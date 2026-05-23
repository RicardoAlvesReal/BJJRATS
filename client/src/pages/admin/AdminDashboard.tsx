// BJJRats — Admin Dashboard

import { useEffect, useState } from 'react';
import api, { type AdminUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Stats {
  total: number;
  superadmin: number;
  admin: number;
  professor: number;
  student: number;
}

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  admin:      'Admin',
  professor:  'Professor',
  student:    'Aluno',
};

const ROLE_COLOR: Record<string, string> = {
  superadmin: '#CC0000',
  admin:      '#E87722',
  professor:  '#3B82F6',
  student:    '#22C55E',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.listUsers()
      .then(({ users }) => {
        const s: Stats = { total: users.length, superadmin: 0, admin: 0, professor: 0, student: 0 };
        for (const u of users) {
          const r = u.role as keyof Stats;
          if (r in s) s[r] = (s[r] as number) + 1;
        }
        setStats(s);
        setRecent([...users].sort((a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        ).slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={headingStyle}>Bem-vindo, {user?.name}</h1>
      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '2rem', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em' }}>
        Visão geral da plataforma
      </p>

      {/* Cards de contagem */}
      {loading ? (
        <p style={{ color: '#555', fontFamily: 'Barlow Condensed, sans-serif' }}>Carregando...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard label="Total de usuários" value={stats?.total ?? 0} color="#FFF" />
            <StatCard label="Super Admins"       value={stats?.superadmin ?? 0} color="#CC0000" />
            <StatCard label="Admins"             value={stats?.admin ?? 0} color="#E87722" />
            <StatCard label="Professores"        value={stats?.professor ?? 0} color="#3B82F6" />
            <StatCard label="Alunos"             value={stats?.student ?? 0} color="#22C55E" />
          </div>

          {/* Usuários recentes */}
          <div style={sectionStyle}>
            <h2 style={subHeadingStyle}>Últimos cadastros</h2>
            {recent.length === 0 ? (
              <p style={{ color: '#555', fontSize: '0.85rem', fontFamily: 'Barlow Condensed, sans-serif' }}>
                Nenhum usuário encontrado.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recent.map((u) => (
                  <div key={u.uid} style={rowStyle}>
                    <div>
                      <span style={{ color: '#FFF', fontWeight: 700, fontSize: '0.9rem' }}>{u.name}</span>
                      <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{u.email}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <RoleBadge role={u.role} />
                      <span style={{ color: '#555', fontSize: '0.75rem' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: '#111',
      border: '1px solid #222',
      padding: '1.25rem',
      fontFamily: 'Barlow Condensed, sans-serif',
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>
        {label}
      </div>
    </div>
  );
}

export function RoleBadge({ role }: { role?: string }) {
  const r = role ?? 'student';
  return (
    <span style={{
      background: ROLE_COLOR[r] ?? '#555',
      color: '#FFF',
      fontWeight: 800,
      fontSize: '0.6rem',
      letterSpacing: '0.08em',
      padding: '2px 6px',
      textTransform: 'uppercase',
      fontFamily: 'Barlow Condensed, sans-serif',
    }}>
      {ROLE_LABEL[r] ?? r}
    </span>
  );
}

const headingStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 800,
  fontSize: '1.5rem',
  color: '#FFF',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  margin: 0,
};

const subHeadingStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 700,
  fontSize: '0.85rem',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  marginBottom: '0.75rem',
};

const sectionStyle: React.CSSProperties = {
  background: '#111',
  border: '1px solid #222',
  padding: '1.25rem',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.6rem 0',
  borderBottom: '1px solid #1A1A1A',
  gap: '0.5rem',
  flexWrap: 'wrap',
};
