import axios from 'axios';
import { X509Certificate, createHash, timingSafeEqual, verify as cryptoVerify } from 'node:crypto';

export type AppleSubscriptionStatus = 'active' | 'trial' | 'past_due' | 'cancelled' | 'expired';

export type AppleRejectionReason =
  | 'apple_status'
  | 'bundle_mismatch'
  | 'no_subscription'
  | 'unknown_product';

export interface AppleSubscriptionVerificationResult {
  isValid: boolean;
  status: AppleSubscriptionStatus;
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate?: Date;
  expiresDate?: Date;
  isTrial: boolean;
  isSandbox: boolean;
  bundleId?: string;
  rejectionReason?: AppleRejectionReason;
  appleStatus?: number;
  raw?: any;
}

const DEFAULT_BUNDLE_ID = 'com.thebjjrats.app.oficial';
const PRODUCTION_VERIFY_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_VERIFY_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

/**
 * SHA-256 do certificado "Apple Root CA - G3" (DER), publicado em
 * https://www.apple.com/certificateauthority/AppleRootCA-G3.cer (válido até 2039).
 */
const APPLE_ROOT_CA_G3_SHA256 = '63343ABFB89A6A03EBB57E9B3F5FA7BE7C4F5C756F3017B3A8C488C3653E9179';
/** OID 1.2.840.113635.100.6.11.1 — certificado folha de assinatura da App Store (DER) */
const OID_APP_STORE_LEAF = Buffer.from('060a2a864886f76364060b01', 'hex');
/** OID 1.2.840.113635.100.6.2.1 — intermediária Apple WWDR (DER) */
const OID_APPLE_WWDR_INTERMEDIATE = Buffer.from('060a2a864886f76364060201', 'hex');

/**
 * Bundle IDs aceitos. APPLE_APP_STORE_BUNDLE_ID aceita lista separada por vírgula
 * (útil enquanto o bundle ID nativo e o do Capacitor não estiverem unificados).
 */
export function getAppleBundleIds(): string[] {
  const raw = process.env.APPLE_APP_STORE_BUNDLE_ID || DEFAULT_BUNDLE_ID;
  const ids = raw.split(',').map((id) => id.trim()).filter(Boolean);
  return ids.length > 0 ? ids : [DEFAULT_BUNDLE_ID];
}

export function getAppleBundleId(): string {
  return getAppleBundleIds()[0];
}

export function getAppleSharedSecret(): string | undefined {
  return process.env.APPLE_SHARED_SECRET || process.env.APPLE_APP_STORE_SHARED_SECRET;
}

export function isAppleConfigured(): boolean {
  return Boolean(getAppleSharedSecret() || process.env.APPLE_KEY_ID);
}

function invalidResult(
  reason: AppleRejectionReason,
  isSandbox: boolean,
  extra: Partial<AppleSubscriptionVerificationResult> = {},
): AppleSubscriptionVerificationResult {
  return {
    isValid: false,
    status: 'expired',
    productId: '',
    transactionId: '',
    originalTransactionId: '',
    isTrial: false,
    isSandbox,
    rejectionReason: reason,
    ...extra,
  };
}

/**
 * Valida o recibo da App Store da Apple.
 * Testa inicialmente o endpoint de produção; se retornar status 21007,
 * faz o fallback automático para o ambiente Sandbox (TestFlight / Testes).
 *
 * Regras de segurança:
 * - O bundle_id do recibo precisa estar em getAppleBundleIds().
 * - Só considera assinaturas auto-renováveis (com expires_date_ms) — nunca inventa datas.
 * - Se `productIds` for informado, ignora transações de produtos desconhecidos.
 */
