import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { COLORS } from '@/lib/design';
import {
  Training, SESSION_TYPES, MODALITIES, INTENSITY_LABELS, SATISFACTION_LABELS,
  parseTrainingDate, getTechniquesList, countAllTechs, calcXP,
} from '@/lib/bjjrats-constants';
import { type TrainingData as ShareTrainingData } from './TrainingShareModal';
import { type ExtraTrainingData } from './NewTraining';

// Atividades extras (mesma lista do NewTraining.tsx)
const EXTRA_ACTIVITIES = [
  { id: 'corrida', label: 'Corrida', icon: '🏃' },
  { id: 'ciclismo', label: 'Ciclismo', icon: '🚴' },
  { id: 'musculacao', label: 'Musculação', icon: '🏋️' },
  { id: 'crossfit', label: 'CrossFit', icon: '💪' },
  { id: 'outras_lutas', label: 'Outras Lutas', icon: '🥊' },
  { id: 'outros_esportes', label: 'Outros Esportes', icon: '⚽' },
];

interface ExtraTraining {
  firestoreId: string;
  id: string;
  uid: string;
  trainingDate?: string;
  sessionType: 'outros_treinos';
  activity: string;
  duration: number;
  distance?: number;
  calories?: number;
  pace?: string | null;
  extraXP: number;
  notes?: string;
  trainingPhoto?: string;
  createdAt?: any;
}

interface Props { onNewTraining: () => void; onShare?: (data: ShareTrainingData) => void; onEdit?: (training: Training) => void; onEditExtra?: (training: ExtraTrainingData) => void; }

