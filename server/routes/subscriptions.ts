// BJJRats — Subscription routes (Asaas integration)

import { Router } from 'express';
import { eq, and, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { academyProfessorLinks, users, plans, subscriptions, settings } from '../db/schema.js';
import {
  createCustomer, findCustomer, createSubscription as asaasCreateSub,
  cancelSubscription as asaasCancelSub, getSubscription, updateSubscription,
  listSubscriptionPayments, parseWebhook,
  type AsaasWebhookEvent,
} from '../services/asaas.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

async function getGraceDays(): Promise<number> {
  try {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'past_due_grace_days'))
      .limit(1);
    return parseInt(row?.value || '3', 10) || 3;
  } catch {
    return 3;
  }
}

// ─── GET /api/subscriptions/plans ──────────────────────────────────────────
// Lista planos disponíveis
router.get('/plans', async (_req, res) => {
  const rows = await db
    .select()
    .from(plans)
    .where(eq(plans.isActive, true))
    .orderBy(plans.price);
  res.json(rows);
});

// ─── GET /api/subscriptions/my ────────────────────────────────────────────
// Assinatura do usuário atual (inclui past_due para permitir regularização)
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  const sub = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userUid, req.userId!),
        or(
          eq(subscriptions.status, 'active'),
          eq(subscriptions.status, 'trial'),
          eq(subscriptions.status, 'past_due'),
        ),
      ),
    )
    .limit(1);
  if (!sub.length) {
    const [academyCoveredAccess] = await db
      .select({
        academyUid: academyProfessorLinks.academyUid,
        academyName: users.academyName,
        academy: users.academy,
        academyUserName: users.name,
        createdAt: academyProfessorLinks.createdAt,
      })
      .from(academyProfessorLinks)
      .innerJoin(users, eq(users.uid, academyProfessorLinks.academyUid))
      .where(
        and(
          eq(academyProfessorLinks.professorUid, req.userId!),
          eq(academyProfessorLinks.relationType, 'internal'),
          eq(academyProfessorLinks.status, 'active'),
        ),
      )
      .limit(1);

    if (academyCoveredAccess) {
      res.json({
        subscription: {
          id: `academy-covered:${academyCoveredAccess.academyUid}`,
          userUid: req.userId!,
          planId: 'academy-covered',
          status: 'active',
          coveredByAcademy: true,
          academyUid: academyCoveredAccess.academyUid,
          academyName: academyCoveredAccess.academyName
            || academyCoveredAccess.academy
            || academyCoveredAccess.academyUserName
            || 'Academia',
          createdAt: academyCoveredAccess.createdAt,
          plan: null,
        },
      });
      return;
    }

    res.json({ subscription: null });
    return;
  }
  const plan = await db
    .select()
    .from(plans)
    .where(eq(plans.id, sub[0].planId))
    .limit(1);
  res.json({ subscription: { ...sub[0], plan: plan[0] ?? null } });
});

// ─── POST /api/subscriptions ──────────────────────────────────────────────
// Cria assinatura: registra no Asaas e no banco
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { planId, billingType, cpfCnpj, phone, paymentMethod } = req.body as {
    planId: string; billingType?: string; cpfCnpj?: string; phone?: string; paymentMethod?: string;
  };

  // Busca o plano
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);

  if (!plan) {
    res.status(404).json({ error: 'Plano não encontrado' });
    return;
  }

  // Obtém dados do usuário
  const [user] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.uid, req.userId!))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  // Cria ou reutiliza customer no Asaas
  let customer = await findCustomer(user.email);
  if (!customer) {
    customer = await createCustomer({
      name: user.name,
      email: user.email,
      cpfCnpj,
      phone,
    });
  }

  const trialDays = plan.trialDays ?? 0;
  const now = new Date();

  // Próximo vencimento: trialDays + 7 dias a partir de hoje
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + trialDays + 7);
  const nextDueStr = nextDue.toISOString().split('T')[0];

  const normalizedBillingType = String(billingType || paymentMethod || 'PIX').toLowerCase();
  const bt = (normalizedBillingType === 'credit_card' ? 'CREDIT_CARD'
    : normalizedBillingType === 'boleto' ? 'BOLETO'
    : 'PIX') as 'PIX' | 'BOLETO' | 'CREDIT_CARD';

  // Cria subscription no Asaas (com vencimento após trial se houver)
  const asaasSub = await asaasCreateSub({
    customer: customer.id,
    value: plan.price,
    nextDueDate: nextDueStr,
    cycle: 'MONTHLY',
    billingType: bt,
    description: `BJJRats - ${plan.name}`,
    externalReference: req.userId,
  });

  // Salva no banco
  const subId = nanoid();
  const isTrial = trialDays > 0;
  const trialEndsAt = isTrial ? new Date(now.getTime() + trialDays * 86400000) : null;
  const periodEnd = new Date(trialEndsAt ?? now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await db.insert(subscriptions).values({
    id: subId,
    userUid: req.userId!,
    planId,
    status: isTrial ? 'trial' : 'active',
    asaasId: asaasSub.id,
    asaasCustomerId: customer.id,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    trialEndsAt,
  });

  let firstPayment:
    | { id: string; invoiceUrl?: string; bankSlipUrl?: string; status: string }
    | null = null;

  try {
    const asaasPayments = await listSubscriptionPayments(asaasSub.id);
    const payablePayment = asaasPayments.find(payment =>
      ['PENDING', 'OVERDUE'].includes(payment.status),
    ) ?? asaasPayments[0];

    if (payablePayment) {
      firstPayment = {
        id: payablePayment.id,
        invoiceUrl: payablePayment.invoiceUrl,
        bankSlipUrl: payablePayment.bankSlipUrl,
        status: payablePayment.status,
      };
    }
  } catch (err) {
    console.warn('[subscriptions] Nao foi possivel buscar a primeira cobranca Asaas:', err);
  }

  res.status(201).json({
    subscription: {
      id: subId,
      asaasId: asaasSub.id,
      payment: firstPayment,
    },
  });
});

