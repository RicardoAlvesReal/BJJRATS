import { Router } from 'express';
import { eq, and, or, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { subscriptions, plans } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  isAppleConfigured,
  getAppleBundleId,
  verifyAppleReceipt,
  parseAppleNotification,
} from '../services/apple.js';

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

// ─── GET /api/subscriptions/apple/status ─────────────────────────────────────
router.get('/status', (_req, res) => {
  res.json({
    configured: isAppleConfigured(),
    bundleId: getAppleBundleId(),
    supportedProducts: Object.keys(APPLE_PRODUCT_MAP),
  });
});

// ─── POST /api/subscriptions/apple/verify ────────────────────────────────────
// Valida o recibo gerado no iOS via Apple In-App Purchase e ativa o plano
router.post('/verify', requireAuth, async (req: AuthRequest, res) => {
  const { receiptData, productId, planId, transactionId } = req.body as {
    receiptData?: string;
    productId?: string;
    planId?: string;
    transactionId?: string;
  };

  if (!receiptData?.trim()) {
    res.status(400).json({ error: 'receiptData é obrigatório para validação com a Apple.' });
    return;
  }

  try {
    // 1. Valida na Apple App Store
    const verification = await verifyAppleReceipt(receiptData);

    if (!verification.isValid) {
      res.status(400).json({
        error: 'Recibo rejeitado ou expirado na Apple App Store.',
        details: verification,
      });
      return;
    }

    const effectiveProductId = verification.productId || productId || '';

    // 2. Localiza o plano no sistema
    let targetPlan: typeof plans.$inferSelect | null = null;
    if (planId) {
      const [found] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
      targetPlan = found || null;
    }

    if (!targetPlan && effectiveProductId && APPLE_PRODUCT_MAP[effectiveProductId]) {
      const mappedSlug = APPLE_PRODUCT_MAP[effectiveProductId].slug;
      const [found] = await db.select().from(plans).where(eq(plans.slug, mappedSlug)).limit(1);
      targetPlan = found || null;
    }

    if (!targetPlan && effectiveProductId) {
      const [found] = await db
        .select()
        .from(plans)
        .where(or(eq(plans.slug, effectiveProductId), eq(plans.id, effectiveProductId)))
        .limit(1);
      targetPlan = found || null;
    }

    if (!targetPlan) {
      const [defaultPlan] = await db.select().from(plans).where(eq(plans.isActive, true)).limit(1);
      targetPlan = defaultPlan || null;
    }

    if (!targetPlan) {
      res.status(404).json({ error: 'Plano correspondente não encontrado no sistema.' });
      return;
    }

    const now = new Date();
    const periodStart = verification.purchaseDate || now;
    const periodEnd = verification.expiresDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 3. Verifica se o usuário já tem assinatura
    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userUid, req.userId!),
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

    let savedSubscription: typeof subscriptions.$inferSelect;

    if (existingSub) {
      const [updated] = await db
        .update(subscriptions)
        .set({
          planId: targetPlan.id,
          status: verification.status,
          provider: 'apple',
          appleOriginalTransactionId: verification.originalTransactionId,
          appleTransactionId: verification.transactionId || transactionId,
          appleProductId: effectiveProductId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        })
        .where(eq(subscriptions.id, existingSub.id))
        .returning();

      savedSubscription = updated;
      console.log(`[AppleAppStore] Assinatura existente ${existingSub.id} atualizada via Apple para usuário ${req.userId}`);
    } else {
      const newSubId = nanoid();
      const [created] = await db
        .insert(subscriptions)
        .values({
          id: newSubId,
          userUid: req.userId!,
          planId: targetPlan.id,
          status: verification.status,
          provider: 'apple',
          appleOriginalTransactionId: verification.originalTransactionId,
          appleTransactionId: verification.transactionId || transactionId,
          appleProductId: effectiveProductId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        })
        .returning();

      savedSubscription = created;
      console.log(`[AppleAppStore] Nova assinatura ${newSubId} criada via Apple para usuário ${req.userId}`);
    }

    res.json({
      success: true,
      verified: true,
      status: verification.status,
      isSandbox: verification.isSandbox,
      subscription: {
        id: savedSubscription.id,
        status: savedSubscription.status,
        provider: 'apple',
        currentPeriodEnd: savedSubscription.currentPeriodEnd,
        plan: {
          id: targetPlan.id,
          name: targetPlan.name,
          price: targetPlan.price,
        },
      },
    });
  } catch (error: any) {
    console.error('[AppleAppStore] Erro ao verificar recibo:', error);
    res.status(500).json({
      error: error?.message || 'Erro interno ao validar recibo com a Apple App Store.',
    });
  }
});

