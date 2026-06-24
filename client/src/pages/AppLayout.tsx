import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, CalendarCheck, School, GraduationCap, Users, Target, User, CreditCard, LockKeyhole } from 'lucide-react';
import { pageVariant as pageVariants, pageTransition, overlayVariant as overlayVariants, modalVariant as modalVariants } from '@/lib/animations';
import { COLORS } from '@/lib/design';
import { BELT_COLORS } from '@/lib/bjjrats-constants';
import api, { passkeys } from '@/lib/api';
import { toast } from 'sonner';
import BiometricEnrollPrompt from '@/components/BiometricEnrollPrompt';
import Dashboard from './app/Dashboard';
import History from './app/History';
import Community from './app/Community';
import Profile from './app/Profile';
import NewTraining from './app/NewTraining';
import Academy from './app/Academy';
import Professores from './app/Professores';
import Goals from './app/Goals';
import TrainingShareModal, { type TrainingData as ShareTrainingData, type ShareUserData } from './app/TrainingShareModal';
import ProfessorPanel from './app/ProfessorPanel';
import SubscriptionModal from './SubscriptionModal';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatures } from '@/hooks/useFeatures';
import { useSessionTab } from '@/hooks/useSessionTab';
import { FreePlanBanner, LockedFeaturePanel, PlusBadge, UpgradeModal, useUpgradePrompt } from '@/components/UpgradePrompt';

type Tab = 'dashboard' | 'history' | 'academy' | 'professores' | 'community' | 'goals' | 'profile';

const TABS: { id: Tab; label: string; feature?: string; icon: (active: boolean) => ReactNode }[] = [
  {
    id: 'dashboard',
    label: 'INÍCIO',
    icon: (active) => <LayoutDashboard size={22} color={active ? '#CC0000' : '#555'} strokeWidth={1.5} />,
  },
  {
    id: 'history',
    label: 'TREINOS',
    feature: 'training_history',
    icon: (active) => <CalendarCheck size={20} color={active ? '#CC0000' : '#555'} strokeWidth={1.5} />,
  },
  {
    id: 'academy',
    label: 'ACADEMIA',
    feature: 'academy_search',
    icon: (active) => <School size={20} color={active ? '#CC0000' : '#555'} strokeWidth={1.5} />,
  },
  {
    id: 'professores',
    label: 'PROFESSORES',
    feature: 'professor_search',
    icon: (active) => <GraduationCap size={20} color={active ? '#CC0000' : '#555'} strokeWidth={1.5} />,
  },
  {
    id: 'community',
    label: 'COMUNIDADE',
    feature: 'community',
    icon: (active) => <Users size={20} color={active ? '#CC0000' : '#555'} strokeWidth={1.5} />,
  },
  {
    id: 'goals',
    label: 'METAS',
    feature: 'goals',
    icon: (active) => <Target size={20} color={active ? '#CC0000' : '#555'} strokeWidth={1.5} />,
  },
  {
    id: 'profile',
    label: 'PERFIL',
    icon: (active) => <User size={20} color={active ? '#CC0000' : '#555'} strokeWidth={1.5} />,
  },
];
const APP_TAB_IDS = TABS.map(tab => tab.id);

function promotionModalSeenKey(userUid: string, notificationId: string) {
  return `promotion_modal_seen_${userUid}_${notificationId}`;
}

function hasSeenPromotionModal(userUid: string, notificationId: string) {
  try {
    return localStorage.getItem(promotionModalSeenKey(userUid, notificationId)) === '1';
  } catch {
    return false;
  }
}

