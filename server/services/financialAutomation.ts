import { and, eq, gte } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { classCheckIns, enrollments, notifications, payments, settings } from '../db/schema.js';
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

function isPaidPayment(payment: typeof payments.$inferSelect) {
  return String(payment.status || '').toLowerCase() === 'paid' || Boolean(payment.paidAt);
}

function paymentDueTime(payment: typeof payments.$inferSelect) {
  const due = normalizePaymentDate(payment.dueDate);
  return due instanceof Date && !Number.isNaN(due.getTime()) ? due.getTime() : 0;
}

function paymentCreatedTime(payment: typeof payments.$inferSelect) {
  const created = normalizePaymentDate(payment.createdAt);
  return created instanceof Date && !Number.isNaN(created.getTime()) ? created.getTime() : 0;
}

function paymentMonthKey(payment: typeof payments.$inferSelect) {
  const due = normalizePaymentDate(payment.dueDate);
  if (!(due instanceof Date) || Number.isNaN(due.getTime())) return null;
  return `${payment.professorUid}:${payment.studentUid}:${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}`;
}

function isDueTodayOrPast(payment: typeof payments.$inferSelect) {
  const due = normalizePaymentDate(payment.dueDate);
  if (!(due instanceof Date) || Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  return dueDay.getTime() <= today.getTime();
}

function isNewerPayment(candidate: typeof payments.$inferSelect, current: typeof payments.$inferSelect) {
  const candidateDue = paymentDueTime(candidate);
  const currentDue = paymentDueTime(current);
  if (candidateDue !== currentDue) return candidateDue > currentDue;

  const candidateCreated = paymentCreatedTime(candidate);
  const currentCreated = paymentCreatedTime(current);
  if (candidateCreated !== currentCreated) return candidateCreated > currentCreated;

  return String(candidate.id) > String(current.id);
}

function effectiveDuePaymentsByStudent(rows: Array<typeof payments.$inferSelect>) {
  const paidMonths = new Set<string>();
  for (const payment of rows) {
    const key = paymentMonthKey(payment);
    if (key && isPaidPayment(payment)) paidMonths.add(key);
  }

  const byStudent = new Map<string, typeof payments.$inferSelect>();
  for (const payment of rows) {
    const key = paymentMonthKey(payment);
    if (!key || paidMonths.has(key) && !isPaidPayment(payment)) continue;
    if (!isDueTodayOrPast(payment)) continue;

    const current = byStudent.get(payment.studentUid);
    if (!current || isNewerPayment(payment, current)) {
      byStudent.set(payment.studentUid, payment);
    }
  }

  return byStudent;
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
    .where(eq(payments.professorUid, professorUid));

  const oldestOverdueByStudent = new Map<string, { days: number; payment: typeof payments.$inferSelect }>();
  for (const payment of effectiveDuePaymentsByStudent(rows).values()) {
    if (isPaidPayment(payment)) continue;
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
  const rows = await db.select().from(payments);
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
      const incentiveResult = await runLowFreqIncentiveSweep();
      if (incentiveResult.sent > 0) {
        console.log(`[financial-automation] ${reason}: ${incentiveResult.sent} incentivo(s) de frequencia enviado(s)`);
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

// ─── Low-frequency incentives ─────────────────────────────────────────────────
export const DEFAULT_LOW_FREQ_THRESHOLD = 4;
export const INCENTIVE_COOLDOWN_DAYS = 7;

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export async function runLowFreqIncentiveSweep() {
  const now = new Date();
  const monthStartStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const cooldownSince = new Date(now.getTime() - INCENTIVE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const monthName = MONTH_NAMES[now.getMonth()];

  // Active enrollments
  const activeEnrollments = await db.select().from(enrollments).where(eq(enrollments.status, 'active'));

  // Check-ins this month
  const checkInsThisMonth = await db.select().from(classCheckIns).where(gte(classCheckIns.createdAt, new Date(monthStartStr)));
  const checkInCountByStudent = new Map<string, number>();
  for (const ci of checkInsThisMonth) {
    checkInCountByStudent.set(ci.studentUid, (checkInCountByStudent.get(ci.studentUid) ?? 0) + 1);
  }

  // Recent incentive notifications (cooldown dedup)
  const recentIncentives = await db.select({ fromUid: notifications.fromUid, toUid: notifications.toUid })
    .from(notifications)
    .where(and(eq(notifications.type, 'low_frequency'), gte(notifications.createdAt, cooldownSince)));
  const recentSet = new Set(recentIncentives.map(n => `${n.fromUid}:${n.toUid}`));

  let sent = 0;
  for (const enr of activeEnrollments) {
    const trainings = checkInCountByStudent.get(enr.studentUid) ?? 0;
    if (trainings >= DEFAULT_LOW_FREQ_THRESHOLD) continue;

    const key = `${enr.professorUid}:${enr.studentUid}`;
    if (recentSet.has(key)) continue;

    try {
      const [notification] = await db.insert(notifications).values({
        id: nanoid(),
        toUid: enr.studentUid,
        fromUid: enr.professorUid,
        fromName: enr.professorName || enr.academyName || 'Professor',
        type: 'low_frequency',
        message: `Sentimos sua falta no tatame. Voce treinou ${trainings} vez${trainings !== 1 ? 'es' : ''} em ${monthName}. Que tal marcar presenca esta semana?`,
        data: { trainingsCount: trainings, monthName, auto: true },
        read: false,
      }).returning();
      await sendNotificationWhatsApp(notification, enr.professorUid);
      sent++;
    } catch (err) {
      console.warn('[financial-automation] incentive notification failed', err);
    }
  }

  return { sent };
}
