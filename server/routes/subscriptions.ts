import { Router } from 'express';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { academyProfessorLinks, users, plans, subscriptions, settings } from '../db/schema.js';
import {
  createCustomer, findCustomer, updateCustomer, createSubscription as asaasCreateSub,
  cancelSubscription as asaasCancelSub, getSubscription, updateSubscription,
  listSubscriptionPayments, getPixQrCode, parseWebhook,
  type AsaasWebhookEvent,
} from '../services/asaas.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import googlePlayRouter from './googlePlay.js';
import appleRouter from './apple.js';
import { verifyGoogleSubscription } from '../services/googlePlay.js';

const router = Router();
router.use('/google-play', googlePlayRouter);
router.use('/apple', appleRouter);

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


type SubscriptionRow = typeof subscriptions.$inferSelect;
type PlanRow = typeof plans.$inferSelect;

const BILLING_SYNC_STATUSES = new Set(['active', 'trial', 'past_due', 'pending']);
const ASAAS_CANCELLED_STATUSES = new Set(['CANCELLED', 'DELETED', 'EXPIRED', 'INACTIVE']);

function parseDate(value: string | Date | null | undefined, endOfDay = false): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

function isPaidPlan(plan: PlanRow | null | undefined) {
  const price = Number(plan?.price);
  return Number.isFinite(price) && price > 0;
}

function isOverdueAsaasPayment(payment: Awaited<ReturnType<typeof listSubscriptionPayments>>[number], graceDays = 3) {
  const status = String(payment.status || '').toUpperCase();
  if (status === 'OVERDUE') return true;
  if (status !== 'PENDING') return false;

  const due = parseDate(payment.dueDate);
  if (!due) return false;
  // Considera os dias de tolerância/carência
  const limitDate = new Date(due);
  limitDate.setDate(limitDate.getDate() + graceDays);
  limitDate.setHours(23, 59, 59, 999);
  return new Date() > limitDate;
}

async function loadPlan(planId: string) {
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);
  return plan ?? null;
}

