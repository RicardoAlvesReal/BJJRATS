import { Router } from 'express';
import { eq, and, or, ne, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { subscriptions, plans } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  isAppleConfigured,
  getAppleBundleId,
  getAppleBundleIds,
  verifyAppleReceipt,
  verifyAndParseAppleNotification,
  AppleSignatureError,
  type AppleSubscriptionVerificationResult,
} from '../services/apple.js';
import { hasActiveAsaasBilling, retireAsaasSubscription } from '../services/storeMigration.js';

const router = Router();

// Mapeamento dos Product IDs da Apple App Store para os slugs de planos do BJJRats
export const APPLE_PRODUCT_MAP: Record<string, { slug: string; name: string }> = {
  plano_aluno_mensal: { slug: 'aluno', name: 'Plano Aluno' },
  plano_professor_mensal: { slug: 'professor', name: 'Plano Professor' },
  plano_academia_mensal: { slug: 'academia', name: 'Plano Academia' },
  'com.thebjjrats.aluno.mensal': { slug: 'aluno', name: 'Plano Aluno' },
  'com.thebjjrats.professor.mensal': { slug: 'professor', name: 'Plano Professor' },
  'com.thebjjrats.academia.mensal': { slug: 'academia', name: 'Plano Academia' },
  'com.thebjjrats.app.oficial.aluno': { slug: 'aluno', name: 'Plano Aluno' },
  'com.thebjjrats.app.oficial.professor': { slug: 'professor', name: 'Plano Professor' },
  'com.thebjjrats.app.oficial.academia': { slug: 'academia', name: 'Plano Academia' },
};

const SUPPORTED_PRODUCT_IDS = Object.keys(APPLE_PRODUCT_MAP);

const REJECTION_MESSAGES: Record<string, string> = {
  apple_status: 'Recibo rejeitado pela Apple App Store.',
  bundle_mismatch: 'Este recibo não pertence ao app BJJRats.',
  no_subscription: 'Nenhuma assinatura encontrada no recibo da Apple.',
  unknown_product: 'O produto comprado não corresponde a nenhum plano do BJJRats.',
};

type Plan = typeof plans.$inferSelect;
type Subscription = typeof subscriptions.$inferSelect;

/** O plano é derivado SOMENTE do productId verificado pela Apple — nunca de dados do cliente. */
async function resolvePlanForProduct(productId: string | undefined): Promise<Plan | null> {
  const mapped = productId ? APPLE_PRODUCT_MAP[productId] : undefined;
  if (!mapped) return null;
  const [found] = await db.select().from(plans).where(eq(plans.slug, mapped.slug)).limit(1);
  return found || null;
}

/** Impede que uma mesma compra da Apple ative várias contas BJJRats. */
async function findLinkedToOtherUser(originalTransactionId: string, userId: string): Promise<Subscription | null> {
  const [other] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.appleOriginalTransactionId, originalTransactionId),
        ne(subscriptions.userUid, userId),
      ),
    )
    .limit(1);
  return other || null;
}

