import { Router } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { enrollments, payments, users } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { applyAutomaticSuspensionsForProfessor } from '../services/financialAutomation.js';
import { notifyEnrollmentsReactivated, notifyEnrollmentsSuspended } from '../services/enrollmentNotifications.js';
import { getAsaasCredentials, getPaymentIntegration } from '../services/paymentIntegrations.js';
import {
  createCustomer,
  createPayment as asaasCreatePayment,
  findCustomer,
  parseWebhook,
  type AsaasWebhookEvent,
} from '../services/asaas.js';

const router = Router();

function normalizePaymentDate(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return value;
}

function normalizePaymentPayload(payload: Record<string, unknown>) {
  const data: Record<string, unknown> = { ...payload };
  if ('dueDate' in data) data['dueDate'] = normalizePaymentDate(data['dueDate']);
  if ('paidAt' in data) data['paidAt'] = normalizePaymentDate(data['paidAt']);
  return data;
}

function formatDateOnly(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function serializePayment<T extends Record<string, unknown>>(payment: T) {
  const pixLink = payment['pixLink'] ?? payment['pix_link'];
  return {
    ...payment,
    dueDate: formatDateOnly(payment['dueDate']),
    paidAt: formatDateOnly(payment['paidAt']),
    pixLink,
    pixKey: payment['pixKey'] ?? pixLink,
    paymentLink: pixLink,
  };
}

function isPaidPayment(payment: typeof payments.$inferSelect) {
  return String(payment.status || '').toLowerCase() === 'paid' || Boolean(payment.paidAt);
}

async function reactivateSuspendedEnrollmentsForPaidPayment(payment: typeof payments.$inferSelect) {
  if (!isPaidPayment(payment) || !payment.professorUid || !payment.studentUid) return [];

  const rows = await db
    .update(enrollments)
    .set({ status: 'active' })
    .where(and(
      eq(enrollments.professorUid, payment.professorUid),
      eq(enrollments.studentUid, payment.studentUid),
      eq(enrollments.status, 'suspended'),
    ))
    .returning();

  if (rows.length > 0) {
    await notifyEnrollmentsReactivated(rows, payment.professorUid);
  }

  return rows;
}

async function suspendActiveEnrollmentsForRevertedPayment(
  payment: typeof payments.$inferSelect,
  previousPayment: typeof payments.$inferSelect,
) {
  if (!isPaidPayment(previousPayment) || isPaidPayment(payment) || !payment.professorUid || !payment.studentUid) return [];

  const rows = await db
    .update(enrollments)
    .set({ status: 'suspended' })
    .where(and(
      eq(enrollments.professorUid, payment.professorUid),
      eq(enrollments.studentUid, payment.studentUid),
      eq(enrollments.status, 'active'),
    ))
    .returning();

  if (rows.length > 0) {
    await notifyEnrollmentsSuspended(rows, payment.professorUid, 'Pagamento estornado.');
  }

  return rows;
}

async function buildAsaasPaymentData(localPaymentId: string, data: Record<string, unknown>) {
  const professorUid = String(data.professorUid || '');
  const credentials = professorUid ? await getAsaasCredentials(professorUid) : null;
  if (!credentials || data.paymentProvider === 'manual') return null;

  const amount = Number(data.amount);
  const dueDateValue = formatDateOnly(data.dueDate);
  if (!Number.isFinite(amount) || amount <= 0 || typeof dueDateValue !== 'string' || !dueDateValue) return null;
  const dueDate = dueDateValue;

  let studentName = String(data.studentName || '').trim();
  let studentEmail = String(data.studentEmail || '').trim();
  let studentPhone = String(data.studentPhone || '').trim();

  if ((!studentName || !studentEmail || !studentPhone) && data.studentUid) {
    const [student] = await db.select({
      name: users.name,
      email: users.email,
      phone: users.phone,
    }).from(users).where(eq(users.uid, String(data.studentUid))).limit(1);
    studentName ||= student?.name || '';
    studentEmail ||= student?.email || '';
    studentPhone ||= student?.phone || '';
  }

  if (!studentName || !studentEmail) return null;

  const config = { apiKey: credentials.apiKey, sandbox: credentials.sandbox };
  const customer = await findCustomer(studentEmail, config) || await createCustomer({
    name: studentName,
    email: studentEmail,
    phone: studentPhone || undefined,
  }, config);

  const charge = await asaasCreatePayment({
    customer: customer.id,
    value: amount,
    dueDate,
    billingType: credentials.billingType,
    description: `BJJRats - Mensalidade ${studentName}`,
    externalReference: localPaymentId,
  }, config);

  return {
    provider: 'asaas',
    paymentId: charge.id,
    paymentLink: charge.invoiceUrl || charge.bankSlipUrl || data.pixLink || data.pixKey || null,
  };
}

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid, studentUid } = req.query as Record<string, string>;
  const effectiveProfessorUid = professorUid || req.userId!;
  const conditions = [];
  if (professorUid) conditions.push(eq(payments.professorUid, professorUid));
  if (studentUid)   conditions.push(eq(payments.studentUid, studentUid));
  const rows = conditions.length
    ? await db.select().from(payments).where(and(...conditions)).orderBy(desc(payments.dueDate))
    : await db.select().from(payments).where(eq(payments.professorUid, req.userId!)).orderBy(desc(payments.dueDate));
  if (!studentUid && effectiveProfessorUid === req.userId) {
    await applyAutomaticSuspensionsForProfessor(effectiveProfessorUid, rows);
  }
  res.json(rows.map(serializePayment));
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const data = normalizePaymentPayload(req.body);
  const professorUid = String(data.professorUid || req.userId);
  let asaasError: string | null = null;
  let asaasResult: Awaited<ReturnType<typeof buildAsaasPaymentData>> = null;
  const integration = await getPaymentIntegration(professorUid);

  try {
    asaasResult = await buildAsaasPaymentData(id, { ...data, professorUid });
    if (asaasResult?.paymentLink) data.pixLink = asaasResult.paymentLink;
  } catch (err) {
    asaasError = err instanceof Error ? err.message : 'Erro ao criar cobrança Asaas';
    if (!integration.manualPaymentsEnabled) {
      res.status(502).json({ error: asaasError });
      return;
    }
  }

  if (!asaasResult && !integration.manualPaymentsEnabled) {
    res.status(400).json({ error: 'Pagamentos manuais estao desativados e o Asaas nao esta conectado.' });
    return;
  }

  if (!data.pixLink && data.pixKey) data.pixLink = data.pixKey;

  // Impedir duplicata: mesma matrícula (studentUid + professorUid) no mesmo mês
  if (data.studentUid && data.dueDate) {
    const dueDateStr = formatDateOnly(data.dueDate);
    if (typeof dueDateStr === 'string') {
      const monthPrefix = dueDateStr.slice(0, 7); // YYYY-MM
      const [duplicate] = await db
        .select({ id: payments.id })
        .from(payments)
        .where(
          and(
            eq(payments.professorUid, professorUid),
            eq(payments.studentUid, String(data.studentUid)),
            sql`to_char(${payments.dueDate}, 'YYYY-MM') = ${monthPrefix}`,
          )
        )
        .limit(1);
      if (duplicate) {
        res.status(409).json({ error: 'Já existe uma cobrança para este aluno neste mês.', existingId: duplicate.id });
        return;
      }
    }
  }

  const [row] = await db.insert(payments).values({ id, ...data, professorUid } as any).returning();
  res.status(201).json({
    ...serializePayment(row),
    paymentProvider: asaasResult?.provider || 'manual',
    asaasPaymentId: asaasResult?.paymentId || null,
    asaasError,
  });
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select().from(payments).where(eq(payments.id, req.params.id)).limit(1);
  if (!existing || existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, ...data } = normalizePaymentPayload(req.body);
  const [row] = await db.update(payments).set(data as any).where(eq(payments.id, req.params.id)).returning();
  const reactivatedEnrollments = await reactivateSuspendedEnrollmentsForPaidPayment(row);
  const suspendedEnrollments = await suspendActiveEnrollmentsForRevertedPayment(row, existing);
  res.json({ ...serializePayment(row), reactivatedEnrollments, suspendedEnrollments });
});

