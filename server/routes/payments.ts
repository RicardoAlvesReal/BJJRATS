import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { enrollments, notifications, payments, settings } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { sendNotificationWhatsApp } from '../services/notificationWhatsApp.js';

const router = Router();
const DEFAULT_AUTO_SUSPEND_AFTER_DAYS = 10;

function financialSettingsKey(uid: string) {
  return `professor:${uid}:financial:auto_suspend_after_days`;
}

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
  return {
    ...payment,
    dueDate: formatDateOnly(payment['dueDate']),
    paidAt: formatDateOnly(payment['paidAt']),
  };
}

function daysPastDue(value: unknown) {
  const due = normalizePaymentDate(value);
  if (!(due instanceof Date) || Number.isNaN(due.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - dueDay.getTime()) / (1000 * 60 * 60 * 24)));
}

async function getAutoSuspendAfterDays(professorUid: string) {
  const [row] = await db.select().from(settings)
    .where(eq(settings.key, financialSettingsKey(professorUid)))
    .limit(1);
  const parsed = Number(row?.value);
  if (!Number.isFinite(parsed)) return DEFAULT_AUTO_SUSPEND_AFTER_DAYS;
  return Math.max(0, Math.min(365, Math.floor(parsed)));
}

async function applyAutomaticSuspensions(professorUid: string, rows: Array<typeof payments.$inferSelect>) {
  const autoSuspendAfterDays = await getAutoSuspendAfterDays(professorUid);
  if (autoSuspendAfterDays <= 0) return { autoSuspendAfterDays, suspended: 0 };

  const oldestOverdueByStudent = new Map<string, { days: number; payment: typeof payments.$inferSelect }>();
  for (const payment of rows) {
    if (payment.status === 'paid') continue;
    const days = daysPastDue(payment.dueDate);
    if (days < autoSuspendAfterDays) continue;
    const current = oldestOverdueByStudent.get(payment.studentUid);
    if (!current || days > current.days) {
      oldestOverdueByStudent.set(payment.studentUid, { days, payment });
    }
  }

  if (oldestOverdueByStudent.size === 0) return { autoSuspendAfterDays, suspended: 0 };

  let suspended = 0;
  const activeEnrollments = await db.select().from(enrollments)
    .where(and(eq(enrollments.professorUid, professorUid), eq(enrollments.status, 'active')));

  for (const enrollment of activeEnrollments) {
    const overdue = oldestOverdueByStudent.get(enrollment.studentUid);
    if (!overdue) continue;

    await db.update(enrollments)
      .set({ status: 'suspended' })
      .where(eq(enrollments.id, enrollment.id));

    suspended++;
    try {
      const [notification] = await db.insert(notifications).values({
        id: nanoid(),
        toUid: enrollment.studentUid,
        fromUid: professorUid,
        fromName: enrollment.professorName || enrollment.academyName || 'Professor',
        type: 'payment_suspended',
        message: `Seu acesso foi suspenso automaticamente apos ${overdue.days} dia(s) de inadimplencia. Regularize sua mensalidade para voltar a treinar.`,
        data: {
          enrollmentId: enrollment.id,
          paymentId: overdue.payment.id,
          daysOverdue: overdue.days,
          autoSuspendAfterDays,
        },
        read: false,
      }).returning();
      await sendNotificationWhatsApp(notification, professorUid);
    } catch (err) {
      console.warn('[payments] automatic suspension notification failed', err);
    }
  }

  return { autoSuspendAfterDays, suspended };
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
    await applyAutomaticSuspensions(effectiveProfessorUid, rows);
  }
  res.json(rows.map(serializePayment));
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const data = normalizePaymentPayload(req.body);
  const [row] = await db.insert(payments).values({ id, ...data } as any).returning();
  res.status(201).json(serializePayment(row));
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ professorUid: payments.professorUid }).from(payments).where(eq(payments.id, req.params.id)).limit(1);
  if (!existing || existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, ...data } = normalizePaymentPayload(req.body);
  const [row] = await db.update(payments).set(data as any).where(eq(payments.id, req.params.id)).returning();
  res.json(serializePayment(row));
});

export default router;