async function upsertAppleSubscription(
  userId: string,
  verification: AppleSubscriptionVerificationResult,
  plan: Plan,
): Promise<Subscription> {
  const values = {
    planId: plan.id,
    status: verification.status,
    provider: 'apple',
    appleOriginalTransactionId: verification.originalTransactionId,
    appleTransactionId: verification.transactionId,
    appleProductId: verification.productId,
    currentPeriodStart: verification.purchaseDate ?? new Date(),
    currentPeriodEnd: verification.expiresDate!,
    trialEndsAt: verification.status === 'trial' ? verification.expiresDate! : null,
    cancelledAt: null,
  };

  // 1. Assinatura já vinculada a esta compra da Apple
  let existing: Subscription | undefined = (
    await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userUid, userId),
          eq(subscriptions.appleOriginalTransactionId, verification.originalTransactionId),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)
  )[0];

  // 2. Senão, a assinatura corrente do usuário
  if (!existing) {
    [existing] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userUid, userId),
          or(
            eq(subscriptions.status, 'active'),
            eq(subscriptions.status, 'trial'),
            eq(subscriptions.status, 'past_due'),
            eq(subscriptions.status, 'pending'),
          ),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
  }

  // 3. Usuário pagava pelo Asaas: encerra a cobrança recorrente lá e arquiva o registro antigo
  //    (evita cobrança em duplicidade e que webhooks do Asaas alterem a assinatura da Apple).
  if (existing && existing.asaasId && existing.provider !== 'apple') {
    await retireAsaasSubscription(existing, 'apple');
    existing = undefined;
  }

  if (existing !== undefined) {
    const activeSub: Subscription = existing;
    const [updated] = await db
      .update(subscriptions)
      .set(values)
      .where(eq(subscriptions.id, activeSub.id))
      .returning();
    console.log(`[AppleAppStore] Assinatura ${activeSub.id} atualizada via Apple para usuário ${userId}`);
    return updated;
  }

  const [created] = await db
    .insert(subscriptions)
    .values({ id: nanoid(), userUid: userId, ...values })
    .returning();
  console.log(`[AppleAppStore] Nova assinatura ${created.id} criada via Apple para usuário ${userId}`);
  return created;
}

function serializeSubscription(sub: Subscription, plan: Plan | null) {
  return {
    id: sub.id,
    status: sub.status,
    provider: 'apple',
    currentPeriodEnd: sub.currentPeriodEnd,
    plan: plan ? { id: plan.id, name: plan.name, price: plan.price } : null,
  };
}

// ─── GET /api/subscriptions/apple/status ─────────────────────────────────────
router.get('/status', (_req, res) => {
  res.json({
    configured: isAppleConfigured(),
    bundleId: getAppleBundleId(),
    bundleIds: getAppleBundleIds(),
    supportedProducts: SUPPORTED_PRODUCT_IDS,
  });
});

// ─── POST /api/subscriptions/apple/verify ────────────────────────────────────
// Valida o recibo gerado no iOS via Apple In-App Purchase e ativa o plano.
// O plano é determinado exclusivamente pelo productId presente no recibo verificado.
router.post('/verify', requireAuth, async (req: AuthRequest, res) => {
  const { receiptData } = req.body as { receiptData?: string };

  if (!receiptData?.trim()) {
    res.status(400).json({ error: 'receiptData é obrigatório para validação com a Apple.', code: 'apple_receipt_missing' });
    return;
  }

  try {
    const verification = await verifyAppleReceipt(receiptData, { productIds: SUPPORTED_PRODUCT_IDS });

    if (!verification.isValid) {
      res.status(400).json({
        error: REJECTION_MESSAGES[verification.rejectionReason || 'apple_status'],
        code: `apple_${verification.rejectionReason || 'rejected'}`,
        appleStatus: verification.appleStatus,
      });
      return;
    }

    if (verification.status === 'expired' || verification.status === 'cancelled') {
      res.status(400).json({
        error: verification.status === 'cancelled'
          ? 'Esta assinatura foi estornada/cancelada pela Apple.'
          : 'Esta assinatura da Apple está expirada.',
        code: 'apple_subscription_inactive',
        status: verification.status,
      });
      return;
    }

    const plan = await resolvePlanForProduct(verification.productId);
    if (!plan) {
      console.error(`[AppleAppStore] Plano não encontrado para o produto ${verification.productId}`);
      res.status(500).json({ error: 'Plano correspondente à compra não está cadastrado no sistema.', code: 'apple_plan_not_found' });
      return;
    }

    const linkedElsewhere = await findLinkedToOtherUser(verification.originalTransactionId, req.userId!);
    if (linkedElsewhere) {
      console.warn(
        `[AppleAppStore] originalTransactionId ${verification.originalTransactionId} já vinculado ao usuário ` +
        `${linkedElsewhere.userUid}; tentativa do usuário ${req.userId}`,
      );
      res.status(409).json({
        error: 'Esta compra da Apple já está vinculada a outra conta BJJRats.',
        code: 'apple_purchase_linked_to_other_account',
      });
      return;
    }

    const saved = await upsertAppleSubscription(req.userId!, verification, plan);

    res.json({
      success: true,
      verified: true,
      status: verification.status,
      isSandbox: verification.isSandbox,
      subscription: serializeSubscription(saved, plan),
    });
  } catch (error: any) {
    console.error('[AppleAppStore] Erro ao verificar recibo:', error);
    res.status(502).json({
      error: error?.message || 'Erro interno ao validar recibo com a Apple App Store.',
      code: 'apple_verify_failed',
    });
  }
});