// ─── POST /api/subscriptions/apple/restore ───────────────────────────────────
// Restaura compras anteriores efetuadas na conta Apple (Obrigatório Apple Review)
router.post('/restore', requireAuth, async (req: AuthRequest, res) => {
  const { receiptData } = req.body as { receiptData?: string };

  if (!receiptData?.trim()) {
    res.status(400).json({ error: 'receiptData é obrigatório para restaurar compras.' });
    return;
  }

  try {
    const verification = await verifyAppleReceipt(receiptData);

    if (!verification.isValid || verification.status === 'expired' || verification.status === 'cancelled') {
      res.json({
        restored: false,
        message: 'Nenhuma assinatura ativa encontrada para restaurar.',
      });
      return;
    }

    // Localiza o plano
    const effectiveProductId = verification.productId;
    let targetPlan: typeof plans.$inferSelect | null = null;

    if (effectiveProductId && APPLE_PRODUCT_MAP[effectiveProductId]) {
      const mappedSlug = APPLE_PRODUCT_MAP[effectiveProductId].slug;
      const [found] = await db.select().from(plans).where(eq(plans.slug, mappedSlug)).limit(1);
      targetPlan = found || null;
    }

    if (!targetPlan && effectiveProductId) {
      const [found] = await db.select().from(plans).where(eq(plans.slug, effectiveProductId)).limit(1);
      targetPlan = found || null;
    }

    if (!targetPlan) {
      const [defaultPlan] = await db.select().from(plans).where(eq(plans.isActive, true)).limit(1);
      targetPlan = defaultPlan || null;
    }

    const now = new Date();
    const periodStart = verification.purchaseDate || now;
    const periodEnd = verification.expiresDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userUid, req.userId!))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    let savedSubscription: typeof subscriptions.$inferSelect;

    if (existingSub) {
      const [updated] = await db
        .update(subscriptions)
        .set({
          planId: targetPlan?.id || existingSub.planId,
          status: 'active',
          provider: 'apple',
          appleOriginalTransactionId: verification.originalTransactionId,
          appleProductId: effectiveProductId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        })
        .where(eq(subscriptions.id, existingSub.id))
        .returning();
      savedSubscription = updated;
    } else {
      const newSubId = nanoid();
      const [created] = await db
        .insert(subscriptions)
        .values({
          id: newSubId,
          userUid: req.userId!,
          planId: targetPlan?.id || '',
          status: 'active',
          provider: 'apple',
          appleOriginalTransactionId: verification.originalTransactionId,
          appleProductId: effectiveProductId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        })
        .returning();
      savedSubscription = created;
    }

    res.json({
      restored: true,
      subscription: {
        id: savedSubscription.id,
        status: savedSubscription.status,
        provider: 'apple',
        currentPeriodEnd: savedSubscription.currentPeriodEnd,
        plan: targetPlan ? { id: targetPlan.id, name: targetPlan.name, price: targetPlan.price } : null,
      },
    });
  } catch (err: any) {
    console.error('[AppleAppStore] Erro ao restaurar compras:', err);
    res.status(500).json({ error: err?.message || 'Falha ao restaurar compras na Apple.' });
  }
});

// ─── POST /api/subscriptions/apple/webhook ───────────────────────────────────
// Recebe Server Notifications da Apple (v1 / v2) para renovação e cancelamento
router.post('/webhook', async (req, res) => {
  try {
    const notification = parseAppleNotification(req.body);
    const { notificationType, originalTransactionId, expiresDate } = notification;

    console.log(`[AppleAppStore Webhook] Evento recebido: type=${notificationType}, txId=${originalTransactionId}`);

    if (originalTransactionId) {
      const [localSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.appleOriginalTransactionId, originalTransactionId))
        .limit(1);

      if (localSub) {
        if (
          notificationType === 'DID_RENEW' ||
          notificationType === 'SUBSCRIBED' ||
          notificationType === 'INTERACTIVE_RENEWAL'
        ) {
          const now = new Date();
          const newEnd = expiresDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await db
            .update(subscriptions)
            .set({
              status: 'active',
              currentPeriodStart: now,
              currentPeriodEnd: newEnd,
            })
            .where(eq(subscriptions.id, localSub.id));

          console.log(`[AppleAppStore Webhook] Assinatura ${localSub.id} renovada com sucesso.`);
        } else if (notificationType === 'DID_FAIL_TO_RENEW') {
          await db
            .update(subscriptions)
            .set({ status: 'past_due' })
            .where(eq(subscriptions.id, localSub.id));

          console.log(`[AppleAppStore Webhook] Assinatura ${localSub.id} em atraso (past_due).`);
        } else if (
          notificationType === 'EXPIRED' ||
          notificationType === 'GRACE_PERIOD_EXPIRED'
        ) {
          await db
            .update(subscriptions)
            .set({ status: 'expired' })
            .where(eq(subscriptions.id, localSub.id));

          console.log(`[AppleAppStore Webhook] Assinatura ${localSub.id} expirada.`);
        } else if (
          notificationType === 'REVOKE' ||
          notificationType === 'REFUND' ||
          notificationType === 'CANCEL'
        ) {
          await db
            .update(subscriptions)
            .set({ status: 'cancelled', cancelledAt: new Date() })
            .where(eq(subscriptions.id, localSub.id));

          console.log(`[AppleAppStore Webhook] Assinatura ${localSub.id} cancelada/estornada.`);
        }
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('[AppleAppStore Webhook] Erro ao processar evento:', err);
    res.status(500).json({ error: 'Erro ao processar notificação da Apple.' });
  }
});

export default router;
