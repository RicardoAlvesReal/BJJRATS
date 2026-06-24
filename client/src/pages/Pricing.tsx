// BJJRats — Página de Planos / Pricing

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import api, { type Plan } from '@/lib/api';
import { openExternalUrl } from '@/lib/native';
import { useAuth } from '@/contexts/AuthContext';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { FONTS } from '@/lib/design';
import { FEATURE_LABELS } from '@/lib/features';

type BillingType = 'PIX' | 'CREDIT_CARD';

function getPanelPath(user?: { role?: string } | null) {
  if (!user) return '/login';
  if (user.role === 'superadmin') return '/admin';
  if (user.role === 'academy' || user.role === 'admin') return '/academia';
  return '/app';
}

export default function PricingPage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingType, setBillingType] = useState<BillingType>('PIX');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [creating, setCreating] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode?: string; copiaECola?: string } | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<{ id: string; status: string; planId: string; isFree: boolean } | null>(null);

  useEffect(() => {
    api.subscriptions.listPlans()
      .then(setPlans)
      .finally(() => setLoading(false));

    // Verifica se já tem assinatura ativa
    if (user) {
      api.subscriptions.getMy()
        .then(data => {
          const sub = data?.subscription;
          if (sub && ['active', 'trial', 'past_due'].includes(sub.status)) {
            setActiveSubscription({
              id: sub.id,
              status: sub.status,
              planId: sub.planId,
              isFree: Number(sub.plan?.price) <= 0,
            });
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSubscribe = async (planId: string) => {
    if (!user) { navigate('/register'); return; }
    const selectedPlanData = plans.find(plan => plan.id === planId);
    const isFreePlan = Number(selectedPlanData?.price ?? 0) <= 0;
    setSelectedPlan(planId);
    setCreating(true);
    try {
      if (!isFreePlan && billingType === 'PIX' && (!cpfCnpj || cpfCnpj.replace(/\D/g, '').length < 11)) {
        alert('Para pagamento via PIX é obrigatório informar o CPF ou CNPJ.');
        setCreating(false);
        setSelectedPlan(null);
        return;
      }
      const result = await api.subscriptions.create({ planId, billingType, cpfCnpj });
      const payment = result.subscription.payment;

      if (result.subscription.isFree) {
        setActiveSubscription({
          id: result.subscription.id,
          status: result.subscription.status,
          planId,
          isFree: true,
        });
        alert('Plano gratuito ativado com sucesso!');
        navigate(getPanelPath(user));
        return;
      }

      // PIX: mostra QR code no modal
      if (billingType === 'PIX') {
        if (payment?.pixQrCode) {
          setPixData({
            qrCode: payment.pixQrCode,
            copiaECola: (payment as any).pixCopiaECola || '',
          });
        } else {
          alert('Não foi possível gerar o QR Code PIX. Tente novamente.');
        }
        setCreating(false);
        return;
      }

      // Cartão: abre checkout em nova aba
      if (billingType === 'CREDIT_CARD') {
        const paymentUrl = payment?.invoiceUrl || payment?.bankSlipUrl;
        if (paymentUrl) {
          openExternalUrl(paymentUrl);
        }
        setCreating(false);
        navigate('/app/subscription');
        return;
      }

      navigate('/app/subscription');
    } catch (err: any) {
      alert(err?.message || 'Erro ao criar assinatura');
    } finally {
      setCreating(false);
      setSelectedPlan(null);
    }
  };

  const planIcons: Record<string, string> = {
    aluno: '🥋',
    professor: '👨‍🏫',
    academia: '🏛️',
  };

  const planColors: Record<string, string> = {
    aluno: '#3B82F6',
    professor: '#8B5CF6',
    academia: '#CC0000',
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const visiblePlans = plans.filter(plan => {
    if (!user || user.role === 'superadmin') return true;
    if (user.role === 'student') return plan.roleAssigned === 'student';
    if (user.role === 'professor') return plan.roleAssigned === 'professor';
    if (user.role === 'academy' || user.role === 'admin') return plan.roleAssigned === 'academy';
    return true;
  });
  const hasPaidPlans = visiblePlans.some(plan => Number(plan.price) > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="bjj-skeleton h-64 w-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-4 py-12">
      {user && (
        <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#666' }}>{user.name || user.email}</span>
          <button onClick={() => navigate(getPanelPath(user))}
            style={{ background: '#111', border: '1px solid #333', color: '#AAA', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer' }}>
            MEU PAINEL
          </button>
          <button onClick={handleLogout}
            style={{ background: 'transparent', border: '1px solid #CC000044', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer' }}>
            SAIR
          </button>
        </div>
      )}
      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="w-full" style={{ maxWidth: '1000px' }}>
        <motion.div variants={fadeUp} className="text-center mb-10">
          <h1 style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '2.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
            Escolha seu plano
          </h1>
          <p style={{ fontFamily: FONTS.condensed, fontSize: '1rem', color: '#666', marginTop: '0.5rem', letterSpacing: '0.05em' }}>
            BJJRATS
          </p>
        </motion.div>

        {/* CPF/CNPJ — apenas para PIX */}
        {hasPaidPlans && billingType === 'PIX' && (
          <div className="flex justify-center mb-3">
            <input
              type="text"
              inputMode="numeric"
              placeholder="CPF ou CNPJ (obrigatório)"
              value={cpfCnpj}
              onChange={e => setCpfCnpj(e.target.value.replace(/\D/g, ''))}
              maxLength={14}
              style={{
                background: '#1A1A1A', border: '1px solid #333', color: '#FFF',
                fontFamily: FONTS.condensed, fontSize: '0.9rem',
                padding: '0.65rem 1rem', width: '280px', textAlign: 'center',
                outline: 'none', letterSpacing: '0.05em',
              }}
            />
          </div>
        )}
        {hasPaidPlans && (
        <motion.div variants={fadeUp} className="flex flex-col items-center gap-3 mb-6">
          <div className="flex justify-center gap-2">
          {(['PIX', 'CREDIT_CARD'] as BillingType[]).map(bt => (
            <button
              key={bt}
              onClick={() => setBillingType(bt)}
              style={{
                background: billingType === bt ? '#CC0000' : '#1A1A1A',
                color: billingType === bt ? '#FFF' : '#888',
                border: billingType === bt ? '1px solid #CC0000' : '1px solid #333',
                fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.75rem',
                letterSpacing: '0.1em', padding: '0.5rem 1.25rem', cursor: 'pointer',
                borderRadius: '6px', textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
            >
              {bt === 'CREDIT_CARD' ? 'Cartão' : 'PIX'}
            </button>
          ))}
          </div>
        </motion.div>
        )}

        {/* Plan cards */}
        {activeSubscription && (
          <motion.div variants={fadeUp} style={{
            background: '#1A2A1A', border: '1px solid #2A5A2A',
            padding: '0.75rem 1rem', textAlign: 'center',
            marginBottom: '0.5rem', maxWidth: '600px', width: '100%',
          }}>
            <p style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.8rem', color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              {activeSubscription.isFree
                ? 'Você está no plano gratuito. Escolha um plano PLUS para liberar mais recursos.'
                : '✅ Você já é assinante! Acesse seu painel para gerenciar sua assinatura.'}
            </p>
          </motion.div>
        )}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visiblePlans.map((plan, i) => {
            const isPopular = plan.slug === 'professor';
            const color = planColors[plan.slug] || '#FFF';
            const trialDays = Number(plan.trialDays ?? 0);
            const isFreePlan = Number(plan.price) <= 0;
            const isCurrentPlan = activeSubscription?.planId === plan.id;
            const canUpgradeFromFree = activeSubscription?.isFree === true && !isFreePlan;
            const subscriptionBlocksSelection = Boolean(activeSubscription) && !canUpgradeFromFree;
            return (
              <div
                key={plan.id}
                style={{
                  background: isPopular ? '#111' : '#0D0D0D',
                  border: isPopular ? `2px solid ${color}` : '1px solid #222',
                  borderRadius: '12px', padding: '1.5rem',
                  display: 'flex', flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {isPopular && (
                  <span style={{
                    position: 'absolute', top: '-0.6rem', left: '50%', transform: 'translateX(-50%)',
                    background: color, color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 800,
                    fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.2rem 0.75rem',
                    borderRadius: '4px', textTransform: 'uppercase',
                  }}>
                    Mais popular
                  </span>
                )}

                <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{planIcons[plan.slug] || '📋'}</div>
                <h2 style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.25rem', color: '#FFF', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {plan.name}
                </h2>
                <p style={{ fontFamily: FONTS.condensed, fontSize: '0.75rem', color: '#666', marginBottom: '1rem', minHeight: '2.5rem' }}>
                  {plan.description}
                </p>

                <div style={{ marginBottom: '1.25rem' }}>
                  <span style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '2.25rem', color }}>
                    {isFreePlan ? 'GRÁTIS' : `R$ ${plan.price.toFixed(2)}`}
                  </span>
                  {!isFreePlan && (
                    <span style={{ fontFamily: FONTS.condensed, fontSize: '0.75rem', color: '#666' }}>/mês</span>
                  )}
                  {!isFreePlan && trialDays > 0 && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <span style={{
                        background: '#3B82F6', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 800,
                        fontSize: '0.65rem', letterSpacing: '0.08em', padding: '0.15rem 0.5rem', textTransform: 'uppercase',
                      }}>
                        {trialDays} DIAS GRÁTIS
                      </span>
                    </div>
                  )}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', flex: 1 }}>
                  {FEATURE_LABELS.filter(f => plan.features.includes(f.key)).map(f => (
                    <li key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', fontFamily: FONTS.condensed, fontSize: '0.8rem', color: '#BBB' }}>
                      <span style={{ color: '#22C55E', fontSize: '0.7rem' }}>✓</span>
                      {f.label}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={creating || subscriptionBlocksSelection}
                  title={isCurrentPlan ? 'Este é o seu plano atual' : undefined}
                  style={{
                    background: subscriptionBlocksSelection ? '#2A2A2A' : color,
                    color: subscriptionBlocksSelection ? '#777' : '#FFF',
                    border: subscriptionBlocksSelection ? '1px solid #333' : 'none',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.8rem',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: subscriptionBlocksSelection ? 'not-allowed' : creating && selectedPlan === plan.id ? 'not-allowed' : 'pointer',
                    opacity: subscriptionBlocksSelection ? 0.6 : creating && selectedPlan === plan.id ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {creating && selectedPlan === plan.id
                    ? 'ATIVANDO...'
                    : isCurrentPlan
                      ? 'PLANO ATUAL'
                      : canUpgradeFromFree
                        ? 'TORNAR-SE PLUS'
                        : activeSubscription
                          ? 'JÁ ASSINANTE'
                      : isFreePlan
                        ? 'ATIVAR GRÁTIS'
                        : 'ASSINAR'}
                </button>
              </div>
            );
          })}
        </motion.div>

        {visiblePlans.length === 0 && (
          <p style={{ textAlign: 'center', color: '#555', fontFamily: FONTS.condensed, fontSize: '1rem', marginTop: '2rem' }}>
            Nenhum plano disponível no momento.
          </p>
        )}
      </motion.div>

      {/* Modal PIX */}
      {pixData && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: '1rem' }}
          onClick={() => { setPixData(null); navigate('/app/subscription'); }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '2rem', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Pagamento <span style={{ color: '#22C55E' }}>PIX</span>
            </h2>
            <p style={{ fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#888', marginBottom: '1.5rem' }}>
              Escaneie o QR code ou copie o código PIX
            </p>

            {pixData.qrCode ? (
              <img src={`data:image/png;base64,${pixData.qrCode}`} alt="QR Code PIX"
                style={{ width: '200px', height: '200px', margin: '0 auto 1rem', background: '#FFF', padding: '0.5rem', borderRadius: '8px' }} />
            ) : (
              <div style={{ width: '200px', height: '200px', margin: '0 auto 1rem', background: '#1A1A1A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontFamily: FONTS.condensed, fontSize: '0.8rem' }}>
                QR Code não disponível
              </div>
            )}

            {pixData.copiaECola && (
              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(pixData.copiaECola!); alert('Código PIX copiado!'); }}
                  style={{ background: '#1A1A1A', border: '1px dashed #333', color: '#AAA', fontFamily: 'monospace', fontSize: '0.65rem', padding: '0.6rem', width: '100%', cursor: 'pointer', borderRadius: '6px', wordBreak: 'break-all', textAlign: 'left' }}>
                  📋 {pixData.copiaECola.substring(0, 80)}...
                </button>
              </div>
            )}

            <button onClick={() => { setPixData(null); navigate('/app/subscription'); }}
              style={{ background: '#CC0000', color: '#FFF', border: 'none', fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.1em', padding: '0.75rem 2rem', cursor: 'pointer', borderRadius: '6px', textTransform: 'uppercase', width: '100%' }}>
              JÁ PAGUEI
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

