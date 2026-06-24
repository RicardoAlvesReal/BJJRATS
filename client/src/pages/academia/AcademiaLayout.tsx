// BJJRats — Painel de Gestão da Academia (role: academy / admin)

import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { tabVariant, tabTransition } from '@/lib/animations';
import api from '@/lib/api';
import Community from '../app/Community';
import NotificationBell from '@/components/NotificationBell';
import AcademiaDashboard from './AcademiaDashboard';
import AcademiaCrm from './AcademiaCrm';
import AcademiaAlunos from './AcademiaAlunos';
import AcademiaProfessores from './AcademiaProfessores';
import AcademiaFinanceiro from './AcademiaFinanceiro';
import AcademiaWhatsapp from './AcademiaWhatsapp';
import AcademiaPromocoes from './AcademiaPromocoes';
import SubscriptionModal from '../SubscriptionModal';
import { useFeatures } from '@/hooks/useFeatures';
import { useSessionTab } from '@/hooks/useSessionTab';
import { FreePlanBanner, LockedFeaturePanel, PlusBadge, UpgradeModal, useUpgradePrompt } from '@/components/UpgradePrompt';

type AcademiaTab = 'dashboard' | 'users' | 'professors' | 'promotions' | 'financeiro' | 'whatsapp' | 'crm' | 'community';

const NAV_ITEMS: { id: AcademiaTab; label: string; features?: string[] }[] = [
  { id: 'dashboard',  label: 'Dashboard', features: ['admin_dashboard', 'academy_dashboard'] },
  { id: 'users',      label: 'Alunos', features: ['user_management', 'student_management'] },
  { id: 'professors', label: 'Professores', features: ['multiple_professors'] },
  { id: 'promotions', label: 'Promocao', features: ['promotions'] },
  { id: 'financeiro', label: 'Financeiro', features: ['payments', 'revenue_analytics'] },
  { id: 'whatsapp',   label: 'WhatsApp'    },
  { id: 'crm',        label: 'CRM', features: ['crm'] },
  { id: 'community',  label: 'Comunidade'  },
];
const ACADEMY_TAB_IDS = NAV_ITEMS.map(item => item.id);

