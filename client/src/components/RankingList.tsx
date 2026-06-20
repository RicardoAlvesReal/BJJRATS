// BJJRats PWA — RankingList Component
// Design: "Cage Fighter" — Brutalismo Tático
// Componente reutilizável de ranking com filtro por faixa e métrica
// Usado em: Academy.tsx (ranking interno) e Community.tsx (ranking geral)

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { BELT_COLORS, BELTS } from '@/lib/bjjrats-constants';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface RankedUser {
  uid: string;
  name: string;
  belt: string;
  stripes?: number;
  xp?: number;
  totalTrainings?: number;
  totalMinutes?: number;
  photo?: string | null;
  academy?: string;
  academyId?: string;
  role?: string;
}

type BeltFilter = 'Todas' | 'Branca' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta';
type MetricFilter = 'xp' | 'treinos' | 'horas';

interface RankingListProps {
  /** Se fornecido, filtra apenas usuários dessa academia (ranking interno) */
  academyId?: string | null;
  /** Título exibido no topo */
  title?: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MEDAL_COLORS = ['#CC8800', '#888888', '#8B4513'];
const MEDAL_LABELS = ['🥇', '🥈', '🥉'];

const BELT_FILTER_OPTIONS: BeltFilter[] = ['Todas', 'Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];

const BELT_BG_COLORS: Record<string, string> = {
  Branca: '#FFFFFF22',
  Azul: '#3B82F622',
  Roxa: '#7C3AED22',
  Marrom: '#92400E22',
  Preta: '#37415122',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function RankingList({ academyId, title }: RankingListProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [beltFilter, setBeltFilter] = useState<BeltFilter>('Todas');
  const [metricFilter, setMetricFilter] = useState<MetricFilter>('xp');

  const loadRanking = useCallback(async () => {
    setLoading(true);
    try {
      const docs = academyId
        ? await api.users.list({ academyId })
        : await api.users.list();
      const all = docs as RankedUser[];
      // Excluir professores/admin/academias do ranking (só atletas/alunos competem)
      setUsers(all.filter(u => u.role !== 'academy' && u.role !== 'admin' && u.role !== 'professor'));
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [academyId]);

  useEffect(() => { loadRanking(); }, [loadRanking]);

  // ─── Filtragem e ordenação ─────────────────────────────────────────────────

  const filtered = users.filter(u => {
    if (beltFilter === 'Todas') return true;
    return (u.belt || 'Branca') === beltFilter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (metricFilter === 'xp') return (b.xp || 0) - (a.xp || 0);
    if (metricFilter === 'treinos') return (b.totalTrainings || 0) - (a.totalTrainings || 0);
    // horas: totalMinutes / 60
    return (b.totalMinutes || 0) - (a.totalMinutes || 0);
  });

  const getMetricValue = (u: RankedUser): number => {
    if (metricFilter === 'xp') return u.xp || 0;
    if (metricFilter === 'treinos') return u.totalTrainings || 0;
    return Math.round((u.totalMinutes || 0) / 60 * 10) / 10;
  };

  const getMetricLabel = (): string => {
    if (metricFilter === 'xp') return 'XP';
    if (metricFilter === 'treinos') return 'treinos';
    return 'horas';
  };

  // ─── Pódio (top 3) ────────────────────────────────────────────────────────

  const renderPodium = () => {
    if (sorted.length < 3) return null;
    const podiumOrder = [1, 0, 2]; // 2º, 1º, 3º (visual)
    return (
      <div style={{
        background: '#111',
        border: '1px solid #1E1E1E',
        padding: '1.25rem 1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: '0.5rem',
        marginBottom: '0.25rem',
      }}>
        {podiumOrder.map(idx => {
          const u = sorted[idx];
          if (!u) return null;
          const beltColor = BELT_COLORS[u.belt] || '#FFFFFF';
          const isFirst = idx === 0;
          const medalColor = MEDAL_COLORS[idx];
          const podiumHeight = isFirst ? '80px' : '56px';
          return (
            <div key={u.uid} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '0.3rem', flex: 1, maxWidth: '100px',
            }}>
              <span style={{ fontSize: isFirst ? '1.5rem' : '1.1rem' }}>{MEDAL_LABELS[idx]}</span>
              {/* Avatar */}
              <div style={{
                width: isFirst ? '48px' : '38px',
                height: isFirst ? '48px' : '38px',
                borderRadius: '50%',
                border: `2px solid ${medalColor}`,
                background: BELT_BG_COLORS[u.belt] || '#1A1A1A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {u.photo ? (
                  <img src={u.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
                    fontSize: isFirst ? '0.8rem' : '0.65rem', color: beltColor,
                  }}>
                    {(u.name || 'A').substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Nome */}
              <p style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
                fontSize: '0.65rem', textTransform: 'uppercase', color: '#FFFFFF',
                textAlign: 'center', lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                width: '100%',
              }}>
                {(u.name || 'Atleta').split(' ')[0]}
              </p>
              {/* Faixa badge */}
              <div style={{
                background: BELT_BG_COLORS[u.belt] || '#1A1A1A',
                border: `1px solid ${beltColor}`,
                padding: '0.1rem 0.3rem',
              }}>
                <span style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
                  fontSize: '0.55rem', textTransform: 'uppercase', color: beltColor,
                }}>
                  {u.belt || 'Branca'}
                </span>
              </div>
              {/* Valor da métrica */}
              <p style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
                fontSize: '0.75rem', color: medalColor,
              }}>
                {getMetricValue(u)} {getMetricLabel()}
              </p>
              {/* Pedestal */}
              <div style={{
                background: medalColor + '30',
                border: `1px solid ${medalColor}`,
                width: '100%', height: podiumHeight,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
                  fontSize: '1.5rem', color: medalColor,
                }}>
                  {idx + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* Título opcional */}
      {title && (
        <div style={{
          background: '#111', border: '1px solid #CC000033',
          borderLeft: '3px solid #CC0000', padding: '0.75rem 1rem',
        }}>
          <p style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
            fontSize: '1rem', textTransform: 'uppercase', color: '#FFFFFF',
          }}>
            🏆 {title}
          </p>
        </div>
      )}

      {/* ─── Filtro por Métrica ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        {(['xp', 'treinos', 'horas'] as MetricFilter[]).map(m => (
          <button
            key={m}
            onClick={() => setMetricFilter(m)}
            style={{
              flex: 1, padding: '0.5rem 0.25rem',
              background: metricFilter === m ? '#CC0000' : '#111',
              border: `1px solid ${metricFilter === m ? '#CC0000' : '#2A2A2A'}`,
              color: metricFilter === m ? '#FFFFFF' : '#555',
              fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
              fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {m === 'xp' ? '⚡ XP' : m === 'treinos' ? '🥋 TREINOS' : '⏱ HORAS'}
          </button>
        ))}
      </div>

      {/* ─── Filtro por Faixa ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '2px' }}>
        {BELT_FILTER_OPTIONS.map(belt => {
          const isActive = beltFilter === belt;
          const beltColor = belt === 'Todas' ? '#CC0000' : BELT_COLORS[belt] || '#FFFFFF';
          return (
            <button
              key={belt}
              onClick={() => setBeltFilter(belt)}
              style={{
                flexShrink: 0,
                padding: '0.375rem 0.625rem',
                background: isActive ? (belt === 'Todas' ? '#CC0000' : BELT_BG_COLORS[belt] || '#1A1A1A') : 'transparent',
                border: `1px solid ${isActive ? beltColor : '#2A2A2A'}`,
                color: isActive ? (belt === 'Branca' ? '#111' : beltColor) : '#555',
                fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
                fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {belt === 'Todas' ? 'TODAS' : belt.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* ─── Contador de resultados ─────────────────────────────────────────── */}
      {!loading && (
        <p style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem',
          textTransform: 'uppercase', color: '#444', letterSpacing: '0.05em',
        }}>
          {sorted.length} atleta{sorted.length !== 1 ? 's' : ''}
          {beltFilter !== 'Todas' ? ` · Faixa ${beltFilter}` : ''}
        </p>
      )}

