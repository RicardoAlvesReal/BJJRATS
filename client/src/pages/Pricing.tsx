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
import {
  initGooglePlayBilling,
  isGooglePlayAvailable,
  purchaseSubscriptionOnGooglePlay,
} from '@/lib/googlePlayBilling';
import {
  initAppleBilling,
  isAppleAvailable,
  purchaseSubscriptionOnApple,
  restorePurchasesOnApple,
} from '@/lib/appleBilling';

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
  const [restoringApple, setRestoringApple] = useState(false);

  const handleRestoreApple = async () => {
    if (!user) { navigate('/login'); return; }
    setRestoringApple(true);
    try {
      const res = await restorePurchasesOnApple();
      if (res.success) {
        alert('Assinatura restaurada com sucesso!');
        navigate(getPanelPath(user));
      } else {
        alert(res.error || 'Nenhuma assinatura ativa encontrada na conta Apple para restaurar.');
      }
    } catch (err: any) {
      alert(err?.message || 'Erro ao restaurar compras na Apple.');
    } finally {
      setRestoringApple(false);
    }
  };

  useEffect(() => {
    if (isGooglePlayAvailable()) {
      initGooglePlayBilling().catch(() => {});
    }
    if (isAppleAvailable()) {
      initAppleBilling().catch(() => {});
    }

    api.subscriptions.listPlans()
      .then(setPlans)
      .finally(() => setLoading(false));

    // Verifica se já tem assinatura ativa
    if (user) {
      const hasActiveProfileTrial = Boolean(user.trialEndsAt && new Date(user.trialEndsAt) > new Date());
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
          } else if (hasActiveProfileTrial) {
            setActiveSubscription({
              id: 'trial',
              status: 'trial',
              planId: 'trial',
              isFree: true,
            });
          }
        })
        .catch(() => {
          if (hasActiveProfileTrial) {
            setActiveSubscription({
              id: 'trial',
              status: 'trial',
              planId: 'trial',
              isFree: true,
            });
          }
        });
    }
  }, [user]);

  const handleSubscribe = async (planId: string) => {
    if (!user) { navigate('/register'); return; }
    const selectedPlanData = plans.find(plan => plan.id === planId);
    const isFreePlan = Number(selectedPlanData?.price ?? 0) <= 0;
    setSelectedPlan(planId);
    setCreating(true);

    // No app iOS, assinaturas de planos pagos são processadas nativamente via Apple In-App Purchase / Apple Pay
    if (!isFreePlan && isAppleAvailable()) {
      try {
        const res = await purchaseSubscriptionOnApple(selectedPlanData?.slug || planId);
        if (res.success) {
          alert('Assinatura ativada com sucesso pela Apple!');
          navigate(getPanelPath(user));
        } else if (res.error) {
          alert(res.error);
        }
      } catch (err: any) {
        alert(err?.message || 'Erro ao processar assinatura na Apple.');
      } finally {
        setCreating(false);
        setSelectedPlan(null);
      }
      return;
    }

    // No app Android, assinaturas de planos pagos são processadas nativamente pela Play Store
    if (!isFreePlan && isGooglePlayAvailable()) {
      try {
        const res = await purchaseSubscriptionOnGooglePlay(selectedPlanData?.slug || planId);
        if (res.success) {
          alert('Assinatura ativada com sucesso pelo Google Play!');
          navigate(getPanelPath(user));
        } else if (res.error) {
          alert(res.error);
        }
      } catch (err: any) {
        alert(err?.message || 'Erro ao processar assinatura no Google Play.');
      } finally {
        setCreating(false);
        setSelectedPlan(null);
      }
      return;
    }

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

      if (result.subscription.status === 'trial') {
        setActiveSubscription({
          id: result.subscription.id,
          status: result.subscription.status,
          planId,
          isFree: false,
        });
        alert('Período grátis ativado! Nenhum pagamento será feito agora.');
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
  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const isFreePlanSelected = selectedPlanData ? Number(selectedPlanData.price) <= 0 : false;

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

        {activeSubscription && (activeSubscription.status === 'active' || activeSubscription.status === 'trial') && (
          <motion.div variants={fadeUp} className="flex justify-center mb-8">
            <div
              style={{
                background: 'linear-gradient(135deg, #0A2010 0%, #102A18 100%)',
                border: '1px solid #22C55E66',
                padding: '1rem 1.5rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                width: '100%',
                maxWidth: '650px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🎉</span>
                <div>
                  <p style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.95rem', color: '#4ADE80', margin: 0, textTransform: 'uppercase' }}>
                    {activeSubscription.status === 'trial' ? 'Você já está no período de teste ativo!' : 'Você já possui uma assinatura ativa!'}
                  </p>
                  <p style={{ fontFamily: FONTS.condensed, fontSize: '0.8rem', color: '#888', margin: '0.2rem 0 0' }}>
                    Seu acesso à plataforma está liberado.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(getPanelPath(user))}
                style={{
                  background: '#22C55E',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1.25rem',
                  fontFamily: FONTS.condensed,
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                IR PARA MEU PAINEL →
              </button>
            </div>
          </motion.div>
        )}

        {/* Banner do Google Play para app Android */}
        {hasPaidPlans && !isFreePlanSelected && isGooglePlayAvailable() && (
          <div className="flex justify-center mb-6">
            <div
              style={{
                background: '#161616',
                border: '1px solid #333',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: '#EEE',
                fontFamily: FONTS.condensed,
                fontSize: '0.85rem',
                letterSpacing: '0.04em',
              }}
            >
              <span style={{ fontSize: '1.1rem', color: '#34A853' }}>▶</span>
              <span>Assinatura protegida e cobrada pela sua conta <strong>Google Play</strong></span>
            </div>
          </div>
        )}

        {/* CPF/CNPJ — apenas para planos pagos via PIX no navegador */}
        {hasPaidPlans && billingType === 'PIX' && !isFreePlanSelected && !isGooglePlayAvailable() && !isAppleAvailable() && (
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
        {hasPaidPlans && !isFreePlanSelected && !isGooglePlayAvailable() && !isAppleAvailable() && (
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
                        : isGooglePlayAvailable()
                          ? 'ASSINAR COM GOOGLE PLAY'
                          : isAppleAvailable()
                            ? 'ASSINAR COM APPLE PAY'
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

        {/* Apple App Store & Google Play Compliance / Restore Purchases Footer */}
        <motion.div variants={fadeUp} style={{ marginTop: '2.5rem', textAlign: 'center', maxWidth: '640px', marginInline: 'auto' }}>
          {isAppleAvailable() && (
            <div style={{ marginBottom: '1.25rem' }}>
              <button
                onClick={handleRestoreApple}
                disabled={restoringApple}
                style={{
                  background: '#1A1A1A',
                  color: '#DDD',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  padding: '0.65rem 1.25rem',
                  fontFamily: FONTS.condensed,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: restoringApple ? 'not-allowed' : 'pointer',
                  opacity: restoringApple ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>🔄</span>
                <span>{restoringApple ? 'RESTAURANDO COMPRAS...' : 'RESTAURAR COMPRAS ANTERIORES'}</span>
              </button>
            </div>
          )}

          {/* Guidelines 3.1.2 Auto-Renewing Subscriptions Disclosure */}
          <div style={{ background: '#11111188', border: '1px solid #222', borderRadius: '8px', padding: '1rem', color: '#777', fontSize: '0.72rem', lineHeight: '1.4', fontFamily: FONTS.condensed }}>
            <p style={{ margin: '0 0 0.5rem', color: '#999', fontWeight: 700 }}>
              INFORMAÇÕES SOBRE A ASSINATURA:
            </p>
            <p style={{ margin: '0 0 0.5rem' }}>
              • O pagamento é processado pela conta da plataforma (Apple ID no iOS ou Google Play no Android) na confirmação da compra.
              <br />
              • A assinatura é renovada automaticamente todo mês, a menos que seja cancelada pelo menos 24 horas antes do término do período vigente.
              <br />
              • Você pode gerenciar ou cancelar sua assinatura a qualquer momento nos Ajustes da sua conta da loja de aplicativos.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #222' }}>
              <a
                href="/termos"
                onClick={(e) => { e.preventDefault(); navigate('/termos'); }}
                style={{ color: '#CC0000', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}
              >
                Termos de Uso (EULA)
              </a>
              <span style={{ color: '#444' }}>•</span>
              <a
                href="/privacidade"
                onClick={(e) => { e.preventDefault(); navigate('/privacidade'); }}
                style={{ color: '#CC0000', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}
              >
                Política de Privacidade
              </a>
            </div>
          </div>
        </motion.div>
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

