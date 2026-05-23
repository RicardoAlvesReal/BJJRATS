// BJJRats — Admin Layout
// Área restrita para superadmin e admin

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';

type AdminTab = 'dashboard' | 'users';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';
  const roleBadge = isSuperAdmin ? 'SUPERADMIN' : 'ADMIN';
  const roleBadgeColor = isSuperAdmin ? '#CC0000' : '#E87722';

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Barlow Condensed, sans-serif',
    }}>
      {/* Top Bar */}
      <header style={{
        background: '#111',
        borderBottom: '2px solid #CC0000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        height: '56px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.1em', color: '#FFF', textTransform: 'uppercase' }}>
              BJJRATS
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.5rem', letterSpacing: '0.25em', color: '#444', textTransform: 'uppercase' }}>
              GESTÃO
            </span>
          </div>
          <span style={{
            background: roleBadgeColor,
            color: '#FFF',
            fontWeight: 800,
            fontSize: '0.6rem',
            letterSpacing: '0.1em',
            padding: '2px 7px',
            textTransform: 'uppercase',
          }}>
            {roleBadge}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: '#999', fontSize: '0.8rem' }}>{user?.name}</span>

          {/* Menu hamburguer mobile / ações */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', padding: '4px' }}
            aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: '56px',
              right: '1rem',
              background: '#1A1A1A',
              border: '1px solid #333',
              minWidth: '180px',
              zIndex: 200,
            }}>
              <button
                onClick={() => { navigate('/'); setMenuOpen(false); }}
                style={menuItemStyle}
              >
                ← Site Público
              </button>
              <button onClick={handleLogout} style={{ ...menuItemStyle, color: '#CC0000' }}>
                Sair
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Nav Tabs */}
      <nav style={{
        background: '#111',
        borderBottom: '1px solid #222',
        display: 'flex',
        gap: 0,
        padding: '0 1.25rem',
      }}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as AdminTab)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: tab === item.id ? '3px solid #CC0000' : '3px solid transparent',
              color: tab === item.id ? '#FFF' : '#666',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700,
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '0.85rem 1rem',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ flex: 1, padding: '1.5rem 1.25rem', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
        {tab === 'dashboard' && <AdminDashboard />}
        {tab === 'users'     && <AdminUsers />}
      </main>
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users',     label: 'Usuários'  },
];

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  background: 'none',
  border: 'none',
  borderBottom: '1px solid #222',
  color: '#CCC',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 600,
  fontSize: '0.85rem',
  letterSpacing: '0.08em',
  padding: '0.75rem 1rem',
  textAlign: 'left',
  cursor: 'pointer',
};