router.post('/asaas/webhook', async (req, res) => {
  const event: AsaasWebhookEvent = parseWebhook(req.body);
  const localPaymentId = event.payment?.externalReference;

  if (!localPaymentId) {
    res.json({ received: true, ignored: 'missing_external_reference' });
    return;
  }

  const [localPayment] = await db.select().from(payments).where(eq(payments.id, localPaymentId)).limit(1);
  if (!localPayment) {
    res.json({ received: true, ignored: 'payment_not_found' });
    return;
  }

  const integration = await getPaymentIntegration(localPayment.professorUid);
  const expectedToken = integration.webhookToken;
  const providedToken = req.header('asaas-access-token');
  if (expectedToken && providedToken !== expectedToken) {
    res.status(401).json({ error: 'invalid_webhook_token' });
    return;
  }

  switch (event.event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED': {
      const [updatedPayment] = await db.update(payments)
        .set({ status: 'paid', paidAt: new Date() })
        .where(eq(payments.id, localPayment.id))
        .returning();
      if (updatedPayment) await reactivateSuspendedEnrollmentsForPaidPayment(updatedPayment);
      break;
    }
    case 'PAYMENT_OVERDUE':
      await db.update(payments)
        .set({ status: 'overdue' })
        .where(eq(payments.id, localPayment.id));
      break;
    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED': {
      const [updatedPayment] = await db.update(payments)
        .set({ status: 'pending' })
        .where(eq(payments.id, localPayment.id))
        .returning();
      if (updatedPayment) await suspendActiveEnrollmentsForRevertedPayment(updatedPayment, localPayment);
      break;
    }
  }

  res.json({ received: true });
});

export default router;