      {/* ─── Loading ────────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{
          textAlign: 'center', padding: '3rem',
          color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
        }}>
          CARREGANDO...
        </div>
      )}

      {/* ─── Vazio ──────────────────────────────────────────────────────────── */}
      {!loading && sorted.length === 0 && (
        <div style={{
          background: '#111', border: '1px solid #1E1E1E',
          padding: '2.5rem', textAlign: 'center',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</p>
          <p style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
            fontSize: '1rem', textTransform: 'uppercase', color: '#555',
          }}>
            {beltFilter !== 'Todas' ? `NENHUM ATLETA FAIXA ${beltFilter.toUpperCase()}` : 'RANKING VAZIO'}
          </p>
          {beltFilter !== 'Todas' && (
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444', marginTop: '0.5rem' }}>
              Tente selecionar outra faixa ou "Todas"
            </p>
          )}
        </div>
      )}

      {/* ─── Pódio ──────────────────────────────────────────────────────────── */}
      {!loading && sorted.length >= 3 && renderPodium()}

      {/* ─── Lista completa ─────────────────────────────────────────────────── */}
      {!loading && sorted.length > 0 && sorted.map((u, i) => {
        const beltColor = BELT_COLORS[u.belt] || '#FFFFFF';
        const isMe = user && u.uid === user.uid;
        const medal = i < 3 ? MEDAL_LABELS[i] : null;
        const metricValue = getMetricValue(u);
        const metricLabel = getMetricLabel();

        return (
          <div
            key={u.uid}
            style={{
              background: isMe ? '#1A0000' : '#111',
              border: `1px solid ${isMe ? '#CC0000' : '#1E1E1E'}`,
              padding: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}
          >
            {/* Posição */}
            <div style={{ width: '28px', textAlign: 'center', flexShrink: 0 }}>
              {medal
                ? <span style={{ fontSize: '1.1rem' }}>{medal}</span>
                : <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
                    fontSize: '0.875rem', color: '#444',
                  }}>#{i + 1}</span>
              }
            </div>

            {/* Avatar */}
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              border: `2px solid ${beltColor}`,
              background: BELT_BG_COLORS[u.belt] || '#1A1A1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, overflow: 'hidden',
            }}>
              {u.photo ? (
                <img src={u.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
                  fontSize: '0.65rem', color: beltColor,
                }}>
                  {(u.name || 'A').substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
                fontSize: '0.9rem', color: isMe ? '#FF4444' : '#FFFFFF',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {u.name || 'Atleta'}
                {isMe && <span style={{ fontSize: '0.6rem', color: '#CC0000', marginLeft: '0.375rem' }}>• VOCÊ</span>}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.15rem' }}>
                {/* Faixa badge */}
                <div style={{
                  background: BELT_BG_COLORS[u.belt] || '#1A1A1A',
                  border: `1px solid ${beltColor}`,
                  padding: '0.05rem 0.3rem', flexShrink: 0,
                }}>
                  <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
                    fontSize: '0.55rem', textTransform: 'uppercase', color: beltColor,
                  }}>
                    {u.belt || 'Branca'}
                  </span>
                </div>
                {/* Stripes */}
                {(u.stripes || 0) > 0 && (
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {Array.from({ length: Math.min(u.stripes || 0, 4) }).map((_, si) => (
                      <div key={si} style={{
                        width: '6px', height: '6px', background: '#FFFFFF',
                        border: '1px solid #555', borderRadius: '1px',
                      }} />
                    ))}
                  </div>
                )}
                {/* Academia (apenas no ranking geral) */}
                {!academyId && u.academy && (
                  <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem',
                    color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    · {u.academy}
                  </span>
                )}
              </div>
            </div>

            {/* Métrica */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
                fontSize: '1rem', color: '#CC0000', lineHeight: 1,
              }}>
                {metricValue}
              </p>
              <p style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem',
                color: '#444', textTransform: 'uppercase',
              }}>
                {metricLabel}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