function markPromotionModalSeen(userUid: string, notificationId: string) {
  try {
    localStorage.setItem(promotionModalSeenKey(userUid, notificationId), '1');
  } catch {
    // Ignora navegadores sem storage disponivel.
  }
}

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useSessionTab<Tab>(
    'bjjrats:app:active-tab',
    APP_TAB_IDS,
    'dashboard',
  );
  const [showNewTraining, setShowNewTraining] = useState(false);
  const [editTraining, setEditTraining] = useState<import('@/lib/bjjrats-constants').Training | null>(null);
  const [editExtraTraining, setEditExtraTraining] = useState<import('@/pages/app/NewTraining').ExtraTrainingData | null>(null);
  const [shareData, setShareData] = useState<ShareTrainingData | null>(null);
  const [showProfessorPanel, setShowProfessorPanel] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const professorPanelDismissedRef = useRef(false);
  const { profile, user, updateProfileData, logout } = useAuth();
  const { hasFeature, isFreePlan, planName } = useFeatures();
  const upgradePrompt = useUpgradePrompt();

  const handleLogout = async () => {
    if (!confirm('Deseja sair da sua conta?')) return;
    await logout();
  };

  // Donos de academia (admin/academy) ficam na tela Academy com CRM
  // Professores (professor / isAcademyAdmin) vão para o ProfessorPanel
  const isAcademyOwner = profile?.role === 'academy' || profile?.role === 'admin';
  const isProfessor = profile?.role === 'professor' || (profile?.isAcademyAdmin === true && !isAcademyOwner);

  // Professor vai direto para o painel de gestão (apenas na primeira carga, não após voltar)
  useEffect(() => {
    if (isProfessor && profile && !professorPanelDismissedRef.current) {
      setShowProfessorPanel(true);
    }
  }, [isProfessor, profile]);

  // Dono de academia vai direto para a aba ACADEMIA
  useEffect(() => {
    if (isAcademyOwner && profile) {
      setActiveTab('academy');
    }
  }, [isAcademyOwner, profile]);

  const visibleTabs = (isProfessor || isAcademyOwner)
    ? TABS.filter(tab => tab.id !== 'professores' && tab.id !== 'goals')
    : TABS;
  const isFeatureLocked = (feature?: string) => Boolean(
    isFreePlan && feature && !hasFeature(feature),
  );
  const handleTabSelect = (tab: typeof TABS[number]) => {
    if (isFeatureLocked(tab.feature)) {
      upgradePrompt.showUpgrade(tab.feature);
      return;
    }
    setActiveTab(tab.id);
    if (tab.id === 'community') setCommunityBadge(false);
  };
  const handleNewTraining = () => {
    if (isFeatureLocked('training_tracking')) {
      upgradePrompt.showUpgrade('training_tracking');
      return;
    }
    setShowNewTraining(true);
  };
  const activeTabConfig = TABS.find(tab => tab.id === activeTab);
  const activeFeatureLocked = isFeatureLocked(activeTabConfig?.feature);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!profile || !user) return;
    const hasPhoto = !!(profile.photo);
    const dismissed = sessionStorage.getItem(`photo_modal_dismissed_${user.uid}`);
    if (!hasPhoto && !dismissed) {
      const t = setTimeout(() => setShowPhotoModal(true), 1500);
      return () => clearTimeout(t);
    }
  }, [profile, user]);

  // ── Biometric enrollment prompt (após primeiro login) ────────────────────
  useEffect(() => {
    if (!user) return;
    const key = `biometric_prompt_dismissed_${user.uid}`;
    if (localStorage.getItem(key) === '1') return;
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return;

    // Pequeno delay para não competir com o prompt da foto
    const t = setTimeout(async () => {
      try {
        const creds = await passkeys.list();
        if (!creds || creds.length === 0) {
          setShowBiometricPrompt(true);
        }
      } catch { /* ignora erro */ }
    }, 3000);
    return () => clearTimeout(t);
  }, [user]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !user) return;
    setUploadingPhoto(true);
    try {
      const url = await api.upload.file(photoFile, 'perfil');
      await updateProfileData({ photo: url });
      setShowPhotoModal(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch {
      // silencioso
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDismissPhotoModal = () => {
    if (user) sessionStorage.setItem(`photo_modal_dismissed_${user.uid}`, '1');
    setShowPhotoModal(false);
  };

  const [promotionNotif, setPromotionNotif] = useState<{ id: string; title: string; message: string; belt: string } | null>(null);
  const [communityBadge, setCommunityBadge] = useState(false);
  const [requestNotif, setRequestNotif] = useState<{ title: string; message: string; approved: boolean } | null>(null);
  const [enrollmentInvite, setEnrollmentInvite] = useState<{
    notificationId: string;
    enrollmentId: string;
    message: string;
    professorUid?: string;
    professorName?: string;
    academyName?: string;
    monthlyFee?: number;
    firstAmount?: number;
    firstDueDate?: string;
  } | null>(null);
  const [processingEnrollmentInvite, setProcessingEnrollmentInvite] = useState(false);
  const [paymentNotif, setPaymentNotif] = useState<{ title: string; body: string; amount: number; dueDate: string; pixKey: string } | null>(null);
  const [socialNotifs, setSocialNotifs] = useState<Array<{ id: string; message: string; type: 'like' | 'comment' }>>([]);

  useEffect(() => {
    if (!user) return;
    const checkNotifications = async () => {
      try {
        const allNotifs = await api.notifications.list() as any[];
        const unread = allNotifs.filter((n: any) => !n.read);

        const alreadyShownPromos = unread.filter((n: any) => n.type === 'promotion' && hasSeenPromotionModal(user.uid, n.id));
        for (const seenPromo of alreadyShownPromos) {
          api.notifications.markRead(seenPromo.id).catch(() => undefined);
        }

        const promoNotif = unread.find((n: any) => n.type === 'promotion' && !hasSeenPromotionModal(user.uid, n.id));
        if (promoNotif) {
          markPromotionModalSeen(user.uid, promoNotif.id);
          setPromotionNotif({
            id: promoNotif.id,
            title: promoNotif.title || 'PROMOCAO DE FAIXA',
            message: promoNotif.message,
            belt: promoNotif.belt || promoNotif.data?.belt || promoNotif.data?.newBelt || 'Branca',
          });
          api.notifications.markRead(promoNotif.id).catch(() => undefined);
        }

        if (!isProfessor && !isAcademyOwner) {
          const reqNotif = unread.find((n: any) => n.type === 'request_approved' || n.type === 'request_rejected');
          if (reqNotif) {
            setRequestNotif({ title: reqNotif.title, message: reqNotif.message, approved: reqNotif.type === 'request_approved' });
            await api.notifications.markRead(reqNotif.id);
          }

          const enrollmentInviteNotif = unread.find((n: any) => n.type === 'enrollment_invite' && n.data?.enrollmentId);
          if (enrollmentInviteNotif) {
            setEnrollmentInvite({
              notificationId: enrollmentInviteNotif.id,
              enrollmentId: enrollmentInviteNotif.data.enrollmentId,
              message: enrollmentInviteNotif.message || 'Você recebeu um convite de matrícula.',
              professorUid: enrollmentInviteNotif.data.professorUid,
              professorName: enrollmentInviteNotif.data.professorName,
              academyName: enrollmentInviteNotif.data.academyName,
              monthlyFee: Number(enrollmentInviteNotif.data.monthlyFee) || 0,
              firstAmount: Number(enrollmentInviteNotif.data.firstAmount) || 0,
              firstDueDate: enrollmentInviteNotif.data.firstDueDate || '',
            });
          }

          const paymentNotifDoc = unread.find((n: any) => n.type === 'payment_due');
          if (paymentNotifDoc) {
            setPaymentNotif({ title: paymentNotifDoc.title, body: paymentNotifDoc.body, amount: paymentNotifDoc.amount || 0, dueDate: paymentNotifDoc.dueDate || '', pixKey: paymentNotifDoc.pixKey || '' });
            await api.notifications.markRead(paymentNotifDoc.id);
          }

          const socialDocs = unread.filter((n: any) => (n.type === 'like' || n.type === 'comment') && n.toUid === user.uid);
          if (socialDocs.length > 0) {
            setSocialNotifs(socialDocs.map((n: any) => ({ id: n.id, message: n.message || '', type: n.type as 'like' | 'comment' })));
            for (const sd of socialDocs) {
              try { await api.notifications.markRead(sd.id); } catch { /* silencioso */ }
            }
          }

          if (!paymentNotifDoc) {
            try {
              const today = new Date();
              const in3days = new Date(today); in3days.setDate(today.getDate() + 3);
              const todayStr = today.toISOString().slice(0, 10);
              const in3Str = in3days.toISOString().slice(0, 10);
              const payments = await api.payments.list({ studentUid: user.uid }) as any[];
              const nearDue = payments
                .filter((p: any) => p.status === 'pending' && p.dueDate >= todayStr && p.dueDate <= in3Str)
                .sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate));
              if (nearDue.length > 0) {
                const p = nearDue[0];
                const dueFormatted = new Date(p.dueDate + 'T00:00:00').toLocaleDateString('pt-BR');
                setPaymentNotif({
                  title: '⏰ Vencimento Próximo',
                  body: `Sua mensalidade de R$ ${p.amount?.toFixed(2)} vence em ${dueFormatted}.`,
                  amount: p.amount || 0,
                  dueDate: p.dueDate || '',
                  pixKey: p.pixKey || '',
                });
              }
            } catch { /* silencioso */ }
          }
        }
      } catch { /* silencioso */ }
    };
    checkNotifications();
  }, [user, isProfessor]);

  const dismissPromotionNotif = () => {
    if (user && promotionNotif) {
      markPromotionModalSeen(user.uid, promotionNotif.id);
      api.notifications.markRead(promotionNotif.id).catch(() => undefined);
    }
    setPromotionNotif(null);
  };

  const handleEnrollmentInviteResponse = async (accepted: boolean) => {
    if (!enrollmentInvite) return;
    setProcessingEnrollmentInvite(true);
    try {
      await api.enrollments.update(enrollmentInvite.enrollmentId, { status: accepted ? 'active' : 'cancelled' });
      await api.notifications.markRead(enrollmentInvite.notificationId);
      if (accepted) {
        try {
          await updateProfileData({
            academyId: enrollmentInvite.professorUid,
            academy: enrollmentInvite.academyName || '',
          });
        } catch { /* o servidor ja ativou o vínculo */ }
        toast.success('Matrícula aceita!');
      } else {
        toast.success('Convite recusado.');
      }
      setEnrollmentInvite(null);
    } catch {
      toast.error('Erro ao responder convite de matrícula');
    } finally {
      setProcessingEnrollmentInvite(false);
    }
  };

  if (showProfessorPanel) {
    return (
      <ProfessorPanel
        onBack={() => { professorPanelDismissedRef.current = true; setShowProfessorPanel(false); }}
        onLogout={isProfessor ? handleLogout : undefined}
        notificationSlot={<NotificationBell placement="inline" />}
      />
    );
  }

  if (showNewTraining || editTraining || editExtraTraining) {
    return (
      <NewTraining
        onBack={() => { setShowNewTraining(false); setEditTraining(null); setEditExtraTraining(null); }}
        onSaved={() => { setShowNewTraining(false); setEditTraining(null); setEditExtraTraining(null); setActiveTab('history'); }}
        onDeleted={() => { setShowNewTraining(false); setEditTraining(null); setEditExtraTraining(null); setActiveTab('history'); }}
        editTraining={editTraining ?? undefined}
        editExtraTraining={editExtraTraining ?? undefined}
      />
    );
  }

  const shareUser: ShareUserData = {
    name: profile?.name,
    belt: profile?.belt,
    academy: profile?.academy,
    photoURL: profile?.photo ?? undefined,
  };

  return (
    <div className="bjj-app-wrapper">
      <NotificationBell />

      {/* Promotion Notification Modal */}
      <AnimatePresence>
        {promotionNotif && (
          <motion.div
            key="promo"
            className="bjj-modal-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={dismissPromotionNotif}
          >
            <motion.div className="bjj-modal-box" variants={modalVariants} onClick={(e) => { e.stopPropagation(); dismissPromotionNotif(); }}>
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: BELT_COLORS[promotionNotif.belt] || '#CC0000', border: '4px solid #CC0000' }}
              >
                <span className="text-3xl">🏅</span>
              </div>
              <p className="text-[2rem] font-black text-white uppercase tracking-[0.05em] leading-tight mb-3 font-['Barlow_Condensed']">{promotionNotif.title}</p>
              <p className="text-base text-[#CCC] leading-relaxed mb-6 font-['Barlow']">{promotionNotif.message}</p>
              <p className="text-[0.75rem] text-[#555] uppercase tracking-[0.1em] font-['Barlow_Condensed']">Toque para fechar</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Notification */}
      <AnimatePresence>
        {requestNotif && (
          <motion.div
            key="request"
            className="bjj-modal-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={() => setRequestNotif(null)}
          >
            <motion.div className="bjj-modal-box" variants={modalVariants} onClick={e => e.stopPropagation()}>
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{
                  background: requestNotif.approved ? '#0D9E6E' : '#CC0000',
                  border: `4px solid ${requestNotif.approved ? '#0D9E6E' : '#CC0000'}`,
                }}
              >
                <span className="text-3xl">{requestNotif.approved ? '✅' : '❌'}</span>
              </div>
              <p className="text-[1.75rem] font-black text-white uppercase tracking-[0.05em] leading-tight mb-3 font-['Barlow_Condensed']">{requestNotif.title}</p>
              <p className="text-base text-[#CCC] leading-relaxed mb-6 font-['Barlow']">{requestNotif.message}</p>
              <p className="text-[0.75rem] text-[#555] uppercase tracking-[0.1em] font-['Barlow_Condensed']">Toque para fechar</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enrollment Invite */}
      <AnimatePresence>
        {enrollmentInvite && (
          <motion.div
            key="enrollment-invite"
            className="bjj-modal-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.div className="bjj-modal-box" variants={modalVariants} onClick={e => e.stopPropagation()}>
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: '#1A6ECC', border: '4px solid #1A6ECC' }}
              >
                <span className="text-3xl">📝</span>
              </div>
              <p className="text-[1.75rem] font-black text-white uppercase tracking-[0.05em] leading-tight mb-3 font-['Barlow_Condensed']">Convite de matrícula</p>
              <p className="text-base text-[#CCC] leading-relaxed mb-4 font-['Barlow']">{enrollmentInvite.message}</p>
              <div className="mb-6" style={{ background: '#111', border: '1px solid #2A2A2A', padding: '0.875rem', textAlign: 'left' }}>
                <p className="text-[0.75rem] text-[#888] uppercase font-['Barlow_Condensed']">Professor</p>
                <p className="text-sm text-white font-['Barlow']">{enrollmentInvite.professorName || 'Professor'}</p>
                {enrollmentInvite.academyName && (
                  <>
                    <p className="text-[0.75rem] text-[#888] uppercase font-['Barlow_Condensed'] mt-3">Academia</p>
                    <p className="text-sm text-white font-['Barlow']">{enrollmentInvite.academyName}</p>
                  </>
                )}
                <p className="text-[0.75rem] text-[#888] uppercase font-['Barlow_Condensed'] mt-3">Mensalidade</p>
                <p className="text-sm text-white font-['Barlow']">R$ {(enrollmentInvite.monthlyFee || 0).toFixed(2)}</p>
                {enrollmentInvite.firstDueDate && (
                  <p className="text-xs text-[#666] font-['Barlow'] mt-1">
                    Primeira cobrança prevista: R$ {(enrollmentInvite.firstAmount || enrollmentInvite.monthlyFee || 0).toFixed(2)} em {new Date(enrollmentInvite.firstDueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEnrollmentInviteResponse(false)}
                  disabled={processingEnrollmentInvite}
                  className="flex-1 py-3 text-sm font-black uppercase font-['Barlow_Condensed']"
                  style={{ background: '#1A0000', border: '1px solid #CC0000', color: '#FF6B6B', opacity: processingEnrollmentInvite ? 0.6 : 1 }}
                >
                  Recusar
                </button>
                <button
                  onClick={() => handleEnrollmentInviteResponse(true)}
                  disabled={processingEnrollmentInvite}
                  className="flex-1 py-3 text-sm font-black uppercase font-['Barlow_Condensed']"
                  style={{ background: '#0D9E6E', border: '1px solid #0D9E6E', color: '#FFF', opacity: processingEnrollmentInvite ? 0.6 : 1 }}
                >
                  {processingEnrollmentInvite ? 'Processando...' : 'Aceitar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Social Notifications */}
      <AnimatePresence>
        {socialNotifs.length > 0 && (
          <motion.div
            key="social"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-4 right-4 z-[9998] flex flex-col gap-2 max-w-[280px]"
          >
            {socialNotifs.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSocialNotifs(prev => prev.filter((_, idx) => idx !== i))}
                className="bjj-notification"
                style={{ cursor: 'pointer', borderColor: n.type === 'like' ? '#CC0000' : '#0D9E6E' }}
              >
                <span className="text-lg shrink-0">{n.type === 'like' ? '❤️' : '💬'}</span>
                <p className="text-[0.8rem] text-[#CCC] leading-tight flex-1 font-['Barlow']">{n.message}</p>
                <span className="text-[0.6rem] text-[#555] shrink-0 font-['Barlow_Condensed']">TAP</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Notification */}
      <AnimatePresence>
        {paymentNotif && (
          <motion.div
            key="payment"
            className="bjj-modal-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={() => setPaymentNotif(null)}
          >
            <motion.div className="bjj-modal-box" variants={modalVariants} onClick={e => e.stopPropagation()}>
              <div className="w-20 h-20 rounded-full bg-[#1A1000] border-4 border-[#FF8C00] mx-auto mb-6 flex items-center justify-center">
                <span className="text-3xl">💳</span>
              </div>
              <p className="text-[1.5rem] font-black text-white uppercase tracking-[0.05em] leading-tight mb-2 font-['Barlow_Condensed']">{paymentNotif.title}</p>
              <p className="text-[0.9rem] text-[#CCC] leading-relaxed mb-4 font-['Barlow']">{paymentNotif.body}</p>
              {paymentNotif.pixKey && (
                <div className="bg-[#111] border border-dashed border-[#FF8C00] rounded-xl p-3 mb-4 text-left">
                  <p className="text-[0.65rem] text-[#888] uppercase mb-1.5 font-['Barlow_Condensed']">CHAVE PIX DO PROFESSOR</p>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[0.8rem] text-[#FF8C00] break-all font-['Barlow']">{paymentNotif.pixKey}</span>
                    <button
                      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(paymentNotif!.pixKey); }}
                      className="bg-transparent border border-[#FF8C00] text-[#FF8C00] text-[0.65rem] font-bold uppercase px-2 py-1 shrink-0 font-['Barlow_Condensed'] rounded-md"
                    >COPIAR</button>
                  </div>
                </div>
              )}
              <button
                onClick={() => setPaymentNotif(null)}
                className="w-full bg-[#FF8C00] text-black text-[0.875rem] font-black uppercase py-3 rounded-xl font-['Barlow_Condensed']"
              >ENTENDIDO</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Modal */}
      <AnimatePresence>
        {showPhotoModal && (
          <motion.div
            key="photo"
            className="bjj-modal-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.div className="bjj-modal-box" variants={modalVariants}>
              <div
                className="w-20 h-20 rounded-full bg-[#1A1A1A] border-2 border-dashed border-[#333] mx-auto mb-4 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => document.getElementById('photo-modal-input')?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-3xl">📷</span>
                )}
              </div>
              <p className="text-[1.25rem] font-black text-white uppercase tracking-[0.05em] mb-2 font-['Barlow_Condensed']">ADICIONE SUA FOTO</p>
              <p className="text-[0.8rem] text-[#888] leading-relaxed mb-5 font-['Barlow']">
                Sua foto aparece no feed e no ranking. Ajuda outros atletas a te reconhecer.
              </p>
              <input id="photo-modal-input" type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              <button
                onClick={() => document.getElementById('photo-modal-input')?.click()}
                className="w-full bg-[#1A1A1A] border border-[#333] text-[#CCC] text-[0.8rem] font-bold uppercase py-2.5 rounded-xl mb-2 font-['Barlow_Condensed']"
              >{photoPreview ? 'TROCAR FOTO' : 'ESCOLHER FOTO'}</button>
              {photoFile && (
                <button
                  onClick={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="w-full bjj-btn-primary !py-3 !mb-2"
                >{uploadingPhoto ? 'ENVIANDO...' : 'SALVAR FOTO'}</button>
              )}
              <button
                onClick={handleDismissPhotoModal}
                className="w-full bg-transparent border-none text-[#444] text-[0.75rem] uppercase py-2 font-['Barlow_Condensed']"
              >AGORA NÃO</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Biometric Enrollment Prompt (pós-login) */}
      {showBiometricPrompt && user && (
        <BiometricEnrollPrompt
          userUid={user.uid}
          onClose={() => setShowBiometricPrompt(false)}
        />
      )}

      {/* Sidebar — Desktop only */}
      <aside className={`bjj-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="bjj-sidebar-logo">
          <span className="text-2xl">🥋</span>
          <span className="text-[1.25rem] font-black uppercase tracking-[0.08em] text-white font-['Barlow_Condensed']">
            BJJ<span className="text-[#CC0000]">RATS</span>
          </span>
          <button
            className="bjj-sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {profile && (
          <div className="bjj-sidebar-profile">
            <div className="bjj-sidebar-avatar">
              {profile.photo ? (
                <img src={profile.photo} alt="" />
              ) : (
                <span>🥋</span>
              )}
            </div>
            <div>
              <p className="bjj-sidebar-name">{profile.name || 'Atleta'}</p>
              {!isProfessor && !isAcademyOwner && <p className="bjj-sidebar-belt">{(profile as any).belt || 'Faixa Branca'}</p>}
            </div>
          </div>
        )}

        <nav className="bjj-sidebar-nav">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              className={`bjj-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabSelect(tab)}
            >
              {tab.icon(activeTab === tab.id)}
              <span>{tab.label}</span>
              {isFeatureLocked(tab.feature) && <PlusBadge />}
              {tab.id === 'community' && communityBadge && activeTab !== 'community' && (
                <span className="bjj-sidebar-badge" />
              )}
            </button>
          ))}
        </nav>

        <div className="bjj-sidebar-footer">
          <button className="bjj-sidebar-new-btn" onClick={handleNewTraining}>
            {isFeatureLocked('training_tracking') ? (
              <LockKeyhole size={14} />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
            <span>NOVO TREINO</span>
          </button>
          <button className="bjj-sidebar-logout-btn" onClick={() => setSubscriptionOpen(true)} style={{ color: '#AAA', borderColor: '#333' }}>
            <CreditCard size={13} strokeWidth={2} />
            <span>ASSINATURA</span>
          </button>
          <button className="bjj-sidebar-logout-btn" onClick={handleLogout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>SAIR</span>
          </button>

          {/* RAOS Tecnologia */}
          <a href="https://raostecnologia.com.br" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center mt-3 pt-3 border-t border-[#1A1A1A] no-underline group"
          >
            <img src="/raos-logo.png" alt="RAOS Tecnologia" className="h-[20px] w-auto object-contain opacity-45 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <div className="bjj-main-content">
        {isFreePlan && (
          <FreePlanBanner planName={planName} onUpgrade={() => upgradePrompt.showUpgrade()} />
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="pb-safe"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            {activeFeatureLocked ? (
              <LockedFeaturePanel
                featureKey={activeTabConfig?.feature}
                onUpgrade={() => upgradePrompt.showUpgrade(activeTabConfig?.feature)}
              />
            ) : (
              <>
                {activeTab === 'dashboard' && <Dashboard onNewTraining={handleNewTraining} onOpenProfessorPanel={isProfessor ? () => setShowProfessorPanel(true) : undefined} />}
                {activeTab === 'history' && <History onNewTraining={handleNewTraining} onShare={(data) => setShareData(data)} onEdit={(t) => setEditTraining(t)} onEditExtra={(t) => setEditExtraTraining(t)} />}
                {activeTab === 'academy' && <Academy />}
                {activeTab === 'professores' && <Professores />}
                {activeTab === 'community' && <Community onClearBadge={() => setCommunityBadge(false)} onNewPosts={() => setCommunityBadge(true)} />}
                {activeTab === 'goals' && <Goals />}
                {activeTab === 'profile' && <Profile onOpenProfessorPanel={isProfessor ? () => setShowProfessorPanel(true) : undefined} onEdit={(t) => setEditTraining(t)} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {shareData && (
          <TrainingShareModal
            training={shareData}
            user={shareUser}
            onClose={() => setShareData(null)}
            zIndex={9999}
            currentUserUid={user?.uid}
            currentUserAcademyId={profile?.academyId || undefined}
            currentUserAcademyName={profile?.academy || profile?.academyName || undefined}
            currentUserBelt={profile?.belt || undefined}
          />
        )}
      </div>

      {/* Tab Bar — Mobile only */}
      <nav className="bjj-tab-bar" style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}>
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            className={`bjj-tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabSelect(tab)}
          >
            {tab.icon(activeTab === tab.id)}
            {isFeatureLocked(tab.feature) && (
              <span style={{ position: 'absolute', top: '3px', right: '5px', color: '#FFD166' }}>
                <LockKeyhole size={10} strokeWidth={2.8} />
              </span>
            )}
            {tab.id === 'community' && communityBadge && activeTab !== 'community' && (
              <span className="absolute top-[4px] right-[8px] w-2 h-2 rounded-full bg-[#CC0000] border-[1.5px] border-[#0A0A0A]" />
            )}
            <span className="text-[0.48rem] tracking-[0.03em]">{tab.label}</span>
          </button>
        ))}
      </nav>

      <SubscriptionModal open={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} />
      <UpgradeModal
        open={upgradePrompt.open}
        featureKey={upgradePrompt.featureKey}
        onClose={upgradePrompt.closeUpgrade}
      />
    </div>
  );
}
