import { Router } from 'express';
import { eq, and, or, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { subscriptions, plans, users } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  isGooglePlayConfigured,
  getGooglePlayPackageName,
  verifyGoogleSubscription,
  parsePubSubNotification,
} from '../services/googlePlay.js';

export const GOOGLE_PLAY_PRODUCT_MAP: Record<string, { slug: string; name: string }> = {
  plano_aluno_mensal: { slug: 'aluno', name: 'Aluno' },
  plano_professor_mensal: { slug: 'professor', name: 'Professor Particular' },
  plano_academia_mensal: { slug: 'academia', name: 'Academia' },
};

export const PLAN_SLUG_TO_GOOGLE_PLAY_PRODUCT: Record<string, string> = {
  aluno: 'plano_aluno_mensal',
  professor: 'plano_professor_mensal',
  academia: 'plano_academia_mensal',
};

const router = Router();

// ─── GET /api/subscriptions/google-play/config ─────────────────────────────
router.get('/config', (_req, res) => {
  res.json({
    configured: isGooglePlayConfigured(),
    packageName: getGooglePlayPackageName(),
    products: PLAN_SLUG_TO_GOOGLE_PLAY_PRODUCT,
    productMap: GOOGLE_PLAY_PRODUCT_MAP,
  });
});

// ─── POST /api/subscriptions/google-play/verify ────────────────────────────
// Endpoint chamado pelo app Android após a conclusão de uma compra no Google Play Billing
router.post('/verify', requireAuth, async (req: AuthRequest, res) => {
  const { purchaseToken, productId, planId } = req.body as {
    purchaseToken?: string;
    productId?: string;
    planId?: string;
  };

  if (!purchaseToken || !productId) {
    res.status(400).json({ error: 'purchaseToken e productId são obrigatórios.' });
    return;
  }

  try {
    // 1. Valida na Google Play Developer API
    const verification = await verifyGoogleSubscription(purchaseToken, productId);

    if (!verification.isValid && verification.status !== 'trial') {
      res.status(400).json({
        error: 'Compra não pôde ser validada ou expirou na Google Play.',
        details: verification,
      });
      return;
    }

    // 2. Localiza o plano no sistema
    let targetPlan: typeof plans.$inferSelect | null = null;
    if (planId) {
      const [found] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
      targetPlan = found || null;
    }

    // Se não encontrou por planId, busca pelo mapeamento oficial dos IDs do Google Play
    if (!targetPlan && GOOGLE_PLAY_PRODUCT_MAP[productId]) {
      const mappedSlug = GOOGLE_PLAY_PRODUCT_MAP[productId].slug;
      const [found] = await db.select().from(plans).where(eq(plans.slug, mappedSlug)).limit(1);
      targetPlan = found || null;
    }

    // Se não encontrou pelo mapeamento, tenta encontrar pelo slug que coincida com productId
    if (!targetPlan) {
      const [found] = await db
        .select()
        .from(plans)
        .where(or(eq(plans.slug, productId), eq(plans.id, productId)))
        .limit(1);
      targetPlan = found || null;
    }

    // Se ainda não encontrou, busca plano ativo padrão compatível
    if (!targetPlan) {
      const [defaultPlan] = await db.select().from(plans).where(eq(plans.isActive, true)).limit(1);
      targetPlan = defaultPlan || null;
    }

    if (!targetPlan) {
      res.status(404).json({ error: 'Nenhum plano correspondente encontrado no sistema.' });
      return;
    }

    const now = new Date();
    const periodStart = verification.startTime || now;
    // Se a Google não retornou data de expiração, define 30 dias por padrão
    const periodEnd = verification.expiryTime || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 3. Procura se o usuário já tem assinatura ativa / em carência / pendente
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

    let finalSub: typeof subscriptions.$inferSelect;

    if (existingSub) {
      const [updated] = await db
        .update(subscriptions)
        .set({
          planId: targetPlan.id,
          status: verification.status,
          provider: 'google_play',
          googlePurchaseToken: purchaseToken,
          googleOrderId: verification.orderId || null,
          googleProductId: productId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
        })
        .where(eq(subscriptions.id, existingSub.id))
        .returning();
      finalSub = updated!;
    } else {
      const subId = nanoid();
      const [created] = await db
        .insert(subscriptions)
        .values({
          id: subId,
          userUid: req.userId!,
          planId: targetPlan.id,
          status: verification.status,
          provider: 'google_play',
          googlePurchaseToken: purchaseToken,
          googleOrderId: verification.orderId || null,
          googleProductId: productId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          trialEndsAt: null,
          cancelledAt: null,
        })
        .returning();
      finalSub = created!;
    }

    // 4. Se o plano concede role específica (ex: professor ou academy), atualiza o role do usuário
    if (targetPlan.roleAssigned && targetPlan.roleAssigned !== 'student') {
      const [user] = await db.select().from(users).where(eq(users.uid, req.userId!)).limit(1);
      if (user && user.role !== 'superadmin' && user.role !== targetPlan.roleAssigned) {
        await db
          .update(users)
          .set({ role: targetPlan.roleAssigned })
          .where(eq(users.uid, req.userId!));
      }
    }

    res.status(200).json({
      success: true,
      subscription: finalSub,
      verification,
    });
  } catch (error: any) {
    console.error('[GooglePlay] Erro ao verificar assinatura:', error);
    res.status(500).json({
      error: 'Erro interno ao validar pagamento no Google Play.',
      message: error?.message || String(error),
    });
  }
});