export default function AcademiaLayout() {
  const { user, logout, updateProfileData } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useSessionTab<AcademiaTab>(
    'bjjrats:academy:active-tab',
    ACADEMY_TAB_IDS,
    'dashboard',
  );
  const [uploading, setUploading] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasFeature, isFreePlan, planName } = useFeatures();
  const upgradePrompt = useUpgradePrompt();
  const isItemLocked = (item: typeof NAV_ITEMS[number]) => Boolean(
    isFreePlan
    && item.features?.length
    && !item.features.some(feature => hasFeature(feature)),
  );
  const handleTabSelect = (item: typeof NAV_ITEMS[number]) => {
    if (isItemLocked(item)) {
      upgradePrompt.showUpgrade(item.features?.[0]);
      return;
    }
    setTab(item.id);
  };
  const activeNavItem = NAV_ITEMS.find(item => item.id === tab);
  const activeFeatureKey = activeNavItem?.features?.[0];

  const checkWhatsApp = useCallback(async () => {
    try {
      const res = await api.whatsapp.status();
      setWhatsappConnected(res.connected === true);
    } catch { setWhatsappConnected(false); }
  }, []);

  useEffect(() => { checkWhatsApp(); }, [checkWhatsApp]);
  // Recarrega quando a aba volta ao foco
  useEffect(() => {
    const onFocus = () => checkWhatsApp();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkWhatsApp();
    });
    return () => window.removeEventListener('focus', onFocus);
  }, [checkWhatsApp]);

  const academyName = (user as any)?.academyName || (user as any)?.academy || 'ACADEMIA';
  const academyLogoUrl = (user as any)?.academyLogoUrl as string | undefined;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await api.upload.file(file, 'perfil');
      await updateProfileData({ academyLogoUrl: url } as any);
    } catch {
      // silencioso
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col font-['Barlow_Condensed']">
      {/* Top Bar */}
      <header
        className="bjj-glass-strong flex items-center justify-between px-5 h-14 sticky top-0 z-100"
        style={{ borderBottom: '2px solid #E87722' }}
      >
        <div className="flex items-center gap-3">
          {/* Logo da academia */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Clique para alterar a logo"
            className="flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden bg-[#1A1A1A] border border-[#2A2A2A] cursor-pointer hover:border-[#E87722] transition-colors disabled:opacity-50 shrink-0"
          >
            {academyLogoUrl ? (
              <img src={academyLogoUrl} alt={academyName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#444] font-black text-[0.9rem] leading-none">?</span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />

          <div className="flex flex-col leading-none">
            <span className="font-black text-[0.95rem] tracking-[0.1em] text-white uppercase">BJJRATS</span>
            <span className="font-bold text-[0.5rem] tracking-[0.25em] text-[#444] uppercase">GESTÃO</span>
          </div>
          <span
            style={{ background: '#E87722' }}
            className="text-white font-extrabold text-[0.6rem] tracking-[0.1em] px-1.5 py-0.5 uppercase"
          >
            ACADEMIA
          </span>
          <span className="text-[#888] font-bold text-[0.65rem] tracking-[0.08em] uppercase hidden sm:inline">
            {academyName}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell placement="inline" />
          <button
            onClick={() => setSubscriptionOpen(true)}
            style={{
              background: 'transparent',
              color: '#AAA',
              border: '1px solid #333',
              borderRadius: '6px',
              padding: '0.4rem 0.9rem',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Assinatura
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              color: '#E87722',
              border: '1px solid #E8772244',
              borderRadius: '6px',
              padding: '0.4rem 0.9rem',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Nav Tabs */}
      <nav className="bg-[#111] border-b border-[#222] flex px-5 overflow-x-auto">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => handleTabSelect(item)}
            className="bg-none border-none font-bold text-[0.8rem] tracking-[0.12em] uppercase px-4 py-3.5 cursor-pointer transition-colors duration-150 whitespace-nowrap"
            style={{
              borderBottom: tab === item.id ? '3px solid #E87722' : '3px solid transparent',
              color: tab === item.id ? '#FFF' : '#666',
            }}
          >
            {item.label}
            {isItemLocked(item) && <PlusBadge />}
          </button>
        ))}
      </nav>

      {isFreePlan && (
        <FreePlanBanner planName={planName} onUpgrade={() => upgradePrompt.showUpgrade()} />
      )}

      {/* Banner WhatsApp conectado */}
      {whatsappConnected && (
        <div style={{ padding: '0.45rem 1.25rem', background: '#0A1A0A', borderBottom: '1px solid #1A4A1A', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.9rem' }}>📱</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#25D366', textTransform: 'uppercase', letterSpacing: '0.06em' }}>NOTIFICAÇÕES VIA WHATSAPP ATIVADAS</span>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 p-6 px-5 w-full mx-auto" style={{ maxWidth: '1100px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={tabVariant}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={tabTransition}
          >
            {activeNavItem && isItemLocked(activeNavItem) ? (
              <LockedFeaturePanel
                featureKey={activeFeatureKey}
                onUpgrade={() => upgradePrompt.showUpgrade(activeFeatureKey)}
              />
            ) : (
              <>
                {tab === 'dashboard' && <AcademiaDashboard />}
                {tab === 'users'     && <AcademiaAlunos />}
                {tab === 'professors' && <AcademiaProfessores />}
                {tab === 'promotions' && <AcademiaPromocoes />}
                {tab === 'financeiro' && <AcademiaFinanceiro />}
                {tab === 'whatsapp'   && <AcademiaWhatsapp />}
                {tab === 'crm'       && <AcademiaCrm />}
                {tab === 'community' && <Community />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <SubscriptionModal open={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} />
      <UpgradeModal
        open={upgradePrompt.open}
        featureKey={upgradePrompt.featureKey}
        onClose={upgradePrompt.closeUpgrade}
      />
    </div>
  );
}
