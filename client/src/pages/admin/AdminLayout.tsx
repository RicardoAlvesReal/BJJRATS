// BJJRats — Admin Layout

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { tabVariant, tabTransition } from '@/lib/animations';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminCrm from './AdminCrm';
import AdminPlans from './AdminPlans';
import AdminAppLinks from './AdminAppLinks';
import AdminAnnouncements from './AdminAnnouncements';
import Community from '../app/Community';
import NotificationBell from '@/components/NotificationBell';

type AdminTab = 'dashboard' | 'users' | 'crm' | 'plans' | 'app' | 'avisos' | 'community';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<AdminTab>('dashboard');

  const isSuperAdmin = user?.role === 'superadmin';
  const roleBadge = isSuperAdmin ? 'SUPERADMIN' : 'ACADEMIA';
  const roleBadgeColor = isSuperAdmin ? '#CC0000' : '#E87722';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col font-['Barlow_Condensed']">
      <NotificationBell />

      {/* Top Bar */}
      <header className="bjj-glass-strong flex items-center justify-between px-5 h-14 sticky top-0 z-100" style={{ borderBottom: '2px solid #CC0000' }}>
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-none">
            <span className="font-black text-[0.95rem] tracking-[0.1em] text-white uppercase">BJJRATS</span>
            <span className="font-bold text-[0.5rem] tracking-[0.25em] text-[#444] uppercase">GESTÃO</span>
          </div>
          <span style={{ background: roleBadgeColor }} className="text-white font-extrabold text-[0.6rem] tracking-[0.1em] px-1.5 py-0.5 uppercase">{roleBadge}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              color: '#CC0000',
              border: '1px solid #CC000044',
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
      <nav className="bg-[#111] border-b border-[#222] flex px-5">
        {NAV_ITEMS.filter(item => !item.superOnly || isSuperAdmin).map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as AdminTab)}
            className="bg-none border-none font-bold text-[0.8rem] tracking-[0.12em] uppercase px-4 py-3.5 cursor-pointer transition-colors duration-150"
            style={{
              borderBottom: tab === item.id ? '3px solid #CC0000' : '3px solid transparent',
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
          <motion.div key={tab} variants={tabVariant} initial="initial" animate="animate" exit="exit" transition={tabTransition}>
            {tab === 'dashboard' && <AdminDashboard />}
            {tab === 'users'     && <AdminUsers />}
            {tab === 'crm'       && <AdminCrm />}
            {tab === 'plans'     && isSuperAdmin && <AdminPlans />}
            {tab === 'app'       && isSuperAdmin && <AdminAppLinks />}
            {tab === 'avisos'    && isSuperAdmin && <AdminAnnouncements />}
            {tab === 'community' && <Community />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

const NAV_ITEMS: { id: string; label: string; superOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users',     label: 'Usuários'  },
  { id: 'crm',       label: 'CRM'       },
  { id: 'plans',     label: 'Planos', superOnly: true },
  { id: 'app',       label: 'App',    superOnly: true },
  { id: 'avisos',    label: 'Notificações', superOnly: true },
  { id: 'community', label: 'Comunidade' },
];
