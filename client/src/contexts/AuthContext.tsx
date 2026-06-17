// BJJRats PWA — Auth Context (JWT + PostgreSQL, sem Firebase)
import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { type UserProfile } from '@/lib/api';
import { toast } from 'sonner';

export type { UserProfile };

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  belt: string;
  academy: string;
  professor?: string;
  dob?: string;
  sex?: string;
  weightKg?: string;
  heightCm?: string;
  bjjSince?: string;
  role?: 'student' | 'professor' | 'academy' | 'admin';
  isAcademyAdmin?: boolean;
  academyName?: string;
  academyAddress?: string;
  academyCity?: string;
  academyState?: string;
  academyLatitude?: number | null;
  academyLongitude?: number | null;
  academyLogoUrl?: string;
  professorPhotoUrl?: string;
  academyId?: string | null;
}

interface AuthContextType {
  /** Perfil completo do usuário logado (antigo `user` + `profile` fundidos) */
  user: UserProfile | null;
  /** Compatibilidade: alias de `user` */
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<string>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
}

const TOKEN_KEY = 'bjjrats_token';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Troca de senha obrigatória (professor interno primeiro login)
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Restaurar sessão ao montar
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    api.auth.me()
      .then(u => {
        setUser(u);
        if ((u as any).mustChangePassword) setShowChangePassword(true);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await api.auth.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    if ((u as any).mustChangePassword) setShowChangePassword(true);
  };

  const register = async (data: RegisterData) => {
    const { token, user: u } = await api.auth.register(data as unknown as Record<string, unknown>);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u.uid;
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await api.auth.resetPassword(email);
  };

  const refreshProfile = async () => {
    const u = await api.auth.me();
    setUser(u);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated = await api.users.update(user.uid, data);
    setUser(updated);
  };

  const handleChangePassword = async () => {
    if (!newPass || newPass.length < 6) { toast.error('Senha deve ter no mínimo 6 caracteres'); return; }
    if (newPass !== confirmPass) { toast.error('Senhas não conferem'); return; }
    setChangingPass(true);
    try {
      await api.users.update(user!.uid, { password: newPass, mustChangePassword: false } as any);
      toast.success('Senha alterada com sucesso!');
      setShowChangePassword(false);
      setUser(prev => prev ? { ...prev, mustChangePassword: false } as any : null);
    } catch { toast.error('Erro ao alterar senha'); }
    finally { setChangingPass(false); }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile: user,   // alias para compatibilidade
      loading,
      login,
      register,
      logout,
      resetPassword,
      refreshProfile,
      updateProfileData,
    }}>
      {showChangePassword && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0A0A0A', border: '1px solid #E87722', padding: '1.5rem', width: '100%', maxWidth: '380px' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#FFF', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>🔐 ALTERAR SENHA</p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', marginBottom: '1rem', lineHeight: 1.4 }}>
              Primeiro acesso detectado. Por segurança, defina uma nova senha para sua conta.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                placeholder="Nova senha (mínimo 6 caracteres)"
                style={{ width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.65rem', outline: 'none', boxSizing: 'border-box' }} />
              <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                placeholder="Confirmar nova senha"
                style={{ width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.65rem', outline: 'none', boxSizing: 'border-box' }} />
              <button onClick={handleChangePassword} disabled={changingPass}
                style={{ background: changingPass ? '#333' : '#E87722', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', padding: '0.7rem', cursor: 'pointer', width: '100%' }}>
                {changingPass ? 'SALVANDO...' : 'SALVAR NOVA SENHA'}
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
