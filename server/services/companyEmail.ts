import crypto from 'crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';

export type CompanyEmailPayload = {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
};

export type CompanyEmailResult = {
  provider: 'resend' | 'webhook' | 'log';
  sent: boolean;
  recipients: string[];
  providerResponse?: unknown;
};

export type CompanyEmailSettings = {
  enabled: boolean;
  provider: 'log' | 'resend' | 'webhook';
  from: string;
  hasResendApiKey: boolean;
  resendApiKeyLast4: string | null;
  webhookUrl: string;
  hasWebhookKey: boolean;
  webhookKeyLast4: string | null;
};

type CompanyEmailSettingsPrivate = CompanyEmailSettings & {
  resendApiKey: string | null;
  webhookKey: string | null;
};

const PREFIX = 'company_email';

function key(name: string) {
  return `${PREFIX}:${name}`;
}

function cleanEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeSenderEmail(value?: string | null) {
  const raw = String(value || '').trim();
  const bracketMatch = raw.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>/);
  const email = (bracketMatch?.[1] || raw).trim().toLowerCase();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : '';
}

function stripControls(value: string) {
  return value.replace(/[\r\n\t]+/g, ' ').trim();
}

function uniqueRecipients(recipients: string[]) {
  return Array.from(new Set(recipients.map(cleanEmail).filter(Boolean)));
}