export async function verifyAppleReceipt(
  receiptData: string,
  options: { preferredSandbox?: boolean; productIds?: string[] } = {},
): Promise<AppleSubscriptionVerificationResult> {
  const { preferredSandbox = false, productIds } = options;
  const secret = getAppleSharedSecret();
  const cleanedReceipt = receiptData.trim().replace(/\s+/g, '');

  const payload: { 'receipt-data': string; password?: string; 'exclude-old-transactions'?: boolean } = {
    'receipt-data': cleanedReceipt,
    'exclude-old-transactions': false,
  };

  if (secret) {
    payload.password = secret;
  } else {
    console.warn('[AppleAppStore] APPLE_SHARED_SECRET não configurado — recibos de assinatura serão rejeitados (status 21004).');
  }

  const primaryUrl = preferredSandbox ? SANDBOX_VERIFY_URL : PRODUCTION_VERIFY_URL;

  let response: any;
  let isSandbox = preferredSandbox;

  try {
    const res = await axios.post(primaryUrl, payload, { timeout: 15000 });
    response = res.data;

    // Código 21007: Recibo de Sandbox enviado ao endpoint de produção
    if (response?.status === 21007) {
      console.log('[AppleAppStore] Recibo identificado como Sandbox (status 21007). Retentando no Sandbox...');
      const sandboxRes = await axios.post(SANDBOX_VERIFY_URL, payload, { timeout: 15000 });
      response = sandboxRes.data;
      isSandbox = true;
    }
  } catch (err: any) {
    console.error('[AppleAppStore] Erro ao comunicar com servidores da Apple:', err?.message || err);
    throw new Error('Falha ao validar recibo com a Apple App Store.');
  }

  if (response?.status !== 0) {
    console.warn('[AppleAppStore] Recibo rejeitado pela Apple com status:', response?.status);
    return invalidResult('apple_status', isSandbox, { appleStatus: response?.status });
  }

  // 1. O recibo precisa pertencer a este app
  const bundleId: string | undefined = response.receipt?.bundle_id;
  const allowedBundleIds = getAppleBundleIds();
  if (!bundleId || !allowedBundleIds.includes(bundleId)) {
    console.warn(`[AppleAppStore] bundle_id do recibo (${bundleId}) não está entre os aceitos: ${allowedBundleIds.join(', ')}`);
    return invalidResult('bundle_mismatch', isSandbox, { bundleId });
  }

  // 2. Apenas assinaturas auto-renováveis (possuem expires_date_ms)
  const receiptInfo: any[] = response.latest_receipt_info || response.receipt?.in_app || [];
  let subscriptionsInfo = Array.isArray(receiptInfo)
    ? receiptInfo.filter((item) => Number(item?.expires_date_ms) > 0)
    : [];

  if (subscriptionsInfo.length === 0) {
    return invalidResult('no_subscription', isSandbox, { bundleId });
  }

  if (productIds && productIds.length > 0) {
    subscriptionsInfo = subscriptionsInfo.filter((item) => productIds.includes(item.product_id));
    if (subscriptionsInfo.length === 0) {
      return invalidResult('unknown_product', isSandbox, { bundleId });
    }
  }

  // 3. Transação com a expiração mais recente
  const latest = [...subscriptionsInfo].sort(
    (a, b) => Number(b.expires_date_ms) - Number(a.expires_date_ms),
  )[0];

  const originalTransactionId: string = latest.original_transaction_id || latest.transaction_id;
  const transactionId: string = latest.transaction_id;
  const productId: string = latest.product_id;
  const isTrial = latest.is_trial_period === 'true' || latest.is_trial_period === true;

  const now = Date.now();
  const expiresMs = Number(latest.expires_date_ms);
  const purchaseMs = Number(latest.purchase_date_ms) || now;

  // Período de carência de cobrança (Billing Grace Period) informado pela Apple
  const renewalInfo: any[] = Array.isArray(response.pending_renewal_info) ? response.pending_renewal_info : [];
  const renewal = renewalInfo.find((r) => r?.original_transaction_id === originalTransactionId);
  const graceExpiresMs = Number(renewal?.grace_period_expires_date_ms) || 0;

  let status: AppleSubscriptionStatus;
  if (latest.cancellation_date_ms) {
    // Estornada / revogada pelo suporte da Apple
    status = 'cancelled';
  } else if (now > expiresMs) {
    status = graceExpiresMs > now ? 'past_due' : 'expired';
  } else if (isTrial) {
    status = 'trial';
  } else {
    status = 'active';
  }

  return {
    isValid: true,
    status,
    productId,
    transactionId,
    originalTransactionId,
    purchaseDate: new Date(purchaseMs),
    expiresDate: new Date(expiresMs),
    isTrial,
    isSandbox,
    bundleId,
    raw: latest,
  };
}

