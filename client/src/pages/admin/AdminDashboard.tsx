// BJJRats — Admin Dashboard

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import api, { type AdminUser, type AdminStats } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { fadeUp, staggerContainer, tabVariant, tabTransition } from '@/lib/animations';
import { COLORS, FONTS } from '@/lib/design';

interface Stats {
  total: number;
  superadmin: number;
  academy: number;
  admin: number;
  professor: number;
  student: number;
}

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  academy:    'Academia',
  admin:      'Academia',
  professor:  'Professor',
  student:    'Aluno',
};

const ROLE_COLOR: Record<string, string> = {
  superadmin: '#CC0000',
  academy:    '#E87722',
  admin:      '#E87722',
  professor:  '#3B82F6',
  student:    '#22C55E',
};

const BELT_COLORS: Record<string, string> = {
  Branca: '#FFFFFF', Cinza: '#888888', Amarela: '#FFD700', Laranja: '#FF8C00',
  Verde: '#00AA00', Azul: '#1A6ECC', Roxa: '#7C1ACC', Marrom: '#8B4513', Preta: '#111111',
};

const PERIODS = [
  { id: 0, label: 'TODOS' },
  { id: 7, label: '7 DIAS' },
  { id: 30, label: '30 DIAS' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [stats, setStats] = useState<Stats | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [recent, setRecent] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [academias, setAcademias] = useState(0);
  const [period, setPeriod] = useState(0);

  const load = useCallback(async (days: number) => {
    try {
      if (isSuperAdmin) {
        const [{ users }, statsData] = await Promise.all([
          api.admin.listUsers(),
          api.admin.getStats(days || undefined),
        ]);
        const s: Stats = { total: users.length, superadmin: 0, academy: 0, admin: 0, professor: 0, student: 0 };
        for (const u of users) {
          const r = u.role as keyof Stats;
          if (r in s) s[r] = (s[r] as number) + 1;
        }
        setStats(s);
        setAcademias(users.filter(u => (u.role === 'academy' || u.role === 'admin' || u.isAcademyAdmin) && (u.academyName || u.academy)).length);
        setRecent([...users].sort((a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        ).slice(0, 5));
        setAdminStats(statsData);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load(period);
  };

  const handlePeriodChange = (days: number) => {
    setLoading(true);
    setPeriod(days);
  };

  // ── Skeletons ──
  if (loading && !adminStats) {
    return (
      <motion.div initial="hidden" animate="show" variants={staggerContainer}>
        <div className="bjj-skeleton h-8 w-64 rounded-lg mb-2" />
        <div className="bjj-skeleton h-4 w-40 rounded mb-6" />

        <div className="bjj-skeleton h-4 w-24 rounded mb-3" />
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[1,2,3,4,5].map(i => <div key={i} className="bjj-skeleton h-24 rounded-xl" />)}
        </div>

        <div className="bjj-skeleton h-4 w-24 rounded mb-3" />
        <div className="grid grid-cols-6 gap-4 mb-8">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bjj-skeleton h-24 rounded-xl" />)}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bjj-skeleton h-64 rounded-xl" />
          <div className="bjj-skeleton h-64 rounded-xl" />
        </div>

        <div className="bjj-skeleton h-4 w-24 rounded mb-3" />
        <div className="bjj-skeleton h-48 rounded-xl" />
      </motion.div>
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div>
          <h1 style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Bem-vindo, {user?.name}
          </h1>
          <p style={{ color: '#666', fontSize: '0.85rem', fontFamily: FONTS.condensed, letterSpacing: '0.05em', marginTop: '0.125rem' }}>
            {isSuperAdmin ? 'Visão geral da plataforma' : 'Visão geral da sua academia'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bjj-btn-ghost"
          style={{ fontSize: '0.7rem', padding: '0.4rem 0.75rem' }}
        >
          {refreshing ? 'ATUALIZANDO...' : '↻ ATUALIZAR'}
        </button>
      </motion.div>

      {/* Cards de usuários */}
      <motion.div variants={fadeUp}>
        <p className="bjj-label">Usuários</p>
        {isSuperAdmin ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            <StatCard label="Total" value={stats?.total ?? 0} color="#FFF" />
            <StatCard label="Superadmins" value={stats?.superadmin ?? 0} color="#CC0000" />
            <StatCard label="Academias" value={academias} color="#E87722" />
            <StatCard label="Professores" value={stats?.professor ?? 0} color="#3B82F6" />
            <StatCard label="Alunos" value={stats?.student ?? 0} color="#22C55E" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard label="Total" value={stats?.total ?? 0} color="#FFF" />
            <StatCard label="Professores" value={stats?.professor ?? 0} color="#3B82F6" />
            <StatCard label="Alunos" value={stats?.student ?? 0} color="#22C55E" />
          </div>
        )}
      </motion.div>

      {/* Treinos + Filtro de período */}
      {adminStats && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <p className="bjj-label" style={{ marginBottom: 0 }}>Treinos</p>
            <div className="flex gap-1" style={{ background: '#111', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '2px' }}>
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePeriodChange(p.id)}
                  style={{
                    background: period === p.id ? '#CC0000' : 'transparent',
                    color: period === p.id ? '#FFF' : '#666',
                    fontFamily: FONTS.condensed,
                    fontWeight: 700,
                    fontSize: '0.6rem',
                    letterSpacing: '0.1em',
                    padding: '0.3rem 0.625rem',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    transition: 'all 0.15s',
                  }}
                >{p.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            <StatCard label="Total de treinos" value={adminStats.trainings.total} color="#CC0000" />
            <StatCard label="XP total" value={adminStats.trainings.totalXP} color="#FF4400" />
            <StatCard label="Horas totais" value={`${adminStats.trainings.totalHours}h`} color="#CC0000" />
            <StatCard label="Hoje" value={adminStats.trainings.today} color="#FF2200" />
            <StatCard label={period > 0 ? `Últ. ${period} dias` : 'Total no período'} value={adminStats.trainings.inRange} color="#FF2200" />
            <StatCard label="Check-ins hoje" value={adminStats.checkInsToday} color="#0EA5E9" />
          </div>
        </motion.div>
      )}

      {/* Gráficos */}
      {adminStats && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Crescimento mensal */}
          {adminStats.userGrowth.length > 0 && (
            <div className="bjj-card" style={{ padding: '1.25rem' }}>
              <p className="bjj-label">Crescimento mensal</p>
              <motion.div
                initial="hidden"
                animate="show"
                variants={staggerContainer}
                style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '120px', paddingTop: '0.5rem' }}
              >
                {adminStats.userGrowth.map((m, i) => {
                  const max = Math.max(...adminStats.userGrowth.map(x => x.count), 1);
                  const h = (m.count / max) * 100;
                  return (
                    <motion.div key={m.month} variants={fadeUp} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontFamily: FONTS.condensed, fontSize: '0.65rem', color: '#888' }}>{m.count}</span>
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max(h, 4)}%`,
                          background: 'linear-gradient(to top, #CC0000, #FF4400)',
                          borderRadius: '3px 3px 0 0',
                          minHeight: '4px',
                          transition: 'height 0.5s ease',
                        }}
                      />
                      <span style={{ fontFamily: FONTS.condensed, fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {new Date(m.month + '-01').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}

          {/* Distribuição por faixa */}
          {adminStats.beltDistribution.length > 0 && (
            <div className="bjj-card" style={{ padding: '1.25rem' }}>
              <p className="bjj-label">Faixas</p>
              {adminStats.beltDistribution.map((b) => {
                const max = Math.max(...adminStats.beltDistribution.map(x => x.count), 1);
                return (
                  <motion.div key={b.belt} variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid #1A1A1A' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: BELT_COLORS[b.belt] || '#555', border: b.belt === 'Branca' ? '1px solid #444' : 'none', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#CCC', textTransform: 'uppercase' }}>{b.belt}</span>
                    <span style={{ fontFamily: FONTS.condensed, fontSize: '0.8rem', color: '#888' }}>{b.count}</span>
                    <div style={{ width: '80px', height: '6px', background: '#1A1A1A', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(b.count / max) * 100}%`, background: BELT_COLORS[b.belt] || '#555', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Academias por estado — só superadmin */}
          {isSuperAdmin && adminStats.academiesByState.length > 0 && (
            <div className="bjj-card" style={{ padding: '1.25rem' }}>
              <p className="bjj-label">Academias por estado</p>
              {adminStats.academiesByState.map((s) => {
                const max = Math.max(...adminStats.academiesByState.map(x => x.count), 1);
                return (
                  <motion.div key={s.state} variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid #1A1A1A' }}>
                    <span style={{ width: '28px', fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.8rem', color: '#E87722' }}>{s.state}</span>
                    <span style={{ flex: 1, fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#888' }}>{s.count} academia{s.count !== 1 ? 's' : ''}</span>
                    <div style={{ width: '80px', height: '6px', background: '#1A1A1A', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(s.count / max) * 100}%`, background: '#E87722', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Últimos cadastros */}
      <motion.div variants={fadeUp}>
        <p className="bjj-label">Últimos cadastros</p>
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          {recent.length === 0 ? (
            <p style={{ color: '#555', fontSize: '0.85rem', fontFamily: FONTS.condensed }}>
              Nenhum usuário encontrado.
            </p>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {recent.map((u) => (
                <motion.div key={u.uid} variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #1A1A1A', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: '#FFF', fontWeight: 700, fontSize: '0.9rem', fontFamily: FONTS.condensed }}>{u.name}</span>
                    <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: '0.5rem', fontFamily: FONTS.barlow }}>{u.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RoleBadge role={u.role} />
                    <span style={{ color: '#555', fontSize: '0.75rem', fontFamily: FONTS.condensed }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bjj-card" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1, fontFamily: FONTS.condensed }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem', fontFamily: FONTS.condensed }}>
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
      fontFamily: FONTS.condensed,
    }}>
      {ROLE_LABEL[r] ?? r}
    </span>
  );
}