function encryptionKey() {
  const secret = process.env.COMPANY_EMAIL_SECRET
    || process.env.PAYMENT_INTEGRATION_SECRET
    || process.env.JWT_SECRET
    || 'bjjrats-dev-company-email';
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decryptSecret(value?: string | null) {
  if (!value) return null;
  if (!value.startsWith('v1:')) return value;
  const [, ivRaw, tagRaw, encryptedRaw] = value.split(':');
  if (!ivRaw || !tagRaw || !encryptedRaw) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function boolValue(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value === 'true';
}

function normalizeProvider(value: unknown): CompanyEmailSettings['provider'] {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'resend') return 'resend';
  if (normalized === 'webhook') return 'webhook';
  return 'log';
}

async function upsertSetting(name: string, value: string) {
  await db.insert(settings)
    .values({ key: name, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

async function deleteSetting(name: string) {
  await db.delete(settings).where(eq(settings.key, name));
}

async function loadMap() {
  const names = ['enabled', 'provider', 'from', 'resend_api_key', 'webhook_url', 'webhook_key'];
  const rows = await db.select().from(settings).where(inArray(settings.key, names.map(key)));
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key.replace(`${PREFIX}:`, '')] = row.value;
  return map;
}

export async function getCompanyEmailSettings(includeSecrets = false): Promise<CompanyEmailSettingsPrivate> {
  const map = await loadMap();
  const resendApiKey = decryptSecret(map.resend_api_key || process.env.RESEND_API_KEY);
  const webhookKey = decryptSecret(map.webhook_key || process.env.COMPANY_EMAIL_WEBHOOK_KEY || process.env.SUPERADMIN_EMAIL_API_KEY);
  const envEnabled = process.env.EMAIL_AUTOMATION_DISABLED === 'true' ? false : process.env.EMAIL_AUTOMATION_ENABLED !== 'false';

  return {
    enabled: boolValue(map.enabled, envEnabled),
    provider: normalizeProvider(map.provider || process.env.EMAIL_AUTOMATION_PROVIDER || process.env.SUPERADMIN_EMAIL_PROVIDER),
    from: normalizeSenderEmail(map.from || process.env.EMAIL_FROM) || 'no-reply@thebjjrats.com',
    hasResendApiKey: Boolean(resendApiKey),
    resendApiKeyLast4: resendApiKey ? resendApiKey.slice(-4) : null,
    webhookUrl: map.webhook_url || process.env.COMPANY_EMAIL_WEBHOOK_URL || process.env.SUPERADMIN_EMAIL_API_URL || '',
    hasWebhookKey: Boolean(webhookKey),
    webhookKeyLast4: webhookKey ? webhookKey.slice(-4) : null,
    resendApiKey: includeSecrets ? resendApiKey : null,
    webhookKey: includeSecrets ? webhookKey : null,
  };
}

export async function saveCompanyEmailSettings(input: Record<string, unknown>) {
  const updates = [
    upsertSetting(key('enabled'), String(input.enabled !== false)),
    upsertSetting(key('provider'), normalizeProvider(input.provider)),
  ];

  if (typeof input.from === 'string') {
    const from = normalizeSenderEmail(input.from);
    if (!from) throw new Error('Informe apenas um e-mail valido para o remetente.');
    updates.push(upsertSetting(key('from'), from));
  }

  if (typeof input.webhookUrl === 'string') {
    updates.push(upsertSetting(key('webhook_url'), input.webhookUrl.trim()));
  }

  const resendApiKey = typeof input.resendApiKey === 'string' ? input.resendApiKey.trim() : '';
  if (resendApiKey) {
    updates.push(upsertSetting(key('resend_api_key'), encryptSecret(resendApiKey)));
  } else if (input.clearResendApiKey === true) {
    updates.push(deleteSetting(key('resend_api_key')));
  }

  const webhookKey = typeof input.webhookKey === 'string' ? input.webhookKey.trim() : '';
  if (webhookKey) {
    updates.push(upsertSetting(key('webhook_key'), encryptSecret(webhookKey)));
  } else if (input.clearWebhookKey === true) {
    updates.push(deleteSetting(key('webhook_key')));
  }

  await Promise.all(updates);
  return getCompanyEmailSettings();
}

async function sendWithResend(payload: CompanyEmailPayload, recipients: string[], config: CompanyEmailSettingsPrivate): Promise<CompanyEmailResult> {
  const apiKey = config.resendApiKey;
  if (!apiKey) throw new Error('RESEND_API_KEY nao configurada.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: recipients,
      reply_to: payload.replyTo,
      subject: stripControls(payload.subject),
      text: payload.text,
      html: payload.html,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body?.message === 'string' ? body.message : 'Falha ao enviar e-mail via Resend.');
  }

  return { provider: 'resend', sent: true, recipients, providerResponse: body };
}

async function sendWithWebhook(payload: CompanyEmailPayload, recipients: string[], config: CompanyEmailSettingsPrivate): Promise<CompanyEmailResult> {
  const url = config.webhookUrl;
  if (!url) throw new Error('COMPANY_EMAIL_WEBHOOK_URL nao configurada.');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.webhookKey) headers.Authorization = `Bearer ${config.webhookKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: config.from,
      to: recipients,
      replyTo: payload.replyTo,
      subject: stripControls(payload.subject),
      text: payload.text,
      html: payload.html,
      metadata: payload.metadata || {},
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : 'Falha ao enviar e-mail via webhook.');
  }

  return { provider: 'webhook', sent: true, recipients, providerResponse: body };
}

function logEmail(payload: CompanyEmailPayload, recipients: string[]): CompanyEmailResult {
  console.info('[company-email] delivery disabled/log mode', {
    recipients,
    subject: stripControls(payload.subject),
    replyTo: payload.replyTo || null,
  });
  return { provider: 'log', sent: true, recipients };
}

export async function sendCompanyEmail(payload: CompanyEmailPayload): Promise<CompanyEmailResult> {
  const recipients = uniqueRecipients(payload.to);
  if (recipients.length === 0) {
    return { provider: 'log', sent: false, recipients: [] };
  }

  const config = await getCompanyEmailSettings(true);
  if (!config.enabled) {
    return { provider: 'log', sent: false, recipients };
  }

  if (config.provider === 'log') {
    return logEmail(payload, recipients);
  }

  if (config.provider === 'webhook') {
    return sendWithWebhook(payload, recipients, config);
  }

  if (config.provider === 'resend') {
    return sendWithResend(payload, recipients, config);
  }

  return logEmail(payload, recipients);
}
