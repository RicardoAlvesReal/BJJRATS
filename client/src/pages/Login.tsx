// BJJRats PWA — Login Screen
// Design: "Cage Fighter" — Brutalismo Tático

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663343500922/eZPracQhphsa87KDbjhHAd/bjjrats-hero-bg-EvuzUMvwhPb4GgYFs4uUr2.webp';
const LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663343500922/eZPracQhphsa87KDbjhHAd/bjjrats-logo-hero-mmgzpqY4ZnMgeAjjykaT4c.webp';

export default function Login() {
  const { login, resetPassword } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Preencha todos os campos');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app');
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential'
        ? 'Email ou senha incorretos'
        : err.code === 'auth/too-many-requests'
        ? 'Muitas tentativas. Tente novamente mais tarde.'
        : 'Erro ao fazer login';
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
    <div className="bjj-app-wrapper min-h-screen flex flex-col relative overflow-hidden">
      {/* Hero Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_BG})`, opacity: 0.35 }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.7) 50%, rgba(10,10,10,0.98) 100%)' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Back to landing */}
        <div style={{ padding: '1rem 1.5rem' }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#CC0000'}
            onMouseLeave={e => e.currentTarget.style.color = '#888'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            VOLTAR AO SITE
          </button>
        </div>
        {/* Logo section */}
        <div className="flex flex-col items-center pt-8 pb-8 px-6">
          <img src={LOGO} alt="BJJRats" className="w-24 h-24 object-contain mb-4" style={{ filter: 'drop-shadow(0 0 20px rgba(204,0,0,0.5))' }} />
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FFFFFF', lineHeight: 1 }}>
            BJJ<span style={{ color: '#CC0000' }}>RATS</span>
          </h1>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#888888', marginTop: '0.25rem' }}>
            TREINE. EVOLUA. DOMINE.
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col justify-end px-6 pb-12">
          {!showReset ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
                style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888888', background: 'none', border: 'none', textAlign: 'right', padding: '0' }}
              >
                Esqueci a senha
              </button>

              <button
                type="submit"
                className="bjj-btn-primary"
                disabled={loading}
                style={{ marginTop: '0.5rem' }}
              >
                {loading ? 'ENTRANDO...' : 'ENTRAR NO TATAMI'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#222' }} />
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ou</span>
                <div style={{ flex: 1, height: '1px', background: '#222' }} />
              </div>

              <button
                type="button"
                className="bjj-btn-outline"
                onClick={() => navigate('/register')}
              >
                CRIAR CONTA
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <div>
                <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', color: '#FFFFFF', marginBottom: '0.5rem' }}>
                  RECUPERAR SENHA
                </h2>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#888888', marginBottom: '1rem' }}>
                  Informe seu email para receber o link de recuperação.
                </p>
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
      </div>
    </div>
  );
}
