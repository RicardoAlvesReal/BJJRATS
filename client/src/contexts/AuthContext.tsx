// BJJRats PWA — Auth Context (JWT + PostgreSQL, sem Firebase)
import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { type UserProfile } from '@/lib/api';

export type { UserProfile };

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  belt: string;
  academy: string;
  professor?: string;
  dob?: string;
  sex?: string;
  weightKg?: string;
  heightCm?: string;
  bjjSince?: string;
  role?: 'student' | 'professor';
  academyName?: string;
  academyAddress?: string;
  academyCity?: string;
  academyState?: string;
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

  // Restaurar sessão ao montar
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    api.auth.me()
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await api.auth.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
  };

  const register = async (data: RegisterData) => {
    const { token, user: u } = await api.auth.register(data as Record<string, unknown>);
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
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
