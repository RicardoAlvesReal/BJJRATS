// Design: "Cage Fighter" — Brutalismo Tático
// Página pública de Desafio — compartilhável via WhatsApp/Instagram
import { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import api from '@/lib/api';

interface Challenge {
  id: string;
  title: string;
  description?: string;
  goal: number;
  goalType: string;
  startDate: string;
  endDate: string;
  xpReward: number;
  academyName: string;
  academyLogo?: string;
  authorUid: string;
}

interface RankEntry {
  uid: string;
  name: string;
  photo?: string;
  belt: string;
  progress: number;
  completed: boolean;
}

const GOAL_LABELS: Record<string, string> = {
  trainings: 'treinos',
  hours: 'horas treinadas',
  xp: 'XP acumulado',
};

export default function PublicChallenge() {
  const params = useParams<{ challengeId: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const BELT_COLORS: Record<string, string> = {
    Branca: '#FFFFFF', Azul: '#1A6ECC', Roxa: '#7C1ACC', Marrom: '#8B4513', Preta: '#888888',
  };

  useEffect(() => {
    const load = async () => {
      try {
        const d = await api.challenges.get(params.challengeId);
        const ch: Challenge = {
          id: d.id,
          title: d.title || 'Desafio',
          description: d.description,
          goal: d.goal || 0,
          goalType: d.goalType || 'trainings',
          startDate: d.startDate || '',
          endDate: d.endDate || '',
          xpReward: d.xpReward || 0,
          academyName: d.academyName || 'Academia',
          academyLogo: d.academyLogo,
          authorUid: d.authorUid,
        };
        setChallenge(ch);

        document.title = `${ch.title} — ${ch.academyName}`;
        const setMeta = (prop: string, content: string) => {
          let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement;
          if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
          el.setAttribute('content', content);
        };
        setMeta('og:title', `⭐ ${ch.title} — ${ch.academyName}`);
        setMeta('og:description', `Desafio: ${ch.goal} ${GOAL_LABELS[ch.goalType] || 'treinos'} até ${ch.endDate}. +${ch.xpReward} XP de recompensa!`);
        if (ch.academyLogo) setMeta('og:image', ch.academyLogo);
        setMeta('og:url', window.location.href);

        const members = await api.users.list({ academyId: d.authorUid });
        const entries: RankEntry[] = [];
        for (const m of members as any[]) {
          let progress = 0;
          if (ch.goalType === 'trainings') {
            const trainings = await api.trainings.list(m.uid);
            progress = (trainings as any[]).filter((t: any) => {
              const dateStr = t.date || '';
              return dateStr >= ch.startDate && dateStr <= ch.endDate;
            }).length;
          } else if (ch.goalType === 'xp') {
            progress = m.xp || 0;
          } else if (ch.goalType === 'hours') {
            const trainings = await api.trainings.list(m.uid);
            const mins = (trainings as any[])
              .filter((t: any) => (t.date || '') >= ch.startDate && (t.date || '') <= ch.endDate)
              .reduce((s: number, t: any) => s + (t.duration || 0), 0);
            progress = Math.round(mins / 60 * 10) / 10;
          }
          entries.push({
            uid: m.uid,
            name: m.name || 'Atleta',
            photo: m.photo,
            belt: m.belt || 'Branca',
            progress,
            completed: progress >= ch.goal,
          });
        }
        entries.sort((a, b) => b.progress - a.progress);
        setRanking(entries);
      } catch { setNotFound(true); }
      finally { setLoading(false); }
    };
    load();
  }, [params.challengeId]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: challenge?.title, text: `Participe do desafio: ${challenge?.title}`, url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado!');
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem' }}>CARREGANDO...</p>
    </div>
  );

  if (notFound || !challenge) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>⭐</p>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF' }}>DESAFIO NÃO ENCONTRADO</p>
      <Link href="/app" style={{ marginTop: '1.5rem', background: '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem 1.5rem', textDecoration: 'none', display: 'inline-block' }}>
        ABRIR O APP
      </Link>
    </div>
  );

  const completedCount = ranking.filter(r => r.completed).length;

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ background: '#111', borderBottom: '2px solid #CC0000', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        {challenge.academyLogo
          ? <img src={challenge.academyLogo} alt="logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          : <div style={{ width: '40px', height: '40px', background: '#1A0000', border: '1px solid #CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🏫</div>}
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1 }}>{challenge.academyName}</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.125rem' }}>THE BJJRATS</p>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Badge */}
        <span style={{ background: '#1A1000', border: '1px solid #CC8800', color: '#CC8800', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.25rem 0.625rem', alignSelf: 'flex-start' }}>
          ⭐ DESAFIO
        </span>

        {/* Title */}
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em', lineHeight: 1.1 }}>{challenge.title}</h1>

        {/* Meta */}
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { icon: '🎯', label: 'META', value: `${challenge.goal} ${GOAL_LABELS[challenge.goalType] || 'treinos'}` },
            { icon: '📅', label: 'PERÍODO', value: `${challenge.startDate} até ${challenge.endDate}` },
            { icon: '⚡', label: 'RECOMPENSA', value: `+${challenge.xpReward} XP` },
            { icon: '✅', label: 'COMPLETARAM', value: `${completedCount} de ${ranking.length} atletas` },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.1rem' }}>{item.icon}</span>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: '#FFFFFF', marginTop: '0.125rem' }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        {challenge.description && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1.25rem' }}>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: '#CCC', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{challenge.description}</p>
          </div>
        )}

        {/* Ranking */}
        {ranking.length > 0 && (
          <div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '0.75rem' }}>🏆 RANKING</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ranking.map((entry, i) => {
                const pct = Math.min(100, Math.round((entry.progress / challenge.goal) * 100));
                return (
                  <div key={entry.uid} style={{ background: '#111', border: `1px solid ${entry.completed ? '#CC880033' : '#1E1E1E'}`, padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : '#333', width: '24px', textAlign: 'center', flexShrink: 0 }}>
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}`}
                    </p>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: BELT_COLORS[entry.belt] + '20', border: `2px solid ${BELT_COLORS[entry.belt] || '#555'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {entry.photo ? <img src={entry.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.875rem' }}>🥋</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <div style={{ flex: 1, background: '#1A1A1A', height: '4px' }}>
                          <div style={{ background: entry.completed ? '#CC8800' : '#CC0000', height: '4px', width: `${pct}%`, transition: 'width 0.3s' }} />
                        </div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', flexShrink: 0 }}>{entry.progress}/{challenge.goal}</p>
                      </div>
                    </div>
                    {entry.completed && <span style={{ fontSize: '1rem', flexShrink: 0 }}>✅</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/app" style={{ background: '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1rem', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
            🥋 PARTICIPAR NO APP
          </Link>
          <button onClick={handleShare} style={{ background: 'none', border: '1px solid #333', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem', cursor: 'pointer' }}>
            COMPARTILHAR DESAFIO
          </button>
        </div>
      </div>
    </div>
  );
}