// ─── POST /api/subscriptions/apple/restore ───────────────────────────────────
// Restaura compras anteriores efetuadas na conta Apple (Obrigatório Apple Review)
router.post('/restore', requireAuth, async (req: AuthRequest, res) => {
  const { receiptData } = req.body as { receiptData?: string };

  if (!receiptData?.trim()) {
    res.status(400).json({ error: 'receiptData é obrigatório para restaurar compras.', code: 'apple_receipt_missing' });
    return;
  }

  try {
    const verification = await verifyAppleReceipt(receiptData, { productIds: SUPPORTED_PRODUCT_IDS });

    if (!verification.isValid || verification.status === 'expired' || verification.status === 'cancelled') {
      res.json({
        restored: false,
        message: 'Nenhuma assinatura ativa encontrada para restaurar.',
      });
      return;
    }

    const plan = await resolvePlanForProduct(verification.productId);
    if (!plan) {
      console.error(`[AppleAppStore] Plano não encontrado para o produto ${verification.productId}`);
      res.status(500).json({ error: 'Plano correspondente à compra não está cadastrado no sistema.', code: 'apple_plan_not_found' });
      return;
    }

    const linkedElsewhere = await findLinkedToOtherUser(verification.originalTransactionId, req.userId!);
    if (linkedElsewhere) {
      res.status(409).json({
        restored: false,
        error: 'Esta compra da Apple já está vinculada a outra conta BJJRats. Entre com a conta original para usá-la.',
        code: 'apple_purchase_linked_to_other_account',
      });
      return;
    }

    const saved = await upsertAppleSubscription(req.userId!, verification, plan);

    res.json({
      restored: true,
      subscription: serializeSubscription(saved, plan),
    });
  } catch (err: any) {
    console.error('[AppleAppStore] Erro ao restaurar compras:', err);
    res.status(502).json({ error: err?.message || 'Falha ao restaurar compras na Apple.', code: 'apple_restore_failed' });
  }
});