// ─── POST /api/subscriptions/cancel ────────────────────────────────────────
// Cancela assinatura
router.post('/cancel', requireAuth, async (req: AuthRequest, res) => {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userUid, req.userId!),
        eq(subscriptions.status, 'active'),
      ),
    )
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: 'Nenhuma assinatura ativa' });
    return;
  }

  if (sub.asaasId) {
    await asaasCancelSub(sub.asaasId);
  }

  await db
    .update(subscriptions)
    .set({ status: 'cancelled', cancelledAt: new Date() })
    .where(eq(subscriptions.id, sub.id));

  res.json({ success: true });
});

// ─── GET /api/subscriptions/my/billing ────────────────────────────────────
// Retorna o billing type atual da assinatura no Asaas + pending payment info
router.get('/my/billing', requireAuth, async (req: AuthRequest, res) => {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userUid, req.userId!),
        or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trial'), eq(subscriptions.status, 'past_due')),
      ),
    )
    .limit(1);

  if (!sub || !sub.asaasId) {
    res.json({ billingType: null, availableMethods: ['PIX', 'CREDIT_CARD'], pendingPayment: null, graceDays: await getGraceDays() });
    return;
  }

  try {
    const asaasSub = await getSubscription(sub.asaasId);
    let pendingPayment: {
      id: string;
      value: number;
      dueDate: string;
      status: string;
      invoiceUrl?: string;
      bankSlipUrl?: string;
      pixQrCode?: string;
    } | null = null;

    // Se estiver past_due, busca cobranças pendentes
    if (sub.status === 'past_due' || asaasSub.status === 'OVERDUE') {
      try {
        const payments = await listSubscriptionPayments(sub.asaasId);
        const overdue = payments.find(p => ['OVERDUE', 'PENDING'].includes(p.status));
        if (overdue) {
          pendingPayment = {
            id: overdue.id,
            value: overdue.value,
            dueDate: overdue.dueDate,
            status: overdue.status,
            invoiceUrl: overdue.invoiceUrl,
            bankSlipUrl: overdue.bankSlipUrl,
            pixQrCode: overdue.pixQrCode,
          };
        }
      } catch { /* silencioso */ }
    }

    res.json({
      billingType: asaasSub.billingType || 'PIX',
      availableMethods: ['PIX', 'CREDIT_CARD'],
      pendingPayment,
      graceDays: await getGraceDays(),
    });
  } catch {
    res.json({ billingType: 'PIX', availableMethods: ['PIX', 'CREDIT_CARD'], pendingPayment: null, graceDays: await getGraceDays() });
  }
});

// ─── PUT /api/subscriptions/my/billing ────────────────────────────────────
// Altera a forma de pagamento da assinatura
router.put('/my/billing', requireAuth, async (req: AuthRequest, res) => {
  const { billingType } = req.body as { billingType?: string };
  const validTypes = ['PIX', 'CREDIT_CARD'];

  if (!billingType || !validTypes.includes(billingType)) {
    res.status(400).json({ error: `billingType inválido. Use: ${validTypes.join(', ')}` });
    return;
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userUid, req.userId!),
        or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trial'), eq(subscriptions.status, 'past_due')),
      ),
    )
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: 'Nenhuma assinatura ativa' });
    return;
  }

  if (!sub.asaasId) {
    res.status(400).json({ error: 'Assinatura não vinculada ao Asaas' });
    return;
  }

  const updated = await updateSubscription(sub.asaasId, {
    billingType: billingType as 'PIX' | 'BOLETO' | 'CREDIT_CARD',
  });

  res.json({
    billingType: updated.billingType || billingType,
    availableMethods: validTypes,
    message: 'Forma de pagamento alterada com sucesso',
  });
});

// ─── POST /api/subscriptions/webhook ──────────────────────────────────────
// Webhook do Asaas para notificações de pagamento
router.post('/webhook', async (req, res) => {
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (webhookToken && req.header('asaas-access-token') !== webhookToken) {
    res.status(401).json({ error: 'invalid_webhook_token' });
    return;
  }

  const event: AsaasWebhookEvent = parseWebhook(req.body);
  const asaasSubscriptionId = event.subscription?.id || event.payment?.subscription;

  if (asaasSubscriptionId) {
    const [localSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.asaasId, asaasSubscriptionId))
      .limit(1);

    if (localSub) {
      switch (event.event) {
        case 'SUBSCRIPTION_CANCELLED':
        case 'SUBSCRIPTION_DELETED':
          await db
            .update(subscriptions)
            .set({ status: 'cancelled', cancelledAt: new Date() })
            .where(eq(subscriptions.id, localSub.id));
          break;

        case 'SUBSCRIPTION_OVERDUE':
        case 'PAYMENT_OVERDUE':
          await db
            .update(subscriptions)
            .set({ status: 'past_due' })
            .where(eq(subscriptions.id, localSub.id));
          break;

        case 'SUBSCRIPTION_PAYMENT_CONFIRMED':
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED':
          // Renova período
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          await db
            .update(subscriptions)
            .set({
              status: 'active',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            })
            .where(eq(subscriptions.id, localSub.id));
          break;
      }
    }
  }

  res.json({ received: true });
});

export default router;
