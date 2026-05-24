// BJJRats PWA — Goals & Achievements Screen
// Design: "Cage Fighter" — Brutalismo Tático
// Metas de treino + conquistas desbloqueadas/bloqueadas
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  Training, ACHIEVEMENTS, calcXP, getLevelInfo, parseTrainingDate,
  treinsNaSemana, treinsNoMes,
} from '@/lib/bjjrats-constants';

interface Goal {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  icon: string;
}

type GoalTab = 'metas' | 'conquistas' | 'desafios';

interface ChallengeEntry {
  id: string;
  title: string;
  description?: string;
  goal: number;
  goalType: string; // 'trainings' | 'minutes' | 'xp'
  startDate: string;
  endDate: string;
  xpReward: number;
  academyId: string;
  authorUid: string;
  // participation
  enrolled?: boolean;
  progress?: number;
  completed?: boolean;
}

export default function Goals() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<GoalTab>('metas');
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom goal targets (stored in Firestore)
  const [targets, setTargets] = useState({
    weeklyTrainings: 3,
    monthlyTrainings: 12,
    weeklyMinutes: 180,
    totalTrainings: 100,
  });
  const [editingTargets, setEditingTargets] = useState(false);
  const [tempTargets, setTempTargets] = useState({ ...targets });

  // Challenges
  const [challenges, setChallenges] = useState<ChallengeEntry[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);

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
    } catch (e) { console.error('Goals fetch error:', e); }
    finally { setLoading(false); }
  }, [user]);

  const loadTargets = useCallback(async () => {
    if (!user) return;
    try {
      const goalsData = await api.goals.list(user.uid) as any[];
      if (goalsData.length > 0) {
        const data = goalsData[0];
        setTargets(prev => ({ ...prev, ...data }));
        setTempTargets(prev => ({ ...prev, ...data }));
      }
    } catch { /* use defaults */ }
  }, [user]);

  useEffect(() => { loadTrainings(); loadTargets(); }, [loadTrainings, loadTargets]);

  const loadChallenges = useCallback(async () => {
    if (!user || !profile?.academyId) return;
    setChallengesLoading(true);
    try {
    // challenges not fully supported without participant tracking; show empty list
    setChallenges([]);
    } catch (e) { console.error('loadChallenges error', e); }
    finally { setChallengesLoading(false); }
  }, [user, profile?.academyId]);

  useEffect(() => {
    if (activeTab === 'desafios') loadChallenges();
  }, [activeTab, loadChallenges]);

  const handleEnroll = async (ch: ChallengeEntry) => {
    if (!user || !profile) return;
    try {
    toast.success('Inscrito no desafio! 💪');
    setChallenges(prev => prev.map(c => c.id === ch.id ? { ...c, enrolled: true, progress: 0, completed: false } : c));
    } catch { toast.error('Erro ao se inscrever'); }
  };

  const handleUnenroll = async (ch: ChallengeEntry) => {
    if (!user) return;
    try {
      setChallenges(prev => prev.map(c => c.id === ch.id ? { ...c, enrolled: false, progress: 0, completed: false } : c));
      toast.success('Inscrição cancelada');
    } catch { toast.error('Erro ao cancelar inscrição'); }
  };

  const saveTargets = async () => {
    if (!user) return;
    try {
      const existing = await api.goals.list(user.uid) as any[];
      if (existing.length > 0) {
        await api.goals.update(existing[0].id, { ...tempTargets });
      } else {
        await api.goals.create({ uid: user.uid, ...tempTargets });
      }
      setTargets(tempTargets);
      setEditingTargets(false);
      toast.success('Metas atualizadas!');
    } catch { toast.error('Erro ao salvar metas'); }
  };

  // ─── Compute current values ──────────────────────────────────────────────
  const weekTrains = treinsNaSemana(trainings);
  const monthTrains = treinsNoMes(trainings);
  const totalMins = trainings.reduce((s, t) => s + (t.duration || 0), 0);
  const weekMins = trainings
    .filter(t => {
      const d = parseTrainingDate(t);
      if (!d) return false;
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek;
    })
    .reduce((s, t) => s + (t.duration || 0), 0);

  const userXP = calcXP(trainings);
  const { currentLevel, xpProgress, xpToNext } = getLevelInfo(userXP);

  const goals: Goal[] = [
    {
      id: 'weekly', label: 'Treinos esta semana', icon: '📅',
      current: weekTrains, target: targets.weeklyTrainings, unit: 'treinos', color: '#CC0000',
    },
    {
      id: 'monthly', label: 'Treinos este mês', icon: '📆',
      current: monthTrains, target: targets.monthlyTrainings, unit: 'treinos', color: '#1A6ECC',
    },
    {
      id: 'weekmins', label: 'Minutos esta semana', icon: '⏱',
      current: weekMins, target: targets.weeklyMinutes, unit: 'min', color: '#0D9E6E',
    },
    {
      id: 'total', label: 'Total de treinos', icon: '🥋',
      current: trainings.length, target: targets.totalTrainings, unit: 'treinos', color: '#CC8800',
    },
  ];

  const unlockedAchievements = ACHIEVEMENTS.filter(a => a.check(trainings));
  const lockedAchievements = ACHIEVEMENTS.filter(a => !a.check(trainings));

  const getProgressLabel = (ch: ChallengeEntry) => {
    const p = ch.progress || 0;
    if (ch.goalType === 'trainings') return `${p} / ${ch.goal} treinos`;
    if (ch.goalType === 'minutes') return `${p} / ${ch.goal} min`;
    if (ch.goalType === 'xp') return `${p} / ${ch.goal} XP`;
    return `${p} / ${ch.goal}`;
  };

  const getDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  if (loading) {
    return (
      <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#444' }}>CARREGANDO...</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ background: '#0A0A0A', borderBottom: '1px solid #1E1E1E', padding: '1rem 1.25rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1 }}>METAS & CONQUISTAS</h1>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.1em' }}>
              {unlockedAchievements.length}/{ACHIEVEMENTS.length} conquistas desbloqueadas
            </p>
          </div>
          {activeTab === 'metas' && (
            <button onClick={() => { setEditingTargets(true); setTempTargets(targets); }} style={{ background: '#111', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.375rem 0.625rem', cursor: 'pointer' }}>
              ✏️ EDITAR
            </button>
          )}
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', overflowX: 'auto' }}>
          <button onClick={() => setActiveTab('metas')} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.625rem 1rem', border: 'none', background: 'transparent', color: activeTab === 'metas' ? '#CC0000' : '#555', borderBottom: activeTab === 'metas' ? '2px solid #CC0000' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>METAS</button>
          <button onClick={() => setActiveTab('conquistas')} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.625rem 1rem', border: 'none', background: 'transparent', color: activeTab === 'conquistas' ? '#CC0000' : '#555', borderBottom: activeTab === 'conquistas' ? '2px solid #CC0000' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>CONQUISTAS ({unlockedAchievements.length})</button>
          <button onClick={() => setActiveTab('desafios')} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.625rem 1rem', border: 'none', background: 'transparent', color: activeTab === 'desafios' ? '#CC0000' : '#555', borderBottom: activeTab === 'desafios' ? '2px solid #CC0000' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>DESAFIOS {challenges.filter(c => c.enrolled).length > 0 ? `(${challenges.filter(c => c.enrolled).length})` : ''}</button>
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >

      {/* ─── Desafios Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'desafios' && (
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {challengesLoading && (
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem', textAlign: 'center', padding: '3rem' }}>CARREGANDO...</p>
          )}
          {!challengesLoading && !profile?.academyId && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⭐</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#555' }}>Vincule-se a uma academia para ver os desafios</p>
            </div>
          )}
          {!challengesLoading && profile?.academyId && challenges.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⭐</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#555' }}>Nenhum desafio ativo no momento</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#444', marginTop: '0.5rem' }}>Aguarde seu professor criar um desafio!</p>
            </div>
          )}
          {challenges.map(ch => {
            const pct = Math.min(100, Math.round(((ch.progress || 0) / ch.goal) * 100));
            const daysLeft = getDaysLeft(ch.endDate);
            const borderColor = ch.completed ? '#0D9E6E' : ch.enrolled ? '#CC0000' : '#1E1E1E';
            return (
              <div key={ch.id} style={{ background: '#111', border: `1px solid ${borderColor}`, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1, marginBottom: '0.25rem' }}>{ch.title}</p>
                    {ch.description && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#666', lineHeight: 1.4 }}>{ch.description}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#CC8800' }}>+{ch.xpReward} XP</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', color: daysLeft <= 3 ? '#CC3333' : '#555' }}>{daysLeft}d restantes</p>
                  </div>
                </div>

                {ch.enrolled && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', color: '#888' }}>{getProgressLabel(ch)}</span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', color: ch.completed ? '#0D9E6E' : '#CC0000' }}>{pct}%</span>
                    </div>
                    <div style={{ background: '#1E1E1E', height: '6px' }}>
                      <div style={{ background: ch.completed ? '#0D9E6E' : '#CC0000', height: '100%', width: `${pct}%`, transition: 'width 0.5s ease' }} />
                    </div>
                    {ch.completed && (
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', color: '#0D9E6E', marginTop: '0.375rem' }}>✅ DESAFIO CONCLUÍDO!</p>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', color: '#555', background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '0.25rem 0.5rem' }}>
                    {ch.goalType === 'trainings' ? '🥋 TREINOS' : ch.goalType === 'minutes' ? '⏱ MINUTOS' : '⚡ XP'}
                  </span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', color: '#555', background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '0.25rem 0.5rem' }}>
                    📅 {ch.startDate} → {ch.endDate}
                  </span>
                </div>

                {!ch.enrolled ? (
                  <button onClick={() => handleEnroll(ch)}
                    style={{ background: '#CC0000', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.75rem', cursor: 'pointer', marginTop: '0.25rem' }}>
                    ⭐ PARTICIPAR DO DESAFIO
                  </button>
                ) : !ch.completed ? (
                  <button onClick={() => handleUnenroll(ch)}
                    style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem', cursor: 'pointer', marginTop: '0.25rem' }}>
                    CANCELAR INSCRIÇÃO
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Metas Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'metas' && (
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* XP / Level Progress */}
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: '3px solid #CC0000', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888' }}>NÍVEL ATUAL</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#FFFFFF', lineHeight: 1 }}>{currentLevel.name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#CC0000', lineHeight: 1 }}>{userXP} XP</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', color: '#555' }}>faltam {xpToNext} XP</p>
              </div>
            </div>
            <div style={{ background: '#1E1E1E', height: '6px', borderRadius: '0' }}>
              <div style={{ background: '#CC0000', height: '100%', width: `${xpProgress}%`, transition: 'width 0.5s ease' }} />
            </div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', textTransform: 'uppercase', color: '#444', marginTop: '0.375rem', textAlign: 'right' }}>{Math.round(xpProgress)}% para o próximo nível</p>
          </div>

          {/* Goals */}
          {goals.map(goal => {
            const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
            const done = goal.current >= goal.target;
            return (
              <div key={goal.id} style={{ background: '#111', border: `1px solid ${done ? goal.color : '#1E1E1E'}`, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{goal.icon}</span>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', color: '#FFFFFF' }}>{goal.label}</p>
                      {done && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.6rem', textTransform: 'uppercase', color: goal.color }}>✓ META ATINGIDA!</p>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: done ? goal.color : '#FFFFFF', lineHeight: 1 }}>{goal.current}</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555' }}>/{goal.target} {goal.unit}</span>
                  </div>
                </div>
                <div style={{ background: '#1E1E1E', height: '4px' }}>
                  <div style={{ background: goal.color, height: '100%', width: `${pct}%`, transition: 'width 0.5s ease' }} />
                </div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', textTransform: 'uppercase', color: '#444', marginTop: '0.25rem', textAlign: 'right' }}>{pct}%</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Conquistas Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'conquistas' && (
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Unlocked */}
          {unlockedAchievements.length > 0 && (
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '0.5rem' }}>
                DESBLOQUEADAS ({unlockedAchievements.length})
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {unlockedAchievements.map(a => (
                  <div key={a.id} style={{ background: '#111', border: '1px solid #CC0000', padding: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.375rem' }}>
                    <span style={{ fontSize: '1.75rem' }}>{a.icon}</span>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1.2 }}>{a.title}</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#888', lineHeight: 1.4 }}>{a.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked */}
          {lockedAchievements.length > 0 && (
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: '0.5rem' }}>
                BLOQUEADAS ({lockedAchievements.length})
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {lockedAchievements.map(a => (
                  <div key={a.id} style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.375rem', opacity: 0.5 }}>
                    <span style={{ fontSize: '1.75rem', filter: 'grayscale(1)' }}>{a.icon}</span>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: '#555', lineHeight: 1.2 }}>{a.title}</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#444', lineHeight: 1.4 }}>{a.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unlockedAchievements.length === 0 && (
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2.5rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUMA CONQUISTA AINDA</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444', marginTop: '0.5rem' }}>Registre treinos para desbloquear conquistas.</p>
            </div>
          )}
        </div>
      )}
      </motion.div>
      </AnimatePresence>

      {/* ─── Edit Targets Modal ──────────────────────────────────────────────── */}
      {editingTargets && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderBottom: 'none', width: '100%', maxWidth: '480px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFFFFF' }}>✏️ EDITAR METAS</h2>
              <button onClick={() => setEditingTargets(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>
            {[
              { key: 'weeklyTrainings', label: 'Treinos por semana', min: 1, max: 14 },
              { key: 'monthlyTrainings', label: 'Treinos por mês', min: 1, max: 60 },
              { key: 'weeklyMinutes', label: 'Minutos por semana', min: 30, max: 1200 },
              { key: 'totalTrainings', label: 'Meta total de treinos', min: 10, max: 1000 },
            ].map(field => (
              <div key={field.key}>
                <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', display: 'block', marginBottom: '0.375rem' }}>{field.label}</label>
                <input
                  type="number" min={field.min} max={field.max}
                  value={(tempTargets as any)[field.key]}
                  onChange={e => setTempTargets(p => ({ ...p, [field.key]: parseInt(e.target.value) || field.min }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <button onClick={saveTargets} style={{ background: '#CC0000', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', padding: '1rem', border: 'none', width: '100%', cursor: 'pointer' }}>
              SALVAR METAS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
