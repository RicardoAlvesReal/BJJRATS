import axios from 'axios';

export interface AppleSubscriptionVerificationResult {
  isValid: boolean;
  status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'expired';
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate?: Date;
  expiresDate?: Date;
  isTrial: boolean;
  isSandbox: boolean;
  raw?: any;
}

const DEFAULT_BUNDLE_ID = 'com.thebjjrats.app.oficial';
const PRODUCTION_VERIFY_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_VERIFY_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

export function getAppleBundleId(): string {
  return process.env.APPLE_APP_STORE_BUNDLE_ID || DEFAULT_BUNDLE_ID;
}

export function getAppleSharedSecret(): string | undefined {
  return process.env.APPLE_SHARED_SECRET || process.env.APPLE_APP_STORE_SHARED_SECRET;
}

export function isAppleConfigured(): boolean {
  return Boolean(getAppleSharedSecret() || process.env.APPLE_KEY_ID);
}

/**
 * Valida o recibo da App Store da Apple.
 * Testa inicialmente o endpoint de produção; se retornar status 21007,
 * faz o fallback automático para o ambiente Sandbox (TestFlight / Testes).
 */
export async function verifyAppleReceipt(
  receiptData: string,
  preferredSandbox = false
): Promise<AppleSubscriptionVerificationResult> {
  const secret = getAppleSharedSecret();
  const cleanedReceipt = receiptData.trim().replace(/\s+/g, '');

  const payload: { 'receipt-data': string; password?: string; 'exclude-old-transactions'?: boolean } = {
    'receipt-data': cleanedReceipt,
    'exclude-old-transactions': false,
  };

  if (secret) {
    payload.password = secret;
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
    return {
      isValid: false,
      status: 'expired',
      productId: '',
      transactionId: '',
      originalTransactionId: '',
      isTrial: false,
      isSandbox,
      raw: response,
    };
  }

  // Coleta as transações mais recentes da assinatura
  const latestReceiptInfo = response.latest_receipt_info || response.receipt?.in_app || [];
  if (!Array.isArray(latestReceiptInfo) || latestReceiptInfo.length === 0) {
    throw new Error('Nenhuma informação de assinatura encontrada no recibo da Apple.');
  }

  // Ordena pela data de expiração mais recente
  const sorted = [...latestReceiptInfo].sort((a, b) => {
    const timeA = Number(a.expires_date_ms || a.purchase_date_ms || 0);
    const timeB = Number(b.expires_date_ms || b.purchase_date_ms || 0);
    return timeB - timeA;
  });

  const latest = sorted[0];
  const originalTransactionId = latest.original_transaction_id || latest.transaction_id;
  const transactionId = latest.transaction_id;
  const productId = latest.product_id;
  const isTrial = latest.is_trial_period === 'true' || latest.is_trial_period === true;

  const now = Date.now();
  const expiresMs = Number(latest.expires_date_ms) || (now + 30 * 86400000);
  const purchaseMs = Number(latest.purchase_date_ms) || now;

  let status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'expired' = 'active';

  // Se foi cancelado expressamente pelo suporte da Apple
  if (latest.cancellation_date_ms) {
    status = 'cancelled';
  } else if (now > expiresMs) {
    status = 'expired';
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
    raw: latest,
  };
}

/**
 * Decodifica o payload recebido do webhook da Apple (App Store Server Notifications)
 */
export function parseAppleNotification(body: any): {
  notificationType: string;
  subtype?: string;
  originalTransactionId?: string;
  productId?: string;
  expiresDate?: Date;
} {
  // App Store Server Notifications v2 (JWT JWS payload)
  if (body?.signedPayload) {
    try {
      const parts = body.signedPayload.split('.');
      if (parts.length >= 2) {
        const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        const notificationType = decodedPayload.notificationType || 'UNKNOWN';
        const subtype = decodedPayload.subtype;

        let originalTransactionId: string | undefined;
        let productId: string | undefined;
        let expiresDate: Date | undefined;

        // Decodifica a transação se presente no payload
        if (decodedPayload.data?.signedTransactionInfo) {
          const txParts = decodedPayload.data.signedTransactionInfo.split('.');
          if (txParts.length >= 2) {
            const txData = JSON.parse(Buffer.from(txParts[1], 'base64').toString('utf8'));
            originalTransactionId = txData.originalTransactionId;
            productId = txData.productId;
            if (txData.expiresDate) {
              expiresDate = new Date(Number(txData.expiresDate));
            }
          }
        }

        return { notificationType, subtype, originalTransactionId, productId, expiresDate };
      }
    } catch (e) {
      console.error('[AppleAppStore Webhook] Erro ao decodificar signedPayload v2:', e);
    }
  }

  // App Store Server Notifications v1 fallback
  const notificationType = body?.notification_type || body?.notificationType || 'UNKNOWN';
  const latestInfo = body?.latest_receipt_info;
  const originalTransactionId = latestInfo?.original_transaction_id || body?.original_transaction_id;
  const productId = latestInfo?.product_id;
  const expiresDate = latestInfo?.expires_date_ms ? new Date(Number(latestInfo.expires_date_ms)) : undefined;

  return { notificationType, originalTransactionId, productId, expiresDate };
}
