// BJJRats — Página de redefinição de senha
import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import api from '@/lib/api';

const LOGO = '/favicon.png';

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Pega o token da URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return toast.error('Senha deve ter no mínimo 6 caracteres');
    if (newPassword !== confirmPassword) return toast.error('Senhas não conferem');

    setLoading(true);
    try {
      await api.auth.confirmResetPassword(token, newPassword);
      setDone(true);
      toast.success('Senha redefinida com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Token inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img src={LOGO} alt="BJJRats" style={{ width: '64px', height: '64px', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(204,0,0,0.5))', marginBottom: '0.75rem' }} />
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.05em' }}>
          BJJ<span style={{ color: '#CC0000' }}>RATS</span>
        </h1>
      </div>

      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '2rem', maxWidth: '400px', width: '100%' }}>
        {!token ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'Barlow, sans-serif', color: '#888', marginBottom: '1rem' }}>
              Link inválido. Solicite uma nova redefinição de senha na página de login.
            </p>
            <button onClick={() => navigate('/login')} className="bjj-btn-primary" style={{ width: '100%' }}>
              IR PARA LOGIN
            </button>
          </div>
        ) : done ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'Barlow, sans-serif', color: '#22C55E', fontSize: '1rem', marginBottom: '0.5rem' }}>
              ✅ Senha redefinida!
            </p>
            <p style={{ fontFamily: 'Barlow, sans-serif', color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Agora você pode fazer login com sua nova senha.
            </p>
            <button onClick={() => navigate('/login')} className="bjj-btn-primary" style={{ width: '100%' }}>
              FAZER LOGIN
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.05em', margin: 0, textAlign: 'center' }}>
              REDEFINIR SENHA
            </h2>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.85rem', color: '#666', textAlign: 'center', margin: 0 }}>
              Digite sua nova senha abaixo.
            </p>

            <div>
              <label className="bjj-label">Nova senha</label>
              <input
                type="password"
                className="bjj-input"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="bjj-label">Confirmar senha</label>
              <input
                type="password"
                className="bjj-input"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="bjj-btn-primary" disabled={loading}>
              {loading ? 'REDEFININDO...' : 'REDEFINIR SENHA'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
