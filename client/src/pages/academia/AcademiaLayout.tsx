// BJJRats — Painel de Gestão da Academia (role: academy / admin)

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { tabVariant, tabTransition } from '@/lib/animations';
import AdminDashboard from '../admin/AdminDashboard';
import AdminUsers from '../admin/AdminUsers';
import AdminCrm from '../admin/AdminCrm';
import Community from '../app/Community';
import NotificationBell from '@/components/NotificationBell';

type AcademiaTab = 'dashboard' | 'users' | 'crm' | 'community';

const NAV_ITEMS: { id: AcademiaTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard'  },
  { id: 'users',     label: 'Usuários'   },
  { id: 'crm',       label: 'CRM'        },
  { id: 'community', label: 'Comunidade' },
];

export default function AcademiaLayout() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<AcademiaTab>('dashboard');

  const academyName = (user as any)?.academyName || (user as any)?.academy || 'ACADEMIA';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col font-['Barlow_Condensed']">
      <NotificationBell />

      {/* Top Bar */}
      <header
        className="bjj-glass-strong flex items-center justify-between px-5 h-14 sticky top-0 z-100"
        style={{ borderBottom: '2px solid #E87722' }}
      >
        <div className="flex items-center gap-3">
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
            onClick={() => setTab(item.id)}
            className="bg-none border-none font-bold text-[0.8rem] tracking-[0.12em] uppercase px-4 py-3.5 cursor-pointer transition-colors duration-150 whitespace-nowrap"
            style={{
              borderBottom: tab === item.id ? '3px solid #E87722' : '3px solid transparent',
              color: tab === item.id ? '#FFF' : '#666',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

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
            {tab === 'dashboard' && <AdminDashboard />}
            {tab === 'users'     && <AdminUsers />}
            {tab === 'crm'       && <AdminCrm />}
            {tab === 'community' && <Community />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