async function syncSubscriptionAccess(sub: SubscriptionRow, plan?: PlanRow | null): Promise<SubscriptionRow> {
  const currentStatus = String(sub.status || '').toLowerCase();
  if (!BILLING_SYNC_STATUSES.has(currentStatus)) return sub;

  const resolvedPlan = plan ?? await loadPlan(sub.planId);
  if (!isPaidPlan(resolvedPlan)) return sub;

  const now = new Date();
  const currentPeriodEnd = parseDate(sub.currentPeriodEnd);
  const localPeriodExpired = !currentPeriodEnd || currentPeriodEnd.getTime() <= now.getTime();

  if (!localPeriodExpired && currentStatus !== 'past_due' && currentStatus !== 'pending') {
    return sub;
  }

  const updates: Partial<SubscriptionRow> = {};

  if (sub.asaasId) {
    try {
      const [asaasSub, asaasPayments, graceDays] = await Promise.all([
        getSubscription(sub.asaasId),
        listSubscriptionPayments(sub.asaasId),
        getGraceDays(),
      ]);
      const asaasStatus = String(asaasSub.status || '').toUpperCase();

      if (asaasSub.deleted || ASAAS_CANCELLED_STATUSES.has(asaasStatus)) {
        updates.status = 'cancelled';
        updates.cancelledAt = new Date();
      } else if (asaasStatus === 'ACTIVE') {
        const nextDueDate = parseDate(asaasSub.nextDueDate, true);

        // Pagamentos confirmados/recebidos no Asaas
        const confirmedStatuses = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']);
        const confirmedPayments = (asaasPayments || []).filter(p =>
          confirmedStatuses.has(String(p.status || '').toUpperCase())
        ).sort((a, b) => {
          const da = new Date(a.paymentDate || a.clientPaymentDate || a.confirmedDate || a.dueDate).getTime();
          const db = new Date(b.paymentDate || b.clientPaymentDate || b.confirmedDate || b.dueDate).getTime();
          return db - da;
        });

        const latestConfirmed = confirmedPayments[0];
        const latestConfirmedDate = latestConfirmed
          ? parseDate(latestConfirmed.paymentDate || latestConfirmed.clientPaymentDate || latestConfirmed.confirmedDate || latestConfirmed.dueDate)
          : null;

        const daysSincePaid = latestConfirmedDate
          ? (now.getTime() - latestConfirmedDate.getTime()) / (1000 * 60 * 60 * 24)
          : Infinity;

        // Se o usuário pagou nos últimos 35 dias, está 100% adimplente / ativo
        const hasRecentConfirmedPayment = daysSincePaid <= 35;

        // Cobranças em atraso que já passaram do vencimento + carência
        const overduePayments = (asaasPayments || []).filter(p => isOverdueAsaasPayment(p, graceDays));
        const hasOverduePending = overduePayments.length > 0;

        if (hasRecentConfirmedPayment) {
          updates.status = 'active';
          if (nextDueDate && nextDueDate.getTime() > now.getTime()) {
            updates.currentPeriodEnd = nextDueDate;
            const periodStart = new Date(nextDueDate);
            periodStart.setMonth(periodStart.getMonth() - 1);
            updates.currentPeriodStart = periodStart;
          } else if (latestConfirmedDate) {
            const nextCycle = new Date(latestConfirmedDate);
            nextCycle.setDate(nextCycle.getDate() + 32);
            updates.currentPeriodEnd = nextCycle > now ? nextCycle : new Date(now.getTime() + 7 * 86400000);
          }
        } else if (nextDueDate && nextDueDate.getTime() > now.getTime() && !hasOverduePending) {
          const periodStart = new Date(nextDueDate);
          periodStart.setMonth(periodStart.getMonth() - 1);
          updates.status = 'active';
          updates.currentPeriodStart = periodStart;
          updates.currentPeriodEnd = nextDueDate;
        } else if (hasOverduePending || localPeriodExpired) {
          updates.status = 'past_due';
        }
      } else if (asaasStatus === 'OVERDUE') {
        updates.status = 'past_due';
      } else if (sub.status === 'trial') {
        // Verifica se usuário tem trial ativo em users antes de marcar expired
        const [u] = await db.select({ trialEndsAt: users.trialEndsAt }).from(users).where(eq(users.uid, sub.userUid)).limit(1);
        const userTrialEnds = parseDate(u?.trialEndsAt);
        const subTrialEnds = parseDate(sub.trialEndsAt || sub.currentPeriodEnd);
        const activeTrialDate = (userTrialEnds && userTrialEnds.getTime() > now.getTime())
          ? userTrialEnds
          : (subTrialEnds && subTrialEnds.getTime() > now.getTime())
            ? subTrialEnds
            : null;

        if (activeTrialDate) {
          updates.status = 'trial';
          updates.trialEndsAt = activeTrialDate;
          updates.currentPeriodEnd = activeTrialDate;
        } else if (localPeriodExpired) {
          updates.status = 'expired';
        }
      } else if (localPeriodExpired) {
        updates.status = 'past_due';
      }
    } catch (err) {
      console.warn('[subscriptions] Falha ao sincronizar assinatura com Asaas; aplicando fallback local:', err);
      if (localPeriodExpired && sub.status !== 'active') updates.status = 'past_due';
    }
  } else if ((sub.provider === 'google_play' || sub.googlePurchaseToken) && sub.googlePurchaseToken) {
    try {
      const verified = await verifyGoogleSubscription(sub.googlePurchaseToken, sub.googleProductId || undefined);
      if (verified.status === 'cancelled' || verified.status === 'expired') {
        updates.status = verified.status;
        if (verified.status === 'cancelled') updates.cancelledAt = new Date();
      } else if (verified.status === 'past_due') {
        updates.status = 'past_due';
      } else if (verified.status === 'active' && verified.expiryTime) {
        updates.status = 'active';
        updates.currentPeriodEnd = verified.expiryTime;
      }
    } catch (err) {
      console.warn('[subscriptions] Falha ao sincronizar assinatura com Google Play:', err);
      if (localPeriodExpired) updates.status = 'past_due';
    }
  } else if (localPeriodExpired) {
    updates.status = 'past_due';
  }

  const hasChanges = Object.entries(updates).some(([key, value]) => (sub as any)[key] !== value);
  if (!hasChanges) return sub;

  const [updated] = await db
    .update(subscriptions)
    .set(updates as any)
    .where(eq(subscriptions.id, sub.id))
    .returning();

  return updated ?? { ...sub, ...updates };
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
  // 1. Busca dados do usuário (isenção, trial no perfil, role)
  const [userRow] = await db
    .select({
      uid: users.uid,
      trialEndsAt: users.trialEndsAt,
      subscriptionExempt: users.subscriptionExempt,
      role: users.role,
    })
    .from(users)
    .where(eq(users.uid, req.userId!))
    .limit(1);

  const now = new Date();
  const hasUserActiveTrial = Boolean(userRow?.trialEndsAt && new Date(userRow.trialEndsAt).getTime() > now.getTime());

  // 2. Se o usuário for isento (subscriptionExempt)
  if (userRow?.subscriptionExempt) {
    res.json({
      subscription: {
        id: `exempt:${req.userId}`,
        userUid: req.userId!,
        planId: 'exempt',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000).toISOString(),
        plan: {
          id: 'exempt',
          name: 'Acesso Isento',
          price: 0,
          roleAssigned: userRow.role || 'student',
          features: ['all'],
        },
      },
    });
    return;
  }

  // 3. Busca assinatura do usuário ordenando por: active > trial > past_due, depois mais recente
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
    .orderBy(
      sql`CASE 
        WHEN ${subscriptions.status} = 'active' THEN 1
        WHEN ${subscriptions.status} = 'trial' THEN 2
        WHEN ${subscriptions.status} = 'past_due' THEN 3
        ELSE 4
      END`,
      desc(subscriptions.createdAt)
    )
    .limit(1);

  if (!sub.length) {
    // 3a. Se tiver trial ativo no perfil do usuário
    if (hasUserActiveTrial) {
      res.json({
        subscription: {
          id: `trial:${req.userId}`,
          userUid: req.userId!,
          planId: 'trial',
          status: 'trial',
          trialEndsAt: userRow!.trialEndsAt,
          currentPeriodEnd: userRow!.trialEndsAt,
          plan: {
            id: 'trial',
            name: 'Período Grátis (Trial)',
            price: 0,
            roleAssigned: userRow?.role || 'student',
            features: ['all'],
          },
        },
      });
      return;
    }

    // 3b. Coberto pela academia
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
  const syncedSub = await syncSubscriptionAccess(sub[0], plan[0] ?? null);

  // Se a assinatura acabou ficando 'past_due' ou 'expired', mas o usuário tem trial ativo concedido no perfil:
  if ((syncedSub.status === 'past_due' || syncedSub.status === 'expired' || syncedSub.status === 'cancelled') && hasUserActiveTrial) {
    res.json({
      subscription: {
        ...syncedSub,
        status: 'trial',
        trialEndsAt: userRow!.trialEndsAt,
        currentPeriodEnd: userRow!.trialEndsAt,
        plan: plan[0] ?? {
          id: 'trial',
          name: 'Período Grátis (Trial)',
          price: 0,
          roleAssigned: userRow?.role || 'student',
          features: ['all'],
        },
      },
    });
    return;
  }

  const isVisibleStatus = ['active', 'trial', 'past_due', 'pending'].includes(String(syncedSub.status || '').toLowerCase());
  res.json({ subscription: isVisibleStatus ? { ...syncedSub, plan: plan[0] ?? null } : null });
});

