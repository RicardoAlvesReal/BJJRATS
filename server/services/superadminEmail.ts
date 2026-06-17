import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { sendCompanyEmail } from './companyEmail.js';

export type SuperadminEmailInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
  category?: string;
  pageUrl?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export type SuperadminEmailResult = {
  provider: 'resend' | 'webhook' | 'log';
  sent: boolean;
  recipients: string[];
  providerResponse?: unknown;
};

function splitEmails(value?: string) {
  return String(value || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function getSuperadminRecipients() {
  const configured = splitEmails(process.env.SUPERADMIN_EMAIL_TO);
  if (configured.length > 0) return configured;

  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.role, 'superadmin'));

  return rows.map((row) => row.email).filter(Boolean);
}

function buildText(input: SuperadminEmailInput) {
  const lines = [
    `Nome: ${input.name}`,
    `E-mail: ${input.email}`,
    input.category ? `Categoria: ${input.category}` : null,
    input.pageUrl ? `Pagina: ${input.pageUrl}` : null,
    '',
    input.message,
  ];
  return lines.filter((line) => line !== null).join('\n');
}

function buildHtml(input: SuperadminEmailInput) {
  const meta = [
    ['Nome', input.name],
    ['E-mail', input.email],
    ['Categoria', input.category],
    ['Pagina', input.pageUrl],
    ['Navegador', input.userAgent],
  ].filter(([, value]) => value);

  const items = meta
    .map(([label, value]) => `<li><strong>${escapeHtml(String(label))}:</strong> ${escapeHtml(String(value))}</li>`)
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">Nova mensagem para o superadmin</h2>
      <ul>${items}</ul>
      <hr />
      <p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>
    </div>
  `;
}

export async function sendSuperadminEmail(input: SuperadminEmailInput): Promise<SuperadminEmailResult> {
  const recipients = await getSuperadminRecipients();
  if (recipients.length === 0) {
    throw new Error('Nenhum e-mail de superadmin encontrado.');
  }

  return sendCompanyEmail({
    to: recipients,
    replyTo: input.email,
    subject: input.subject,
    text: buildText(input),
    html: buildHtml(input),
    metadata: input.metadata,
  });
}
