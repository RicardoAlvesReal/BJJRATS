import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export interface GoogleSubscriptionVerificationResult {
  isValid: boolean;
  status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'expired' | 'pending';
  productId: string;
  orderId?: string;
  startTime?: Date;
  expiryTime?: Date;
  autoRenewing: boolean;
  rawState?: string;
  acknowledgementState?: string;
}

export interface GooglePubSubNotification {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    version: string;
    notificationType: number; // 1: RECOVERED, 2: RENEWED, 3: CANCELED, 4: PURCHASED, 5: ON_HOLD, 6: IN_GRACE_PERIOD, 7: RESTARTED, 8: PRICE_CHANGE_CONFIRMED, 9: DEFERRED, 10: PAUSED, 12: REVOKED, 13: EXPIRED
    purchaseToken: string;
    subscriptionId: string;
  };
  testNotification?: {
    version: string;
  };
}

const DEFAULT_PACKAGE_NAME = 'com.thebjjrats.app.oficial';

export function getGooglePlayPackageName(): string {
  return process.env.GOOGLE_PLAY_PACKAGE_NAME || DEFAULT_PACKAGE_NAME;
}

/**
 * Carrega as credenciais da Service Account a partir de:
 * 1. JSON em GOOGLE_PLAY_SERVICE_ACCOUNT_KEY
 * 2. Caminho de arquivo em GOOGLE_PLAY_SERVICE_ACCOUNT_FILE
 * 3. Par GOOGLE_PLAY_CLIENT_EMAIL + GOOGLE_PLAY_PRIVATE_KEY
 */