// ─── POST /api/subscriptions/apple/webhook ───────────────────────────────────
// Recebe App Store Server Notifications. v2: JWS verificado criptograficamente.
// v1 (legado): aceito somente com o shared secret correto.
router.post('/webhook', async (req, res) => {
  let notification;
  try {
    notification = verifyAndParseAppleNotification(req.body);
  } catch (err: any) {
    if (err instanceof AppleSignatureError) {
      console.warn(`[AppleAppStore Webhook] Notificação rejeitada: ${err.message} (ip=${req.ip})`);
      res.status(401).json({ error: 'Notificação não autenticada.' });
      return;
    }
    console.error('[AppleAppStore Webhook] Erro ao decodificar notificação:', err);
    res.status(400).json({ error: 'Notificação inválida.' });
    return;
  }

  const {
    version, notificationType, subtype, originalTransactionId, transactionId,
    productId, purchaseDate, expiresDate, revocationDate, isTrial, environment,
  } = notification;

  console.log(
    `[AppleAppStore Webhook] v${version} type=${notificationType}${subtype ? `/${subtype}` : ''} ` +
    `env=${environment ?? '-'} txId=${originalTransactionId ?? '-'}`,
  );

  try {
    if (!originalTransactionId) {
      // Ex.: notificação TEST, CONSUMPTION_REQUEST etc.
      res.json({ received: true });
      return;
    }

    const [localSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.appleOriginalTransactionId, originalTransactionId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!localSub) {
      console.log(`[AppleAppStore Webhook] Nenhuma assinatura local para txId=${originalTransactionId}.`);
      res.json({ received: true });
      return;
    }

    switch (notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW':
      case 'OFFER_REDEEMED':
      case 'INTERACTIVE_RENEWAL': // v1
      case 'DID_RECOVER': {       // v1
        if (!expiresDate) {
          console.warn(`[AppleAppStore Webhook] ${notificationType} sem expiresDate — ignorado.`);
          break;
        }
        // Proteção contra notificações fora de ordem
        if (localSub.currentPeriodEnd && expiresDate.getTime() < new Date(localSub.currentPeriodEnd).getTime()) {
          console.log(`[AppleAppStore Webhook] ${notificationType} com expiração anterior à atual — ignorado.`);
          break;
        }

        const plan = productId && productId !== localSub.appleProductId
          ? await resolvePlanForProduct(productId)
          : null;
        const status = expiresDate.getTime() < Date.now() ? 'expired' : isTrial ? 'trial' : 'active';

        await db
          .update(subscriptions)
          .set({
            status,
            currentPeriodStart: purchaseDate ?? new Date(),
            currentPeriodEnd: expiresDate,
            trialEndsAt: status === 'trial' ? expiresDate : null,
            cancelledAt: null,
            ...(transactionId ? { appleTransactionId: transactionId } : {}),
            ...(plan ? { planId: plan.id, appleProductId: productId } : {}),
          })
          .where(eq(subscriptions.id, localSub.id));

        console.log(`[AppleAppStore Webhook] Assinatura ${localSub.id} → ${status} até ${expiresDate.toISOString()}.`);
        break;
      }

      case 'DID_FAIL_TO_RENEW':
        await db.update(subscriptions).set({ status: 'past_due' }).where(eq(subscriptions.id, localSub.id));
        console.log(`[AppleAppStore Webhook] Assinatura ${localSub.id} em atraso (past_due${subtype ? `, ${subtype}` : ''}).`);
        break;

      case 'EXPIRED':
      case 'GRACE_PERIOD_EXPIRED':
        await db.update(subscriptions).set({ status: 'expired' }).where(eq(subscriptions.id, localSub.id));
        console.log(`[AppleAppStore Webhook] Assinatura ${localSub.id} expirada.`);
        break;

      case 'REFUND':
      case 'REVOKE':
      case 'CANCEL': // v1: estorno pelo suporte da Apple
        await db
          .update(subscriptions)
          .set({ status: 'cancelled', cancelledAt: revocationDate ?? new Date() })
          .where(eq(subscriptions.id, localSub.id));
        console.log(`[AppleAppStore Webhook] Assinatura ${localSub.id} cancelada/estornada.`);
        break;

      case 'DID_CHANGE_RENEWAL_STATUS':
      case 'DID_CHANGE_RENEWAL_PREF':
        // O acesso continua até o fim do período; EXPIRED/DID_RENEW chegará depois.
        console.log(`[AppleAppStore Webhook] ${notificationType}${subtype ? `/${subtype}` : ''} registrado para ${localSub.id}.`);
        break;

      default:
        console.log(`[AppleAppStore Webhook] Tipo ${notificationType} sem ação.`);
    }

    res.json({ received: true });
  } catch (err: any) {
    // 5xx faz a Apple reenviar a notificação
    console.error('[AppleAppStore Webhook] Erro ao processar evento:', err);
    res.status(500).json({ error: 'Erro ao processar notificação da Apple.' });
  }
});

export default router;
