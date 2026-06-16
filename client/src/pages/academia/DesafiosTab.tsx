// BJJRats — Aba de Desafios para o Painel da Academia
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Challenge {
  id: string;
  title: string;
  description?: string;
  goal: number;
  goalType: string;
  startDate: string;
  endDate: string;
  xpReward: number;
  createdAtStr?: string;
  creatorUid?: string;
}

const EMPTY_CHALLENGE_FORM = {
  title: '',
  description: '',
  goal: '',
  goalType: 'trainings',
  startDate: '',
  endDate: '',
  xpReward: '50',
};

const ACCENT = '#E87722';

// ── DesafiosTab ────────────────────────────────────────────────────────────────
export default function DesafiosTab() {
  const { user, profile } = useAuth();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [showNewChallenge, setShowNewChallenge] = useState(false);
  const [challengeForm, setChallengeForm] = useState(EMPTY_CHALLENGE_FORM);
  const [savingChallenge, setSavingChallenge] = useState(false);
  const [challengeRanking, setChallengeRanking] = useState<{
    challengeId: string;
    entries: { uid: string; name: string; belt: string; progress: number; completed: boolean }[];
  } | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);

  const loadChallenges = useCallback(async () => {
    if (!user) return;
    setChallengesLoading(true);
    try {
      const all = await api.challenges.list({ academyId: user.uid });
      const sorted = (all as Challenge[]).sort((a, b) => (b.startDate > a.startDate ? 1 : b.startDate < a.startDate ? -1 : 0));
      setChallenges(sorted);
    } catch {
      setChallenges([]);
    } finally {
      setChallengesLoading(false);
    }
  }, [user]);

  useEffect(() => { loadChallenges(); }, [loadChallenges]);

  const handleSaveChallenge = async () => {
    if (!user || !profile) return;
    if (!challengeForm.title.trim() || !challengeForm.goal || !challengeForm.startDate || !challengeForm.endDate) return;
    setSavingChallenge(true);
    try {
      const publisherName = (profile as any).academyName || profile.name;
      const publisherLogo = (profile as any).academyLogoUrl || (profile as any).academyLogo || '';
      await api.challenges.create({
        authorUid: user.uid,
        academyId: user.uid,
        academyName: publisherName,
        academyLogo: publisherLogo,
        title: challengeForm.title.trim(),
        description: challengeForm.description.trim() || null,
        goal: parseInt(challengeForm.goal),
        goalType: challengeForm.goalType,
        startDate: challengeForm.startDate,
        endDate: challengeForm.endDate,
        xpReward: parseInt(challengeForm.xpReward) || 50,
        createdAtStr: new Date().toLocaleDateString('pt-BR'),
      });
      toast.success('Desafio criado!');
      setChallengeForm(EMPTY_CHALLENGE_FORM);
      setShowNewChallenge(false);
      loadChallenges();
    } catch {
      toast.error('Erro ao criar desafio');
    } finally {
      setSavingChallenge(false);
    }
  };

  const canSubmit = challengeForm.title.trim() && challengeForm.goal && challengeForm.startDate && challengeForm.endDate;

  const handleLoadRanking = async (ch: Challenge) => {
    if (challengeRanking?.challengeId === ch.id) { setChallengeRanking(null); return; }
    setRankingLoading(true);
    try {
      const trainings = await api.trainings.list();
      const byUser: Record<string, any[]> = {};
      for (const t of (trainings as any[])) {
        if (!t.trainingDate || t.trainingDate < ch.startDate || t.trainingDate > ch.endDate) continue;
        if (!byUser[t.uid]) byUser[t.uid] = [];
        byUser[t.uid].push(t);
      }
      const entries = Object.entries(byUser).map(([uid, ts]) => {
        const first = ts[0];
        let progress = 0;
        if (ch.goalType === 'trainings') progress = ts.length;
        else if (ch.goalType === 'xp') progress = ts.reduce((s, t) => s + (t.xp || 0), 0);
        else if (ch.goalType === 'minutes') progress = ts.reduce((s, t) => s + (t.duration || 0), 0);
        return { uid, name: first.userName || 'Atleta', belt: first.userBelt || 'Branca', progress, completed: progress >= ch.goal };
      });
      entries.sort((a, b) => b.progress - a.progress);
      setChallengeRanking({ challengeId: ch.id, entries });
    } catch {
      toast.error('Erro ao carregar ranking');
    } finally {
      setRankingLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <button onClick={() => setShowNewChallenge(true)}
        style={{ background: ACCENT, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.875rem', cursor: 'pointer', width: '100%' }}>
        + NOVO DESAFIO
      </button>

      {showNewChallenge && (
        <div style={{ background: '#111', border: `1px solid ${ACCENT}`, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#FFF' }}>NOVO DESAFIO</p>

          {[{ k: 'title', l: 'TÍTULO *', ph: 'Ex: Desafio 30 Treinos' }, { k: 'description', l: 'DESCRIÇÃO', ph: 'Explique o desafio...' }].map(f => (
            <div key={f.k}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{f.l}</p>
              <input type="text" value={(challengeForm as Record<string, string>)[f.k]}
                onChange={e => setChallengeForm(prev => ({ ...prev, [f.k]: e.target.value }))}
                placeholder={f.ph}
                style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>META (TIPO)</p>
              <select value={challengeForm.goalType} onChange={e => setChallengeForm(prev => ({ ...prev, goalType: e.target.value }))}
                style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }}>
                <option value="trainings">Nº DE TREINOS</option>
                <option value="minutes">MINUTOS DE TREINO</option>
                <option value="xp">XP ACUMULADO</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>META (VALOR) *</p>
              <input type="number" value={challengeForm.goal} onChange={e => setChallengeForm(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="Ex: 30"
                style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>INÍCIO *</p>
              <input type="date" value={challengeForm.startDate} onChange={e => setChallengeForm(prev => ({ ...prev, startDate: e.target.value }))}
                style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>TÉRMINO *</p>
              <input type="date" value={challengeForm.endDate} onChange={e => setChallengeForm(prev => ({ ...prev, endDate: e.target.value }))}
                style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>RECOMPENSA XP</p>
            <input type="number" value={challengeForm.xpReward} onChange={e => setChallengeForm(prev => ({ ...prev, xpReward: e.target.value }))}
              placeholder="Ex: 100"
              style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button onClick={() => { setShowNewChallenge(false); setChallengeForm(EMPTY_CHALLENGE_FORM); }}
              style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer' }}>
              CANCELAR
            </button>
            <button onClick={handleSaveChallenge} disabled={savingChallenge || !canSubmit}
              style={{ flex: 2, background: (savingChallenge || !canSubmit) ? '#333' : ACCENT, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer' }}>
              {savingChallenge ? 'SALVANDO...' : '⭐ CRIAR DESAFIO'}
            </button>
          </div>
        </div>
      )}

      {challengesLoading && (
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>CARREGANDO...</p>
      )}
      {!challengesLoading && challenges.length === 0 && !showNewChallenge && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⭐</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM DESAFIO CRIADO</p>
        </div>
      )}

      {challenges.map(ch => (
        <div key={ch.id} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1 }}>{ch.title}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: ACCENT, textTransform: 'uppercase', marginTop: '0.25rem' }}>{ch.startDate} → {ch.endDate}</p>
            </div>
            <span style={{ background: '#FFD70022', border: '1px solid #FFD700', color: '#FFD700', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', flexShrink: 0 }}>
              +{ch.xpReward} XP
            </span>
          </div>
          {ch.description && (
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#666', lineHeight: 1.4 }}>{ch.description}</p>
          )}
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#888' }}>
            META: {ch.goal} {ch.goalType === 'trainings' ? 'TREINOS' : ch.goalType === 'minutes' ? 'MINUTOS' : 'XP'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => handleLoadRanking(ch)}
              style={{ background: '#1A1A2A', border: '1px solid #2A2A4A', color: '#8888CC', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer' }}>
              {rankingLoading && challengeRanking?.challengeId !== ch.id ? '...' : challengeRanking?.challengeId === ch.id ? '✖ FECHAR' : '🏆 RANKING'}
            </button>
            <button onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/desafio/${ch.id}`).catch(() => {}); toast.success('Link copiado!'); }}
              style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer' }}>
              🔗 LINK
            </button>
            <button onClick={async () => { await api.challenges.delete(ch.id); setChallenges(prev => prev.filter(c => c.id !== ch.id)); toast.success('Desafio removido'); }}
              style={{ background: '#1A0000', border: '1px solid #3A0000', color: '#CC3333', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer' }}>
              🗑️
            </button>
          </div>

          {/* Ranking expandido */}
          {challengeRanking?.challengeId === ch.id && (
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid #1E1E1E', paddingTop: '0.75rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', color: ACCENT, marginBottom: '0.5rem' }}>
                🏆 RANKING — {challengeRanking.entries.length} PARTICIPANTE{challengeRanking.entries.length !== 1 ? 'S' : ''}
              </p>
              {challengeRanking.entries.length === 0 ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', textAlign: 'center', padding: '0.75rem 0' }}>Nenhum inscrito ainda</p>
              ) : challengeRanking.entries.map((entry, idx) => (
                <div key={entry.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0', borderBottom: '1px solid #111' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#555', minWidth: '1.25rem', textAlign: 'center' }}>
                    {idx + 1}
                  </span>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#888', border: '1px solid #333', flexShrink: 0 }} />
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#FFF', textTransform: 'uppercase', flex: 1, margin: 0 }}>{entry.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <div style={{ width: '60px', height: '4px', background: '#1E1E1E', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (entry.progress / ch.goal) * 100)}%`, height: '100%', background: entry.completed ? '#22C55E' : ACCENT }} />
                    </div>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: entry.completed ? '#22C55E' : '#888' }}>
                      {entry.progress}/{ch.goal}
                    </span>
                    {entry.completed && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
