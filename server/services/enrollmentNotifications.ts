import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { enrollments, notifications } from '../db/schema.js';
import { sendNotificationWhatsApp } from './notificationWhatsApp.js';
import { sendNotificationEmail } from './notificationEmail.js';

type EnrollmentRow = typeof enrollments.$inferSelect;

export async function notifyEnrollmentReactivated(
  enrollment: EnrollmentRow,
  sourceUid = enrollment.professorUid,
) {
  try {
    const sourceName = enrollment.professorName || enrollment.academyName || 'Professor';
    const [notification] = await db.insert(notifications).values({
      id: nanoid(),
      toUid: enrollment.studentUid,
      fromUid: sourceUid,
      fromName: sourceName,
      type: 'enrollment_reactivated',
      message: `Sua matricula foi reativada. Voce esta ativo novamente${enrollment.academyName ? ` em ${enrollment.academyName}` : ''} e ja pode voltar aos treinos.`,
      data: {
        enrollmentId: enrollment.id,
        professorUid: enrollment.professorUid,
        academyName: enrollment.academyName || null,
      },
      read: false,
    }).returning();

    const [whatsapp, email] = await Promise.all([
      sendNotificationWhatsApp(notification, sourceUid),
      sendNotificationEmail(notification, sourceUid),
    ]);
    return { ...notification, whatsapp, email };
  } catch (err) {
    console.warn('[enrollments] reactivation notification failed', err);
    return null;
  }
}

export async function notifyEnrollmentsReactivated(
  rows: EnrollmentRow[],
  sourceUid?: string,
) {
  for (const row of rows) {
    await notifyEnrollmentReactivated(row, sourceUid || row.professorUid);
  }
}

export async function notifyEnrollmentSuspended(
  enrollment: EnrollmentRow,
  sourceUid = enrollment.professorUid,
  reason = 'Pagamento estornado pelo professor.',
) {
  try {
    const sourceName = enrollment.professorName || enrollment.academyName || 'Professor';
    const [notification] = await db.insert(notifications).values({
      id: nanoid(),
      toUid: enrollment.studentUid,
      fromUid: sourceUid,
      fromName: sourceName,
      type: 'payment_suspended',
      message: `Sua matricula voltou para suspensao. Motivo: ${reason} Regularize a situacao para voltar a treinar.`,
      data: {
        enrollmentId: enrollment.id,
        professorUid: enrollment.professorUid,
        academyName: enrollment.academyName || null,
        reason,
      },
      read: false,
    }).returning();

    const [whatsapp, email] = await Promise.all([
      sendNotificationWhatsApp(notification, sourceUid),
      sendNotificationEmail(notification, sourceUid),
    ]);
    return { ...notification, whatsapp, email };
  } catch (err) {
    console.warn('[enrollments] suspension notification failed', err);
    return null;
  }
}

export async function notifyEnrollmentsSuspended(
  rows: EnrollmentRow[],
  sourceUid?: string,
  reason?: string,
) {
  for (const row of rows) {
    await notifyEnrollmentSuspended(row, sourceUid || row.professorUid, reason);
  }
}
