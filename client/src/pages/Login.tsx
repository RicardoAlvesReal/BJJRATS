// BJJRats PWA — Login Screen
// Design: "Cage Fighter" — Brutalismo Tático

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import TurnstileWidget from '@/components/TurnstileWidget';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663343500922/eZPracQhphsa87KDbjhHAd/bjjrats-hero-bg-EvuzUMvwhPb4GgYFs4uUr2.webp';
const LOGO = '/favicon.png';

export default function Login() {
  const { login, resetPassword } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Preencha todos os campos');
    setLoading(true);
    try {
      await login(email, password, turnstileToken);
      navigate('/app');
    } catch (err: any) {
      const code = err?.code || err?.body?.code;
      const msg =
        code === 'auth/user-not-found' ? 'Email não encontrado' :
        code === 'auth/wrong-password' ? 'Senha incorreta' :
        code === 'auth/too-many-requests' ? 'Muitas tentativas. Tente novamente mais tarde.' :
        err?.message || 'Erro ao fazer login';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return toast.error('Informe seu email');
    try {
      await resetPassword(resetEmail);
      toast.success('Email de recuperação enviado!');
      setShowReset(false);
    } catch {
      toast.error('Erro ao enviar email de recuperação');
    }
  };

  return (
    <div className="bjj-login-wrapper">

      {/* ─── Painel hero (fundo no mobile / coluna esquerda no desktop) ─── */}
      <div className="bjj-login-hero">
        <img src={HERO_BG} alt="" className="bjj-login-hero-img" />
        <div className="bjj-login-hero-overlay" />

        {/* Conteúdo visível só no desktop */}
        <div className="bjj-login-hero-content">
          <img src={LOGO} alt="BJJRats" className="bjj-login-logo-desktop" />
          <h1 className="bjj-login-brand-desktop">
            BJJ<span style={{ color: '#CC0000' }}>RATS</span>
          </h1>
          <p className="bjj-login-tagline-desktop">TREINE. EVOLUA. DOMINE.</p>
          <div className="bjj-login-hero-divider" />
          <p className="bjj-login-hero-subtitle">
            O app dos atletas que treinam de verdade.<br />
            Registre treinos, evolua na faixa e conecte-se com a comunidade.
          </p>
        </div>
      </div>

      {/* ─── Painel de formulário (frente no mobile / coluna direita no desktop) ─── */}
      <div className="bjj-login-panel">

        {/* Botão voltar */}
        <button className="bjj-login-back-btn" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          VOLTAR AO SITE
        </button>

        {/* Logo — mobile only */}
        <div className="bjj-login-mobile-logo">
          <img
            src={LOGO}
            alt="BJJRats"
            style={{ width: '5rem', height: '5rem', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(204,0,0,0.5))' }}
          />
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FFF', lineHeight: 1, marginTop: '0.75rem' }}>
            BJJ<span style={{ color: '#CC0000' }}>RATS</span>
          </h1>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#888', marginTop: '0.25rem' }}>
            TREINE. EVOLUA. DOMINE.
          </p>
        </div>

        {/* Heading — desktop only */}
        <div className="bjj-login-panel-heading">
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FFF', lineHeight: 1, marginBottom: '0.375rem' }}>
            {showReset ? 'RECUPERAR SENHA' : 'ENTRAR NA CONTA'}
          </h2>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#666', marginBottom: '2rem' }}>
            {showReset
              ? 'Informe seu email para receber o link de recuperação.'
              : 'Acesse sua conta para registrar treinos e acompanhar sua evolução.'}
          </p>
        </div>

        {/* Formulário */}
        <div className="bjj-login-form-wrap">
          {!showReset ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="bjj-label">Email</label>
                <input
                  type="email"
                  className="bjj-input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="bjj-label">Senha</label>
                <input
                  type="password"
                  className="bjj-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowReset(true)}
                style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', background: 'none', border: 'none', textAlign: 'right', padding: 0, cursor: 'pointer' }}
              >
                Esqueci a senha
              </button>

              <TurnstileWidget onSuccess={t => setTurnstileToken(t)} />

              <button type="submit" className="bjj-btn-primary" disabled={loading || !turnstileToken} style={{ marginTop: '0.25rem' }}>
                {loading ? 'ENTRANDO...' : 'ENTRAR NO TATAMI'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.25rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#222' }} />
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ou</span>
                <div style={{ flex: 1, height: '1px', background: '#222' }} />
              </div>

              <button type="button" className="bjj-btn-outline" onClick={() => navigate('/register')}>
                CRIAR CONTA
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Heading apenas no mobile (desktop usa bjj-login-panel-heading) */}
              <div className="bjj-login-reset-heading-mobile">
                <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', color: '#FFF', marginBottom: '0.375rem' }}>
                  RECUPERAR SENHA
                </h2>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#888', marginBottom: '0.5rem' }}>
                  Informe seu email para receber o link de recuperação.
                </p>
              </div>
              <div>
                <label className="bjj-label">Email</label>
                <input
                  type="email"
                  className="bjj-input"
                  placeholder="seu@email.com"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="bjj-btn-primary">ENVIAR LINK</button>
              <button type="button" className="bjj-btn-outline" onClick={() => setShowReset(false)}>VOLTAR</button>
            </form>
          )}
        </div>

        {/* RAOS Tecnologia */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #1A1A1A', textAlign: 'center' }}>
          <a href="https://raostecnologia.com.br" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555', opacity: 0.4, transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
            >Desenvolvido por</span>
            <img src="/raos-logo.png" alt="RAOS Tecnologia" style={{ height: '24px', width: 'auto', objectFit: 'contain', opacity: 0.65, transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.65')}
            />
          </a>
        </div>
      </div>
    </div>
  );
}
