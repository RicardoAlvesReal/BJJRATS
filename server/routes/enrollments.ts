import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { enrollments, notifications, users } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { isInternalAcademyProfessor } from '../services/academyProfessorAccess.js';
import { notifyEnrollmentReactivated } from '../services/enrollmentNotifications.js';
import { sendNotificationWhatsApp } from '../services/notificationWhatsApp.js';
import { sendNotificationEmail } from '../services/notificationEmail.js';

const router = Router();

function isOpenEnrollmentStatus(status?: string | null) {
  return status !== 'cancelled' && status !== 'rejected';
}

function enrollmentStatusPriority(status?: string | null) {
  if (status === 'active') return 4;
  if (status === 'suspended') return 3;
  if (status === 'pending') return 2;
  return 1;
}

function enrollmentCreatedAtTime(row: { createdAt?: Date | string | null }) {
  if (!row.createdAt) return 0;
  const date = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function dedupeEnrollmentRows<T extends { professorUid: string; studentUid: string; status?: string | null; createdAt?: Date | string | null }>(rows: T[]) {
  const openByPair = new Map<string, T>();
  const closedRows: T[] = [];

  for (const row of rows) {
    if (!isOpenEnrollmentStatus(row.status)) {
      closedRows.push(row);
      continue;
    }

    const key = `${row.professorUid}:${row.studentUid}`;
    const current = openByPair.get(key);
    if (!current) {
      openByPair.set(key, row);
      continue;
    }

    const currentScore = enrollmentStatusPriority(current.status);
    const rowScore = enrollmentStatusPriority(row.status);
    if (rowScore > currentScore || (rowScore === currentScore && enrollmentCreatedAtTime(row) > enrollmentCreatedAtTime(current))) {
      openByPair.set(key, row);
    }
  }

  return [...Array.from(openByPair.values()), ...closedRows];
}

async function findOpenEnrollment(professorUid: string, studentUid: string, excludeId?: string) {
  const rows = await db.select().from(enrollments).where(and(
    eq(enrollments.professorUid, professorUid),
    eq(enrollments.studentUid, studentUid),
  ));
  return rows.find(row => row.id !== excludeId && isOpenEnrollmentStatus(row.status)) ?? null;
}

async function findOpenEnrollmentDuplicates(professorUid: string, studentUid: string, excludeId?: string) {
  const rows = await db.select().from(enrollments).where(and(
    eq(enrollments.professorUid, professorUid),
    eq(enrollments.studentUid, studentUid),
  ));
  return rows.filter(row => row.id !== excludeId && isOpenEnrollmentStatus(row.status));
}

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid, studentUid } = req.query as Record<string, string>;
  const conditions = [];
  if (professorUid) conditions.push(eq(enrollments.professorUid, professorUid));
  if (studentUid)   conditions.push(eq(enrollments.studentUid, studentUid));
  const rows = conditions.length
    ? await db.select().from(enrollments).where(and(...conditions)).orderBy(desc(enrollments.createdAt))
    : await db.select().from(enrollments).orderBy(desc(enrollments.createdAt));
  res.json(dedupeEnrollmentRows(rows));
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const body = req.body as Record<string, any>;
  const professorUid = String(body.professorUid || '');
  const studentUid = String(body.studentUid || '');
  if (!professorUid || !studentUid) {
    res.status(400).json({ error: 'Professor e aluno são obrigatórios' });
    return;
  }

  const createdByStudent = req.userId === studentUid;
  const createdByProfessor = req.userId === professorUid;
  if (!createdByStudent && !createdByProfessor) {
    res.status(403).json({ error: 'Proibido' });
    return;
  }

  if (createdByProfessor && await isInternalAcademyProfessor(req.userId!, req.userRole)) {
    res.status(403).json({ error: 'Matriculas deste professor sao gerenciadas pela academia.' });
    return;
  }

  const duplicate = await findOpenEnrollment(professorUid, studentUid);
  if (duplicate) {
    const isPending = duplicate.status === 'pending';
    res.status(409).json({
      error: isPending
        ? 'Já existe um convite de matrícula pendente para este aluno.'
        : 'Este aluno já possui uma matrícula ativa com este professor.',
      enrollment: duplicate,
    });
    return;
  }

  const status = createdByStudent ? (body.status || 'active') : 'pending';
  const [row] = await db.insert(enrollments).values({
    id,
    professorUid,
    professorName: body.professorName || null,
    academyName: body.academyName || null,
    studentUid,
    studentName: body.studentName || null,
    monthlyFee: Number(body.monthlyFee) || 0,
    dueDay: Number(body.dueDay) || 1,
    status,
    pixKey: body.pixKey || null,
  } as any).returning();

  let inviteNotification: Record<string, unknown> | null = null;

  if (status === 'active') {
    const profileUpdate: Record<string, string | null> = { academyId: row.professorUid };
    if (row.academyName) profileUpdate.academy = row.academyName;
    await db.update(users).set(profileUpdate).where(eq(users.uid, row.studentUid));
  } else {
    const [notification] = await db.insert(notifications).values({
      id: nanoid(),
      toUid: studentUid,
      fromUid: req.userId!,
      fromName: body.professorName || body.academyName || 'Professor',
      type: 'enrollment_invite',
      title: 'Convite de matricula',
      message: `${body.professorName || 'Seu professor'} enviou um convite de matrícula${body.academyName ? ` para ${body.academyName}` : ''}. Aceite para ativar o vínculo.`,
      data: {
        enrollmentId: row.id,
        professorUid,
        professorName: body.professorName || null,
        academyName: body.academyName || null,
        monthlyFee: Number(body.monthlyFee) || 0,
        dueDay: Number(body.dueDay) || 1,
        billingMode: body.billingMode || null,
        firstAmount: Number(body.firstAmount) || Number(body.monthlyFee) || 0,
        firstDueDate: body.firstDueDate || null,
        firstMonth: body.firstMonth || null,
        pixKey: body.pixKey || null,
      },
      read: false,
    } as any).returning();

    let whatsapp = { enabled: false, recipients: 0, sent: 0, failed: 0 };
    let email = { enabled: false, recipients: 0, sent: 0, failed: 0 };
    try {
      whatsapp = await sendNotificationWhatsApp(notification, req.userId!);
    } catch (err) {
      console.warn('[enrollments] invite whatsapp automation failed', err);
    }
    try {
      email = await sendNotificationEmail(notification, req.userId!);
    } catch (err) {
      console.warn('[enrollments] invite email automation failed', err);
    }
    inviteNotification = { ...notification, whatsapp, email };
  }
  res.status(201).json(inviteNotification ? { ...row, notification: inviteNotification } : row);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({
    professorUid: enrollments.professorUid,
    studentUid: enrollments.studentUid,
    studentName: enrollments.studentName,
    academyName: enrollments.academyName,
    status: enrollments.status,
  }).from(enrollments).where(eq(enrollments.id, req.params.id)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Não encontrado' }); return; }
  const { id: _id, ...data } = req.body;

  if (existing.studentUid === req.userId && existing.status === 'pending') {
    if (data.status === 'active') {
      const duplicates = await findOpenEnrollmentDuplicates(existing.professorUid, existing.studentUid, req.params.id);
      const blocking = duplicates.find(row => row.status === 'active' || row.status === 'suspended');
      if (blocking) {
        res.status(409).json({ error: 'Este aluno já possui uma matrícula ativa com este professor.' });
        return;
      }
      for (const duplicate of duplicates.filter(row => row.status === 'pending')) {
        await db.update(enrollments).set({ status: 'cancelled' }).where(eq(enrollments.id, duplicate.id));
      }

      const [row] = await db.update(enrollments).set({ status: 'active' }).where(eq(enrollments.id, req.params.id)).returning();
      const profileUpdate: Record<string, string | null> = { academyId: existing.professorUid };
      if (existing.academyName) profileUpdate.academy = existing.academyName;
      await db.update(users).set(profileUpdate).where(eq(users.uid, existing.studentUid));
      await db.insert(notifications).values({
        id: nanoid(),
        toUid: existing.professorUid,
        fromUid: req.userId!,
        type: 'enrollment_invite_accepted',
        message: `${existing.studentName || 'Aluno'} aceitou o convite de matrícula.`,
        read: false,
      });
      res.json(row);
      return;
    }

    if (data.status === 'rejected' || data.status === 'cancelled') {
      const [row] = await db.update(enrollments).set({ status: 'cancelled' }).where(eq(enrollments.id, req.params.id)).returning();
      await db.insert(notifications).values({
        id: nanoid(),
        toUid: existing.professorUid,
        fromUid: req.userId!,
        type: 'enrollment_invite_rejected',
        message: `${existing.studentName || 'Aluno'} recusou o convite de matrícula.`,
        read: false,
      });
      res.json(row);
      return;
    }
  }

  if (existing.studentUid === req.userId && data.status === 'cancelled') {
    const [row] = await db.update(enrollments).set({ status: 'cancelled' }).where(eq(enrollments.id, req.params.id)).returning();

    const [student] = await db.select({
      academyId: users.academyId,
    }).from(users).where(eq(users.uid, existing.studentUid)).limit(1);
    if (student?.academyId === existing.professorUid) {
      await db.update(users).set({
        academyId: null,
        academy: '',
        professor: '',
      }).where(eq(users.uid, existing.studentUid));
    }

    await db.insert(notifications).values({
      id: nanoid(),
      toUid: existing.professorUid,
      fromUid: req.userId!,
      type: 'enrollment_cancelled_by_student',
      message: `${existing.studentName || 'Aluno'} se desvinculou da academia.`,
      read: false,
    });

    res.json(row);
    return;
  }

  if (existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  if (await isInternalAcademyProfessor(req.userId!, req.userRole)) {
    res.status(403).json({ error: 'Matriculas deste professor sao gerenciadas pela academia.' });
    return;
  }
  if (existing.status === 'pending' && data.status === 'active') {
    res.status(403).json({ error: 'O aluno precisa aceitar a matrícula' });
    return;
  }

  const [row] = await db.update(enrollments).set(data).where(eq(enrollments.id, req.params.id)).returning();
  let automation: Record<string, unknown> | null = null;
  if (row && existing.status === 'suspended' && data.status === 'active') {
    automation = await notifyEnrollmentReactivated(row, req.userId!);
  }
  res.json(automation ? { ...row, automation } : row);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ professorUid: enrollments.professorUid }).from(enrollments).where(eq(enrollments.id, req.params.id)).limit(1);
  if (!existing || existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  if (await isInternalAcademyProfessor(req.userId!, req.userRole)) {
    res.status(403).json({ error: 'Matriculas deste professor sao gerenciadas pela academia.' });
    return;
  }
  await db.delete(enrollments).where(eq(enrollments.id, req.params.id));
  res.json({ success: true });
});

