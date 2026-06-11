// BJJRats — WhatsApp Service
// Envia mensagens via Evolution API (automático) ou abre wa.me (fallback manual)

import api from './api';

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

function openWhatsApp(phone: string, message: string): void {
  const formattedPhone = formatPhone(phone);
  const encodedMsg = encodeURIComponent(message);
  const url = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;
  window.open(url, '_blank');
}

async function sendOrFallback(phone: string, message: string): Promise<void> {
  try {
    await api.whatsapp.send(phone, message);
  } catch {
    openWhatsApp(phone, message);
  }
}

export interface WhatsAppPayload {
  studentName: string;
  studentPhone?: string;
  professorName: string;
  academyName: string;
  amount?: number;
  dueDate?: string;
  daysOverdue?: number;
  pixKey?: string;
  suspendReason?: string;
  trainingsCount?: number;
  monthName?: string;
}

export async function sendDueWhatsApp(payload: WhatsAppPayload): Promise<void> {
  const { studentName, studentPhone = '', professorName, academyName, amount, dueDate, pixKey } = payload;
  const amountStr = amount ? `R$ ${amount.toFixed(2)}` : '';
  const pixStr = pixKey ? `\n\n💳 *PIX:* ${pixKey}` : '';
  const message =
    `Olá *${studentName}*! 👋\n\n` +
    `Passando para lembrar que sua mensalidade na *${academyName}* vence em *${dueDate || 'breve'}*${amountStr ? ` no valor de *${amountStr}*` : ''}.\n` +
    `Qualquer dúvida, estou à disposição!${pixStr}\n\n` +
    `OSS! 🥋 — ${professorName}`;
  await sendOrFallback(studentPhone, message);
}

export async function sendOverdueWhatsApp(payload: WhatsAppPayload): Promise<void> {
  const { studentName, studentPhone = '', professorName, academyName, amount, daysOverdue = 0, pixKey } = payload;
  const amountStr = amount ? `R$ ${amount.toFixed(2)}` : '';
  const pixStr = pixKey ? `\n\n💳 *PIX:* ${pixKey}` : '';

  let urgency = '';
  if (daysOverdue <= 2) {
    urgency = `Sua mensalidade venceu há *${daysOverdue} dia(s)*. Por favor, regularize para continuar treinando. 🙏`;
  } else if (daysOverdue <= 7) {
    urgency = `Sua mensalidade está em atraso há *${daysOverdue} dias*. Regularize o quanto antes para evitar a suspensão. ⚠️`;
  } else {
    urgency = `⚠️ Atenção: sua mensalidade está em atraso há *${daysOverdue} dias*. Entre em contato comigo imediatamente para regularizar sua situação.`;
  }

  const message =
    `Olá *${studentName}*! 👋\n\n` +
    `${urgency}\n\n` +
    `*Academia:* ${academyName}\n` +
    (amountStr ? `*Valor:* ${amountStr}\n` : '') +
    pixStr +
    `\n\nOSS! 🥋 — ${professorName}`;
  await sendOrFallback(studentPhone, message);
}

export async function sendSuspendWhatsApp(payload: WhatsAppPayload): Promise<void> {
  const { studentName, studentPhone = '', professorName, academyName, suspendReason } = payload;
  const reasonStr = suspendReason ? `\n\n*Motivo:* ${suspendReason}` : '';
  const message =
    `Olá *${studentName}*, tudo bem?\n\n` +
    `Informamos que seu acesso à *${academyName}* foi temporariamente suspenso.${reasonStr}\n\n` +
    `Para regularizar sua situação, entre em contato comigo.\n\n` +
    `OSS! 🥋 — ${professorName}`;
  await sendOrFallback(studentPhone, message);
}

export async function sendLowFrequencyWhatsApp(payload: WhatsAppPayload): Promise<void> {
  const { studentName, studentPhone = '', professorName, academyName, trainingsCount = 0, monthName = 'este mês' } = payload;
  const message =
    `Olá *${studentName}*! 🥋\n\n` +
    `Sentimos sua falta no tatame! Você treinou apenas *${trainingsCount} vez${trainingsCount !== 1 ? 'es' : ''}* em *${monthName}* na *${academyName}*.\n\n` +
    `Cada treino conta na sua evolução rumo à próxima faixa. Que tal marcar presença esta semana? 💪\n\n` +
    `OSS! — ${professorName}`;
  await sendOrFallback(studentPhone, message);
}
