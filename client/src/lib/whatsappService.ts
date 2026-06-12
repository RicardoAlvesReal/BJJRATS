// BJJRats — WhatsApp Service
// Envia mensagens via Evolution API (automatico).

import api from './api';

async function sendAutomatic(phone: string, message: string): Promise<void> {
  await api.whatsapp.send(phone, message);
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
  await sendAutomatic(studentPhone, message);
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
  await sendAutomatic(studentPhone, message);
}

export async function sendSuspendWhatsApp(payload: WhatsAppPayload): Promise<void> {
  const { studentName, studentPhone = '', professorName, academyName, suspendReason } = payload;
  const reasonStr = suspendReason ? `\n\n*Motivo:* ${suspendReason}` : '';
  const message =
    `Olá *${studentName}*, tudo bem?\n\n` +
    `Informamos que seu acesso à *${academyName}* foi temporariamente suspenso.${reasonStr}\n\n` +
    `Para regularizar sua situação, entre em contato comigo.\n\n` +
    `OSS! 🥋 — ${professorName}`;
  await sendAutomatic(studentPhone, message);
}

export async function sendLowFrequencyWhatsApp(payload: WhatsAppPayload): Promise<void> {
  const { studentName, studentPhone = '', professorName, academyName, trainingsCount = 0, monthName = 'este mês' } = payload;
  const message =
    `Olá *${studentName}*! 🥋\n\n` +
    `Sentimos sua falta no tatame! Você treinou apenas *${trainingsCount} vez${trainingsCount !== 1 ? 'es' : ''}* em *${monthName}* na *${academyName}*.\n\n` +
    `Cada treino conta na sua evolução rumo à próxima faixa. Que tal marcar presença esta semana? 💪\n\n` +
    `OSS! — ${professorName}`;
  await sendAutomatic(studentPhone, message);
}