// ─── Asaas Subscription Checkout ───────────────────────────────────────────
// POST /api/enrollments/:id/asaas-subscribe
// Aluno ativa cobrança recorrente (assinatura) via Asaas para esta matrícula
router.post('/:id/asaas-subscribe', requireAuth, async (req: AuthRequest, res) => {
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.id, req.params.id))
    .limit(1);

  if (!enrollment) { res.status(404).json({ error: 'Matrícula não encontrada' }); return; }
  if (enrollment.studentUid !== req.userId!) { res.status(403).json({ error: 'Proibido' }); return; }

  const { getAsaasCredentials } = await import('../services/paymentIntegrations.js');
  const creds = await getAsaasCredentials(enrollment.professorUid);
  if (!creds || !creds.apiKey) {
    res.status(400).json({ error: 'Professor não possui cobrança online configurada.' });
    return;
  }

  const [student] = await db
    .select({ name: users.name, email: users.email, phone: users.phone })
    .from(users)
    .where(eq(users.uid, enrollment.studentUid))
    .limit(1);

  if (!student) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

  const { findCustomer, createCustomer, createSubscription } = await import('../services/asaas.js');
  const config = { apiKey: creds.apiKey, sandbox: creds.sandbox };

  let customer = await findCustomer(student.email || '', config);
  if (!customer) {
    customer = await createCustomer({
      name: student.name || enrollment.studentName || 'Aluno',
      email: student.email || '',
      phone: student.phone || undefined,
    }, config);
  }

  // Próximo vencimento baseado no dueDay da matrícula
  const now = new Date();
  const dueDay = enrollment.dueDay || 1;
  let nextDue = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (nextDue <= now) nextDue.setMonth(nextDue.getMonth() + 1);
  const nextDueStr = nextDue.toISOString().split('T')[0];

  try {
    const sub = await createSubscription({
      customer: customer.id,
      value: enrollment.monthlyFee || 0,
      nextDueDate: nextDueStr,
      cycle: 'MONTHLY',
      billingType: creds.billingType || 'PIX',
      description: `Mensalidade - ${enrollment.studentName || 'Aluno'} - ${enrollment.academyName || 'Professor'}`,
      externalReference: enrollment.id,
    }, config);

    res.json({
      invoiceUrl: sub.invoiceUrl || null,
      subscriptionId: sub.id,
      billingType: creds.billingType,
    });
  } catch (err: any) {
    console.error('[enrollments] Asaas subscription error:', err);
    res.status(500).json({ error: 'Erro ao criar assinatura. Tente novamente.' });
  }
});

export default router;
