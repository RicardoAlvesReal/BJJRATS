// BJJRats — Middleware de Feature Flags
// Verifica se a assinatura ativa do usuário inclui determinada funcionalidade

import { Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { subscriptions, plans } from '../db/schema.js';
import { AuthRequest } from './auth.js';

/**
 * Middleware que verifica se o usuário tem acesso a uma feature específica.
 * 
 * @param featureKey - Chave da feature (ex: 'training_tracking', 'community')
 * 
 * Uso:
 *   router.get('/alguma-rota', requireAuth, requireFeature('training_tracking'), handler)
 */
export function requireFeature(featureKey: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const uid = req.userId;
      if (!uid) {
        res.status(401).json({ error: 'Autenticação necessária.' });
        return;
      }

      // Superadmin sempre tem acesso a tudo
      if (req.userRole === 'superadmin') {
        next();
        return;
      }

      // Busca assinatura ativa/trial/past_due
      const [sub] = await db
        .select({
          planId: subscriptions.planId,
          status: subscriptions.status,
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userUid, uid),
            // Aceita active, trial e past_due (período de graça para regularizar)
          )
        )
        .limit(1);

      if (!sub) {
        res.status(403).json({
          error: 'Assinatura necessária.',
          code: 'subscription_required',
          requiredFeature: featureKey,
        });
        return;
      }

      // Só bloqueia se não for active, trial, ou past_due
      if (!['active', 'trial', 'past_due'].includes(sub.status)) {
        res.status(403).json({
          error: 'Assinatura inativa. Regularize para acessar.',
          code: 'subscription_inactive',
          requiredFeature: featureKey,
        });
        return;
      }

      // Busca o plano e verifica features
      const [plan] = await db
        .select({ features: plans.features })
        .from(plans)
        .where(eq(plans.id, sub.planId))
        .limit(1);

      if (!plan) {
        res.status(403).json({
          error: 'Plano não encontrado.',
          code: 'plan_not_found',
          requiredFeature: featureKey,
        });
        return;
      }

      const features: string[] = Array.isArray(plan.features) ? plan.features : [];
      if (!features.includes(featureKey)) {
        res.status(403).json({
          error: `Seu plano não inclui a funcionalidade "${featureKey}".`,
          code: 'feature_not_included',
          requiredFeature: featureKey,
        });
        return;
      }

      next();
    } catch (err) {
      console.error('[features] Erro ao verificar feature:', err);
      res.status(500).json({ error: 'Erro ao verificar permissões.' });
    }
  };
}
