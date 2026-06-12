import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, whatsappInstances } from '../db/schema.js';
import * as evolution from './evolutionApi.js';

export type WhatsAppAutomationResult = {
  enabled: boolean;
  recipients: number;
  sent: number;
  failed: number;
};

type NotificationLike = {
  toUid: string;
  fromName?: string | null;
  type?: string | null;
  message: string;
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
  enrollment_rejected: 'Solicitacao recusada',
  promotion: 'Promocao',
};

function hasPhone(phone?: string | null) {
  return Boolean(phone?.replace(/\D/g, ''));
}

function labelFromType(type?: string | null) {
  if (!type) return 'Notificacao';
  return TYPE_LABELS[type] || type.replace(/_/g, ' ').toUpperCase();
}

function buildMessage(notification: NotificationLike, senderName?: string | null) {
  const title = labelFromType(notification.type);
  const message = String(notification.message || '').replace(/<[^>]*>/g, '').trim();
  const source = notification.fromName || senderName;
  return `*${title}*\n\n${message}${source ? `\n\nEnviado por: ${source}` : ''}`.trim();
}

export async function ensureWhatsAppSenderConnected(sourceUid: string) {
  const expectedInstanceName = `bjjrats_${sourceUid}`;
  const [instance] = await db.select().from(whatsappInstances)
    .where(eq(whatsappInstances.professorUid, sourceUid))
    .limit(1);

  const instanceName = instance?.instanceName || expectedInstanceName;

  try {
    const state = await evolution.getConnectionState(instanceName);
    if (state.instance.state !== 'open') return false;

    const phone = state.instance.ownerJid?.split('@')[0] || null;
    if (!instance) {
      await db.insert(whatsappInstances).values({
        id: nanoid(),
        professorUid: sourceUid,
        instanceName,
        status: 'connected',
        phone,
      }).onConflictDoNothing();
    } else if (instance.status !== 'connected' || (!instance.phone && phone)) {
      await db.update(whatsappInstances)
        .set({ status: 'connected', phone: phone || instance.phone })
        .where(eq(whatsappInstances.id, instance.id));
    }

    return true;
  } catch {
    return false;
  }
}

export async function sendNotificationWhatsApp(
  notification: NotificationLike,
  senderUid: string,
): Promise<WhatsAppAutomationResult> {
  if (!notification.toUid || notification.toUid === senderUid) {
    return { enabled: true, recipients: 0, sent: 0, failed: 0 };
  }

  const connected = await ensureWhatsAppSenderConnected(senderUid);
  if (!connected) {
    return { enabled: false, recipients: 0, sent: 0, failed: 0 };
  }

  const [[recipient], [sender]] = await Promise.all([
    db.select({ uid: users.uid, phone: users.phone }).from(users)
      .where(eq(users.uid, notification.toUid))
      .limit(1),
    db.select({ name: users.name }).from(users)
      .where(eq(users.uid, senderUid))
      .limit(1),
  ]);

  if (!recipient || !hasPhone(recipient.phone)) {
    return { enabled: true, recipients: 0, sent: 0, failed: 0 };
  }

  try {
    await evolution.sendMessage(senderUid, recipient.phone!, buildMessage(notification, sender?.name));
    return { enabled: true, recipients: 1, sent: 1, failed: 0 };
  } catch (err) {
    console.warn('[notifications] whatsapp send failed', err);
    return { enabled: true, recipients: 1, sent: 0, failed: 1 };
  }
}

export async function sendNotificationsWhatsApp(
  rows: NotificationLike[],
  senderUid: string,
): Promise<WhatsAppAutomationResult> {
  const total: WhatsAppAutomationResult = { enabled: true, recipients: 0, sent: 0, failed: 0 };
  for (const row of rows) {
    const result = await sendNotificationWhatsApp(row, senderUid);
    total.enabled = total.enabled && result.enabled;
    total.recipients += result.recipients;
    total.sent += result.sent;
    total.failed += result.failed;
  }
  return total;
}
