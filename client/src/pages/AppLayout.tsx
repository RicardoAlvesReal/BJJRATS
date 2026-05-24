// BJJRats PWA — App Layout with TabBar
// Design: "Cage Fighter" — Brutalismo Tático

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import Dashboard from './app/Dashboard';
import History from './app/History';
import Community from './app/Community';
import Profile from './app/Profile';
import NewTraining from './app/NewTraining';
import Academy from './app/Academy';
import Goals from './app/Goals';
import TrainingShareModal, { type TrainingData as ShareTrainingData, type ShareUserData } from './app/TrainingShareModal';
import ProfessorPanel from './app/ProfessorPanel';
import { useAuth } from '@/contexts/AuthContext';
type Tab = 'dashboard' | 'history' | 'academy' | 'community' | 'goals' | 'profile';

const TABS: { id: Tab; label: string; icon: (active: boolean) => ReactNode }[] = [
  {
    id: 'dashboard',
    label: 'INÍCIO',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#CC0000' : '#444'} stroke="none">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'TREINOS',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#CC0000' : '#444'} strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="0" ry="0"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="8" y1="14" x2="8" y2="14" strokeLinecap="square" strokeWidth="3"/>
        <line x1="12" y1="14" x2="12" y2="14" strokeLinecap="square" strokeWidth="3"/>
        <line x1="16" y1="14" x2="16" y2="14" strokeLinecap="square" strokeWidth="3"/>
      </svg>
    ),
  },
  {
    id: 'academy',
    label: 'ACADEMIA',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#CC0000' : '#444'} strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'community',
    label: 'COMUNIDADE',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#CC0000' : '#444'} strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: 'goals',
    label: 'METAS',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#CC0000' : '#444'} strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'PERFIL',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#CC0000' : '#444'} strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function AppLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showNewTraining, setShowNewTraining] = useState(false);
  const [editTraining, setEditTraining] = useState<import('@/lib/bjjrats-constants').Training | null>(null);
  const [editExtraTraining, setEditExtraTraining] = useState<import('@/pages/app/NewTraining').ExtraTrainingData | null>(null);
  const [shareData, setShareData] = useState<ShareTrainingData | null>(null);
  const [showProfessorPanel, setShowProfessorPanel] = useState(false);
  const { profile, user, updateProfileData, logout } = useAuth();

  const handleLogout = async () => {
    if (!confirm('Deseja sair da sua conta?')) return;
    await logout();
  };
  const isProfessor = profile?.role === 'professor';
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Verificar se o usuário não tem foto ao carregar o perfil
  useEffect(() => {
    if (!profile || !user) return;
    const hasPhoto = !!(profile.photo);
    const dismissed = sessionStorage.getItem(`photo_modal_dismissed_${user.uid}`);
    if (!hasPhoto && !dismissed) {
      // Mostrar modal após 1.5s para não assustar o usuário no primeiro acesso
      const t = setTimeout(() => setShowPhotoModal(true), 1500);
      return () => clearTimeout(t);
    }
  }, [profile, user]);

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
      // silencioso — não bloquear o usuário
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDismissPhotoModal = () => {
    if (user) sessionStorage.setItem(`photo_modal_dismissed_${user.uid}`, '1');
    setShowPhotoModal(false);
  };

  // Verificar notificações de promoção pendentes
  const [promotionNotif, setPromotionNotif] = useState<{ title: string; message: string; belt: string } | null>(null);
  const [communityBadge, setCommunityBadge] = useState(false);
  const [requestNotif, setRequestNotif] = useState<{ title: string; message: string; approved: boolean } | null>(null);
  const [paymentNotif, setPaymentNotif] = useState<{ title: string; body: string; amount: number; dueDate: string; pixKey: string } | null>(null);
  const [socialNotifs, setSocialNotifs] = useState<Array<{ id: string; message: string; type: 'like' | 'comment' }>>([]);

  useEffect(() => {
    if (!user) return;
    const checkNotifications = async () => {
      try {
        const allNotifs = await api.notifications.list() as any[];
        const unread = allNotifs.filter((n: any) => !n.read);

        const promoNotif = unread.find((n: any) => n.type === 'promotion');
        if (promoNotif) {
          setPromotionNotif({ title: promoNotif.title, message: promoNotif.message, belt: promoNotif.belt });
          await api.notifications.markRead(promoNotif.id);
        }

        if (!isProfessor) {
          const reqNotif = unread.find((n: any) => n.type === 'request_approved' || n.type === 'request_rejected');
          if (reqNotif) {
            setRequestNotif({ title: reqNotif.title, message: reqNotif.message, approved: reqNotif.type === 'request_approved' });
            await api.notifications.markRead(reqNotif.id);
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
                  body: `Sua mensalidade de R$ ${p.amount?.toFixed(2)} vence em ${dueFormatted}. Pague via PIX para não ficar em atraso.`,
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

  if (showProfessorPanel) {
    return <ProfessorPanel onBack={() => setShowProfessorPanel(false)} />;
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
    // Usar foto do perfil
    photoURL: profile?.photo ?? undefined,
  };

  const BELT_COLORS_MAP: Record<string, string> = {
    Branca: '#FFFFFF', Azul: '#1A6ECC', Roxa: '#7B2FBE', Marrom: '#8B4513', Preta: '#111111',
  };

  return (
    <div className="bjj-app-wrapper">
      {/* Banner de promoção de faixa */}
      {promotionNotif && (
        <div
          onClick={() => setPromotionNotif(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.92)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', cursor: 'pointer',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '320px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: BELT_COLORS_MAP[promotionNotif.belt] || '#CC0000', margin: '0 auto 1.5rem', border: '4px solid #CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '2rem' }}>🏅</span>
            </div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em', lineHeight: 1.1, marginBottom: '0.75rem' }}>{promotionNotif.title}</p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '1rem', color: '#CCC', lineHeight: 1.5, marginBottom: '2rem' }}>{promotionNotif.message}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Toque para fechar</p>
          </div>
        </div>
      )}

      {/* Notificação de aprovação/recusa de vínculo */}
      {requestNotif && (
        <div
          onClick={() => setRequestNotif(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.92)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', cursor: 'pointer',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '320px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: requestNotif.approved ? '#0D9E6E' : '#CC0000',
              margin: '0 auto 1.5rem', border: `4px solid ${requestNotif.approved ? '#0D9E6E' : '#CC0000'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '2.5rem' }}>{requestNotif.approved ? '✅' : '❌'}</span>
            </div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.75rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em', lineHeight: 1.1, marginBottom: '0.75rem' }}>{requestNotif.title}</p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '1rem', color: '#CCC', lineHeight: 1.5, marginBottom: '2rem' }}>{requestNotif.message}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Toque para fechar</p>
          </div>
        </div>
      )}

      {/* Notificações sociais (curtidas e comentários) */}
      {socialNotifs.length > 0 && (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9998, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '280px' }}>
          {socialNotifs.map((n, i) => (
            <div
              key={n.id}
              onClick={() => setSocialNotifs(prev => prev.filter((_, idx) => idx !== i))}
              style={{ background: '#111', border: `1px solid ${n.type === 'like' ? '#CC0000' : '#0D9E6E'}`, padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem', boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{n.type === 'like' ? '❤️' : '💬'}</span>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#CCC', lineHeight: 1.3, flex: 1 }}>{n.message}</p>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', flexShrink: 0 }}>TAP</span>
            </div>
          ))}
        </div>
      )}

      {/* Notificação de cobrança para o aluno */}
      {paymentNotif && (
        <div
          onClick={() => setPaymentNotif(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.92)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', cursor: 'pointer',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '320px' }} onClick={e => e.stopPropagation()}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: '#1A1000', border: '4px solid #FF8C00',
              margin: '0 auto 1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '2.5rem' }}>💳</span>
            </div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.05em', lineHeight: 1.1, marginBottom: '0.5rem' }}>{paymentNotif.title}</p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: '#CCC', lineHeight: 1.5, marginBottom: '1rem' }}>{paymentNotif.body}</p>
            {paymentNotif.pixKey && (
              <div style={{ background: '#111', border: '1px dashed #FF8C00', padding: '0.75rem', marginBottom: '1rem', textAlign: 'left' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.375rem' }}>CHAVE PIX DO PROFESSOR</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#FF8C00', wordBreak: 'break-all' }}>{paymentNotif.pixKey}</span>
                  <button
                    onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(paymentNotif!.pixKey); }}
                    style={{ background: 'transparent', border: '1px solid #FF8C00', color: '#FF8C00', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.25rem 0.5rem', cursor: 'pointer', flexShrink: 0 }}
                  >COPIAR</button>
                </div>
              </div>
            )}
            <button
              onClick={() => setPaymentNotif(null)}
              style={{ background: '#FF8C00', border: 'none', color: '#000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.75rem 2rem', cursor: 'pointer', width: '100%' }}
            >ENTENDIDO</button>
          </div>
        </div>
      )}

      {/* Modal de foto obrigatória */}
      {showPhotoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: '#111', border: '1px solid #222', padding: '1.5rem', maxWidth: '320px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#1A1A1A', border: '3px dashed #333', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => document.getElementById('photo-modal-input')?.click()}>
              {photoPreview ? (
                <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <span style={{ fontSize: '2rem' }}>📷</span>
              )}
            </div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>ADICIONE SUA FOTO</p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', lineHeight: 1.5, marginBottom: '1.25rem' }}>Sua foto aparece no feed da comunidade, nos posts de treino e no ranking. Ajuda outros atletas a te reconhecer.</p>
            <input id="photo-modal-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
            <button
              onClick={() => document.getElementById('photo-modal-input')?.click()}
              style={{ background: '#1A1A1A', border: '1px solid #333', color: '#CCC', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem 1rem', cursor: 'pointer', width: '100%', marginBottom: '0.5rem' }}
            >{photoPreview ? 'TROCAR FOTO' : 'ESCOLHER FOTO'}</button>
            {photoFile && (
              <button
                onClick={handlePhotoUpload}
                disabled={uploadingPhoto}
                style={{ background: '#CC0000', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.75rem 1rem', cursor: uploadingPhoto ? 'not-allowed' : 'pointer', width: '100%', marginBottom: '0.5rem', opacity: uploadingPhoto ? 0.7 : 1 }}
              >{uploadingPhoto ? 'ENVIANDO...' : 'SALVAR FOTO'}</button>
            )}
            <button
              onClick={handleDismissPhotoModal}
              style={{ background: 'transparent', border: 'none', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.5rem', cursor: 'pointer', width: '100%' }}
            >AGORA NÃO</button>
          </div>
        </div>
      )}

      {/* Sidebar — apenas desktop */}
      <aside className="bjj-sidebar">
        {/* Logo */}
        <div className="bjj-sidebar-logo">
          <span style={{ fontSize: '1.5rem' }}>🥋</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFF' }}>
            BJJ<span style={{ color: '#CC0000' }}>RATS</span>
          </span>
        </div>

        {/* Perfil resumido */}
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
              <p className="bjj-sidebar-belt">{(profile as any).belt || 'Faixa Branca'}</p>
            </div>
          </div>
        )}

        {/* Navegação */}
        <nav className="bjj-sidebar-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`bjj-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'community') setCommunityBadge(false); }}
            >
              {tab.icon(activeTab === tab.id)}
              <span>{tab.label}</span>
              {tab.id === 'community' && communityBadge && activeTab !== 'community' && (
                <span className="bjj-sidebar-badge" />
              )}
            </button>
          ))}
        </nav>

        {/* Novo Treino + Sair */}
        <div className="bjj-sidebar-footer">
          <button className="bjj-sidebar-new-btn" onClick={() => setShowNewTraining(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            NOVO TREINO
          </button>
          <button className="bjj-sidebar-logout-btn" onClick={handleLogout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            SAIR
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="bjj-main-content">
        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="pb-safe"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {activeTab === 'dashboard' && <Dashboard onNewTraining={() => setShowNewTraining(true)} />}
            {activeTab === 'history' && <History onNewTraining={() => setShowNewTraining(true)} onShare={(data) => setShareData(data)} onEdit={(t) => setEditTraining(t)} onEditExtra={(t) => setEditExtraTraining(t)} />}
            {activeTab === 'academy' && <Academy />}
            {activeTab === 'community' && <Community onClearBadge={() => setCommunityBadge(false)} onNewPosts={() => setCommunityBadge(true)} />}
            {activeTab === 'goals' && <Goals />}
            {activeTab === 'profile' && <Profile onOpenProfessorPanel={isProfessor ? () => setShowProfessorPanel(true) : undefined} onEdit={(t) => setEditTraining(t)} />}
          </motion.div>
        </AnimatePresence>

        {/* Modal de compartilhamento */}
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

      {/* Tab Bar — apenas mobile */}
      <nav className="bjj-tab-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`bjj-tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); if (tab.id === 'community') setCommunityBadge(false); }}
            style={{ padding: '0.5rem 0.125rem', position: 'relative' }}
          >
            {tab.icon(activeTab === tab.id)}
            {tab.id === 'community' && communityBadge && activeTab !== 'community' && (
              <span style={{ position: 'absolute', top: '4px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', background: '#CC0000', border: '1.5px solid #0A0A0A' }} />
            )}
            <span style={{ fontSize: '0.48rem', letterSpacing: '0.03em' }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
