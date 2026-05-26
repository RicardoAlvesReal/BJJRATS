// Histórico completo de treinos com filtros, busca e paginação
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Training, BELT_COLORS, parseTrainingDate, calcXP } from '@/lib/bjjrats-constants';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { COLORS } from '@/lib/design';
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
    <div className="bjj-content" style={{ paddingBottom: '80px' }}>

      {/* Header */}
      <div className="bjj-header">
        <button onClick={onBack} className="text-[#CC0000] p-1 flex items-center shrink-0 bg-none border-none cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="flex-1">
          <h1 className="bjj-header-title">HISTÓRICO DE TREINOS</h1>
          <p className="text-[0.65rem] text-[#555] uppercase tracking-[0.05em] mt-0.5 font-['Barlow_Condensed']">
            {filtered.length} treino{filtered.length !== 1 ? 's' : ''} · {totalHrs}h
          </p>
        </div>
      </div>

      <div className="bjj-content-gap">

        {/* Busca */}
        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por anotações, academia, professor..."
            className="bjj-input"
            style={{ paddingLeft: '2.25rem', fontSize: '0.8rem', paddingTop: '0.625rem', paddingBottom: '0.625rem' }}
          />
        </div>

        {/* Filtros em linha */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {/* Tipo */}
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="text-[0.7rem] font-black uppercase tracking-[0.08em] px-2.5 py-2 rounded-lg shrink-0 outline-none cursor-pointer font-['Barlow_Condensed'] transition-all duration-200"
            style={{ background: filterType !== 'all' ? '#1A0000' : '#111', border: `1px solid ${filterType !== 'all' ? '#CC0000' : '#2A2A2A'}`, color: filterType !== 'all' ? '#CC0000' : '#888' }}
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
            className="text-[0.7rem] font-black uppercase tracking-[0.08em] px-2.5 py-2 rounded-lg shrink-0 outline-none cursor-pointer font-['Barlow_Condensed'] transition-all duration-200"
            style={{ background: filterModality !== 'all' ? '#1A0000' : '#111', border: `1px solid ${filterModality !== 'all' ? '#CC0000' : '#2A2A2A'}`, color: filterModality !== 'all' ? '#CC0000' : '#888' }}
          >
            <option value="all">MODALIDADE: TODAS</option>
            <option value="gi">GI</option>
            <option value="nogi">NO-GI</option>
          </select>

          {/* Mês */}
          <select
            value={filterMonth}
            onChange={e => { setFilterMonth(e.target.value); setPage(1); }}
            className="text-[0.7rem] font-black uppercase tracking-[0.08em] px-2.5 py-2 rounded-lg shrink-0 outline-none cursor-pointer font-['Barlow_Condensed'] transition-all duration-200"
            style={{ background: filterMonth !== 'all' ? '#1A0000' : '#111', border: `1px solid ${filterMonth !== 'all' ? '#CC0000' : '#2A2A2A'}`, color: filterMonth !== 'all' ? '#CC0000' : '#888' }}
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

          {hasFilters && (
            <button onClick={resetFilters} className="bjj-btn-ghost shrink-0 text-[0.6rem] px-2.5 py-1.5">
              LIMPAR
            </button>
          )}
        </motion.div>

        {/* Lista */}
        {paginated.length === 0 ? (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center py-12">
            <p className="text-[2.5rem] mb-3">🔍</p>
            <p className="text-[1rem] font-bold uppercase text-[#555] font-['Barlow_Condensed']">
              {hasFilters ? 'NENHUM TREINO ENCONTRADO' : 'NENHUM TREINO REGISTRADO'}
            </p>
          </motion.div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-1.5">
            {paginated.map((t, i) => {
              const dateObj = parseTrainingDate(t);
              const dateStr = dateObj
                ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '').toUpperCase()
                : '—';
              const sess = SESSION_MAP[t.sessionType || ''] || { label: 'Treino', color: '#555', icon: '🥋' };
              const modLabel = t.modality === 'gi' ? 'Gi' : t.modality === 'nogi' ? 'No-Gi' : null;

              return (
                <motion.div
                  key={t.firestoreId || i}
                  variants={fadeUp}
                  className="bjj-card flex items-stretch overflow-hidden p-0"
                  style={{ borderLeft: `3px solid ${sess.color}` }}
                >
                  {/* Ícone */}
                  <div className="w-9 shrink-0 flex items-center justify-center" style={{ background: sess.color + '18' }}>
                    <span className="text-[1.1rem]">{sess.icon}</span>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 p-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[0.875rem] font-bold text-[#CCC] uppercase font-['Barlow_Condensed']">{sess.label}</p>
                      {modLabel && (
                        <span className="text-[0.6rem] font-['Barlow_Condensed'] px-1 py-0.5" style={{ color: t.modality === 'gi' ? '#1A6ECC' : '#7C1ACC', background: (t.modality === 'gi' ? '#1A6ECC' : '#7C1ACC') + '18' }}>{modLabel}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-[0.7rem] text-[#555] font-['Barlow']">{dateStr}</p>
                      {t.duration > 0 && <p className="text-[0.7rem] text-[#444] font-['Barlow']">· {t.duration}min</p>}
                      {t.academy && <p className="text-[0.7rem] text-[#333] font-['Barlow'] truncate max-w-[120px]">· {t.academy}</p>}
                    </div>
                    {t.notes && (
                      <p className="text-[0.7rem] text-[#555] italic mt-1.5 leading-[1.4] font-['Barlow'] line-clamp-2">
                        "{t.notes}"
                      </p>
                    )}
                  </div>

                  {/* Direita: XP + intensidade + ações */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0 p-3 pl-0">
                    {t.xp && t.xp > 0 && (
                      <p className="text-[0.75rem] font-black text-[#CC0000] font-['Barlow_Condensed']">+{t.xp} XP</p>
                    )}
                    {t.intensity && t.intensity > 0 && (
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <div key={n} className="w-1 h-3" style={{ background: n <= t.intensity! ? '#CC0000' : '#1A1A1A' }} />
                        ))}
                      </div>
                    )}
                    {t.satisfaction && t.satisfaction > 0 && (
                      <p className="text-[0.75rem]">{['', '😞', '😐', '🙂', '😊', '🤩'][t.satisfaction]}</p>
                    )}
                    {/* Botões editar / excluir */}
                    <div className="flex gap-1 mt-0.5">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(t)}
                          title="Editar treino"
                          className="w-7 h-7 flex items-center justify-center shrink-0 cursor-pointer"
                          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}
                      {t.firestoreId && (
                        confirmDelete === t.firestoreId ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(t.firestoreId!)}
                              disabled={deleting}
                              className="h-7 px-2 text-[0.6rem] font-bold uppercase font-['Barlow_Condensed'] border-none cursor-pointer"
                              style={{ background: '#CC0000', color: '#FFF' }}
                            >
                              {deleting ? '...' : 'SIM'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="h-7 px-2 text-[0.6rem] font-bold uppercase font-['Barlow_Condensed'] cursor-pointer"
                              style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888' }}
                            >
                              NÃO
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(t.firestoreId!)}
                            title="Excluir treino"
                            className="w-7 h-7 flex items-center justify-center shrink-0 cursor-pointer"
                            style={{ background: '#1A0000', border: '1px solid #CC000033', color: '#CC0000' }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-[0.7rem] font-bold uppercase font-['Barlow_Condensed'] px-3.5 py-2 cursor-pointer"
              style={{ background: '#111', border: '1px solid #2A2A2A', color: page === 1 ? '#333' : '#888' }}
            >
              ← ANT.
            </button>
            <p className="text-[0.75rem] font-bold text-[#555] font-['Barlow_Condensed'] min-w-[80px] text-center">
              {page} / {totalPages}
            </p>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-[0.7rem] font-bold uppercase font-['Barlow_Condensed'] px-3.5 py-2 cursor-pointer"
              style={{ background: '#111', border: '1px solid #2A2A2A', color: page === totalPages ? '#333' : '#888' }}
            >
              PRÓ. →
            </button>
          </motion.div>
        )}

        {/* Resumo dos filtrados */}
        {filtered.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bjj-card grid grid-cols-3 gap-2 mt-1">
            {[
              { label: 'TREINOS', value: filtered.length },
              { label: 'HORAS', value: `${totalHrs}h` },
              { label: 'XP', value: filtered.reduce((s, t) => s + (t.xp || 0), 0) },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-[1.25rem] font-black text-[#CC0000] leading-none font-['Barlow_Condensed']">{s.value}</p>
                <p className="text-[0.55rem] text-[#444] uppercase tracking-[0.05em] mt-0.5 font-['Barlow_Condensed']">{s.label}</p>
              </div>
            ))}
          </motion.div>
        )}

      </div>
    </div>
  );
}
