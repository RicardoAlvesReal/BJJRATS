import { and, eq, not } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { enrollments, notifications, payments, settings } from '../db/schema.js';
import { sendNotificationWhatsApp } from './notificationWhatsApp.js';

export const DEFAULT_AUTO_SUSPEND_AFTER_DAYS = 10;

const DEFAULT_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_STARTUP_DELAY_MS = 60 * 1000;

export function financialSettingsKey(uid: string) {
  return `professor:${uid}:financial:auto_suspend_after_days`;
}

export function normalizeAutoSuspendAfterDays(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_AUTO_SUSPEND_AFTER_DAYS;
  return Math.max(0, Math.min(365, Math.floor(parsed)));
}

function readPositiveIntEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
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

function daysPastDue(value: unknown) {
  const due = normalizePaymentDate(value);
  if (!(due instanceof Date) || Number.isNaN(due.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - dueDay.getTime()) / (1000 * 60 * 60 * 24)));
}

export async function getAutoSuspendAfterDays(professorUid: string) {
  const [row] = await db.select().from(settings)
    .where(eq(settings.key, financialSettingsKey(professorUid)))
    .limit(1);
  return normalizeAutoSuspendAfterDays(row?.value);
}

export async function applyAutomaticSuspensionsForProfessor(
  professorUid: string,
  candidatePayments?: Array<typeof payments.$inferSelect>,
) {
  const autoSuspendAfterDays = await getAutoSuspendAfterDays(professorUid);
  if (autoSuspendAfterDays <= 0) return { autoSuspendAfterDays, suspended: 0 };

  const rows = candidatePayments || await db.select().from(payments)
    .where(and(eq(payments.professorUid, professorUid), not(eq(payments.status, 'paid'))));

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

    const [updated] = await db.update(enrollments)
      .set({ status: 'suspended' })
      .where(and(eq(enrollments.id, enrollment.id), eq(enrollments.status, 'active')))
      .returning({ id: enrollments.id });

    if (!updated) continue;
    suspended++;

    try {
      const [notification] = await db.insert(notifications).values({
        id: nanoid(),
        toUid: enrollment.studentUid,
        fromUid: professorUid,
        fromName: enrollment.professorName || enrollment.academyName || 'Professor',
        type: 'payment_suspended',
        message: `Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de ${autoSuspendAfterDays} dia(s) de atraso. Atraso atual: ${overdue.days} dia(s). Regularize sua mensalidade para voltar a treinar.`,
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
      console.warn('[financial-automation] automatic suspension notification failed', err);
    }
  }

  return { autoSuspendAfterDays, suspended };
}

export async function runAutomaticSuspensionSweep() {
  const rows = await db.select().from(payments).where(not(eq(payments.status, 'paid')));
  const byProfessor = new Map<string, Array<typeof payments.$inferSelect>>();
  const professorUids: string[] = [];

  for (const payment of rows) {
    let group = byProfessor.get(payment.professorUid);
    if (!group) {
      group = [];
      byProfessor.set(payment.professorUid, group);
      professorUids.push(payment.professorUid);
    }
    group.push(payment);
  }

  let suspended = 0;
  for (const professorUid of professorUids) {
    const professorPayments = byProfessor.get(professorUid) || [];
    const result = await applyAutomaticSuspensionsForProfessor(professorUid, professorPayments);
    suspended += result.suspended;
  }

  return { professors: professorUids.length, suspended };
}

export function startFinancialAutomationJobs() {
  if (process.env.FINANCIAL_AUTOMATION_DISABLED === 'true') {
    console.log('[financial-automation] disabled by FINANCIAL_AUTOMATION_DISABLED=true');
    return;
  }

  const intervalMs = readPositiveIntEnv('FINANCIAL_AUTOMATION_INTERVAL_MS', DEFAULT_SWEEP_INTERVAL_MS);
  const startupDelayMs = readPositiveIntEnv('FINANCIAL_AUTOMATION_STARTUP_DELAY_MS', DEFAULT_STARTUP_DELAY_MS);
  let running = false;

  const run = async (reason: string) => {
    if (running) return;
    running = true;
    try {
      const result = await runAutomaticSuspensionSweep();
      if (result.suspended > 0) {
        console.log(`[financial-automation] ${reason}: ${result.suspended} matricula(s) suspensa(s)`);
      }
    } catch (err) {
      console.warn('[financial-automation] sweep failed', err);
    } finally {
      running = false;
    }
  };

  const startupTimer = setTimeout(() => void run('startup'), startupDelayMs);
  startupTimer.unref?.();

  const intervalTimer = setInterval(() => void run('interval'), intervalMs);
  intervalTimer.unref?.();
}