// ─── Verificação de JWS (App Store Server Notifications v2 / StoreKit 2) ─────

export class AppleSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppleSignatureError';
  }
}

function decodeJsonSegment(segment: string): any {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch {
    throw new AppleSignatureError('Segmento JWS com JSON inválido.');
  }
}

function isCertValidAt(cert: X509Certificate, at: number): boolean {
  return new Date(cert.validFrom).getTime() <= at && at <= new Date(cert.validTo).getTime();
}

/**
 * Verifica a assinatura de um JWS emitido pela Apple e retorna o payload.
 * - Cadeia x5c: folha → intermediária WWDR → Apple Root CA G3 (fingerprint fixado)
 * - OIDs de extensão da Apple na folha e na intermediária
 * - Validade dos certificados
 * - Assinatura ES256
 */
export function verifyAppleJws<T = any>(jws: unknown): T {
  if (typeof jws !== 'string') throw new AppleSignatureError('JWS ausente.');

  const parts = jws.split('.');
  if (parts.length !== 3) throw new AppleSignatureError('JWS malformado.');
  const [headerSegment, payloadSegment, signatureSegment] = parts;

  const header = decodeJsonSegment(headerSegment);
  if (header?.alg !== 'ES256') throw new AppleSignatureError(`Algoritmo JWS inesperado: ${header?.alg}`);
  if (!Array.isArray(header.x5c) || header.x5c.length < 3) {
    throw new AppleSignatureError('Cadeia de certificados x5c ausente ou incompleta.');
  }

  let leaf: X509Certificate;
  let intermediate: X509Certificate;
  let root: X509Certificate;
  try {
    [leaf, intermediate, root] = header.x5c
      .slice(0, 3)
      .map((cert: string) => new X509Certificate(Buffer.from(cert, 'base64')));
  } catch {
    throw new AppleSignatureError('Certificado x5c inválido.');
  }

  const rootFingerprint = createHash('sha256').update(root.raw).digest('hex').toUpperCase();
  if (rootFingerprint !== APPLE_ROOT_CA_G3_SHA256) {
    throw new AppleSignatureError('Certificado raiz não é a Apple Root CA - G3.');
  }

  const chainOk =
    intermediate.ca &&
    intermediate.checkIssued(root) &&
    intermediate.verify(root.publicKey) &&
    leaf.checkIssued(intermediate) &&
    leaf.verify(intermediate.publicKey);
  if (!chainOk) throw new AppleSignatureError('Cadeia de certificados inválida.');

  if (!leaf.raw.includes(OID_APP_STORE_LEAF) || !intermediate.raw.includes(OID_APPLE_WWDR_INTERMEDIATE)) {
    throw new AppleSignatureError('Certificados não são de assinatura da App Store.');
  }

  const now = Date.now();
  if (![leaf, intermediate, root].every((cert) => isCertValidAt(cert, now))) {
    throw new AppleSignatureError('Certificado fora do período de validade.');
  }

  const signatureOk = cryptoVerify(
    'sha256',
    Buffer.from(`${headerSegment}.${payloadSegment}`),
    { key: leaf.publicKey, dsaEncoding: 'ieee-p1363' },
    Buffer.from(signatureSegment, 'base64url'),
  );
  if (!signatureOk) throw new AppleSignatureError('Assinatura JWS inválida.');

  return decodeJsonSegment(payloadSegment) as T;
}