// ─── POST /api/subscriptions/google-play/webhook ───────────────────────────
// Recebe notificações RTDN (Real-Time Developer Notifications) do Google Cloud Pub/Sub
router.post('/webhook', async (req, res) => {
  // O Google Cloud Pub/Sub exige resposta 200/204 rápida para confirmar o recebimento
  const notification = parsePubSubNotification(req.body);

  if (!notification) {
    // Mesmo em payload inválido, responder 200 evita repetições desnecessárias se não for Pub/Sub
    res.status(200).json({ received: false, reason: 'Invalid or empty Pub/Sub envelope' });
    return;
  }

  // Notificação de teste do Pub/Sub
  if (notification.testNotification) {
    console.log('[GooglePlay Webhook] Notificação de teste recebida do Google Cloud Pub/Sub.');
    res.status(200).json({ received: true, test: true });
    return;
  }

  const subNotif = notification.subscriptionNotification;
  if (!subNotif?.purchaseToken) {
    res.status(200).json({ received: true, message: 'No subscription notification payload' });
    return;
  }

  const { purchaseToken, subscriptionId, notificationType } = subNotif;
  console.log(`[GooglePlay Webhook] Evento recebido: type=${notificationType}, subId=${subscriptionId}`);

  try {
    // Busca assinatura local correspondente pelo purchaseToken
    const [localSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.googlePurchaseToken, purchaseToken))
      .limit(1);

    if (!localSub) {
      console.warn(`[GooglePlay Webhook] Assinatura local não encontrada para token: ${purchaseToken.slice(0, 10)}...`);
      res.status(200).json({ received: true, synced: false });
      return;
    }

    // Consulta os dados atualizados diretamente na API do Google Play
    const verified = await verifyGoogleSubscription(purchaseToken, subscriptionId);

    const updates: Partial<typeof subscriptions.$inferSelect> = {
      status: verified.status,
    };

    if (verified.expiryTime) {
      updates.currentPeriodEnd = verified.expiryTime;
    }
    if (verified.orderId) {
      updates.googleOrderId = verified.orderId;
    }
    if (notificationType === 3 /* CANCELED */ || notificationType === 12 /* REVOKED */) {
      updates.cancelledAt = new Date();
    }

    await db.update(subscriptions).set(updates).where(eq(subscriptions.id, localSub.id));
    console.log(`[GooglePlay Webhook] Assinatura ${localSub.id} atualizada com status=${verified.status}`);

    res.status(200).json({ received: true, synced: true, status: verified.status });
  } catch (error) {
    console.error('[GooglePlay Webhook] Erro ao processar evento:', error);
    // Sempre retornar 200 para que o Pub/Sub confirme o ACK da mensagem
    res.status(200).json({ received: true, error: true });
  }
});

export default router;
