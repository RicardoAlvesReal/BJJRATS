// BJJRats — Subscription / feature gating middleware

import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, plans, subscriptions } from '../db/schema.js';
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

    // Verifica se é exempt
    const [user] = await db
      .select({ subscriptionExempt: users.subscriptionExempt })
      .from(users)
      .where(eq(users.uid, req.userId!))
      .limit(1);

    if (user?.subscriptionExempt) {
      req.isExempt = true;
      return next();
    }

    // Busca assinatura ativa
    const [sub] = await db
      .select({
        status: subscriptions.status,
        planId: subscriptions.planId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userUid, req.userId!))
      .orderBy(subscriptions.createdAt)
      .limit(1);

    if (!sub || (sub.status !== 'active' && sub.status !== 'trial')) {
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
