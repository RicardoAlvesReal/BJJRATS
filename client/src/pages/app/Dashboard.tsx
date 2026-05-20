// BJJRats PWA — Dashboard Screen
// Design: "Cage Fighter" — Brutalismo Tático
// Identical to mobile app: XP, streak, charts, recent trainings from Firestore
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import WeeklyGoalBar from '@/components/WeeklyGoalBar';
import {
  Training, BELT_COLORS, SESSION_TYPES, MODALITIES, INTENSITY_LABELS,
  calcXP, calcStreak, getLevelInfo, horasPorSemana, topTecnicas,
  distribuicaoSessao, calendarioAtividade, parseTrainingDate,
  countAllTechs, ACHIEVEMENTS, LEVEL_COLORS, treinsNaSemana, treinsNoMes,
} from '@/lib/bjjrats-constants';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

interface Props {
  onNewTraining: () => void;
}

export default function Dashboard({ onNewTraining }: Props) {
  const { user, profile } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyTarget, setWeeklyTarget] = useState(3);

  const loadTrainings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const raw = await api.trainings.list(user.uid) as any[];
      const docs = raw.map(d => ({ firestoreId: d.id, id: d.id, ...d } as Training));
      docs.sort((a, b) => {
        const ta = parseTrainingDate(a)?.getTime() || 0;
        const tb = parseTrainingDate(b)?.getTime() || 0;
        return tb - ta;
      });
      setTrainings(docs);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadWeeklyTarget = useCallback(async () => {
    if (!user) return;
    try {
      const goalsData = await api.goals.list(user.uid) as any[];
      if (goalsData.length > 0) {
        const data = goalsData[0];
        if (data.weeklyTrainings) setWeeklyTarget(Number(data.weeklyTrainings));
      }
    } catch { /* usa padrão 3 */ }
  }, [user]);

  useEffect(() => { loadTrainings(); loadWeeklyTarget(); }, [loadTrainings, loadWeeklyTarget]);

  const userXP = calcXP(trainings);
  const { currentLevel, xpProgress, xpToNext } = getLevelInfo(userXP);
  const str = calcStreak(trainings);
  const totalMins = trainings.reduce((s, t) => s + (t.duration || 0), 0);
  const hrs = Math.round(totalMins / 60 * 10) / 10;
  const semanas = horasPorSemana(trainings);
  const tecnicas = topTecnicas(trainings);
  const sessoes = distribuicaoSessao(trainings);
  const calendario = calendarioAtividade(trainings);
  const diasAtivos = calendario.filter(d => d.treinos > 0).length;
  const weekTrainings = treinsNaSemana(trainings);
  const monthTrainings = treinsNoMes(trainings);
  const unlockedCount = ACHIEVEMENTS.filter(a => a.check(trainings)).length;
  const beltColor = BELT_COLORS[profile?.belt || 'Branca'] || '#FFFFFF';
  const levelColor = LEVEL_COLORS[currentLevel.name] || '#CC0000';

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '2px solid #CC0000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: '0.125rem' }}>
            BEM-VINDO DE VOLTA
          </p>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em' }}>
            {profile?.name || user?.displayName || 'ATLETA'}
          </h1>
        </div>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `3px solid ${beltColor}`, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {profile?.photo ? <img src={profile.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.5rem' }}>🥋</span>}
        </div>
      </div>

      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* XP Card */}
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: '0.25rem' }}>
                <span style={{ color: levelColor }}>NÍVEL {currentLevel.level}</span> — {currentLevel.name.toUpperCase()}
              </p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2rem', color: '#FFFFFF', lineHeight: 1 }}>
                {userXP} <span style={{ color: '#CC0000', fontSize: '0.875rem' }}>XP</span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', marginBottom: '0.25rem' }}>
                {xpToNext > 0 ? `${xpToNext} XP para nível ${currentLevel.level + 1}` : 'Nível máximo!'}
              </p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#888' }}>
                Streak: <span style={{ color: '#CC0000' }}>{str}</span> dias
              </p>
            </div>
          </div>
          <div style={{ background: '#080808', height: '6px', overflow: 'hidden' }}>
            <div style={{ background: levelColor, height: '6px', width: `${xpProgress}%`, transition: 'width 0.5s ease' }} />
          </div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', marginTop: '0.375rem', textAlign: 'right', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {xpProgress}% PARA O PRÓXIMO NÍVEL
          </p>
        </div>

        {/* Meta Semanal */}
        <WeeklyGoalBar
          current={weekTrainings}
          target={weeklyTarget}
        />

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
          {[
            { label: 'TREINOS TOTAL', value: trainings.length, icon: '🥋' },
            { label: 'ESTA SEMANA', value: weekTrainings, icon: '📅' },
            { label: 'ESTE MÊS', value: monthTrainings, icon: '🗓' },
            { label: 'HORAS NO TATAME', value: `${hrs}h`, icon: '⏱' },
            { label: 'CONQUISTAS', value: `${unlockedCount}/${ACHIEVEMENTS.length}`, icon: '🏆' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.875rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{s.icon}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.75rem', color: '#FFFFFF', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginTop: '0.25rem' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* New Training CTA */}
        <button onClick={onNewTraining} style={{ background: '#CC0000', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1.125rem', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', cursor: 'pointer', transition: 'background 0.15s' }}>
          + REGISTRAR TREINO
        </button>

        {/* Activity Calendar */}
        {trainings.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF' }}>📅 ATIVIDADE (42 DIAS)</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#CC0000' }}>{diasAtivos} dias ativos</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
              {calendario.map((d, i) => {
                const intensity = d.treinos === 0 ? 0 : d.mins < 30 ? 1 : d.mins < 60 ? 2 : d.mins < 90 ? 3 : 4;
                const colors = ['#0D0D0D', '#3A0000', '#660000', '#990000', '#CC0000'];
                return <div key={i} title={`${d.date.toLocaleDateString('pt-BR')}: ${d.treinos} treino(s)`} style={{ height: '14px', background: colors[intensity], border: '1px solid #1A1A1A', borderRadius: '2px' }} />;
              })}
            </div>
          </div>
        )}

        {/* Chart: Hours per week */}
        {trainings.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF' }}>⏱ HORAS POR SEMANA</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#0D9E6E' }}>{hrs}h total</p>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={semanas} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 10, fontFamily: 'Barlow Condensed' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', fontFamily: 'Barlow Condensed', fontSize: '12px', color: '#fff' }} formatter={(v: any) => [`${v}h`, 'Horas']} />
                <Bar dataKey="horas" fill="#0D9E6E" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Chart: Top techniques */}
        {tecnicas.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '0.75rem' }}>🥋 TOP TÉCNICAS PRATICADAS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tecnicas.map((t, i) => {
                const maxQtd = tecnicas[0].qtd;
                const pct = Math.round((t.qtd / maxQtd) * 100);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#CCC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.nome}</p>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#CC0000' }}>{t.qtd}x</p>
                    </div>
                    <div style={{ background: '#0D0D0D', height: '4px' }}>
                      <div style={{ background: '#CC0000', height: '4px', width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chart: Session types */}
        {sessoes.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF' }}>📊 TIPOS DE SESSÃO</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555' }}>{trainings.length} treinos</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={sessoes} dataKey="qtd" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2}>
                    {sessoes.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {sessoes.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '10px', height: '10px', background: s.color, flexShrink: 0 }} />
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#CCC', flex: 1 }}>{s.icon} {s.label}</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#888' }}>{s.qtd}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Trainings */}
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '0.75rem' }}>ÚLTIMOS TREINOS</p>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.875rem', textTransform: 'uppercase' }}>CARREGANDO...</div>
          ) : trainings.length === 0 ? (
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🥋</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFFFFF', marginBottom: '0.5rem' }}>NENHUM TREINO AINDA</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#555' }}>Registre seu primeiro treino para ver seus gráficos de evolução!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {trainings.slice(0, 3).map((t, i) => {
                const sess = SESSION_TYPES.find(x => x.id === t.sessionType) || SESSION_TYPES[0];
                const mod = MODALITIES.find(x => x.id === t.modality) || null;
                const techCount = countAllTechs(t.techniques);
                return (
                  <div key={t.firestoreId || i} style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: '3px solid #CC0000', padding: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.2rem 0.5rem', border: `1px solid ${sess.color}`, background: sess.color + '20', color: sess.color }}>
                          {sess.icon} {sess.label}
                        </span>
                        {mod && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.2rem 0.5rem', border: `1px solid ${mod.color}`, background: mod.color + '20', color: mod.color }}>{mod.label}</span>}
                      </div>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555' }}>{t.trainingDate || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888' }}>⏱ {t.duration} min</span>
                      {t.intensity && <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888' }}>🔥 {INTENSITY_LABELS[t.intensity]}</span>}
                      {techCount > 0 && <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888' }}>🥋 {techCount} técnicas</span>}
                    </div>
                    {t.notes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.375rem', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Belt progress */}
        {profile?.belt && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '0.75rem' }}>🥋 EVOLUÇÃO DE FAIXA</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `3px solid ${beltColor}`, background: beltColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: beltColor }}>{profile.belt.substring(0, 3).toUpperCase()}</span>
              </div>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: beltColor }}>Faixa {profile.belt}</p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555' }}>{trainings.length} treinos · {hrs}h no tatame</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'].map((b, i) => {
                const beltIdx = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'].indexOf(profile.belt);
                const isActive = i <= beltIdx;
                return <div key={b} style={{ flex: 1, height: '8px', background: isActive ? (BELT_COLORS[b] || '#CC0000') : '#1A1A1A', border: b === profile.belt ? `1px solid ${BELT_COLORS[b]}` : '1px solid transparent' }} />;
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