function getGoogleAuthClient() {
  const jsonKey = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;
  const filePath = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE;
  const clientEmail = process.env.GOOGLE_PLAY_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PLAY_PRIVATE_KEY;

  let credentials: { client_email?: string; private_key?: string } | undefined;

  if (jsonKey) {
    try {
      credentials = JSON.parse(jsonKey);
    } catch (e) {
      console.error('[GooglePlay] Falha ao fazer parse de GOOGLE_PLAY_SERVICE_ACCOUNT_KEY JSON:', e);
    }
  } else if (filePath) {
    try {
      const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
      if (fs.existsSync(resolved)) {
        const fileContent = fs.readFileSync(resolved, 'utf8');
        credentials = JSON.parse(fileContent);
      } else {
        console.warn(`[GooglePlay] Arquivo de credenciais não encontrado: ${resolved}`);
      }
    } catch (e) {
      console.error('[GooglePlay] Falha ao ler GOOGLE_PLAY_SERVICE_ACCOUNT_FILE:', e);
    }
  } else if (clientEmail && privateKey) {
    credentials = {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    };
  }

  if (!credentials?.client_email || !credentials?.private_key) {
    return null;
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
}

export function isGooglePlayConfigured(): boolean {
  return getGoogleAuthClient() !== null;
}

/**
 * Valida a compra de assinatura com a API do Google Play (Subscriptions v2 / v1)
 * e realiza acknowledgement automático caso ainda não tenha sido feito.
 */
export async function verifyGoogleSubscription(
  token: string,
  productId?: string,
): Promise<GoogleSubscriptionVerificationResult> {
  const auth = getGoogleAuthClient();
  const packageName = getGooglePlayPackageName();

  if (!auth) {
    throw new Error('Google Play API não configurada. Defina as credenciais da Service Account no ambiente.');
  }

  const playApi = google.androidpublisher({ version: 'v3', auth });

  // 1. Tentar via Subscriptions v2 (API moderna do Google Play)
  try {
    const v2Res = await playApi.purchases.subscriptionsv2.get({
      packageName,
      token,
    });

    const data = v2Res.data;
    if (data) {
      const lineItem = data.lineItems?.[0];
      const resolvedProductId = lineItem?.productId || productId || '';
      const orderId = data.latestOrderId || undefined;
      const state = data.subscriptionState;

      // Status mapping conforme documentação oficial:
      // SUBSCRIPTION_STATE_PENDING, SUBSCRIPTION_STATE_ACTIVE, SUBSCRIPTION_STATE_PAUSED,
      // SUBSCRIPTION_STATE_IN_GRACE_PERIOD, SUBSCRIPTION_STATE_ON_HOLD,
      // SUBSCRIPTION_STATE_CANCELED, SUBSCRIPTION_STATE_EXPIRED
      let status: GoogleSubscriptionVerificationResult['status'] = 'expired';
      let isValid = false;

      if (state === 'SUBSCRIPTION_STATE_ACTIVE') {
        status = 'active';
        isValid = true;
      } else if (state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') {
        status = 'past_due';
        isValid = true;
      } else if (state === 'SUBSCRIPTION_STATE_ON_HOLD' || state === 'SUBSCRIPTION_STATE_PAUSED') {
        status = 'past_due';
        isValid = false;
      } else if (state === 'SUBSCRIPTION_STATE_PENDING') {
        status = 'pending';
        isValid = false;
      } else if (state === 'SUBSCRIPTION_STATE_CANCELED') {
        // Usuário cancelou a renovação, mas ainda pode ter tempo restante até o vencimento
        const expiryDate = lineItem?.expiryTime ? new Date(lineItem.expiryTime) : undefined;
        if (expiryDate && expiryDate.getTime() > Date.now()) {
          status = 'active';
          isValid = true;
        } else {
          status = 'cancelled';
          isValid = false;
        }
      }

      const startTime = data.startTime ? new Date(data.startTime) : undefined;
      const expiryTime = lineItem?.expiryTime ? new Date(lineItem.expiryTime) : undefined;
      const autoRenewing = Boolean(lineItem?.autoRenewingPlan?.autoRenewEnabled);

      // Confirmar/reconhecer compra se ainda pendente
      if (
        data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING_ACKNOWLEDGE' &&
        resolvedProductId
      ) {
        try {
          await playApi.purchases.subscriptions.acknowledge({
            packageName,
            subscriptionId: resolvedProductId,
            token,
            requestBody: {},
          });
          console.log(`[GooglePlay] Assinatura ${resolvedProductId} confirmada (acknowledged) com sucesso.`);
        } catch (ackErr) {
          console.warn('[GooglePlay] Aviso ao tentar acknowledge subscription:', ackErr);
        }
      }

      return {
        isValid,
        status,
        productId: resolvedProductId,
        orderId,
        startTime,
        expiryTime,
        autoRenewing,
        rawState: state || undefined,
        acknowledgementState: data.acknowledgementState || undefined,
      };
    }
  } catch (v2Err: any) {
    console.warn('[GooglePlay] Subscriptions v2 fallback para v1:', v2Err?.message || v2Err);
  }

  // 2. Fallback para Subscriptions v1 se v2 falhar e tivermos o productId
  if (!productId) {
    throw new Error('Não foi possível validar a assinatura sem o productId no fallback v1.');
  }

  const v1Res = await playApi.purchases.subscriptions.get({
    packageName,
    subscriptionId: productId,
    token,
  });

  const v1Data = v1Res.data;
  const expiryMillis = Number(v1Data.expiryTimeMillis || 0);
  const expiryTime = expiryMillis ? new Date(expiryMillis) : undefined;
  const startTimeMillis = Number(v1Data.startTimeMillis || 0);
  const startTime = startTimeMillis ? new Date(startTimeMillis) : undefined;
  const isExpired = expiryTime ? expiryTime.getTime() <= Date.now() : true;
  const autoRenewing = Boolean(v1Data.autoRenewing);

  let status: GoogleSubscriptionVerificationResult['status'] = isExpired ? 'expired' : 'active';
  let isValid = !isExpired;

  if (v1Data.paymentState === 0) {
    status = 'pending';
    isValid = false;
  } else if (v1Data.paymentState === 2) {
    status = 'trial';
    isValid = !isExpired;
  } else if (v1Data.cancelReason !== undefined && isExpired) {
    status = 'cancelled';
    isValid = false;
  }

  // Acknowledge v1
  if (v1Data.acknowledgementState === 0) {
    try {
      await playApi.purchases.subscriptions.acknowledge({
        packageName,
        subscriptionId: productId,
        token,
        requestBody: {},
      });
      console.log(`[GooglePlay] Assinatura v1 ${productId} confirmada (acknowledged).`);
    } catch (ackErr) {
      console.warn('[GooglePlay] Falha ao confirmar assinatura v1:', ackErr);
    }
  }

  return {
    isValid,
    status,
    productId,
    orderId: v1Data.orderId || undefined,
    startTime,
    expiryTime,
    autoRenewing,
    acknowledgementState: v1Data.acknowledgementState === 1 ? 'ACKNOWLEDGED' : 'PENDING',
  };
}

/**
 * Decodifica uma mensagem de webhook do Google Cloud Pub/Sub (RTDN)
 */
export function parsePubSubNotification(body: any): GooglePubSubNotification | null {
  try {
    if (!body?.message?.data) return null;
    const decoded = Buffer.from(body.message.data, 'base64').toString('utf8');
    return JSON.parse(decoded) as GooglePubSubNotification;
  } catch (err) {
    console.error('[GooglePlay] Erro ao decodificar notificação Pub/Sub:', err);
    return null;
  }
}
