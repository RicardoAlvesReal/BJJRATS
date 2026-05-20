
// Design: "Cage Fighter" — Brutalismo Tático
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';
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
      <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #0EA5E9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => setSelectedExtra(null)} style={{ background: 'none', border: 'none', color: '#0EA5E9', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em' }}>DETALHE DA ATIVIDADE</h1>
        </div>
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Foto */}
          {selectedExtra.trainingPhoto && (
            <div style={{ width: '100%', background: '#0A0A0A', border: '2px solid #1E1E1E' }}>
              <img src={selectedExtra.trainingPhoto} alt="Foto da atividade" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          )}

          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: '3px solid #0EA5E9', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF' }}>{act?.icon || '🏃'} {act?.label || 'Atividade'}</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#0EA5E9', marginTop: '0.25rem' }}>OUTROS TREINOS</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#0EA5E9', lineHeight: 1 }}>+{selectedExtra.extraXP} XP</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', marginTop: '0.25rem' }}>{selectedExtra.trainingDate || '—'}</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selectedExtra.distance ? '1fr 1fr 1fr' : '1fr 1fr', gap: '0.5rem' }}>
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.75rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFFFFF' }}>{selectedExtra.duration} min</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginTop: '0.25rem' }}>DURAÇÃO</p>
            </div>
            {selectedExtra.distance ? (
              <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.75rem', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFFFFF' }}>{selectedExtra.distance} km</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginTop: '0.25rem' }}>DISTÂNCIA</p>
              </div>
            ) : null}
            {selectedExtra.calories ? (
              <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.75rem', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFFFFF' }}>{selectedExtra.calories} kcal</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginTop: '0.25rem' }}>CALORIAS</p>
              </div>
            ) : (
              <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.75rem', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFFFFF' }}>{selectedExtra.extraXP}</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginTop: '0.25rem' }}>XP EXTRA</p>
              </div>
            )}
          </div>

          {selectedExtra.pace && (
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#0EA5E9' }}>⏱️ {selectedExtra.pace}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginTop: '0.25rem' }}>PACE (MIN/KM)</p>
            </div>
          )}

          {selectedExtra.notes && (
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '0.5rem' }}>📝 OBSERVAÇÕES</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#AAA', lineHeight: 1.6, fontStyle: 'italic' }}>"{selectedExtra.notes}"</p>
            </div>
          )}

          {/* Botão Compartilhar Atividade */}
          {onShare && (
            <button
              onClick={() => {
                const shareData: ShareTrainingData = {
                  trainingDate: selectedExtra.trainingDate,
                  sessionType: 'outros_treinos',
                  modality: selectedExtra.activity,
                  duration: selectedExtra.duration,
                  intensity: 3,
                  satisfaction: 4,
                  techniques: {},
                  notes: selectedExtra.notes,
                  academy: '',
                  professor: '',
                  xp: selectedExtra.extraXP,
                  trainingPhotoUrl: selectedExtra.trainingPhoto,
                  extraData: { activity: selectedExtra.activity, distance: selectedExtra.distance || 0, calories: selectedExtra.calories || 0, pace: selectedExtra.pace || null },
                };
                onShare(shareData);
              }}
              style={{ background: '#0EA5E9', border: 'none', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              📴 COMPARTILHAR CARD
            </button>
          )}

          {/* Botão Editar Atividade */}
          {onEditExtra && (
            <button
              onClick={() => onEditExtra(selectedExtra as ExtraTrainingData)}
              style={{ background: '#111', border: '2px solid #0EA5E9', color: '#0EA5E9', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              ✏️ EDITAR ATIVIDADE
            </button>
          )}

          <button
            onClick={() => handleDeleteExtra(selectedExtra.firestoreId || selectedExtra.id || '')}
            style={{ background: 'transparent', border: '2px solid #440000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem', cursor: 'pointer', width: '100%' }}
          >
            🗑 EXCLUIR ATIVIDADE
          </button>
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
      <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #CC0000', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#CC0000', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em' }}>DETALHE DO TREINO</h1>
        </div>
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Foto do treino */}
          {selected.trainingPhoto && (
            <div style={{ width: '100%', background: '#0A0A0A', border: '2px solid #1E1E1E' }}>
              <img
                src={selected.trainingPhoto}
                alt="Foto do treino"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          )}

          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: `3px solid ${sess.color}`, padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF' }}>{sess.icon} {sess.label}</p>
                {mod && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: mod.color, marginTop: '0.25rem' }}>{mod.label}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#CC0000', lineHeight: 1 }}>+{xpGained} XP</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', marginTop: '0.25rem' }}>{selected.trainingDate || '—'}</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            {[
              { label: 'DURAÇÃO', value: `${selected.duration || 0} min` },
              { label: 'INTENSIDADE', value: selected.intensity ? INTENSITY_LABELS[selected.intensity] : '—' },
              { label: 'SATISFAÇÃO', value: selected.satisfaction ? SATISFACTION_LABELS[selected.satisfaction] : '—' },
            ].map(s => (
              <div key={s.label} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.75rem', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFFFFF' }}>{s.value}</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginTop: '0.25rem' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {(selected.academy || selected.professor) && (
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
              {selected.academy && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.875rem', color: '#CCC' }}>🏫 {selected.academy}</p>}
              {selected.professor && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.875rem', color: '#888', marginTop: '0.375rem' }}>👤 Prof. {selected.professor}</p>}
            </div>
          )}

          {techList.length > 0 && (
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '0.75rem' }}>🥋 TÉCNICAS ({techCount})</p>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {techList.map((tech, i) => (
                  <span key={i} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.25rem 0.5rem', border: '1px solid #CC0000', color: '#CC0000', background: '#1A0000' }}>{tech}</span>
                ))}
              </div>
            </div>
          )}

          {selected.notes && (
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '0.5rem' }}>📝 OBSERVAÇÕES</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#AAA', lineHeight: 1.6, fontStyle: 'italic' }}>"{selected.notes}"</p>
            </div>
          )}

          {/* Botão Gerar Card */}
          <button
            onClick={() => handleOpenShare(selected)}
            style={{ background: '#111', border: '2px solid #CC0000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            📲 GERAR CARD PARA REDES SOCIAIS
          </button>

          {/* Botão Editar Treino */}
          {onEdit && (
            <button
              onClick={() => onEdit(selected)}
              style={{ background: '#111', border: '2px solid #1A6ECC', color: '#1A6ECC', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              ✏️ EDITAR TREINO
            </button>
          )}

          <button
            onClick={() => handleDelete(selected.firestoreId || selected.id || '')}
            style={{ background: 'transparent', border: '2px solid #440000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem', cursor: 'pointer', width: '100%' }}
          >
            🗑 EXCLUIR TREINO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '2px solid #CC0000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em' }}>MEUS TREINOS</h1>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#555' }}>{trainings.length + extraTrainings.length} registros</p>
      </div>
      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          {[
            { label: 'TREINOS', value: trainings.length + extraTrainings.length },
            { label: 'HORAS', value: `${hrs}h` },
            { label: 'XP TOTAL', value: `${totalXP}${totalExtraXP > 0 ? ` +${totalExtraXP}` : ''}` },
          ].map(s => (
            <div key={s.label} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.75rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#FFFFFF', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginTop: '0.25rem' }}>{s.label}</p>
            </div>
          ))}
        </div>
        <button onClick={onNewTraining} style={{ background: '#CC0000', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1rem', border: 'none', width: '100%', cursor: 'pointer' }}>
          + REGISTRAR NOVO TREINO
        </button>
        <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {FILTERS.map(f => {
            const isExtra = f.id === 'outros_treinos';
            const activeColor = isExtra ? '#0EA5E9' : '#CC0000';
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.375rem 0.75rem', border: `1px solid ${filter === f.id ? activeColor : '#2A2A2A'}`, background: filter === f.id ? activeColor : '#111', color: filter === f.id ? '#FFFFFF' : '#666', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {f.label}
              </button>
            );
          })}
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
        ) : combinedList.length === 0 ? (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM TREINO ENCONTRADO</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {combinedList.map((item, i) => {
              if (item.type === 'extra') {
                const t = item.data as ExtraTraining;
                const act = EXTRA_ACTIVITIES.find(a => a.id === t.activity);
                return (
                  <div key={`extra-${t.firestoreId || i}`} onClick={() => setSelectedExtra(t)} style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: '3px solid #0EA5E9', cursor: 'pointer', display: 'flex', alignItems: 'stretch', overflow: 'hidden' }}>
                    {/* Miniatura da foto */}
                    {t.trainingPhoto ? (
                      <div style={{ width: '80px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                        <img src={t.trainingPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    ) : (
                      <div style={{ width: '80px', flexShrink: 0, background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>{act?.icon || '🏃'}</span>
                      </div>
                    )}
                    {/* Conteúdo do item */}
                    <div style={{ flex: 1, padding: '0.875rem', minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.15rem 0.4rem', border: '1px solid #0EA5E9', background: '#0EA5E920', color: '#0EA5E9', flexShrink: 0 }}>{act?.icon || '🏃'} {act?.label || 'Atividade'}</span>
                        </div>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#0EA5E9', flexShrink: 0, marginLeft: '0.5rem' }}>+{t.extraXP} XP</span>
                      </div>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.trainingDate || '—'} · {t.duration || 0} min{t.distance ? ` · 📏 ${t.distance} km` : ''}{t.calories ? ` · 🔥 ${t.calories} kcal` : ''}{t.pace ? ` · ⏱️ ${t.pace}` : ''}
                      </p>
                      {t.notes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.25rem' }}>"{t.notes}"</p>}
                    </div>
                  </div>
                );
              } else {
                const t = item.data as Training;
                const sess = SESSION_TYPES.find(x => x.id === t.sessionType) || SESSION_TYPES[0];
                const mod = MODALITIES.find(x => x.id === t.modality) || null;
                const techCount = countAllTechs(t.techniques);
                const xpGained = calcXP([t]);
                return (
                  <div key={t.firestoreId || i} onClick={() => setSelected(t)} style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: `3px solid ${sess.color}`, cursor: 'pointer', display: 'flex', alignItems: 'stretch', overflow: 'hidden' }}>
                    {/* Miniatura da foto */}
                    {t.trainingPhoto ? (
                      <div style={{ width: '80px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                        <img src={t.trainingPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    ) : (
                      <div style={{ width: '80px', flexShrink: 0, background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.5rem', opacity: 0.2 }}>🥋</span>
                      </div>
                    )}
                    {/* Conteúdo do item */}
                    <div style={{ flex: 1, padding: '0.875rem', minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.15rem 0.4rem', border: `1px solid ${sess.color}`, background: sess.color + '20', color: sess.color, flexShrink: 0 }}>{sess.icon} {sess.label}</span>
                          {mod && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.15rem 0.4rem', border: `1px solid ${mod.color}`, background: mod.color + '20', color: mod.color, flexShrink: 0 }}>{mod.label}</span>}
                        </div>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#CC0000', flexShrink: 0, marginLeft: '0.5rem' }}>+{xpGained} XP</span>
                      </div>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.trainingDate || '—'} · {t.duration || 0} min{t.intensity ? ` · 🔥 ${INTENSITY_LABELS[t.intensity]}` : ''}{techCount > 0 ? ` · 🥋 ${techCount} técnicas` : ''}
                      </p>
                      {t.notes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.25rem' }}>"{t.notes}"</p>}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}
