// BJJRats — Subscription / feature gating middleware

import { and, eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { academyProfessorLinks, users, plans, subscriptions } from '../db/schema.js';
import type { AuthRequest } from './auth.js';
import type { Response, NextFunction } from 'express';

// Extende AuthRequest com info da subscription
export interface SubRequest extends AuthRequest {
  subscriptionStatus?: string;
  planFeatures?: string[];
  isExempt?: boolean;
}

// Middleware: verifica se usuário tem acesso à plataforma
// (assinatura ativa, trial, exempt ou superadmin)
export async function requireSubscription(
  req: SubRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    // Superadmin sempre passa
    if (req.userRole === 'superadmin') {
      req.isExempt = true;
      return next();
    }

    // Verifica se é exempt ou está em trial
    const [user] = await db
      .select({ subscriptionExempt: users.subscriptionExempt, trialEndsAt: users.trialEndsAt })
      .from(users)
      .where(eq(users.uid, req.userId!))
      .limit(1);

    if (user?.subscriptionExempt) {
      req.isExempt = true;
      return next();
    }

    if (user?.trialEndsAt && new Date(user.trialEndsAt) > new Date()) {
      req.isExempt = true;
      return next();
    }

    // Busca assinatura ativa ou trial mais recente (evita que uma assinatura antiga cancelada bloqueie uma ativa)
    const [sub] = await db
      .select({
        status: subscriptions.status,
        planId: subscriptions.planId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userUid, req.userId!))
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

    if (!sub || (sub.status !== 'active' && sub.status !== 'trial')) {
      const [academyCoveredAccess] = await db
        .select({ id: academyProfessorLinks.id })
        .from(academyProfessorLinks)
        .where(and(
          eq(academyProfessorLinks.professorUid, req.userId!),
          eq(academyProfessorLinks.relationType, 'internal'),
          eq(academyProfessorLinks.status, 'active'),
        ))
        .limit(1);

      if (academyCoveredAccess) {
        req.isExempt = true;
        req.subscriptionStatus = 'academy_covered';
        return next();
      }

      res.status(403).json({
        error: 'subscription_required',
        message: 'Assinatura necessária para acessar este recurso.',
      });
      return;
    }

    req.subscriptionStatus = sub.status;

    // Carrega features do plano
    if (sub.planId) {
      const [plan] = await db
        .select({ features: plans.features })
        .from(plans)
        .where(eq(plans.id, sub.planId))
        .limit(1);
      req.planFeatures = (plan?.features as string[]) ?? [];
    }

    next();
  } catch (err) {
    console.error('Erro no requireSubscription:', err);
    res.status(500).json({ error: 'Erro ao verificar assinatura' });
  }
}

// Middleware: verifica feature específica
export function requireFeature(feature: string) {
  return (req: SubRequest, res: Response, next: NextFunction) => {
    if (req.isExempt) return next();
    if (req.planFeatures?.includes(feature)) return next();

    res.status(403).json({
      error: 'feature_not_available',
      message: `Seu plano não inclui: ${feature}`,
    });
  };
}
