// BJJRats — Email Service via EmailJS
// Funções centralizadas para envio de avisos financeiros e frequência

import emailjs from '@emailjs/browser';

export interface EmailConfig {
  serviceId: string;
  publicKey: string;
  templateDue: string;           // Template: vencimento próximo
  templateOverdue: string;       // Template: mensalidade atrasada
  templateSuspend: string;       // Template: suspensão
  templateLowFrequency?: string; // Template: incentivo de frequência (opcional, usa templateDue como fallback)
  daysBeforeDue: number;         // Dias de antecedência para aviso
  customMessage: string;         // Mensagem personalizada
  lowFrequencyThreshold?: number; // Mínimo de treinos/mês (padrão: 4)
}

export interface EmailPayload {
  to_email: string;
  to_name: string;
  professor_name: string;
  academy_name: string;
  amount: string;
  due_date: string;
  pix_key?: string;
  custom_message?: string;
  suspend_reason?: string;
}

/** Inicializa o EmailJS com a Public Key do professor */
export function initEmailJS(publicKey: string) {
  emailjs.init({ publicKey });
}

/** Envia aviso de vencimento próximo */
export async function sendDueNotice(config: EmailConfig, payload: EmailPayload): Promise<void> {
  initEmailJS(config.publicKey);
  await emailjs.send(config.serviceId, config.templateDue, {
    ...payload,
    custom_message: config.customMessage || '',
  });
}

/** Envia aviso de mensalidade atrasada */
export async function sendOverdueNotice(config: EmailConfig, payload: EmailPayload): Promise<void> {
  initEmailJS(config.publicKey);
  await emailjs.send(config.serviceId, config.templateOverdue, {
    ...payload,
    custom_message: config.customMessage || '',
  });
}

/** Envia aviso de atraso com número de dias (2, 5, 7 dias) */
export async function sendOverdueDaysNotice(
  config: EmailConfig,
  payload: EmailPayload & { days_overdue: number }
): Promise<void> {
  initEmailJS(config.publicKey);
  const message =
    payload.days_overdue <= 2
      ? `Sua mensalidade venceu há ${payload.days_overdue} dia(s). Por favor, regularize para continuar treinando. OSS! 🤙`
      : payload.days_overdue <= 5
      ? `Sua mensalidade está em atraso há ${payload.days_overdue} dias. Regularize o quanto antes para evitar a suspensão. OSS! 🤙`
      : `⚠️ Atenção: sua mensalidade está em atraso há ${payload.days_overdue} dias. Entre em contato com o professor imediatamente para regularizar sua situação.`;
  await emailjs.send(config.serviceId, config.templateOverdue, {
    ...payload,
    custom_message: message,
    days_overdue: payload.days_overdue,
  });
}

/** Envia mensagem de incentivo para aluno com baixa frequência */
export async function sendLowFrequencyNotice(
  config: EmailConfig,
  payload: EmailPayload & { trainings_count: number; month_name: string }
): Promise<void> {
  initEmailJS(config.publicKey);
  const template = config.templateLowFrequency || config.templateDue;
  const message = `Olá ${payload.to_name}! Notamos que você treinou apenas ${payload.trainings_count} vez(es) em ${payload.month_name} em ${payload.academy_name}. Sentimos sua falta no tatame! Cada treino conta na sua evolução rumo à próxima faixa. Que tal marcar presença esta semana? OSS! 🥋`;
  await emailjs.send(config.serviceId, template, {
    ...payload,
    custom_message: message,
    trainings_count: payload.trainings_count,
    month_name: payload.month_name,
  });
}

/** Envia notificação de novo aluno vinculado à academia */
export async function sendNewMemberNotice(config: EmailConfig, payload: {
  to_email: string;
  to_name: string;
  student_name: string;
  student_email: string;
  student_belt: string;
  academy_name: string;
}): Promise<void> {
  initEmailJS(config.publicKey);
  await emailjs.send(config.serviceId, config.templateDue, {
    ...payload,
    subject: 'Novo aluno vinculado à sua academia',
    custom_message: `O aluno ${payload.student_name} (${payload.student_email}) se vinculou à ${payload.academy_name} via link de convite.`,
  });
}

/** Envia aviso de suspensão (privado — não aparece no app do aluno) */
export async function sendSuspendNotice(config: EmailConfig, payload: EmailPayload): Promise<void> {
  initEmailJS(config.publicKey);
  await emailjs.send(config.serviceId, config.templateSuspend, {
    ...payload,
    suspend_reason: payload.suspend_reason || '',
    custom_message: config.customMessage || '',
  });
}
