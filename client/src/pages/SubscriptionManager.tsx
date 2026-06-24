// BJJRats — Gerenciamento de assinatura

import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import api, { type Subscription } from '@/lib/api';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { FONTS } from '@/lib/design';
import { useAuth } from '@/contexts/AuthContext';
import { getFeatureLabel } from '@/lib/features';

const BILLING_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
};

const BILLING_ICONS: Record<string, string> = {
  PIX: '📱',
  CREDIT_CARD: '💳',
};

function getPanelPath(user?: { role?: string } | null) {
  if (!user) return '/login';
  if (user.role === 'superadmin') return '/admin';
  if (user.role === 'academy' || user.role === 'admin') return '/academia';
  return '/app';
}

function isPanelAccessBlocked(sub: Subscription | null, graceDays: number) {
  if (!sub || sub.status !== 'past_due') return false;
  if (!sub.currentPeriodEnd) return true;
  const lockDate = new Date(sub.currentPeriodEnd);
  lockDate.setDate(lockDate.getDate() + graceDays);
  return new Date() >= lockDate;
}

export default function SubscriptionManager({ compact }: { compact?: boolean }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isCompact = !!compact;
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [billingType, setBillingType] = useState<string | null>(null);
  const [changingBilling, setChangingBilling] = useState(false);
  const [showBillingOptions, setShowBillingOptions] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    id: string; value: number; dueDate: string; status: string;
    invoiceUrl?: string; bankSlipUrl?: string; pixQrCode?: string;
  } | null>(null);
  const [graceDays, setGraceDays] = useState(3);

  const load = useCallback(async () => {
    try {
      const { subscription } = await api.subscriptions.getMy();
      setSub(subscription);
      if (subscription && (subscription.status === 'active' || subscription.status === 'trial' || subscription.status === 'past_due')) {
        try {
          const billing = await api.subscriptions.getBilling();
          setBillingType(billing.billingType);
          setPendingPayment(billing.pendingPayment || null);
          if (typeof billing.graceDays === 'number') setGraceDays(billing.graceDays);
        } catch {
          setBillingType(null);
          setPendingPayment(null);
        }
      }
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
      toast.success('Assinatura cancelada');
    } catch {
      toast.error('Erro ao cancelar assinatura');
    } finally {
      setCancelling(false);
    }
  };

  const handleChangeBilling = async (newBillingType: string) => {
    setChangingBilling(true);
    try {
      const result = await api.subscriptions.updateBilling(newBillingType);
      setBillingType(result.billingType);
      setShowBillingOptions(false);
      toast.success('Forma de pagamento alterada!');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar forma de pagamento');
    } finally {
      setChangingBilling(false);
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

  const isFreePlan = Number(sub.plan.price) <= 0;
  const canChangeBilling = !isFreePlan
    && (sub.status === 'active' || sub.status === 'trial' || sub.status === 'past_due');
  const panelAccessBlocked = isPanelAccessBlocked(sub, graceDays);

  return (
    <div className={isCompact ? '' : 'min-h-screen bg-[#0A0A0A] flex flex-col items-center px-4 py-12'}>
      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="w-full" style={{ maxWidth: '500px' }}>
        {!isCompact && (
          <motion.div variants={fadeUp} className="text-center mb-8">
            <h1 style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Minha assinatura
            </h1>
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="bjj-card" style={{ padding: '1.5rem' }}>
          {/* Plan info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.25rem', color: '#FFF' }}>
                {sub.plan.name}
              </span>
              <span style={{ fontFamily: FONTS.condensed, fontSize: '0.75rem', color: '#666', display: 'block', marginTop: '0.125rem' }}>
                {isFreePlan ? 'Plano gratuito' : `R$ ${sub.plan.price.toFixed(2)}/mês`}
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

          {/* Past due banner — inadimplente */}
          {sub.status === 'past_due' && (
            <div style={{
              background: 'linear-gradient(135deg, #1A0000 0%, #2A0A00 100%)',
              border: '2px solid #CC0000',
              padding: '1rem',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <div>
                  <p style={{
                    fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.85rem',
                    color: '#FF4444', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    PAGAMENTO PENDENTE
                  </p>
                  <p style={{
                    fontFamily: FONTS.condensed, fontSize: '0.7rem', color: '#E87722',
                    margin: '0.2rem 0 0', letterSpacing: '0.04em',
                  }}>
                    {sub.currentPeriodEnd
                      ? (() => {
                          const lockDate = new Date(sub.currentPeriodEnd);
                          lockDate.setDate(lockDate.getDate() + graceDays);
                          const now = new Date();
                          const diffDays = Math.ceil((lockDate.getTime() - now.getTime()) / 86400000);
                          if (diffDays > 0) {
                            return `Você tem ${diffDays} dia${diffDays > 1 ? 's' : ''} de tolerância para regularizar. Após isso, o acesso será bloqueado.`;
                          }
                          return 'Seu período de tolerância expirou. O acesso está bloqueado até a regularização.';
                        })()
                      : 'Sua assinatura está suspensa por falta de pagamento.'}
                  </p>
                </div>
              </div>

              {pendingPayment ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{
                    background: '#0A0A0A', border: '1px solid #333',
                    padding: '0.6rem 0.75rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.75rem', color: '#CCC' }}>
                      Cobrança pendente
                    </span>
                    <span style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.85rem', color: '#CC0000' }}>
                      {pendingPayment.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div style={{
                    background: '#0A0A0A', border: '1px solid #333',
                    padding: '0.6rem 0.75rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.75rem', color: '#888' }}>
                      Vencimento
                    </span>
                    <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.8rem', color: '#E87722' }}>
                      {new Date(pendingPayment.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {pendingPayment.invoiceUrl && (
                    <a
                      href={pendingPayment.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block', textAlign: 'center',
                        background: '#CC0000', color: '#FFF',
                        padding: '0.75rem',
                        fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.85rem',
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      PAGAR AGORA
                    </a>
                  )}
                  {pendingPayment.bankSlipUrl && !pendingPayment.invoiceUrl && (
                    <a
                      href={pendingPayment.bankSlipUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block', textAlign: 'center',
                        background: '#CC0000', color: '#FFF',
                        padding: '0.75rem',
                        fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.85rem',
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      VER BOLETO
                    </a>
                  )}
                  {!pendingPayment.invoiceUrl && !pendingPayment.bankSlipUrl && (
                    <div style={{
                      background: '#0A0A0A', border: '1px solid #333',
                      padding: '0.6rem 0.75rem', textAlign: 'center',
                    }}>
                      <p style={{ fontFamily: FONTS.condensed, fontSize: '0.7rem', color: '#888', margin: 0 }}>
                        O pagamento será processado automaticamente.
                      </p>
                      <button
                        onClick={load}
                        style={{
                          marginTop: '0.5rem',
                          background: 'transparent', border: '1px solid #444',
                          color: '#AAA', cursor: 'pointer',
                          fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.7rem',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          padding: '0.4rem 1rem',
                        }}
                      >
                        VERIFICAR PAGAMENTO
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                  <p style={{ fontFamily: FONTS.condensed, fontSize: '0.7rem', color: '#888', margin: '0 0 0.5rem' }}>
                    Entre em contato com o suporte para regularizar.
                  </p>
                  <button
                    onClick={load}
                    style={{
                      background: 'transparent', border: '1px solid #CC000044',
                      color: '#CC0000', cursor: 'pointer',
                      fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.7rem',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      padding: '0.4rem 1rem',
                    }}
                  >
                    VERIFICAR NOVAMENTE
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Trial info */}
          {sub.trialEndsAt && sub.status === 'trial' && (
            <div style={{
              background: '#0A1A2A', border: '1px solid #2A6FAF',
              padding: '0.6rem 0.75rem', marginBottom: '1rem',
            }}>
              <p style={{ fontFamily: FONTS.condensed, fontSize: '0.7rem', color: '#5AA9FF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🎉 Período de teste até {new Date(sub.trialEndsAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}

          {/* Billing type */}
          {canChangeBilling && (
            <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <p style={{ fontFamily: FONTS.condensed, fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                Forma de pagamento
              </p>

              {!showBillingOptions ? (
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#111', border: '1px solid #222',
                    padding: '0.65rem 0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>{BILLING_ICONS[billingType || 'PIX'] || '📱'}</span>
                      <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.8rem', color: '#CCC' }}>
                        {BILLING_LABELS[billingType || 'PIX'] || billingType || 'PIX'}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowBillingOptions(true)}
                      style={{
                        background: 'transparent', border: '1px solid #333',
                        color: '#AAA', cursor: 'pointer',
                        fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.65rem',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        padding: '0.3rem 0.65rem',
                      }}
                    >
                      ALTERAR
                    </button>
                  </div>

                  {billingType === 'PIX' && (
                    <p style={{ fontFamily: FONTS.condensed, fontSize: '0.6rem', color: '#555', margin: '0.35rem 0 0', letterSpacing: '0.04em' }}>
                      O pagamento via PIX é processado automaticamente na data de vencimento.
                    </p>
                  )}
                  {billingType === 'CREDIT_CARD' && (
                    <p style={{ fontFamily: FONTS.condensed, fontSize: '0.6rem', color: '#555', margin: '0.35rem 0 0', letterSpacing: '0.04em' }}>
                      A cobrança é automática no cartão de crédito cadastrado.
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <p style={{ fontFamily: FONTS.condensed, fontSize: '0.65rem', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Selecione a nova forma de pagamento:
                  </p>
                  {['PIX', 'CREDIT_CARD'].map(method => (
                    <button
                      key={method}
                      onClick={() => handleChangeBilling(method)}
                      disabled={changingBilling || method === billingType}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        background: method === billingType ? '#0A1A0A' : '#111',
                        border: `1px solid ${method === billingType ? '#4CAF5044' : '#222'}`,
                        color: method === billingType ? '#4CAF50' : '#CCC',
                        padding: '0.6rem 0.75rem',
                        cursor: changingBilling || method === billingType ? 'default' : 'pointer',
                        fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.8rem',
                        opacity: changingBilling ? 0.6 : method === billingType ? 0.5 : 1,
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{BILLING_ICONS[method]}</span>
                      <span>{BILLING_LABELS[method]}</span>
                      {method === billingType && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#4CAF50', letterSpacing: '0.05em' }}>ATUAL</span>
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowBillingOptions(false)}
                    disabled={changingBilling}
                    style={{
                      background: 'transparent', border: '1px solid #333',
                      color: '#888', cursor: changingBilling ? 'not-allowed' : 'pointer',
                      fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.65rem',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      padding: '0.4rem', marginTop: '0.25rem',
                      opacity: changingBilling ? 0.5 : 1,
                    }}
                  >
                    CANCELAR
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Features */}
          {sub.plan.features && sub.plan.features.length > 0 && (
            <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '1rem', marginTop: '1rem' }}>
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
                    {getFeatureLabel(f)}
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
            <button
              onClick={() => {
                if (panelAccessBlocked) {
                  toast.error('Regularize a assinatura para voltar ao painel.');
                  return;
                }
                navigate(getPanelPath(user));
              }}
              disabled={panelAccessBlocked}
              style={{
                flex: 1,
                background: 'transparent',
                color: panelAccessBlocked ? '#555' : '#888',
                border: '1px solid #222',
                borderRadius: '6px', padding: '0.6rem',
                fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.75rem',
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: panelAccessBlocked ? 'not-allowed' : 'pointer',
                opacity: panelAccessBlocked ? 0.65 : 1,
              }}
            >
              {panelAccessBlocked ? 'REGULARIZE PARA VOLTAR' : 'VOLTAR AO PAINEL'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