// ─── POST /api/subscriptions ──────────────────────────────────────────────
// Cria assinatura: registra no Asaas e no banco
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { planId, billingType, cpfCnpj, phone, paymentMethod } = req.body as {
    planId: string; billingType?: string; cpfCnpj?: string; phone?: string; paymentMethod?: string;
  };

  // ⛔ Bloqueia criação de nova assinatura se já existe uma ativa/trial/past_due
  const [existingSub] = await db
    .select({ id: subscriptions.id, status: subscriptions.status, planId: subscriptions.planId })
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

  let replacingFreeSubscriptionId: string | null = null;
  if (existingSub) {
    const [existingPlan] = await db
      .select({ price: plans.price })
      .from(plans)
      .where(eq(plans.id, existingSub.planId))
      .limit(1);
    const existingIsFree = Number.isFinite(Number(existingPlan?.price))
      && Number(existingPlan?.price) <= 0;

    if (existingIsFree) {
      replacingFreeSubscriptionId = existingSub.id;
    } else {
      res.status(409).json({
        error: 'Você já possui uma assinatura ativa. Cancele a atual antes de assinar um novo plano.',
        code: 'duplicate_subscription',
        existingSubscription: { id: existingSub.id, status: existingSub.status, planId: existingSub.planId },
      });
      return;
    }
  }

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

  const planPrice = Number(plan.price);
  const isFree = Number.isFinite(planPrice) && planPrice <= 0;
  const now = new Date();
  const subId = nanoid();

  // Planos gratuitos não passam pelo Asaas porque não possuem cobrança.
  if (isFree) {
    if (replacingFreeSubscriptionId) {
      res.status(409).json({
        error: 'Este já é o seu plano atual.',
        code: 'same_free_plan',
      });
      return;
    }

    await db.insert(subscriptions).values({
      id: subId,
      userUid: req.userId!,
      planId,
      status: 'active',
      asaasId: null,
      asaasCustomerId: null,
      currentPeriodStart: now,
      currentPeriodEnd: null,
      trialEndsAt: null,
    });

    res.status(201).json({
      subscription: {
        id: subId,
        asaasId: null,
        status: 'active',
        isFree: true,
        payment: null,
      },
    });
    return;
  }

  // Obtém dados do usuário
  const [user] = await db
    .select({ name: users.name, email: users.email, phone: users.phone })
    .from(users)
    .where(eq(users.uid, req.userId!))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  // Cria ou reutiliza customer no Asaas (sempre garante CPF)
  const customerPhone = String(phone || user.phone || '').trim() || undefined;
  const cleanCpf = (cpfCnpj || '').replace(/\D/g, '');
  let customer = await findCustomer(user.email);
  if (!customer) {
    customer = await createCustomer({
      name: user.name,
      email: user.email,
      cpfCnpj: cleanCpf || undefined,
      phone: customerPhone,
    });
  } else if (cleanCpf && cleanCpf.length >= 11) {
    // Atualiza CPF se o customer já existia sem ele
    try {
      customer = await updateCustomer(customer.id, { cpfCnpj: cleanCpf });
    } catch (e) {
      console.warn('[subscriptions] Não foi possível atualizar CPF do customer:', e);
    }
  }

  const trialDays = plan.trialDays ?? 0;

  // Próximo vencimento: trialDays + 30 dias a partir de hoje
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + trialDays + 30);
  const nextDueStr = nextDue.toISOString().split('T')[0];

  const normalizedBillingType = String(billingType || paymentMethod || 'PIX').toLowerCase();
  const bt = (normalizedBillingType === 'credit_card' ? 'CREDIT_CARD'
    : normalizedBillingType === 'boleto' ? 'BOLETO'
    : 'PIX') as 'PIX' | 'BOLETO' | 'CREDIT_CARD';

  // Cria subscription no Asaas (com vencimento após trial se houver)
  const asaasSub = await asaasCreateSub({
    customer: customer.id,
    value: planPrice,
    nextDueDate: nextDueStr,
    cycle: 'MONTHLY',
    billingType: bt,
    description: `BJJRats - ${plan.name}`,
    externalReference: req.userId,
  });

  // Salva no banco
  const isTrial = trialDays > 0;
  const trialEndsAt = isTrial ? new Date(now.getTime() + trialDays * 86400000) : null;
  const periodEnd = new Date(trialEndsAt ?? now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const initialStatus = isTrial ? 'trial' : 'pending';

  if (replacingFreeSubscriptionId) {
    await db
      .update(subscriptions)
      .set({
        planId,
        status: initialStatus,
        asaasId: asaasSub.id,
        asaasCustomerId: customer.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt,
        cancelledAt: null,
      })
      .where(eq(subscriptions.id, replacingFreeSubscriptionId));
  } else {
    await db.insert(subscriptions).values({
      id: subId,
      userUid: req.userId!,
      planId,
      status: initialStatus,
      asaasId: asaasSub.id,
      asaasCustomerId: customer.id,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt,
    });
  }

  let firstPayment:
    | { id: string; invoiceUrl?: string; bankSlipUrl?: string; pixQrCode?: string; pixCopiaECola?: string; status: string }
    | null = null;

  try {
    const asaasPayments = await listSubscriptionPayments(asaasSub.id);
    const payablePayment = asaasPayments.find(payment =>
      ['PENDING', 'OVERDUE'].includes(payment.status),
    ) ?? asaasPayments[0];

    if (payablePayment) {
      let pixQr = payablePayment.pixQrCode || (payablePayment as any).pixQrCodeUrl || '';
      let pixCopia = (payablePayment as any).pixCopiaECola || (payablePayment as any).payload || (payablePayment as any).pixTransaction || '';

      // Se for PIX sem QR code, busca via endpoint dedicado
      if (bt === 'PIX' && !pixQr) {
        try {
          const pixData = await getPixQrCode(payablePayment.id);
          pixQr = pixData.encodedImage || '';
          pixCopia = pixCopia || pixData.payload || '';
        } catch (e) {
          console.warn('[subscriptions] Erro ao buscar PIX QR code:', e);
        }
      }

      firstPayment = {
        id: payablePayment.id,
        invoiceUrl: payablePayment.invoiceUrl,
        bankSlipUrl: payablePayment.bankSlipUrl,
        pixQrCode: pixQr,
        pixCopiaECola: pixCopia,
        status: payablePayment.status,
      };
    }
  } catch (err) {
    console.warn('[subscriptions] Nao foi possivel buscar a primeira cobranca Asaas:', err);
  }

  res.status(201).json({
    subscription: {
      id: replacingFreeSubscriptionId || subId,
      asaasId: asaasSub.id,
      status: initialStatus,
      isFree: false,
      upgradedFromFree: Boolean(replacingFreeSubscriptionId),
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

  if (!sub) {
    res.json({
      billingType: null,
      availableMethods: ['PIX', 'CREDIT_CARD'],
      pendingPayment: null,
      graceDays: await getGraceDays(),
      isFree: false,
    });
    return;
  }

  if (!sub.asaasId) {
    const [plan] = await db
      .select({ price: plans.price })
      .from(plans)
      .where(eq(plans.id, sub.planId))
      .limit(1);
    const isFree = Number(plan?.price) <= 0;

    res.json({
      billingType: null,
      availableMethods: isFree ? [] : ['PIX', 'CREDIT_CARD'],
      pendingPayment: null,
      graceDays: await getGraceDays(),
      isFree,
    });
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

    let invoices: Array<{
      id: string;
      value: number;
      dueDate: string;
      paymentDate?: string | null;
      status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
      invoiceUrl?: string;
      bankSlipUrl?: string;
      pixQrCode?: string;
    }> = [];

    try {
      const payments = await listSubscriptionPayments(sub.asaasId);
      invoices = payments.map(p => {
        const isPaid = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(p.status);
        const isOverdue = p.status === 'OVERDUE';
        const isPending = ['PENDING', 'AWAITING_RISK_ANALYSIS'].includes(p.status);
        return {
          id: p.id,
          value: p.value,
          dueDate: p.dueDate,
          paymentDate: p.paymentDate || p.clientPaymentDate || null,
          status: isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : isPending ? 'PENDING' : 'CANCELLED',
          invoiceUrl: p.invoiceUrl,
          bankSlipUrl: p.bankSlipUrl,
          pixQrCode: p.pixQrCode,
        };
      });

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
    } catch (err) {
      console.warn('[subscriptions/my/billing] Erro ao listar pagamentos Asaas:', err);
    }

    res.json({
      billingType: asaasSub.billingType || 'PIX',
      availableMethods: ['PIX', 'CREDIT_CARD'],
      pendingPayment,
      invoices,
      graceDays: await getGraceDays(),
    });
  } catch {
    res.json({ billingType: 'PIX', availableMethods: ['PIX', 'CREDIT_CARD'], pendingPayment: null, invoices: [], graceDays: await getGraceDays() });
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
    const [plan] = await db
      .select({ price: plans.price })
      .from(plans)
      .where(eq(plans.id, sub.planId))
      .limit(1);

    res.status(400).json({
      error: Number(plan?.price) <= 0
        ? 'Plano gratuito não possui forma de pagamento'
        : 'Assinatura não vinculada ao Asaas',
    });
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