export default function History({ onNewTraining, onShare, onEdit, onEditExtra }: Props) {
  const { user, profile } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [extraTrainings, setExtraTrainings] = useState<ExtraTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Training | null>(null);
  const [selectedExtra, setSelectedExtra] = useState<ExtraTraining | null>(null);

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

      const rawExtra = await api.extraTrainings.list(user.uid) as any[];
      const extraDocs = rawExtra.map(d => ({ firestoreId: d.id, id: d.id, ...d } as ExtraTraining));
      extraDocs.sort((a, b) => {
        const ta = a.trainingDate ? parseDateStr(a.trainingDate) : 0;
        const tb = b.trainingDate ? parseDateStr(b.trainingDate) : 0;
        return tb - ta;
      });
      setExtraTrainings(extraDocs);
    } catch (e) { console.error('History fetch error:', e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadTrainings(); }, [loadTrainings]);

  // Parse date string dd/mm/yyyy to timestamp
  const parseDateStr = (s: string): number => {
    const parts = s.split('/');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      return d.getTime();
    }
    return 0;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este treino?')) return;
    try {
      // Encontrar o treino para saber o XP e duração
      const training = trainings.find(t => t.firestoreId === id || t.id === id);
      await api.trainings.delete(id);
      setTrainings(prev => prev.filter(t => t.firestoreId !== id && t.id !== id));
      setSelected(null);
      toast.success('Treino excluído');
    } catch { toast.error('Erro ao excluir treino'); }
  };

  const handleDeleteExtra = async (id: string) => {
    if (!confirm('Excluir esta atividade?')) return;
    try {
      const extra = extraTrainings.find(t => t.firestoreId === id || t.id === id);
      await api.extraTrainings.delete(id);
      setExtraTrainings(prev => prev.filter(t => t.firestoreId !== id && t.id !== id));
      setSelectedExtra(null);
      toast.success('Atividade excluída');
    } catch { toast.error('Erro ao excluir atividade'); }
  };

  const handleOpenShare = (t: Training) => {
    // Converter Training para ShareTrainingData
    const techsRecord: Record<string, string[]> = {};
    if (t.techniques && typeof t.techniques === 'object' && !Array.isArray(t.techniques)) {
      for (const [k, v] of Object.entries(t.techniques)) {
        if (Array.isArray(v)) techsRecord[k] = v;
      }
    }
    const shareData: ShareTrainingData = {
      trainingDate: t.trainingDate,
      sessionType: t.sessionType,
      modality: t.modality,
      duration: t.duration || 0,
      intensity: t.intensity,
      satisfaction: t.satisfaction,
      techniques: techsRecord,
      notes: t.notes,
      academy: t.academy,
      professor: t.professor,
      trainingPhotoUrl: t.trainingPhoto,
      xp: t.xp ?? calcXP([t]),
      compData: (t as any).compData || undefined,
    };
    if (onShare) onShare(shareData);
  };

  const FILTERS = [
    { id: 'all',             label: 'TODOS' },
    { id: 'aula_coletiva',   label: 'AULA COLETIVA' },
    { id: 'aula_particular', label: 'AULA PARTICULAR' },
    { id: 'treino_livre',    label: 'TREINO LIVRE' },
    { id: 'competicao',      label: 'COMPETIÇÃO' },
    { id: 'seminario',       label: 'SEMINÁRIO' },
    { id: 'outros_treinos',  label: 'OUTROS TREINOS' },
  ];

  const filtered = filter === 'all' ? trainings : trainings.filter(t => t.sessionType === filter);
  // Extras aparecem em "all" e no filtro "outros_treinos"
  const showExtras = filter === 'all' || filter === 'outros_treinos';
  const totalMins = trainings.reduce((s, t) => s + (t.duration || 0), 0);
  const hrs = Math.round(totalMins / 60 * 10) / 10;
  const totalXP = calcXP(trainings);
  const totalExtraXP = extraTrainings.reduce((s, t) => s + (t.extraXP || 0), 0);

  // Combinar e ordenar para exibição quando "all"
  type CombinedItem = { type: 'bjj'; data: Training; date: number } | { type: 'extra'; data: ExtraTraining; date: number };
  const getCombinedList = (): CombinedItem[] => {
    const items: CombinedItem[] = [];
    const bjjList = filter === 'all' ? trainings : (filter === 'outros_treinos' ? [] : trainings.filter(t => t.sessionType === filter));
    const extraList = showExtras ? extraTrainings : [];

    for (const t of bjjList) {
      items.push({ type: 'bjj', data: t, date: parseTrainingDate(t)?.getTime() || 0 });
    }
    for (const t of extraList) {
      items.push({ type: 'extra', data: t, date: t.trainingDate ? parseDateStr(t.trainingDate) : 0 });
    }
    items.sort((a, b) => b.date - a.date);
    return items;
  };

  const combinedList = getCombinedList();

  // ── Detalhe de treino extra selecionado ──────────────────────────────────────
  if (selectedExtra) {
    const act = EXTRA_ACTIVITIES.find(a => a.id === selectedExtra.activity);
    return (
      <div className="bg-background min-h-screen">
        <div className="bjj-header" style={{ borderColor: '#0EA5E940' }}>
          <button onClick={() => setSelectedExtra(null)} className="text-[#0EA5E9] bg-none border-none cursor-pointer p-1 flex items-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="bjj-header-title">DETALHE DA ATIVIDADE</h1>
          <div className="w-5" />
        </div>
        <div className="bjj-content">
          {selectedExtra.trainingPhoto && (
            <div className="w-full bg-background border border-[#1E1E1E] rounded-xl overflow-hidden">
              <img src={selectedExtra.trainingPhoto} alt="Foto da atividade" className="w-full h-auto block" />
            </div>
          )}

          <div className="bjj-card" style={{ borderLeft: '3px solid #0EA5E9' }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[1.25rem] font-black text-white uppercase font-['Barlow_Condensed']">{act?.icon || '🏃'} {act?.label || 'Atividade'}</p>
                <p className="text-[0.75rem] font-bold text-[#0EA5E9] font-['Barlow_Condensed'] mt-1">OUTROS TREINOS</p>
              </div>
              <div className="text-right">
                <p className="text-[1.5rem] font-black text-[#0EA5E9] leading-none font-['Barlow_Condensed']">+{selectedExtra.extraXP} XP</p>
                <p className="text-[0.7rem] text-[#555] font-['Barlow_Condensed'] mt-1">{selectedExtra.trainingDate || '—'}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: selectedExtra.distance ? '1fr 1fr 1fr' : '1fr 1fr' }}>
            {[
              { label: 'DURAÇÃO', value: `${selectedExtra.duration} min` },
              ...(selectedExtra.distance ? [{ label: 'DISTÂNCIA', value: `${selectedExtra.distance} km` }] : []),
              ...(selectedExtra.calories ? [{ label: 'CALORIAS', value: `${selectedExtra.calories} kcal` }] : [{ label: 'XP EXTRA', value: `${selectedExtra.extraXP}` }]),
            ].map(s => (
              <div key={s.label} className="bjj-stat-card">
                <p className="bjj-stat-number">{s.value}</p>
                <p className="text-[0.55rem] tracking-[0.1em] text-[#555] font-['Barlow_Condensed'] mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {selectedExtra.pace && (
            <div className="bjj-card text-center">
              <p className="text-[1.5rem] font-black text-[#0EA5E9] font-['Barlow_Condensed']">⏱️ {selectedExtra.pace}</p>
              <p className="text-[0.65rem] tracking-[0.1em] text-[#555] font-['Barlow_Condensed'] mt-1">PACE (MIN/KM)</p>
            </div>
          )}

          {selectedExtra.notes && (
            <div className="bjj-card">
              <p className="text-[0.875rem] font-black uppercase text-white font-['Barlow_Condensed'] mb-2">📝 OBSERVAÇÕES</p>
              <p className="text-[0.875rem] text-[#AAA] italic font-['Barlow']">"{selectedExtra.notes}"</p>
            </div>
          )}

          {onShare && (
            <button onClick={() => {
                const shareData: ShareTrainingData = {
                  trainingDate: selectedExtra.trainingDate, sessionType: 'outros_treinos', modality: selectedExtra.activity,
                  duration: selectedExtra.duration, intensity: 3, satisfaction: 4, techniques: {}, notes: selectedExtra.notes,
                  academy: '', professor: '', xp: selectedExtra.extraXP, trainingPhotoUrl: selectedExtra.trainingPhoto,
                  extraData: { activity: selectedExtra.activity, distance: selectedExtra.distance || 0, calories: selectedExtra.calories || 0, pace: selectedExtra.pace || null },
                };
                onShare(shareData);
              }}
              className="bjj-btn-primary !bg-[#0EA5E9] !shadow-[0_4px_15px_rgba(14,165,233,0.3)] hover:!shadow-[0_6px_25px_rgba(14,165,233,0.45)]"
            >📴 COMPARTILHAR CARD</button>
          )}

          {onEditExtra && (
            <button onClick={() => onEditExtra(selectedExtra as ExtraTrainingData)}
              className="bjj-btn-outline !border-[#0EA5E9] !text-[#0EA5E9]"
            >✏️ EDITAR ATIVIDADE</button>
          )}

          <button onClick={() => handleDeleteExtra(selectedExtra.firestoreId || selectedExtra.id || '')}
            className="bjj-btn-outline !border-[#440000] !text-[#CC0000] !border-2"
          >🗑 EXCLUIR ATIVIDADE</button>
        </div>
      </div>
    );
  }

  // ── Detalhe de treino BJJ selecionado ────────────────────────────────────────
  if (selected) {
    const sess = SESSION_TYPES.find(x => x.id === selected.sessionType) || SESSION_TYPES[0];
    const mod = MODALITIES.find(x => x.id === selected.modality) || null;
    const techList = getTechniquesList(selected.techniques);
    const techCount = countAllTechs(selected.techniques);
    const xpGained = calcXP([selected]);
    return (
      <div className="bg-background min-h-screen">
        <div className="bjj-header">
          <button onClick={() => setSelected(null)} className="text-[#CC0000] bg-none border-none cursor-pointer p-1 flex items-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="bjj-header-title">DETALHE DO TREINO</h1>
          <div className="w-5" />
        </div>
        <div className="bjj-content">
          {selected.trainingPhoto && (
            <div className="w-full bg-background border border-[#1E1E1E] rounded-xl overflow-hidden">
              <img src={selected.trainingPhoto} alt="Foto do treino" className="w-full h-auto block" />
            </div>
          )}

          <div className="bjj-card" style={{ borderLeft: `3px solid ${sess.color}` }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[1.25rem] font-black text-white uppercase font-['Barlow_Condensed']">{sess.icon} {sess.label}</p>
                {mod && <p className="text-[0.75rem] font-bold font-['Barlow_Condensed'] mt-1" style={{ color: mod.color }}>{mod.label}</p>}
              </div>
              <div className="text-right">
                <p className="text-[1.5rem] font-black text-[#CC0000] leading-none font-['Barlow_Condensed']">+{xpGained} XP</p>
                <p className="text-[0.7rem] text-[#555] font-['Barlow_Condensed'] mt-1">{selected.trainingDate || '—'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'DURAÇÃO', value: `${selected.duration || 0} min` },
              { label: 'INTENSIDADE', value: selected.intensity ? INTENSITY_LABELS[selected.intensity] : '—' },
              { label: 'SATISFAÇÃO', value: selected.satisfaction ? SATISFACTION_LABELS[selected.satisfaction] : '—' },
            ].map(s => (
              <div key={s.label} className="bjj-stat-card">
                <p className="bjj-stat-number">{s.value}</p>
                <p className="text-[0.55rem] tracking-[0.1em] text-[#555] font-['Barlow_Condensed'] mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {(selected.academy || selected.professor) && (
            <div className="bjj-card">
              {selected.academy && <p className="text-[0.875rem] text-[#CCC] font-['Barlow_Condensed']">🏫 {selected.academy}</p>}
              {selected.professor && <p className="text-[0.875rem] text-[#888] font-['Barlow_Condensed'] mt-1">👤 Prof. {selected.professor}</p>}
            </div>
          )}

          {techList.length > 0 && (
            <div className="bjj-card">
              <p className="text-[0.875rem] font-black uppercase text-white font-['Barlow_Condensed'] mb-2">🥋 TÉCNICAS ({techCount})</p>
              <div className="flex gap-1.5 flex-wrap">
                {techList.map((tech, i) => (
                  <span key={i} className="text-[0.65rem] font-bold uppercase px-2 py-1 border border-[#CC0000] text-[#CC0000] bg-[#1A0000] font-['Barlow_Condensed'] rounded">{tech}</span>
                ))}
              </div>
            </div>
          )}

          {selected.notes && (
            <div className="bjj-card">
              <p className="text-[0.875rem] font-black uppercase text-white font-['Barlow_Condensed'] mb-2">📝 OBSERVAÇÕES</p>
              <p className="text-[0.875rem] text-[#AAA] italic font-['Barlow']">"{selected.notes}"</p>
            </div>
          )}

          {(selected.sessionType === 'competicao' && (selected as any).compData) && (() => {
            const cd = (selected as any).compData;
            return (
              <div className="bjj-card" style={{ borderLeft: '3px solid #CC8800' }}>
                <p className="text-[0.875rem] font-black uppercase text-white font-['Barlow_Condensed'] mb-3">🏆 COMPETIÇÃO</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[0.8rem]">
                  {cd.tournament && <div><span className="text-[#666] font-['Barlow_Condensed'] uppercase text-[0.65rem]">Torneio</span><p className="text-[#CCC] font-['Barlow']">{cd.tournament}</p></div>}
                  {cd.league && <div><span className="text-[#666] font-['Barlow_Condensed'] uppercase text-[0.65rem]">Liga</span><p className="text-[#CCC] font-['Barlow']">{cd.league}</p></div>}
                  {cd.city && <div><span className="text-[#666] font-['Barlow_Condensed'] uppercase text-[0.65rem]">Cidade</span><p className="text-[#CCC] font-['Barlow']">{cd.city}</p></div>}
                  {cd.belt && <div><span className="text-[#666] font-['Barlow_Condensed'] uppercase text-[0.65rem]">Faixa</span><p className="text-[#CCC] font-['Barlow']">{cd.belt}</p></div>}
                  {cd.weightCategory && <div><span className="text-[#666] font-['Barlow_Condensed'] uppercase text-[0.65rem]">Peso</span><p className="text-[#CCC] font-['Barlow']">{cd.weightCategory}</p></div>}
                  {cd.ageCategory && <div><span className="text-[#666] font-['Barlow_Condensed'] uppercase text-[0.65rem]">Idade</span><p className="text-[#CCC] font-['Barlow']">{cd.ageCategory}</p></div>}
                  {cd.fights && <div><span className="text-[#666] font-['Barlow_Condensed'] uppercase text-[0.65rem]">Lutas</span><p className="text-[#CCC] font-['Barlow']">{cd.fights}</p></div>}
                  {cd.placement && <div><span className="text-[#666] font-['Barlow_Condensed'] uppercase text-[0.65rem]">Colocação</span><p className="text-[#CCC] font-['Barlow']">{cd.placement}</p></div>}
                </div>
              </div>
            );
          })()}

          <button onClick={() => handleOpenShare(selected)}
            className="bjj-btn-outline !border-[#CC0000] !text-[#CC0000]"
          >📲 GERAR CARD PARA REDES SOCIAIS</button>

          {onEdit && (
            <button onClick={() => onEdit(selected)}
              className="bjj-btn-outline !border-[#1A6ECC] !text-[#1A6ECC]"
            >✏️ EDITAR TREINO</button>
          )}

          <button onClick={() => handleDelete(selected.firestoreId || selected.id || '')}
            className="bjj-btn-outline !border-[#440000] !text-[#CC0000] !border-2"
          >🗑 EXCLUIR TREINO</button>
        </div>
      </div>
    );
  }

  const ffadeUp = fadeUp as any;
  const fcontainer = staggerContainer as any;

  return (
    <div className="bg-background min-h-screen">
      <div className="bjj-header">
        <h1 className="text-[1.5rem] font-black text-white font-['Barlow_Condensed']">MEUS TREINOS</h1>
        <p className="text-[0.75rem] font-bold text-[#555] font-['Barlow_Condensed']">{trainings.length + extraTrainings.length} registros</p>
      </div>
      <div className="bjj-content">
        <motion.div initial="hidden" animate="show" variants={ffadeUp} className="grid grid-cols-3 gap-2">
          {[
            { label: 'TREINOS', value: trainings.length + extraTrainings.length },
            { label: 'HORAS', value: `${hrs}h` },
            { label: 'XP TOTAL', value: `${totalXP}${totalExtraXP > 0 ? ` +${totalExtraXP}` : ''}` },
          ].map(s => (
            <div key={s.label} className="bjj-stat-card">
              <p className="bjj-stat-number">{s.value}</p>
              <p className="text-[0.55rem] tracking-[0.1em] text-[#555] font-['Barlow_Condensed'] mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>
        <motion.div initial="hidden" animate="show" variants={ffadeUp}>
          <button onClick={onNewTraining} className="bjj-btn-primary mb-3">+ REGISTRAR NOVO TREINO</button>
        </motion.div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map(f => {
            const isExtra = f.id === 'outros_treinos';
            const activeColor = isExtra ? '#0EA5E9' : '#CC0000';
            return (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className="text-[0.7rem] font-black uppercase tracking-[0.08em] px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-all duration-200 font-['Barlow_Condensed']"
                style={{
                  border: `1px solid ${filter === f.id ? activeColor : '#2A2A2A'}`,
                  background: filter === f.id ? activeColor : '#111',
                  color: filter === f.id ? '#FFFFFF' : '#666',
                }}
              >{f.label}</button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bjj-skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : combinedList.length === 0 ? (
          <div className="bjj-card text-center py-8">
            <p className="text-[1rem] font-bold uppercase text-[#555] font-['Barlow_Condensed']">NENHUM TREINO ENCONTRADO</p>
            <p className="text-[0.75rem] text-[#444] mt-2 font-['Barlow']">Registre seu primeiro treino!</p>
          </div>
        ) : (
          <motion.div variants={fcontainer} initial="hidden" animate="show" className="flex flex-col gap-2.5">
            {combinedList.map((item, i) => {
              if (item.type === 'extra') {
                const t = item.data as ExtraTraining;
                const act = EXTRA_ACTIVITIES.find(a => a.id === t.activity);
                return (
                  <motion.div key={`extra-${t.firestoreId || i}`} variants={ffadeUp}
                    onClick={() => setSelectedExtra(t)}
                    className="bjj-card cursor-pointer flex items-stretch overflow-hidden p-0"
                    style={{ borderLeft: '3px solid #0EA5E9' }}
                  >
                    {t.trainingPhoto ? (
                      <div className="w-20 shrink-0 overflow-hidden">
                        <img src={t.trainingPhoto} alt="" className="w-full h-full object-cover block" />
                      </div>
                    ) : (
                      <div className="w-20 shrink-0 bg-background flex items-center justify-center">
                        <span className="text-[1.5rem] opacity-30">{act?.icon || '🏃'}</span>
                      </div>
                    )}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[0.65rem] font-black uppercase px-1.5 py-0.5 border border-[#0EA5E9] bg-[#0EA5E920] text-[#0EA5E9] shrink-0 rounded font-['Barlow_Condensed']">{act?.icon || '🏃'} {act?.label || 'Atividade'}</span>
                        <span className="text-[0.875rem] font-black text-[#0EA5E9] shrink-0 ml-2 font-['Barlow_Condensed']">+{t.extraXP} XP</span>
                      </div>
                      <p className="text-[0.75rem] text-[#666] truncate font-['Barlow']">
                        {t.trainingDate || '—'} · {t.duration || 0} min{t.distance ? ` · 📏 ${t.distance} km` : ''}{t.calories ? ` · 🔥 ${t.calories} kcal` : ''}{t.pace ? ` · ⏱️ ${t.pace}` : ''}
                      </p>
                      {t.notes && <p className="text-[0.75rem] text-[#555] italic truncate mt-1 font-['Barlow']">"{t.notes}"</p>}
                    </div>
                  </motion.div>
                );
              } else {
                const t = item.data as Training;
                const sess = SESSION_TYPES.find(x => x.id === t.sessionType) || SESSION_TYPES[0];
                const mod = MODALITIES.find(x => x.id === t.modality) || null;
                const techCount = countAllTechs(t.techniques);
                const xpGained = calcXP([t]);
                return (
                  <motion.div key={t.firestoreId || i} variants={ffadeUp}
                    onClick={() => setSelected(t)}
                    className="bjj-card cursor-pointer flex items-stretch overflow-hidden p-0"
                    style={{ borderLeft: `3px solid ${sess.color}` }}
                  >
                    {t.trainingPhoto ? (
                      <div className="w-20 shrink-0 overflow-hidden">
                        <img src={t.trainingPhoto} alt="" className="w-full h-full object-cover block" />
                      </div>
                    ) : (
                      <div className="w-20 shrink-0 bg-background flex items-center justify-center">
                        <span className="text-[1.5rem] opacity-20">🥋</span>
                      </div>
                    )}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex gap-1.5 flex-wrap flex-1 min-w-0">
                          <span className="text-[0.65rem] font-black uppercase px-1.5 py-0.5 border shrink-0 rounded font-['Barlow_Condensed']"
                            style={{ borderColor: sess.color, background: sess.color + '20', color: sess.color }}
                          >{sess.icon} {sess.label}</span>
                          {mod && <span className="text-[0.65rem] font-black uppercase px-1.5 py-0.5 border shrink-0 rounded font-['Barlow_Condensed']"
                            style={{ borderColor: mod.color, background: mod.color + '20', color: mod.color }}
                          >{mod.label}</span>}
                        </div>
                        <span className="text-[0.875rem] font-black text-[#CC0000] shrink-0 ml-2 font-['Barlow_Condensed']">+{xpGained} XP</span>
                      </div>
                      <p className="text-[0.75rem] text-[#666] truncate font-['Barlow']">
                        {t.trainingDate || '—'} · {t.duration || 0} min{t.intensity ? ` · 🔥 ${INTENSITY_LABELS[t.intensity]}` : ''}{techCount > 0 ? ` · 🥋 ${techCount} técnicas` : ''}
                      </p>
                      {t.notes && <p className="text-[0.75rem] text-[#555] italic truncate mt-1 font-['Barlow']">"{t.notes}"</p>}
                    </div>
                  </motion.div>
                );
              }
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
