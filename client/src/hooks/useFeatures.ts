// BJJRats — Hook de Feature Flags (cliente)
// Permite verificar se o plano atual do usuário inclui determinada funcionalidade

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface UseFeaturesResult {
  /** Lista de chaves de features disponíveis no plano atual */
  features: string[];
  /** Se ainda está carregando */
  loading: boolean;
  /** Verifica se uma feature específica está disponível */
  hasFeature: (key: string) => boolean;
  /** Se o usuário tem assinatura ativa (trial, active, past_due) */
  hasActiveSubscription: boolean;
  /** Status da assinatura */
  subscriptionStatus: string | null;
}

/**
 * Hook que retorna as features do plano de assinatura do usuário.
 * 
 * Uso:
 *   const { hasFeature, features, loading } = useFeatures();
 *   if (hasFeature('training_tracking')) { ... }
 */
export function useFeatures(): UseFeaturesResult {
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.subscriptions.my()
      .then(data => {
        if (cancelled) return;
        const sub = data?.subscription;
        if (sub?.plan?.features) {
          setFeatures(Array.isArray(sub.plan.features) ? sub.plan.features : []);
        } else if (sub?.planId === 'academy-covered') {
          // Coberto por academia — tem todas as features de aluno
          setFeatures(['training_tracking', 'training_history', 'streak', 'community', 'achievements', 'competitions', 'goals', 'events', 'challenges', 'profile_stats']);
        }
        setSubscriptionStatus(sub?.status ?? null);
      })
      .catch(() => {
        // Usuário sem assinatura — sem features
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const hasFeature = useCallback((key: string) => features.includes(key), [features]);

  const hasActiveSubscription = subscriptionStatus === 'active'
    || subscriptionStatus === 'trial'
    || subscriptionStatus === 'past_due';

  return { features, loading, hasFeature, hasActiveSubscription, subscriptionStatus };
}
