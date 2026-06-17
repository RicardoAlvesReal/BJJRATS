import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { sendCompanyEmail } from './companyEmail.js';

export type EmailAutomationResult = {
  enabled: boolean;
  recipients: number;
  sent: number;
  failed: number;
};

type NotificationLike = {
  toUid: string;
  title?: string | null;
  fromName?: string | null;
  type?: string | null;
  message?: string | null;
  body?: string | null;
  content?: string | null;
  data?: unknown;
};

const TYPE_LABELS: Record<string, string> = {
  payment_due: 'Mensalidade gerada',
  payment_overdue: 'Mensalidade atrasada',
  payment_suspended: 'Acesso suspenso',
  low_frequency: 'Baixa frequencia',
  class_rescheduled: 'Aula remarcada',
  class_cancelled: 'Aula cancelada',
  event_confirmed: 'Evento confirmado',
  enrollment: 'Matricula',
  enrollment_accepted: 'Matricula aceita',
  enrollment_reactivated: 'Matricula reativada',
  enrollment_rejected: 'Solicitacao recusada',
  promotion: 'Promocao',
  trial_request: 'Aula experimental',
  academy_professor_partner: 'Convite de parceria',
  academy_student_assignment: 'Novo aluno indicado',
};

function cleanText(value: unknown) {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, '').replace(/\s+\n/g, '\n').trim()
    : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function dataText(notification: NotificationLike, key: string) {
  return isRecord(notification.data) ? cleanText(notification.data[key]) : '';
}

function labelFromType(type?: string | null) {
  if (!type) return 'Notificacao BJJRats';
  return TYPE_LABELS[type] || type.replace(/_/g, ' ').toUpperCase();
}

function subjectFrom(notification: NotificationLike) {
  return cleanText(notification.title)
    || dataText(notification, 'title')
    || labelFromType(notification.type);
}

function messageFrom(notification: NotificationLike) {
  return cleanText(notification.message)
    || cleanText(notification.body)
    || cleanText(notification.content)
    || dataText(notification, 'message')
    || dataText(notification, 'body')
    || dataText(notification, 'content')
    || 'Voce recebeu uma nova notificacao no BJJRats.';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildHtml(subject: string, message: string, source?: string | null) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">${escapeHtml(subject)}</h2>
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      ${source ? `<p style="color:#666;font-size:13px">Enviado por: ${escapeHtml(source)}</p>` : ''}
    </div>
  `;
}

export async function sendNotificationEmail(
  notification: NotificationLike,
  senderUid: string,
): Promise<EmailAutomationResult> {
  if (!notification.toUid || notification.toUid === senderUid) {
    return { enabled: true, recipients: 0, sent: 0, failed: 0 };
  }

  const [[recipient], [sender]] = await Promise.all([
    db.select({ email: users.email }).from(users)
      .where(eq(users.uid, notification.toUid))
      .limit(1),
    db.select({
      name: users.name,
      email: users.email,
      academyName: users.academyName,
      role: users.role,
    }).from(users)
      .where(eq(users.uid, senderUid))
      .limit(1),
  ]);

  if (!recipient?.email) {
    return { enabled: true, recipients: 0, sent: 0, failed: 0 };
  }

  const subject = subjectFrom(notification);
  const message = messageFrom(notification);
  const source = notification.fromName || sender?.academyName || sender?.name || 'BJJRats';

  try {
    const result = await sendCompanyEmail({
      to: [recipient.email],
      replyTo: sender?.email,
      subject: `BJJRats - ${subject}`,
      text: [message, source ? `Enviado por: ${source}` : ''].filter(Boolean).join('\n\n'),
      html: buildHtml(subject, message, source),
      metadata: {
        source: 'notification',
        type: notification.type || null,
        senderUid,
        toUid: notification.toUid,
      },
    });

    return {
      enabled: result.provider !== 'log' || result.sent,
      recipients: result.recipients.length,
      sent: result.sent ? result.recipients.length : 0,
      failed: result.sent ? 0 : result.recipients.length,
    };
  } catch (err) {
    console.warn('[notifications] email send failed', err);
    return { enabled: true, recipients: 1, sent: 0, failed: 1 };
  }
}

export async function sendNotificationsEmail(
  rows: NotificationLike[],
  senderUid: string,
): Promise<EmailAutomationResult> {
  const total: EmailAutomationResult = { enabled: true, recipients: 0, sent: 0, failed: 0 };
  for (const row of rows) {
    const result = await sendNotificationEmail(row, senderUid);
    total.enabled = total.enabled && result.enabled;
    total.recipients += result.recipients;
    total.sent += result.sent;
    total.failed += result.failed;
  }
  return total;
}
