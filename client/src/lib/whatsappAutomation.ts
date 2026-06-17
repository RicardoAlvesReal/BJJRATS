import type { WhatsAppAutomationResult } from './api';

export function getWhatsAppAutomationToast(
  whatsapp?: WhatsAppAutomationResult | null,
  baseMessage = 'Notificacao enviada',
) {
  if (whatsapp?.enabled && whatsapp.recipients > 0) {
    const failedLabel = whatsapp.failed > 0 ? ` (${whatsapp.failed} falhou)` : '';
    return `${baseMessage}! WhatsApp: ${whatsapp.sent}/${whatsapp.recipients}${failedLabel}`;
  }

  if (whatsapp?.enabled) {
    return `${baseMessage} no app. Nenhum telefone encontrado para WhatsApp.`;
  }

  return `${baseMessage} no app. Conecte o WhatsApp para envio automatico.`;
}

export function summarizeWhatsAppAutomation(
  rows: Array<{ whatsapp?: WhatsAppAutomationResult | null }>,
): WhatsAppAutomationResult {
  return rows.reduce(
    (acc, item) => ({
      enabled: acc.enabled && Boolean(item.whatsapp?.enabled),
      recipients: acc.recipients + (item.whatsapp?.recipients || 0),
      sent: acc.sent + (item.whatsapp?.sent || 0),
      failed: acc.failed + (item.whatsapp?.failed || 0),
    }),
    { enabled: true, recipients: 0, sent: 0, failed: 0 },
  );
}
