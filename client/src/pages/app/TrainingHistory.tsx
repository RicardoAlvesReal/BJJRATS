// Design: "Cage Fighter" — Brutalismo Tático
// Histórico completo de treinos com filtros, busca e paginação
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Training, BELT_COLORS, parseTrainingDate, calcXP } from '@/lib/bjjrats-constants';
import api from '@/lib/api';
import { toast } from 'sonner';

const SESSION_MAP: Record<string, { label: string; color: string; icon: string }> = {
  aula_coletiva:   { label: 'Aula Coletiva',   color: '#1A6ECC', icon: '🥋' },
  aula_particular: { label: 'Aula Particular', color: '#7C1ACC', icon: '🎯' },
  treino_livre:    { label: 'Treino Livre',    color: '#CC4400', icon: '🥊' },
  competicao:      { label: 'Competição',      color: '#CC8800', icon: '🏆' },
  seminario:       { label: 'Seminário',       color: '#0D9E6E', icon: '📚' },
};

const PAGE_SIZE = 20;

interface Props {
  trainings: Training[];
  onBack: () => void;
  belt?: string;
  onEdit?: (t: Training) => void;
  onRefresh?: () => void;
}

export default function TrainingHistory({ trainings, onBack, belt, onEdit, onRefresh }: Props) {
  const { user } = useAuth();
  const beltColor = BELT_COLORS[belt || 'Branca'] || '#FFFFFF';

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterModality, setFilterModality] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // firestoreId
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (firestoreId: string) => {
    setDeleting(true);
    try {
      const training = trainings.find(t => t.firestoreId === firestoreId || t.id === firestoreId);
      await api.trainings.delete(firestoreId);
      toast.success('Treino excluído.');
      setConfirmDelete(null);
      onRefresh?.();
    } catch {
      toast.error('Erro ao excluir treino.');
    } finally {
      setDeleting(false);
    }
  };

  // Meses disponíveis
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    trainings.forEach(t => {
      const d = parseTrainingDate(t);
      if (d) set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [trainings]);

  const filtered = useMemo(() => {
    return trainings.filter(t => {
      if (filterType !== 'all' && t.sessionType !== filterType) return false;
      if (filterModality !== 'all' && t.modality !== filterModality) return false;
      if (filterMonth !== 'all') {
        const d = parseTrainingDate(t);
        if (!d) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== filterMonth) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        const academy = (t.academy || '').toLowerCase();
        const professor = (t.professor || '').toLowerCase();
        const sess = SESSION_MAP[t.sessionType || '']?.label.toLowerCase() || '';
        if (!notes.includes(q) && !academy.includes(q) && !professor.includes(q) && !sess.includes(q)) return false;
      }
      return true;
    });
  }, [trainings, filterType, filterModality, filterMonth, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearch(''); setFilterType('all'); setFilterModality('all'); setFilterMonth('all'); setPage(1);
  };

  const hasFilters = search || filterType !== 'all' || filterModality !== 'all' || filterMonth !== 'all';

  const totalMins = filtered.reduce((s, t) => s + (t.duration || 0), 0);
  const totalHrs = Math.round(totalMins / 60 * 10) / 10;

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '2px solid #CC0000', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'sticky', top: 0, background: '#0A0A0A', zIndex: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#CC0000', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em' }}>HISTÓRICO DE TREINOS</h1>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.1rem' }}>
            {filtered.length} treino{filtered.length !== 1 ? 's' : ''} · {totalHrs}h
          </p>
        </div>
        {hasFilters && (
          <button onClick={resetFilters} style={{ background: 'none', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.3rem 0.625rem', cursor: 'pointer', flexShrink: 0 }}>
            LIMPAR
          </button>
        )}
      </div>

      <div style={{ padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>

        {/* Busca */}
        <div style={{ position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por anotações, academia, professor..."
            style={{ width: '100%', background: '#111', border: '1px solid #1E1E1E', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', padding: '0.625rem 0.75rem 0.625rem 2.25rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filtros em linha */}
        <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {/* Tipo */}
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
            style={{ background: filterType !== 'all' ? '#1A0000' : '#111', border: `1px solid ${filterType !== 'all' ? '#CC0000' : '#1E1E1E'}`, color: filterType !== 'all' ? '#CC0000' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem 0.625rem', cursor: 'pointer', flexShrink: 0, outline: 'none' }}
          >
            <option value="all">TIPO: TODOS</option>
            {Object.entries(SESSION_MAP).map(([id, s]) => (
              <option key={id} value={id}>{s.icon} {s.label.toUpperCase()}</option>
            ))}
          </select>

          {/* Modalidade */}
          <select
            value={filterModality}
            onChange={e => { setFilterModality(e.target.value); setPage(1); }}
            style={{ background: filterModality !== 'all' ? '#1A0000' : '#111', border: `1px solid ${filterModality !== 'all' ? '#CC0000' : '#1E1E1E'}`, color: filterModality !== 'all' ? '#CC0000' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem 0.625rem', cursor: 'pointer', flexShrink: 0, outline: 'none' }}
          >
            <option value="all">MODALIDADE: TODAS</option>
            <option value="gi">GI</option>
            <option value="nogi">NO-GI</option>
          </select>

          {/* Mês */}
          <select
            value={filterMonth}
            onChange={e => { setFilterMonth(e.target.value); setPage(1); }}
            style={{ background: filterMonth !== 'all' ? '#1A0000' : '#111', border: `1px solid ${filterMonth !== 'all' ? '#CC0000' : '#1E1E1E'}`, color: filterMonth !== 'all' ? '#CC0000' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem 0.625rem', cursor: 'pointer', flexShrink: 0, outline: 'none' }}
          >
            <option value="all">MÊS: TODOS</option>
            {availableMonths.map(m => {
              const [y, mo] = m.split('-');
              const label = new Date(parseInt(y), parseInt(mo) - 1, 1)
                .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                .toUpperCase();
              return <option key={m} value={m}>{label}</option>;
            })}
          </select>
        </div>

        {/* Lista */}
        {paginated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>
              {hasFilters ? 'NENHUM TREINO ENCONTRADO' : 'NENHUM TREINO REGISTRADO'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {paginated.map((t, i) => {
              const dateObj = parseTrainingDate(t);
              const dateStr = dateObj
                ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '').toUpperCase()
                : '—';
              const sess = SESSION_MAP[t.sessionType || ''] || { label: 'Treino', color: '#555', icon: '🥋' };
              const modLabel = t.modality === 'gi' ? 'Gi' : t.modality === 'nogi' ? 'No-Gi' : null;

              return (
                <div
                  key={t.firestoreId || i}
                  style={{ background: '#111', border: '1px solid #1A1A1A', padding: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}
                >
                  {/* Ícone */}
                  <div style={{ width: '36px', height: '36px', background: sess.color + '18', border: `1px solid ${sess.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.1rem' }}>
                    {sess.icon}
                  </div>

                  {/* Conteúdo */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#CCC', textTransform: 'uppercase' }}>{sess.label}</p>
                      {modLabel && (
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: t.modality === 'gi' ? '#1A6ECC' : '#7C1ACC', background: (t.modality === 'gi' ? '#1A6ECC' : '#7C1ACC') + '18', padding: '0.1rem 0.3rem' }}>{modLabel}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>{dateStr}</p>
                      {t.duration > 0 && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#444' }}>· {t.duration}min</p>}
                      {t.academy && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>· {t.academy}</p>}
                    </div>
                    {t.notes && (
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555', marginTop: '0.375rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.notes}
                      </p>
                    )}
                  </div>

                  {/* Direita: XP + intensidade + ações */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', flexShrink: 0 }}>
                    {t.xp && t.xp > 0 && (
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#CC0000' }}>+{t.xp} XP</p>
                    )}
                    {t.intensity && t.intensity > 0 && (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[1,2,3,4,5].map(n => (
                          <div key={n} style={{ width: '4px', height: '12px', background: n <= t.intensity! ? '#CC0000' : '#1A1A1A' }} />
                        ))}
                      </div>
                    )}
                    {t.satisfaction && t.satisfaction > 0 && (
                      <p style={{ fontSize: '0.75rem' }}>
                        {['', '😞', '😐', '🙂', '😊', '🤩'][t.satisfaction]}
                      </p>
                    )}
                    {/* Botões editar / excluir */}
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.125rem' }}>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(t)}
                          title="Editar treino"
                          style={{ width: '28px', height: '28px', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}
                      {t.firestoreId && (
                        confirmDelete === t.firestoreId ? (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              onClick={() => handleDelete(t.firestoreId!)}
                              disabled={deleting}
                              style={{ height: '28px', background: '#CC0000', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0 0.5rem', cursor: deleting ? 'not-allowed' : 'pointer' }}
                            >
                              {deleting ? '...' : 'SIM'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              style={{ height: '28px', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0 0.5rem', cursor: 'pointer' }}
                            >
                              NÃO
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(t.firestoreId!)}
                            title="Excluir treino"
                            style={{ width: '28px', height: '28px', background: '#1A0000', border: '1px solid #CC000033', color: '#CC0000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', paddingTop: '0.5rem' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ background: '#111', border: '1px solid #1E1E1E', color: page === 1 ? '#333' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem 0.875rem', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              ← ANT.
            </button>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#555', minWidth: '80px', textAlign: 'center' }}>
              {page} / {totalPages}
            </p>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ background: '#111', border: '1px solid #1E1E1E', color: page === totalPages ? '#333' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem 0.875rem', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              PRÓ. →
            </button>
          </div>
        )}

        {/* Resumo dos filtrados */}
        {filtered.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.25rem' }}>
            {[
              { label: 'TREINOS', value: filtered.length },
              { label: 'HORAS', value: `${totalHrs}h` },
              { label: 'XP', value: filtered.reduce((s, t) => s + (t.xp || 0), 0) },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#CC0000', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.125rem' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
