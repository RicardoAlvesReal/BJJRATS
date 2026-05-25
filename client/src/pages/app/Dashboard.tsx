import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import WeeklyGoalBar from '@/components/WeeklyGoalBar';
import { fadeUp as fadeUpVariant, staggerContainer } from '@/lib/animations';
import { COLORS } from '@/lib/design';
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

const BELTS_ORDER = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fadeUp = fadeUpVariant as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const container = staggerContainer as any;

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bjj-header">
        <div>
          <p className="text-[0.65rem] font-bold tracking-[0.15em] text-[#555] uppercase font-['Barlow_Condensed'] mb-0.5">
            BEM-VINDO DE VOLTA
          </p>
          <h1 className="text-[1.5rem] font-black text-white tracking-[0.05em] uppercase font-['Barlow_Condensed']">
            {profile?.name || user?.name || 'ATLETA'}
          </h1>
        </div>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0"
          style={{ border: `3px solid ${beltColor}`, background: '#111' }}
        >
          {profile?.photo ? (
            <img src={profile.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">🥋</span>
          )}
        </div>
      </div>

      <div className="bjj-content">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* XP Card */}
            <motion.div initial="hidden" animate="show" variants={fadeUp} className="bjj-card bjj-card-glow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[0.65rem] font-bold tracking-[0.15em] text-[#555] uppercase font-['Barlow_Condensed'] mb-1">
                    <span style={{ color: levelColor }}>NÍVEL {currentLevel.level}</span> — {currentLevel.name.toUpperCase()}
                  </p>
                  <p className="text-[2rem] font-black text-white leading-none font-['Barlow_Condensed']">
                    {userXP} <span className="bjj-text-gradient text-[0.875rem]">XP</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[0.7rem] text-[#555] font-['Barlow_Condensed'] mb-1">
                    {xpToNext > 0 ? `${xpToNext} XP para nível ${currentLevel.level + 1}` : 'Nível máximo!'}
                  </p>
                  <p className="text-[0.875rem] font-bold text-[#888] font-['Barlow_Condensed']">
                    Streak: <span className="bjj-text-gradient">{str}</span> dias
                  </p>
                </div>
              </div>
              <div className="bjj-xp-bar">
                <div className="bjj-xp-bar-fill" style={{ width: `${xpProgress}%` }} />
              </div>
              <p className="text-[0.6rem] text-[#555] mt-1.5 text-right tracking-[0.05em] uppercase font-['Barlow_Condensed']">
                {xpProgress}% PARA O PRÓXIMO NÍVEL
              </p>
            </motion.div>

            {/* Weekly Goal */}
            <motion.div initial="hidden" animate="show" variants={fadeUp}>
              <WeeklyGoalBar current={weekTrainings} target={weeklyTarget} />
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              className="grid grid-cols-2 gap-2.5"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {[
                { label: 'TREINOS TOTAL', value: trainings.length, icon: '🥋' },
                { label: 'ESTA SEMANA', value: weekTrainings, icon: '📅' },
                { label: 'ESTE MÊS', value: monthTrainings, icon: '🗓' },
                { label: 'HORAS NO TATAME', value: `${hrs}h`, icon: '⏱' },
                { label: 'CONQUISTAS', value: `${unlockedCount}/${ACHIEVEMENTS.length}`, icon: '🏆' },
              ].map(s => (
                <motion.div key={s.label} variants={fadeUp} className="bjj-stat-card">
                  <p className="text-[1.25rem] mb-1">{s.icon}</p>
                  <p className="bjj-stat-number">{s.value}</p>
                  <p className="bjj-stat-label">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* New Training CTA */}
            <motion.button
              onClick={onNewTraining}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="bjj-btn-primary"
            >
              + REGISTRAR TREINO
            </motion.button>

            {/* Activity Calendar */}
            {calendario.length > 0 && (
              <motion.div initial="hidden" animate="show" variants={fadeUp} className="bjj-card">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[0.875rem] font-black text-white tracking-[0.1em] uppercase font-['Barlow_Condensed']">
                    📅 ATIVIDADE (42 DIAS)
                  </p>
                  <p className="text-[0.75rem] font-bold text-[#CC0000] font-['Barlow_Condensed']">{diasAtivos} dias ativos</p>
                </div>
                <div className="grid grid-cols-7 gap-[3px]">
                  {calendario.map((d, i) => {
                    const intensity = d.treinos === 0 ? 0 : d.mins < 30 ? 1 : d.mins < 60 ? 2 : d.mins < 90 ? 3 : 4;
                    const colors = ['#0D0D0D', '#3A0000', '#660000', '#990000', '#CC0000'];
                    return (
                      <div
                        key={i}
                        title={`${d.date.toLocaleDateString('pt-BR')}: ${d.treinos} treino(s)`}
                        className="bjj-activity-dot"
                        style={{ background: colors[intensity], border: '1px solid #1A1A1A' }}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Hours per week chart */}
            {semanas.length > 0 && (
              <motion.div initial="hidden" animate="show" variants={fadeUp} className="bjj-card">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[0.875rem] font-black text-white tracking-[0.1em] uppercase font-['Barlow_Condensed']">
                    ⏱ HORAS POR SEMANA
                  </p>
                  <p className="text-[0.75rem] font-bold text-[#0D9E6E] font-['Barlow_Condensed']">{hrs}h total</p>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={semanas} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 10, fontFamily: 'Barlow Condensed' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px', fontFamily: 'Barlow Condensed', fontSize: '12px', color: '#fff' }} formatter={(v: any) => [`${v}h`, 'Horas']} />
                    <Bar dataKey="horas" fill="#0D9E6E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Top Techniques */}
            {tecnicas.length > 0 && (
              <motion.div initial="hidden" animate="show" variants={fadeUp} className="bjj-card">
                <p className="bjj-section-title">🥋 TOP TÉCNICAS PRATICADAS</p>
                <div className="flex flex-col gap-2">
                  {tecnicas.map((t, i) => {
                    const maxQtd = tecnicas[0].qtd;
                    const pct = Math.round((t.qtd / maxQtd) * 100);
                    return (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <p className="text-[0.75rem] text-[#CCC] tracking-[0.05em] uppercase font-['Barlow_Condensed']">{t.nome}</p>
                          <p className="text-[0.75rem] font-bold text-[#CC0000] font-['Barlow_Condensed']">{t.qtd}x</p>
                        </div>
                        <div className="bjj-progress">
                          <div className="bjj-progress-fill bg-[#CC0000]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Session Types */}
            {sessoes.length > 0 && (
              <motion.div initial="hidden" animate="show" variants={fadeUp} className="bjj-card">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[0.875rem] font-black text-white tracking-[0.1em] uppercase font-['Barlow_Condensed']">
                    📊 TIPOS DE SESSÃO
                  </p>
                  <p className="text-[0.75rem] text-[#555] font-['Barlow_Condensed']">{trainings.length} treinos</p>
                </div>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={sessoes} dataKey="qtd" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2}>
                        {sessoes.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 flex flex-col gap-1.5">
                    {sessoes.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                        <p className="text-[0.75rem] text-[#CCC] flex-1 font-['Barlow_Condensed']">{s.icon} {s.label}</p>
                        <p className="text-[0.75rem] font-bold text-[#888] font-['Barlow_Condensed']">{s.qtd}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Recent Trainings */}
            <div>
              <p className="text-[0.875rem] font-black text-white tracking-[0.1em] uppercase mb-3 font-['Barlow_Condensed']">
                ÚLTIMOS TREINOS
              </p>
              {trainings.length === 0 ? (
                <div className="bjj-card text-center !py-8">
                  <p className="text-4xl mb-3">🥋</p>
                  <p className="text-[1.1rem] font-black text-white uppercase font-['Barlow_Condensed'] mb-2">
                    NENHUM TREINO AINDA
                  </p>
                  <p className="text-[0.875rem] text-[#555] font-['Barlow']">
                    Registre seu primeiro treino para ver seus gráficos de evolução!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {trainings.slice(0, 3).map((t, i) => {
                    const sess = SESSION_TYPES.find(x => x.id === t.sessionType) || SESSION_TYPES[0];
                    const mod = MODALITIES.find(x => x.id === t.modality) || null;
                    const techCount = countAllTechs(t.techniques);
                    return (
                      <motion.div
                        key={t.firestoreId || i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="bjj-card bjj-card-accent hover:!border-[#CC000060]"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-1.5 flex-wrap">
                            <span className="bjj-tag" style={{ border: `1px solid ${sess.color}`, background: sess.color + '20', color: sess.color }}>
                              {sess.icon} {sess.label}
                            </span>
                            {mod && (
                              <span className="bjj-tag" style={{ border: `1px solid ${mod.color}`, background: mod.color + '20', color: mod.color }}>
                                {mod.label}
                              </span>
                            )}
                          </div>
                          <span className="text-[0.7rem] text-[#555] font-['Barlow_Condensed']">{t.trainingDate || '—'}</span>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                          <span className="text-[0.75rem] text-[#888] font-['Barlow']">⏱ {t.duration} min</span>
                          {t.intensity && <span className="text-[0.75rem] text-[#888] font-['Barlow']">🔥 {INTENSITY_LABELS[t.intensity]}</span>}
                          {techCount > 0 && <span className="text-[0.75rem] text-[#888] font-['Barlow']">🥋 {techCount} técnicas</span>}
                        </div>
                        {t.notes && (
                          <p className="text-[0.75rem] text-[#555] italic mt-1.5 truncate font-['Barlow']">{t.notes}</p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Belt Progress */}
            {profile?.belt && (
              <motion.div initial="hidden" animate="show" variants={fadeUp} className="bjj-card">
                <p className="text-[0.875rem] font-black text-white tracking-[0.1em] uppercase mb-3 font-['Barlow_Condensed']">
                  🥋 EVOLUÇÃO DE FAIXA
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ border: `3px solid ${beltColor}`, background: beltColor + '20' }}
                  >
                    <span className="text-[0.75rem] font-black font-['Barlow_Condensed']" style={{ color: beltColor }}>
                      {profile.belt.substring(0, 3).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[1rem] font-black font-['Barlow_Condensed']" style={{ color: beltColor }}>
                      Faixa {profile.belt}
                    </p>
                    <p className="text-[0.75rem] text-[#555] font-['Barlow']">{trainings.length} treinos · {hrs}h no tatame</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {BELTS_ORDER.map((b, i) => {
                    const beltIdx = BELTS_ORDER.indexOf(profile.belt);
                    const isActive = i <= beltIdx;
                    return (
                      <div
                        key={b}
                        className="h-2 flex-1 rounded-sm transition-all duration-300"
                        style={{
                          background: isActive ? (BELT_COLORS[b] || '#CC0000') : '#1A1A1A',
                          border: b === profile.belt ? `1px solid ${BELT_COLORS[b]}` : '1px solid transparent',
                        }}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bjj-card">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-1.5 w-full mb-2" />
        <Skeleton className="h-3 w-20 ml-auto" />
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2.5">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
