// BJJRats — Painel de Controle / Admin Login
// Área restrita: apenas superadmin
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';

const TOKEN_KEY = 'bjjrats_token';

export default function AdminLogin() {
  const { refreshProfile } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Preencha todos os campos');
    setLoading(true);
    try {
      const { token, user } = await api.auth.login(email, password);
      if (user.role !== 'superadmin') {
        toast.error('Acesso negado. Você não tem permissão para esta área.');
        return;
      }
      localStorage.setItem(TOKEN_KEY, token);
      await refreshProfile();
      navigate('/admin');
    } catch (err: any) {
      toast.error('Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030303',
      display: 'flex',
      fontFamily: "'Barlow Condensed', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Grade de fundo sutil */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(204,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(204,0,0,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* Painel esquerdo — informações do sistema (oculto em telas pequenas) */}
      <div style={{
        display: 'none',
        width: '420px',
        flexShrink: 0,
        borderRight: '1px solid #1A1A1A',
        padding: '3rem 2.5rem',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1,
      }}
        className="admin-left-panel"
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '3rem' }}>
            <div style={{ width: '8px', height: '8px', background: '#CC0000', borderRadius: '50%' }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.25em', color: '#CC0000', textTransform: 'uppercase' }}>
              SISTEMA ATIVO
            </span>
          </div>

          <h1 style={{ fontSize: '2.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FFF', lineHeight: 1, marginBottom: '0.5rem' }}>
            BJJRATS
          </h1>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.3em', color: '#444', textTransform: 'uppercase', marginBottom: '3rem' }}>
            SISTEMA DE GESTÃO
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { label: 'MÓDULO', value: 'CONTROLE ADMINISTRATIVO' },
              { label: 'ACESSO', value: 'RESTRITO — NÍVEL ADMIN' },
              { label: 'VERSÃO', value: 'v1.0.0 — 2026' },
            ].map(({ label, value }) => (
              <div key={label}>
                <span style={{ display: 'block', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em', color: '#333', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  {label}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', letterSpacing: '0.06em' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.15em', color: '#222', textTransform: 'uppercase' }}>
          © 2026 BJJRATS — USO INTERNO
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Voltar ao site */}
        <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem' }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#333', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'color 0.15s', padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#888'}
            onMouseLeave={e => e.currentTarget.style.color = '#333'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            SITE PÚBLICO
          </button>
        </div>

        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Cabeçalho do formulário */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '32px', height: '32px', border: '1px solid #CC0000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="0" ry="0" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFF', margin: 0, lineHeight: 1 }}>
                  AUTENTICAÇÃO
                </h2>
                <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em', color: '#444', textTransform: 'uppercase', margin: 0 }}>
                  PAINEL DE CONTROLE
                </p>
              </div>
            </div>

            <div style={{ height: '1px', background: 'linear-gradient(to right, #CC0000, transparent)' }} />
          </div>

          {/* Aviso de segurança */}
          <div style={{
            background: '#0A0A0A', border: '1px solid #1E1E1E',
            borderLeft: '2px solid #CC0000',
            padding: '0.65rem 0.875rem', marginBottom: '1.75rem',
            display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
          }}>
            <span style={{ color: '#CC0000', fontSize: '0.65rem', flexShrink: 0, marginTop: '1px' }}>!</span>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#555', lineHeight: 1.5, margin: 0 }}>
              Acesso restrito a administradores autorizados. Acessos não autorizados são registrados.
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <div>
              <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#444', marginBottom: '0.4rem' }}>
                IDENTIFICAÇÃO
              </label>
              <input
                type="email"
                placeholder="usuario@bjjrats.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                style={{ width: '100%', background: '#0A0A0A', border: '1px solid #1E1E1E', color: '#DDD', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.7rem 0.875rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.currentTarget.style.borderColor = '#CC0000'}
                onBlur={e => e.currentTarget.style.borderColor = '#1E1E1E'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#444', marginBottom: '0.4rem' }}>
                CREDENCIAL
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ width: '100%', background: '#0A0A0A', border: '1px solid #1E1E1E', color: '#DDD', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.7rem 0.875rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.currentTarget.style.borderColor = '#CC0000'}
                onBlur={e => e.currentTarget.style.borderColor = '#1E1E1E'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'transparent',
                border: `1px solid ${loading ? '#3A0000' : '#CC0000'}`,
                color: loading ? '#3A0000' : '#CC0000',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 800,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                padding: '0.875rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '0.25rem',
                transition: 'all 0.15s',
                width: '100%',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#CC0000'; e.currentTarget.style.color = '#000'; } }}
              onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#CC0000'; } }}
            >
              {loading ? 'VERIFICANDO...' : 'AUTENTICAR →'}
            </button>
          </form>

          <p style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.2em', color: '#1A1A1A', textTransform: 'uppercase', textAlign: 'center', marginTop: '2rem' }}>
            BJJRATS © 2026 — SISTEMA ADMINISTRATIVO
          </p>
        </div>
      </div>

      {/* CSS para o painel esquerdo aparecer em telas largas */}
      <style>{`
        @media (min-width: 860px) {
          .admin-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
