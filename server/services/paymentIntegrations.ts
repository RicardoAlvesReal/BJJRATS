import crypto from 'crypto';
import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';

export type PaymentBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

export type PaymentIntegrationPublic = {
  provider: 'asaas';
  manualPaymentsEnabled: boolean;
  asaasEnabled: boolean;
  asaasSandbox: boolean;
  asaasBillingType: PaymentBillingType;
  hasAsaasApiKey: boolean;
  asaasApiKeyLast4: string | null;
  webhookToken: string;
  pixKey: string;
  pixQrCodeUrl: string;
};

export type PaymentIntegrationPrivate = PaymentIntegrationPublic & {
  asaasApiKey: string | null;
};

const PREFIX = 'payments';

function key(ownerUid: string, name: string) {
  return `owner:${ownerUid}:${PREFIX}:${name}`;
}

function encryptionKey() {
  const secret = process.env.PAYMENT_INTEGRATION_SECRET || process.env.JWT_SECRET || 'bjjrats-dev-payment-integrations';
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

function normalizeBillingType(value: unknown): PaymentBillingType {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'BOLETO') return 'BOLETO';
  if (normalized === 'CREDIT_CARD') return 'CREDIT_CARD';
  return 'PIX';
}

async function upsertSetting(name: string, value: string) {
  await db.insert(settings)
    .values({ key: name, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

async function deleteSetting(name: string) {
  await db.delete(settings).where(eq(settings.key, name));
}

async function loadMap(ownerUid: string) {
  const names = [
    'manual_enabled',
    'asaas_enabled',
    'asaas_sandbox',
    'asaas_billing_type',
    'asaas_api_key',
    'webhook_token',
    'pix_key',
    'pix_qr_code_url',
  ];
  const rows = await db.select().from(settings).where(inArray(settings.key, names.map(name => key(ownerUid, name))));
  const map: Record<string, string> = {};
  for (const row of rows) {
    const name = row.key.replace(`owner:${ownerUid}:${PREFIX}:`, '');
    map[name] = row.value;
  }
  return map;
}

export async function ensurePaymentWebhookToken(ownerUid: string) {
  const tokenKey = key(ownerUid, 'webhook_token');
  const [row] = await db.select().from(settings).where(eq(settings.key, tokenKey)).limit(1);
  if (row?.value) return row.value;
  const token = nanoid(32);
  await upsertSetting(tokenKey, token);
  return token;
}

export async function getPaymentIntegration(ownerUid: string, includeSecret = false): Promise<PaymentIntegrationPrivate> {
  const map = await loadMap(ownerUid);
  const apiKey = decryptSecret(map.asaas_api_key);
  const webhookToken = map.webhook_token || await ensurePaymentWebhookToken(ownerUid);

  return {
    provider: 'asaas',
    manualPaymentsEnabled: boolValue(map.manual_enabled, true),
    asaasEnabled: boolValue(map.asaas_enabled, false),
    asaasSandbox: boolValue(map.asaas_sandbox, true),
    asaasBillingType: normalizeBillingType(map.asaas_billing_type),
    hasAsaasApiKey: Boolean(apiKey),
    asaasApiKeyLast4: apiKey ? apiKey.slice(-4) : null,
    webhookToken,
    asaasApiKey: includeSecret ? apiKey : null,
    pixKey: map.pix_key || '',
    pixQrCodeUrl: map.pix_qr_code_url || '',
  };
}

export async function savePaymentIntegration(ownerUid: string, input: Record<string, unknown>) {
  const updates = [
    upsertSetting(key(ownerUid, 'manual_enabled'), String(input.manualPaymentsEnabled !== false)),
    upsertSetting(key(ownerUid, 'asaas_enabled'), String(input.asaasEnabled === true)),
    upsertSetting(key(ownerUid, 'asaas_sandbox'), String(input.asaasSandbox !== false)),
    upsertSetting(key(ownerUid, 'asaas_billing_type'), normalizeBillingType(input.asaasBillingType)),
  ];

  const apiKey = typeof input.asaasApiKey === 'string' ? input.asaasApiKey.trim() : '';
  if (apiKey) {
    updates.push(upsertSetting(key(ownerUid, 'asaas_api_key'), encryptSecret(apiKey)));
  } else if (input.clearAsaasApiKey === true) {
    updates.push(deleteSetting(key(ownerUid, 'asaas_api_key')));
  }

  if (typeof input.pixKey === 'string') updates.push(upsertSetting(key(ownerUid, 'pix_key'), input.pixKey));
  if (typeof input.pixQrCodeUrl === 'string') updates.push(upsertSetting(key(ownerUid, 'pix_qr_code_url'), input.pixQrCodeUrl));

  await Promise.all(updates);
  await ensurePaymentWebhookToken(ownerUid);
  return getPaymentIntegration(ownerUid);
}

export async function getAsaasCredentials(ownerUid: string) {
  const integration = await getPaymentIntegration(ownerUid, true);
  if (!integration.asaasEnabled || !integration.asaasApiKey) return null;
  return {
    apiKey: integration.asaasApiKey,
    sandbox: integration.asaasSandbox,
    billingType: integration.asaasBillingType,
  };
}

export function toPublicPaymentIntegration(integration: PaymentIntegrationPrivate): PaymentIntegrationPublic {
  const { asaasApiKey: _asaasApiKey, ...publicData } = integration;
  return publicData;
}
