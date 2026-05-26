// BJJRats — Gerenciamento de assinatura

import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import api, { type Subscription } from '@/lib/api';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { FONTS } from '@/lib/design';

export default function SubscriptionManager() {
  const [, navigate] = useLocation();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      const { subscription } = await api.subscriptions.getMy();
      setSub(subscription);
    } catch {
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura?')) return;
    setCancelling(true);
    try {
      await api.subscriptions.cancel();
      await load();
    } catch {
      alert('Erro ao cancelar assinatura');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="bjj-skeleton h-48 w-80 rounded-xl" />
      </div>
    );
  }

  if (!sub || !sub.plan) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial="hidden" animate="show" variants={staggerContainer} className="text-center" style={{ maxWidth: '400px' }}>
          <motion.div variants={fadeUp}>
            <h1 style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Sem assinatura ativa
            </h1>
            <p style={{ fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#666', margin: '0.5rem 0 1.5rem' }}>
              Assine um plano para desbloquear todos os recursos do BJJRats.
            </p>
            <button
              onClick={() => navigate('/pricing')}
              style={{
                background: '#CC0000', color: '#FFF',
                border: 'none', borderRadius: '6px', padding: '0.75rem 2rem',
                fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.85rem',
                letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              VER PLANOS
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: '#22C55E',
    trial: '#3B82F6',
    past_due: '#E87722',
    cancelled: '#CC0000',
    expired: '#666',
  };

  const statusLabels: Record<string, string> = {
    active: 'Ativa',
    trial: 'Período de teste',
    past_due: 'Pagamento pendente',
    cancelled: 'Cancelada',
    expired: 'Expirada',
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-4 py-12">
      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="w-full" style={{ maxWidth: '500px' }}>
        <motion.div variants={fadeUp} className="text-center mb-8">
          <h1 style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
            Minha assinatura
          </h1>
        </motion.div>

        <motion.div variants={fadeUp} className="bjj-card" style={{ padding: '1.5rem' }}>
          {/* Plan info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.25rem', color: '#FFF' }}>
                {sub.plan.name}
              </span>
              <span style={{ fontFamily: FONTS.condensed, fontSize: '0.75rem', color: '#666', display: 'block', marginTop: '0.125rem' }}>
                R$ {sub.plan.price.toFixed(2)}/mês
              </span>
            </div>
            <span style={{
              background: (statusColors[sub.status] || '#666') + '22',
              color: statusColors[sub.status] || '#666',
              fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.65rem',
              letterSpacing: '0.08em', padding: '0.3rem 0.75rem',
              borderRadius: '4px', textTransform: 'uppercase',
            }}>
              {statusLabels[sub.status] || sub.status}
            </span>
          </div>

          {/* Period */}
          {sub.currentPeriodEnd && (
            <div style={{ fontFamily: FONTS.condensed, fontSize: '0.8rem', color: '#888', marginBottom: '1rem' }}>
              Próximo vencimento: {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}
            </div>
          )}

          {/* Features */}
          {sub.plan.features && sub.plan.features.length > 0 && (
            <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <p style={{ fontFamily: FONTS.condensed, fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                Recursos incluídos
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {sub.plan.features.map(f => (
                  <span key={f} style={{
                    background: '#1A1A1A', color: '#AAA',
                    fontFamily: FONTS.condensed, fontSize: '0.65rem',
                    padding: '0.2rem 0.5rem', borderRadius: '4px',
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', borderTop: '1px solid #1A1A1A', paddingTop: '1rem' }}>
            {sub.status === 'active' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: '#CC0000',
                  border: '1px solid #CC000044',
                  borderRadius: '6px', padding: '0.6rem',
                  fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.75rem',
                  letterSpacing: '0.08em', textTransform: 'uppercase', cursor: cancelling ? 'not-allowed' : 'pointer',
                  opacity: cancelling ? 0.6 : 1,
                }}
              >
                {cancelling ? 'Cancelando...' : 'Cancelar assinatura'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