export interface AppleNotification {
  version: 1 | 2;
  notificationType: string;
  subtype?: string;
  notificationUUID?: string;
  environment?: string;
  originalTransactionId?: string;
  transactionId?: string;
  productId?: string;
  purchaseDate?: Date;
  expiresDate?: Date;
  revocationDate?: Date;
  isTrial?: boolean;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Verifica a autenticidade e decodifica a notificação recebida no webhook da Apple.
 * Lança AppleSignatureError se a notificação não for comprovadamente da Apple.
 */
export function verifyAndParseAppleNotification(body: any): AppleNotification {
  const allowedBundleIds = getAppleBundleIds();

  // App Store Server Notifications v2 (JWS assinado)
  if (body?.signedPayload) {
    const payload = verifyAppleJws<any>(body.signedPayload);
    const data = payload?.data || {};

    if (data.bundleId && !allowedBundleIds.includes(data.bundleId)) {
      throw new AppleSignatureError(`Notificação de outro app (bundleId=${data.bundleId}).`);
    }

    const notification: AppleNotification = {
      version: 2,
      notificationType: payload.notificationType || 'UNKNOWN',
      subtype: payload.subtype,
      notificationUUID: payload.notificationUUID,
      environment: data.environment,
    };

    if (data.signedTransactionInfo) {
      const tx = verifyAppleJws<any>(data.signedTransactionInfo);
      if (tx.bundleId && !allowedBundleIds.includes(tx.bundleId)) {
        throw new AppleSignatureError(`Transação de outro app (bundleId=${tx.bundleId}).`);
      }
      notification.originalTransactionId = tx.originalTransactionId;
      notification.transactionId = tx.transactionId;
      notification.productId = tx.productId;
      if (tx.purchaseDate) notification.purchaseDate = new Date(Number(tx.purchaseDate));
      if (tx.expiresDate) notification.expiresDate = new Date(Number(tx.expiresDate));
      if (tx.revocationDate) notification.revocationDate = new Date(Number(tx.revocationDate));
      notification.isTrial = tx.offerType === 1 && tx.offerDiscountType === 'FREE_TRIAL';
    }

    return notification;
  }

  // App Store Server Notifications v1 (legado): autenticado pelo shared secret no campo "password"
  const secret = getAppleSharedSecret();
  if (!secret || typeof body?.password !== 'string' || !safeEqual(body.password, secret)) {
    throw new AppleSignatureError('Notificação v1 sem shared secret válido.');
  }
  if (body?.bid && !allowedBundleIds.includes(body.bid)) {
    throw new AppleSignatureError(`Notificação v1 de outro app (bid=${body.bid}).`);
  }

  const candidates: any[] = [
    ...(Array.isArray(body?.unified_receipt?.latest_receipt_info) ? body.unified_receipt.latest_receipt_info : []),
    ...(body?.latest_receipt_info && !Array.isArray(body.latest_receipt_info) ? [body.latest_receipt_info] : []),
  ];
  const latest = candidates.sort((a, b) => Number(b?.expires_date_ms || 0) - Number(a?.expires_date_ms || 0))[0];

  return {
    version: 1,
    notificationType: body?.notification_type || 'UNKNOWN',
    environment: body?.environment,
    originalTransactionId: latest?.original_transaction_id || body?.original_transaction_id,
    transactionId: latest?.transaction_id,
    productId: latest?.product_id || body?.auto_renew_product_id,
    purchaseDate: latest?.purchase_date_ms ? new Date(Number(latest.purchase_date_ms)) : undefined,
    expiresDate: latest?.expires_date_ms ? new Date(Number(latest.expires_date_ms)) : undefined,
    revocationDate: latest?.cancellation_date_ms ? new Date(Number(latest.cancellation_date_ms)) : undefined,
    isTrial: latest?.is_trial_period === 'true',
  };
}
