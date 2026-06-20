// BJJRats PWA — Shared helpers for ProfessorPanel sub-components
import { toast } from 'sonner';

export function getWhatsAppAutomationToast(
  whatsapp?: { enabled?: boolean; recipients?: number; sent?: number; failed?: number } | null,
  baseMessage = 'Notificação enviada',
) {
  if (whatsapp?.enabled && (whatsapp.recipients ?? 0) > 0) {
    const failedLabel = (whatsapp.failed ?? 0) > 0 ? ` (${whatsapp.failed} falhou)` : '';
    return `${baseMessage}! WhatsApp: ${whatsapp.sent}/${whatsapp.recipients}${failedLabel}`;
  }
  if (whatsapp?.enabled) {
    return `${baseMessage} no app. Nenhum telefone encontrado para WhatsApp.`;
  }
  return `${baseMessage} no app. Conecte o WhatsApp para envio automático.`;
}

export function shouldReplaceFinancialPayment(current: any, candidate: any): boolean {
  if (candidate.status === 'paid' && current.status !== 'paid') return true;
  if (candidate.createdAt && current.createdAt && candidate.createdAt > current.createdAt) return true;
  return false;
}

export function currentEffectivePaymentsByStudent<T extends { studentUid?: string; status?: string; amount?: number }>(rows: T[], now = new Date()) {
  const byStudent = new Map<string, T>();
  rows.forEach(p => {
    const uid = p.studentUid;
    if (!uid) return;
    const existing = byStudent.get(uid);
    if (!existing || shouldReplaceFinancialPayment(existing as any, p as any)) {
      byStudent.set(uid, p);
    }
  });
  return Array.from(byStudent.values());
}
