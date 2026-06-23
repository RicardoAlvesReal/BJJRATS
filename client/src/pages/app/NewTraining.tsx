// BJJRats PWA — New Training Screen (+ Edit Mode)
// Design: Dark Modern — Glassmorphism + BJJ
// Idêntico ao app móvel: tipo de sessão, modalidade, duração, intensidade, técnicas por categoria,
// foto do treino (upload para Firebase Storage), anotações, XP preview e card para redes sociais
import { useRef, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api, { type UserProfile } from '@/lib/api';
import { toast } from 'sonner';
import { SESSION_TYPES, MODALITIES, INTENSITY_LABELS, SATISFACTION_LABELS, TECH_CATEGORIES, Training } from '@/lib/bjjrats-constants';
import TrainingShareModal, { type TrainingData as ShareTrainingData, type ShareUserData } from './TrainingShareModal';

export interface ExtraTrainingData {
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

interface Props {
  onBack: () => void;
  onSaved: () => void;
  /** Chamado após exclusão bem-sucedida */
  onDeleted?: () => void;
  /** Se fornecido, abre o formulário em modo de edição pré-preenchido */
  editTraining?: Training;
  /** Se fornecido, abre o formulário em modo de edição de atividade extra */
  editExtraTraining?: ExtraTrainingData;
}

interface TrainingFieldSuggestion {
  id: string;
  label: string;
  value: string;
  subtitle?: string;
}

function normalizeSuggestionText(value?: string | null): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function addSuggestion(map: Map<string, TrainingFieldSuggestion>, suggestion: TrainingFieldSuggestion) {
  const label = suggestion.label.trim();
  if (!label) return;
  const subtitle = suggestion.subtitle?.trim();
  const key = normalizeSuggestionText(`${label}|${subtitle || ''}`);
  if (!map.has(key)) {
    map.set(key, { ...suggestion, label, value: suggestion.value.trim() || label, subtitle });
  }
}

function sortSuggestions(a: TrainingFieldSuggestion, b: TrainingFieldSuggestion) {
  return a.label.localeCompare(b.label, 'pt-BR');
}

function buildAcademySuggestions(users: UserProfile[], profile?: UserProfile | null) {
  const suggestions = new Map<string, TrainingFieldSuggestion>();
  const profileAcademy = profile?.academyName || profile?.academy;

  addSuggestion(suggestions, {
    id: 'profile-academy',
    label: profileAcademy || '',
    value: profileAcademy || '',
    subtitle: [profile?.academyCity, profile?.academyState].filter(Boolean).join(' - '),
  });

  users
    .filter(data => data.role === 'academy' || data.role === 'admin' || data.role === 'professor' || data.isAcademyAdmin)
    .forEach(data => {
      const academyName = data.academyName || data.academy;
      addSuggestion(suggestions, {
        id: data.academyId || data.uid,
        label: academyName || '',
        value: academyName || '',
        subtitle: [data.academyCity, data.academyState].filter(Boolean).join(' - '),
      });
    });

  return Array.from(suggestions.values()).sort(sortSuggestions);
}

function buildProfessorSuggestions(users: UserProfile[], profile?: UserProfile | null) {
  const suggestions = new Map<string, TrainingFieldSuggestion>();

  addSuggestion(suggestions, {
    id: 'profile-professor',
    label: profile?.professor || '',
    value: profile?.professor || '',
    subtitle: profile?.academyName || profile?.academy,
  });

  users.forEach(data => {
    addSuggestion(suggestions, {
      id: data.uid,
      label: data.name || '',
      value: data.name || '',
      subtitle: data.academyName || data.academy || [data.academyCity, data.academyState].filter(Boolean).join(' - '),
    });
  });

  return Array.from(suggestions.values()).sort(sortSuggestions);
}

function matchesSuggestion(suggestion: TrainingFieldSuggestion, term: string) {
  const normalizedTerm = normalizeSuggestionText(term);
  if (!normalizedTerm) return true;
  return normalizeSuggestionText(`${suggestion.label} ${suggestion.subtitle || ''}`).includes(normalizedTerm);
}

export default function NewTraining({ onBack, onSaved, onDeleted, editTraining, editExtraTraining }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('finalizacoes');
  const isEditMode = !!editTraining || !!editExtraTraining;
  const isEditExtra = !!editExtraTraining;

  // Estado pós-salvamento: treino salvo + modal de card
  const [savedData, setSavedData] = useState<{ training: ShareTrainingData; xp: number } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Upload de foto
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoRemovedRef = useRef(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    (editExtraTraining as any)?.trainingPhotoUrl || (editExtraTraining as any)?.trainingPhoto || (editTraining as any)?.trainingPhotoUrl || (editTraining as any)?.trainingPhoto || null
  );

  // Sugestoes cadastradas para preencher academia/professor no treino
  const [academySuggestions, setAcademySuggestions] = useState<TrainingFieldSuggestion[]>([]);
  const [professorSuggestions, setProfessorSuggestions] = useState<TrainingFieldSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showAcademySuggestions, setShowAcademySuggestions] = useState(false);
  const [showProfessorSuggestions, setShowProfessorSuggestions] = useState(false);

  // Carregar academias e professores cadastrados, mantendo os dados do perfil como fallback.
  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      setSuggestionsLoading(true);
      try {
        const [users, professors] = await Promise.all([
          api.users.list(),
          api.users.list({ role: 'professor' }),
        ]);
        if (cancelled) return;
        setAcademySuggestions(buildAcademySuggestions(users, profile));
        setProfessorSuggestions(buildProfessorSuggestions(professors, profile));
      } catch {
        if (cancelled) return;
        setAcademySuggestions(buildAcademySuggestions([], profile));
        setProfessorSuggestions(buildProfessorSuggestions([], profile));
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    };

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [profile?.academy, profile?.academyName, profile?.academyCity, profile?.academyState, profile?.professor]);

  const todayDate = new Date();
  const todayFormatted = `${String(todayDate.getDate()).padStart(2, '0')}/${String(todayDate.getMonth() + 1).padStart(2, '0')}/${todayDate.getFullYear()}`;

  // Normalizar techniques do editTraining para Record<string, string[]>
  const normalizeEditTechs = (): Record<string, string[]> => {
    if (!editTraining?.techniques) return {};
    const t = editTraining.techniques;
    if (Array.isArray(t)) return {};
    const result: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(t)) {
      if (Array.isArray(v)) result[k] = v;
    }
    return result;
  };

  // ── Categorias oficiais de competição (CBJJ/IBJJF) ──────────────────────────
  const COMP_WEIGHT_CATEGORIES = {
    M: [
      'Galo (até 57,5kg)', 'Pluma (até 64kg)', 'Pena (até 70kg)',
      'Leve (até 76kg)', 'Médio (até 82,3kg)', 'Meio-Pesado (até 88,3kg)',
      'Pesado (até 94,3kg)', 'Super-Pesado (até 100,5kg)', 'Pesadíssimo (acima de 100,5kg)',
      'Absoluto (sem limite)',
    ],
    F: [
      'Galo (até 48,5kg)', 'Pluma (até 53,5kg)', 'Pena (até 58,5kg)',
      'Leve (até 64kg)', 'Médio (até 69kg)', 'Meio-Pesado (até 74kg)',
      'Pesado (até 79,3kg)', 'Super-Pesado (acima de 79,3kg)',
      'Absoluto (sem limite)',
    ],
  };
  const COMP_AGE_CATEGORIES = [
    'Juvenil (15-17 anos)', 'Adulto (18-29 anos)', 'Master 1 (30-35 anos)',
    'Master 2 (36-40 anos)', 'Master 3 (41-45 anos)', 'Master 4 (46-50 anos)',
    'Master 5 (51-55 anos)', 'Master 6 (56-60 anos)', 'Master 7 (61+ anos)',
  ];
  const COMP_BELTS = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];
  const COMP_PLACEMENTS = ['🥇 1º Lugar', '🥈 2º Lugar', '🥉 3º Lugar', '4º Lugar', '5º Lugar', 'Outro'];

  const [form, setForm] = useState({
    trainingDate: editExtraTraining?.trainingDate || editTraining?.trainingDate || todayFormatted,
    sessionType: editExtraTraining ? 'outros_treinos' : (editTraining?.sessionType || 'aula_coletiva'),
    modality: editTraining?.modality || 'gi',
    duration: editTraining?.duration || 60,
    intensity: editTraining?.intensity || 3,
    satisfaction: editTraining?.satisfaction || 4,
    techniques: normalizeEditTechs(),
    notes: editExtraTraining?.notes || editTraining?.notes || '',
    academy: editTraining?.academy || profile?.academy || '',
    professor: editTraining?.professor || profile?.professor || '',
  });

  // ── Atividades extras (Outros Treinos) ──────────────────────────────────────
  const EXTRA_ACTIVITIES = [
    { id: 'corrida', label: 'Corrida', icon: '🏃', hasDistance: true, hasCalories: true },
    { id: 'ciclismo', label: 'Ciclismo', icon: '🚴', hasDistance: true, hasCalories: true },
    { id: 'musculacao', label: 'Musculação', icon: '🏋️', hasDistance: false, hasCalories: false },
    { id: 'crossfit', label: 'CrossFit', icon: '💪', hasDistance: false, hasCalories: false },
    { id: 'outras_lutas', label: 'Outras Lutas', icon: '🥊', hasDistance: false, hasCalories: false },
    { id: 'outros_esportes', label: 'Outros Esportes', icon: '⚽', hasDistance: false, hasCalories: false },
  ];

  const [extraData, setExtraData] = useState({
    activity: editExtraTraining?.activity || (editTraining as any)?.extraData?.activity || '',
    duration: editExtraTraining?.duration || (editTraining as any)?.extraData?.duration || 40,
    distance: editExtraTraining?.distance || (editTraining as any)?.extraData?.distance || 0,
    calories: editExtraTraining?.calories || (editTraining as any)?.extraData?.calories || 0,
    caloriesEdited: !!editExtraTraining,
  });
  const updateExtra = (field: string, value: any) => setExtraData(e => ({ ...e, [field]: value }));

  // Cálculo de pace (min/km)
  const calcPace = () => {
    if (!extraData.distance || extraData.distance <= 0 || !extraData.duration || extraData.duration <= 0) return '--';
    const paceMin = extraData.duration / extraData.distance;
    const mins = Math.floor(paceMin);
    const secs = Math.round((paceMin - mins) * 60);
    return `${mins}:${String(secs).padStart(2, '0')} min/km`;
  };

  // Estimativa de calorias
  const estimateCalories = (activity: string, duration: number, distance: number) => {
    // MET aproximados por atividade
    const mets: Record<string, number> = {
      corrida: 9.8, ciclismo: 7.5, musculacao: 5.0,
      crossfit: 8.0, outras_lutas: 8.5, outros_esportes: 6.0,
    };
    const met = mets[activity] || 6.0;
    const weight = 80; // peso médio estimado (kg)
    return Math.round((met * weight * duration) / 60);
  };

  // Atualizar calorias estimadas quando atividade/duração mudam
  useEffect(() => {
    if (form.sessionType === 'outros_treinos' && extraData.activity && !extraData.caloriesEdited) {
      const est = estimateCalories(extraData.activity, extraData.duration, extraData.distance);
      setExtraData(e => ({ ...e, calories: est }));
    }
  }, [extraData.activity, extraData.duration, extraData.distance, form.sessionType]);

  // Pontos extras (metade do XP de uma sessão BJJ se >40min)
  const calcExtraXP = () => {
    if (form.sessionType !== 'outros_treinos') return 0;
    if (extraData.duration < 40) return 0;
    // Metade de uma sessão base BJJ (10pts) = 5 pontos extras
    return 5;
  };

  // Estado dos campos de competição
  const [compData, setCompData] = useState({
    tournament: (editTraining as any)?.compData?.tournament || '',
    league: (editTraining as any)?.compData?.league || '',
    city: (editTraining as any)?.compData?.city || '',
    belt: (editTraining as any)?.compData?.belt || profile?.belt || 'Branca',
    gender: (editTraining as any)?.compData?.gender || 'M',
    weightCategory: (editTraining as any)?.compData?.weightCategory || '',
    ageCategory: (editTraining as any)?.compData?.ageCategory || '',
    fights: (editTraining as any)?.compData?.fights || 1,
    placement: (editTraining as any)?.compData?.placement || '',
  });
  const updateComp = (field: string, value: any) => setCompData(c => ({ ...c, [field]: value }));

  const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const toggleTechnique = (categoryId: string, tech: string) => {
    setForm(f => {
      const current = f.techniques[categoryId] || [];
      const updated = current.includes(tech)
        ? current.filter(t => t !== tech)
        : [...current, tech];
      return { ...f, techniques: { ...f.techniques, [categoryId]: updated } };
    });
  };

  const countSelectedTechs = () => Object.values(form.techniques).reduce((s, arr) => s + arr.length, 0);

  const calcXPLocal = () => {
    let pts = 10;
    const dur = form.duration;
    if (dur >= 60) pts += 5;
    if (dur >= 90) pts += 5;
    if (dur >= 120) pts += 5;
    if (form.sessionType === 'treino_livre')    pts += 5;
    if (form.sessionType === 'aula_particular')  pts += 5;
    if (form.sessionType === 'competicao')       pts += 20;
    if (form.sessionType === 'seminario')        pts += 10;
    return pts;
  };

  // ── Seleção de foto ─────────────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    photoRemovedRef.current = true;
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Upload local ────────────────────────────────────────────────────────────
  const uploadTrainingPhoto = async (file: File): Promise<string | null> => {
    if (!user) return null;
    try {
      return await api.upload.file(file, 'treinos');
    } catch (e) {
      console.error('Upload photo error:', e);
      return null;
    }
  };

  // ── Salvar / Atualizar treino ────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const wasPhotoRemoved = photoRemovedRef.current;
      photoRemovedRef.current = false;
      console.log('[handleSave] isEditMode:', isEditMode, 'editTraining:', !!editTraining, 'editExtraTraining:', !!editExtraTraining, 'sessionType:', form.sessionType);
      const xpGained = calcXPLocal();

      // Upload da foto se houver novo arquivo selecionado
      let trainingPhotoUrl: string | null =
        (editExtraTraining as any)?.trainingPhotoUrl ||
        (editExtraTraining as any)?.trainingPhoto ||
        (editTraining as any)?.trainingPhotoUrl ||
        (editTraining as any)?.trainingPhoto ||
        null;
      if (photoFile) {
        trainingPhotoUrl = await uploadTrainingPhoto(photoFile);
        if (!trainingPhotoUrl) {
          toast.error('Nao foi possivel enviar a foto do treino. Tente novamente.');
          setLoading(false);
          return;
        }
      }
      // Se foto foi removida explicitamente ou preview limpo sem novo arquivo
      if (wasPhotoRemoved || (!photoPreview && !photoFile)) {
        trainingPhotoUrl = null;
      }

      if (isEditMode && editExtraTraining) {
        // ── MODO EDIÇÃO EXTRA: updateDoc em extraTrainings ─────────────────
        const extraId = editExtraTraining.firestoreId || editExtraTraining.id;
        if (!extraId) throw new Error('ID da atividade não encontrado');
        const originalNotes = editExtraTraining.notes || '';
        if (form.notes === originalNotes) {
          toast.error('Altere o campo Observações para salvar as alterações no card do histórico.');
          setLoading(false);
          return;
        }
        const newExtraXP = calcExtraXP();
        const updates: any = {
          trainingDate: form.trainingDate,
          activity: extraData.activity,
          duration: extraData.duration,
          distance: extraData.distance || null,
          calories: extraData.calories || null,
          pace: extraData.distance > 0 ? calcPace() : null,
          extraXP: newExtraXP,
          notes: form.notes,
        };
        if (trainingPhotoUrl !== undefined) updates.trainingPhotoUrl = trainingPhotoUrl;

        await api.extraTrainings.update(extraId, updates);
        await refreshProfile();

        setLoading(false);
        toast.success('Atividade atualizada! ✏️');
        onSaved();
      } else if (isEditMode && editTraining) {
        // ── MODO EDIÇÃO: updateDoc ──────────────────────────────────────
        const trainingId = editTraining.firestoreId || editTraining.id;
        if (!trainingId) throw new Error('ID do treino não encontrado');

        const updates: any = {
          trainingDate: form.trainingDate,
          sessionType: form.sessionType,
          modality: form.modality,
          duration: form.duration,
          intensity: form.intensity,
          satisfaction: form.satisfaction,
          techniques: form.techniques,
          notes: form.notes,
          academy: form.academy,
          professor: form.professor,
          xp: xpGained,
        };
        // Salvar dados de competição se tipo for competição
        if (form.sessionType === 'competicao') {
          updates.compData = compData;
        } else {
          updates.compData = null;
        }
        if (trainingPhotoUrl !== undefined) updates.trainingPhoto = trainingPhotoUrl;

        await api.trainings.update(trainingId, updates);
        await refreshProfile();

        setLoading(false);
        toast.success('Treino atualizado! ✏️');
        onSaved();
      } else {
        // ── MODO CRIAÇÃO: addDoc ────────────────────────────────────────────

        // ── OUTROS TREINOS: salvar em coleção separada ───────────────────
        if (form.sessionType === 'outros_treinos') {
          const extraXP = calcExtraXP();
          const extraDoc: any = {
            uid: user.uid,
            trainingDate: form.trainingDate,
            sessionType: 'outros_treinos',
            activity: extraData.activity,
            duration: extraData.duration,
            distance: extraData.distance || null,
            calories: extraData.calories || null,
            pace: extraData.distance > 0 ? calcPace() : null,
            extraXP,
            notes: form.notes,
          };
          if (trainingPhotoUrl) extraDoc.trainingPhotoUrl = trainingPhotoUrl;

          await api.extraTrainings.create(extraDoc);
          await refreshProfile();

          setLoading(false);
          const actLabel = EXTRA_ACTIVITIES.find(a => a.id === extraData.activity)?.label || 'Atividade';
          toast.success(`${actLabel} salva! +${extraXP} XP extras 🏃`);
          setSavedData({
            xp: extraXP,
            training: {
              trainingDate: form.trainingDate,
              sessionType: 'outros_treinos',
              modality: extraData.activity,
              duration: extraData.duration,
              intensity: 3,
              satisfaction: 4,
              techniques: {},
              notes: form.notes,
              academy: '',
              professor: '',
              xp: extraXP,
              trainingPhotoUrl: trainingPhotoUrl || undefined,
              extraData: { activity: extraData.activity, distance: extraData.distance, calories: extraData.calories, pace: extraData.distance > 0 ? calcPace() : null },
            },
          });
          return;
        }

        const trainingDoc: any = {
          uid: user.uid,
          trainingDate: form.trainingDate,
          sessionType: form.sessionType,
          modality: form.modality,
          duration: form.duration,
          intensity: form.intensity,
          satisfaction: form.satisfaction,
          techniques: form.techniques,
          notes: form.notes,
          academy: form.academy,
          professor: form.professor,
          xp: xpGained,
        };
        // Salvar dados de competição se tipo for competição
        if (form.sessionType === 'competicao') {
          trainingDoc.compData = compData;
        }
        if (trainingPhotoUrl) trainingDoc.trainingPhoto = trainingPhotoUrl;

        await api.trainings.create(trainingDoc);

        // Calcular XP bônus por colocação em competição
        let placementBonus = 0;
        if (form.sessionType === 'competicao' && compData.placement) {
          if (compData.placement.includes('1º')) placementBonus = 50;
          else if (compData.placement.includes('2º')) placementBonus = 30;
          else if (compData.placement.includes('3º')) placementBonus = 20;
        }

        await refreshProfile();

        // ── MILESTONES AUTOMÁTICOS ─────────────────────────────────────────
        try {
          const trainSnap = await getDocs(query(collection(db, 'trainings'), where('uid', '==', user.uid)));
          const totalCount = trainSnap.size;
          const MILESTONES: Record<number, { title: string; xp: number; emoji: string }> = {
            10:  { title: '10 TREINOS!',  xp: 50,  emoji: '🥋' },
            50:  { title: '50 TREINOS!',  xp: 150, emoji: '⭐' },
            100: { title: '100 TREINOS!', xp: 300, emoji: '🏆' },
            200: { title: '200 TREINOS!', xp: 500, emoji: '🔥' },
            300: { title: '300 TREINOS!', xp: 750, emoji: '💎' },
            500: { title: '500 TREINOS!', xp: 1000, emoji: '🥇' },
          };
          const milestone = MILESTONES[totalCount];
          if (milestone) {
            // Verificar se a conquista já foi concedida
            const achSnap = await getDocs(query(collection(db, 'achievements'), where('uid', '==', user.uid), where('type', '==', `milestone_${totalCount}`)));
            if (achSnap.empty) {
              // Conceder conquista
              await addDoc(collection(db, 'achievements'), {
                uid: user.uid,
                type: `milestone_${totalCount}`,
                title: milestone.title,
                emoji: milestone.emoji,
                xpReward: milestone.xp,
                unlockedAt: serverTimestamp(),
              });
              // Bônus de XP
              await updateDoc(doc(db, 'users', user.uid), { xp: increment(milestone.xp) });
              // Notificação in-app
              await addDoc(collection(db, 'notifications'), {
                uid: user.uid,
                type: 'milestone',
                title: `${milestone.emoji} MARCO ATINGIDO!`,
                message: `Parabéns! Você completou ${totalCount} treinos e ganhou +${milestone.xp} XP!`,
                read: false,
                createdAt: serverTimestamp(),
              });
              // Post automático no feed
              await addDoc(collection(db, 'posts'), {
                uid: user.uid,
                authorUid: user.uid,
                authorName: profile?.name || 'Atleta',
                authorBelt: profile?.belt || 'Branca',
                authorPhotoURL: profile?.photo || null,
                // Não incluir academyId em posts da comunidade para evitar contaminação
                feedTarget: 'community',
                type: 'milestone',
                content: `${milestone.emoji} Atingi ${totalCount} treinos no tatame! ${milestone.title}`,
                trainingData: null,
                likes: [],
                commentsCount: 0,
                createdAt: serverTimestamp(),
              });
              toast.success(`${milestone.emoji} MARCO: ${milestone.title} +${milestone.xp} XP!`, { duration: 5000 });
            }
          }
        } catch { /* milestones são secundários */ }

        // challenges update skipped (no participant tracking endpoint)

        setLoading(false);
        const totalXpMsg = placementBonus > 0 ? `+${xpGained} XP + ${placementBonus} XP bônus 🏆` : `+${xpGained} XP 🥋`;
        toast.success(`Treino salvo! ${totalXpMsg}`);
        if (placementBonus > 0) {
          const medal = compData.placement.includes('1º') ? '🥇' : compData.placement.includes('2º') ? '🥈' : '🥉';
          toast.success(`${medal} Bônus de pódio: +${placementBonus} XP!`, { duration: 4000 });
        }
        // Mostrar tela de sucesso com opção de gerar card
        setSavedData({
          xp: xpGained + placementBonus,
          training: {
            trainingDate: form.trainingDate,
            sessionType: form.sessionType,
            modality: form.modality,
            duration: form.duration,
            intensity: form.intensity,
            satisfaction: form.satisfaction,
            techniques: form.techniques,
            notes: form.notes,
            academy: form.academy,
            professor: form.professor,
            xp: xpGained + placementBonus,
            trainingPhotoUrl: trainingPhotoUrl || undefined,
            compData: form.sessionType === 'competicao' ? compData : undefined,
          },
        });
      }
    } catch (e) {
      console.error('Save error:', e);
      toast.error('Erro ao salvar treino');
      setLoading(false);
    }
  }, [user, loading, photoFile, photoPreview, form, refreshProfile, isEditMode, editTraining, editExtraTraining]);
  // ── Excluir treino ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!user) return;

    // Exclusão de atividade extra
    if (editExtraTraining) {
      const extraId = editExtraTraining.firestoreId || editExtraTraining.id;
      if (!extraId) return;
      setDeleting(true);
      try {
        await api.extraTrainings.delete(extraId);
        await refreshProfile();
        toast.success('Atividade excluída.');
        (onDeleted || onSaved)();
      } catch {
        toast.error('Erro ao excluir atividade');
        setDeleting(false);
        setConfirmDelete(false);
      }
      return;
    }

    if (!editTraining) return;
    const trainingId = editTraining.firestoreId || editTraining.id;
    if (!trainingId) return;
    setDeleting(true);
    try {
      await api.trainings.delete(trainingId);
      await refreshProfile();
      toast.success('Treino excluído.');
      (onDeleted || onSaved)();
    } catch {
      toast.error('Erro ao excluir treino');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };
  const xp = calcXPLocal();
  const techCount = countSelectedTechs();
  const activeCat = TECH_CATEGORIES.find(c => c.id === activeCategory) || TECH_CATEGORIES[0];
  const filteredAcademySuggestions = academySuggestions
    .filter(suggestion => matchesSuggestion(suggestion, form.academy))
    .slice(0, 8);
  const filteredProfessorSuggestions = professorSuggestions
    .filter(suggestion => matchesSuggestion(suggestion, form.professor))
    .slice(0, 8);

/* success saved state */
  if (savedData) {
    const shareUser: ShareUserData = {
      name: profile?.name,
      belt: profile?.belt,
      academy: profile?.academy,
      photoURL: (profile?.photo || user?.photoURL) ?? undefined,
    };
    const sess = SESSION_TYPES.find(s => s.id === savedData.training.sessionType);

    return (
      <div className="bjj-content" style={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div>
          <div className="!font-black !text-6xl !leading-none" style={{ color: '#CC0000' }}>+{savedData.xp}</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', marginTop: '0.25rem' }}>XP GANHOS</div>
        </div>

        {/* Resumo */}
        <div className="bjj-card !text-left" style={{ borderLeft: `4px solid ${sess?.color || '#CC0000'}` }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFFFFF' }}>{sess?.icon} {sess?.label || savedData.training.sessionType}</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', color: '#888' }}>{savedData.training.trainingDate} · {savedData.training.duration} min</p>
          {savedData.training.academy && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', color: '#666' }}>🏢 {savedData.training.academy}</p>}
        </div>

        {/* Pergunta */}
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFF' }}>DESEJA GERAR CARD PARA REDES SOCIAIS?</p>

        {/* Botões */}
        <div className="flex flex-col gap-3 w-full" style={{ maxWidth: '400px' }}>
          <button
            onClick={() => setShowShareModal(true)}
            className="bjj-btn-primary"
          >
            📲 SIM, GERAR CARD
          </button>
          <button
            onClick={onSaved}
            className="bjj-btn-ghost !w-full !border !border-[#2A2A2A] !justify-center !text-[#555] !text-[0.875rem]"
          >
            NÃO, IR PARA HISTÓRICO
          </button>
        </div>

        {/* Modal de compartilhamento */}
        {showShareModal && (
          <TrainingShareModal
            training={savedData.training}
            user={shareUser}
            onClose={() => { setShowShareModal(false); onSaved(); }}
            zIndex={9999}
            currentUserUid={user?.uid}
            currentUserAcademyId={profile?.academyId || undefined}
            currentUserAcademyName={profile?.academy || profile?.academyName || undefined}
            currentUserBelt={profile?.belt || undefined}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div className="bjj-header">
        <button onClick={onBack} className="bjj-btn-ghost !text-[#CC0000] !p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="bjj-header-title">
          {isEditMode ? '✏️ EDITAR TREINO' : 'NOVO TREINO'}
        </h1>
      </div>

      <div className="bjj-content">

        {/* Date */}
        <div>
          <label className="bjj-label">DATA DO TREINO</label>
          <input
            type="text"
            value={form.trainingDate}
            onChange={e => update('trainingDate', e.target.value)}
            placeholder="DD/MM/AAAA"
            className="bjj-input"
          />
        </div>

        {/* Session Type */}
        <div>
          <label className="bjj-label">TIPO DE SESSÃO</label>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {SESSION_TYPES.map(s => (
              <button key={s.id} type="button" onClick={() => update('sessionType', s.id)} style={{ padding: '0.5rem 0.75rem', border: `2px solid ${form.sessionType === s.id ? s.color : '#2A2A2A'}`, background: form.sessionType === s.id ? s.color + '30' : '#111', color: form.sessionType === s.id ? s.color : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Campos de Competição (aparecem quando sessionType === 'competicao') */}
        {form.sessionType === 'competicao' && (
          <div className="bjj-card !bg-[#1A1A0A] !border-[#CC8800]" style={{ borderLeft: '3px solid #CC8800' }}>
            <div className="bjj-header-title !text-[0.85rem]" style={{ color: '#CC8800' }}>
              🏆 DADOS DA COMPETIÇÃO
            </div>

            {/* Torneio */}
            <div>
              <label className="bjj-label">TORNEIO</label>
              <input type="text" value={compData.tournament} onChange={e => updateComp('tournament', e.target.value)} placeholder="Ex: Campeonato Brasileiro" className="bjj-input" />
            </div>

            {/* Liga */}
            <div>
              <label className="bjj-label">LIGA</label>
              <input type="text" value={compData.league} onChange={e => updateComp('league', e.target.value)} placeholder="Ex: CBJJ, IBJJF, SJJSAF" className="bjj-input" />
            </div>

            {/* Cidade/Estado */}
            <div>
              <label className="bjj-label">CIDADE / ESTADO</label>
              <input type="text" value={compData.city} onChange={e => updateComp('city', e.target.value)} placeholder="Ex: São Paulo/SP" className="bjj-input" />
            </div>

            {/* Faixa */}
            <div>
              <label className="bjj-label">FAIXA</label>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {COMP_BELTS.map(b => (
                  <button key={b} type="button" onClick={() => updateComp('belt', b)} style={{ padding: '0.5rem 0.75rem', border: `2px solid ${compData.belt === b ? '#CC8800' : '#2A2A2A'}`, background: compData.belt === b ? '#CC880030' : '#111', color: compData.belt === b ? '#CC8800' : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer' }}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Gênero */}
            <div>
              <label className="bjj-label">GÊNERO</label>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button type="button" onClick={() => updateComp('gender', 'M')} style={{ flex: 1, padding: '0.625rem', border: `2px solid ${compData.gender === 'M' ? '#CC8800' : '#2A2A2A'}`, background: compData.gender === 'M' ? '#CC880030' : '#111', color: compData.gender === 'M' ? '#CC8800' : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', cursor: 'pointer' }}>
                  ♂ MASCULINO
                </button>
                <button type="button" onClick={() => updateComp('gender', 'F')} style={{ flex: 1, padding: '0.625rem', border: `2px solid ${compData.gender === 'F' ? '#CC8800' : '#2A2A2A'}`, background: compData.gender === 'F' ? '#CC880030' : '#111', color: compData.gender === 'F' ? '#CC8800' : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', cursor: 'pointer' }}>
                  ♀ FEMININO
                </button>
              </div>
            </div>

            {/* Categoria de Peso */}
            <div>
              <label className="bjj-label">CATEGORIA DE PESO</label>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {COMP_WEIGHT_CATEGORIES[compData.gender as 'M' | 'F'].map(w => (
                  <button key={w} type="button" onClick={() => updateComp('weightCategory', w)} style={{ padding: '0.4rem 0.625rem', border: `2px solid ${compData.weightCategory === w ? '#CC8800' : '#2A2A2A'}`, background: compData.weightCategory === w ? '#CC880030' : '#111', color: compData.weightCategory === w ? '#CC8800' : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', cursor: 'pointer' }}>
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoria de Idade */}
            <div>
              <label className="bjj-label">CATEGORIA DE IDADE</label>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {COMP_AGE_CATEGORIES.map(a => (
                  <button key={a} type="button" onClick={() => updateComp('ageCategory', a)} style={{ padding: '0.4rem 0.625rem', border: `2px solid ${compData.ageCategory === a ? '#CC8800' : '#2A2A2A'}`, background: compData.ageCategory === a ? '#CC880030' : '#111', color: compData.ageCategory === a ? '#CC8800' : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', cursor: 'pointer' }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantas Lutas */}
            <div>
              <label className="bjj-label">QUANTAS LUTAS</label>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button key={n} type="button" onClick={() => updateComp('fights', n)} style={{ flex: 1, padding: '0.625rem 0', border: `2px solid ${compData.fights === n ? '#CC8800' : '#2A2A2A'}`, background: compData.fights === n ? '#CC880030' : '#111', color: compData.fights === n ? '#CC8800' : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Colocação Final */}
            <div>
              <label className="bjj-label">COLOCAÇÃO FINAL</label>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {COMP_PLACEMENTS.map(p => (
                  <button key={p} type="button" onClick={() => updateComp('placement', p)} style={{ padding: '0.5rem 0.75rem', border: `2px solid ${compData.placement === p ? '#CC8800' : '#2A2A2A'}`, background: compData.placement === p ? '#CC880030' : '#111', color: compData.placement === p ? '#CC8800' : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Campos de Outros Treinos (aparecem quando sessionType === 'outros_treinos') */}
        {form.sessionType === 'outros_treinos' && (
          <div className="bjj-card !bg-[#0A1A2A] !border-[#0EA5E9]" style={{ borderLeft: '3px solid #0EA5E9' }}>
            <div className="bjj-header-title !text-[0.85rem]" style={{ color: '#0EA5E9' }}>
              🏃 ATIVIDADE COMPLEMENTAR
            </div>
            {isEditMode && (
              <div style={{ background: '#F59E0B20', border: '1px solid #F59E0B', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#F59E0B' }}>
                ⚠️ Após editar, altere também o campo <strong>Observações</strong> abaixo para salvar as alterações no card do histórico.
              </div>
            )}

            {/* Tipo de Atividade */}
            <div>
              <label className="bjj-label">ATIVIDADE</label>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {EXTRA_ACTIVITIES.map(a => (
                  <button key={a.id} type="button" onClick={() => updateExtra('activity', a.id)} style={{ padding: '0.5rem 0.625rem', border: `2px solid ${extraData.activity === a.id ? '#0EA5E9' : '#2A2A2A'}`, background: extraData.activity === a.id ? '#0EA5E930' : '#111', color: extraData.activity === a.id ? '#0EA5E9' : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer' }}>
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duração */}
            <div>
              <label className="bjj-label">TEMPO (MINUTOS)</label>
              <input
                type="number"
                min="1"
                max="600"
                value={extraData.duration || ''}
                onChange={e => updateExtra('duration', parseInt(e.target.value) || 0)}
                placeholder="Ex: 45"
                className="bjj-input"
              />
              {extraData.duration > 0 && extraData.duration < 40 && (
                <div style={{ marginTop: '0.375rem', fontSize: '0.65rem', color: '#F59E0B' }}>
                  ⚠️ Atividades com menos de 40 min não ganham pontos extras
                </div>
              )}
              {/* Pace médio exibido junto ao tempo para corrida e ciclismo */}
              {EXTRA_ACTIVITIES.find(a => a.id === extraData.activity)?.hasDistance && extraData.duration > 0 && extraData.distance > 0 && (
                <div className="bjj-card !bg-[#0A1A2A] !border-[#0EA5E9] !p-[0.5rem_0.75rem]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>PACE MÉDIO</span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#0EA5E9' }}>{calcPace()} /km</span>
                </div>
              )}
            </div>

            {/* Distância (só para corrida e ciclismo) */}
            {EXTRA_ACTIVITIES.find(a => a.id === extraData.activity)?.hasDistance && (
              <div>
                <label className="bjj-label">DISTÂNCIA (KM)</label>
                <input type="number" step="0.1" min="0" value={extraData.distance || ''} onChange={e => updateExtra('distance', parseFloat(e.target.value) || 0)} placeholder="Ex: 5.0" className="bjj-input" />
                {extraData.distance > 0 && extraData.duration > 0 && (
                  <div style={{ marginTop: '0.375rem', fontSize: '0.65rem', color: '#888' }}>
                    Pace atualizado automaticamente acima
                  </div>
                )}
              </div>
            )}

            {/* Calorias (só para corrida e ciclismo) */}
            {EXTRA_ACTIVITIES.find(a => a.id === extraData.activity)?.hasCalories && (
              <div>
                <label className="bjj-label">CALORIAS (ESTIMATIVA EDITÁVEL)</label>
                <input type="number" min="0" value={extraData.calories || ''} onChange={e => { updateExtra('calories', parseInt(e.target.value) || 0); updateExtra('caloriesEdited', true); }} placeholder="Calorias" className="bjj-input" />
                <div style={{ marginTop: '0.25rem', fontSize: '0.6rem', color: '#666' }}>
                  Estimativa baseada em MET × peso médio (80kg). Edite se necessário.
                </div>
              </div>
            )}

            {/* Pontos extras */}
            <div className="bjj-card flex justify-between items-center" style={{ borderLeft: `3px solid ${calcExtraXP() > 0 ? '#0EA5E9' : '#2A2A2A'}` }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>PONTOS EXTRAS</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: calcExtraXP() > 0 ? '#0EA5E9' : '#444' }}>
                +{calcExtraXP()} XP
              </span>
            </div>
          </div>
        )}

        {/* Modality (ocultar para outros treinos) */}
        {form.sessionType !== 'outros_treinos' && (
        <div>
          <label className="bjj-label">MODALIDADE</label>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {MODALITIES.map(m => (
              <button key={m.id} type="button" onClick={() => update('modality', m.id)} style={{ flex: 1, padding: '0.75rem', border: `2px solid ${form.modality === m.id ? m.color : '#2A2A2A'}`, background: form.modality === m.id ? m.color + '30' : '#111', color: form.modality === m.id ? m.color : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Duration */}
        {form.sessionType !== 'outros_treinos' && (
        <div>
          <label className="bjj-label">DURAÇÃO: {form.duration} MINUTOS</label>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {[30, 45, 60, 75, 90, 120].map(n => (
              <button key={n} type="button" onClick={() => update('duration', n)} style={{ flex: 1, minWidth: '50px', padding: '0.625rem 0', border: `2px solid ${form.duration === n ? '#CC0000' : '#2A2A2A'}`, background: form.duration === n ? '#CC000030' : '#111', color: form.duration === n ? '#CC0000' : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                {n} min
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Intensity */}
        {form.sessionType !== 'outros_treinos' && (
        <div>
          <label className="bjj-label">INTENSIDADE: {INTENSITY_LABELS[form.intensity]}</label>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => update('intensity', n)} style={{ flex: 1, height: '44px', border: `2px solid ${form.intensity >= n ? '#CC0000' : '#2A2A2A'}`, background: form.intensity >= n ? '#CC0000' : '#111', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Satisfaction */}
        {form.sessionType !== 'outros_treinos' && (
        <div>
          <label className="bjj-label">SATISFAÇÃO: {SATISFACTION_LABELS[form.satisfaction]}</label>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => update('satisfaction', n)} style={{ flex: 1, height: '44px', border: `2px solid ${form.satisfaction === n ? '#1A6ECC' : '#2A2A2A'}`, background: form.satisfaction === n ? '#1A6ECC' : '#111', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                {SATISFACTION_LABELS[n]}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Techniques by category */}
        {form.sessionType !== 'outros_treinos' && (
        <div>
          <label className="bjj-label">TÉCNICAS PRATICADAS ({techCount})</label>
          {/* Category tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0.375rem', marginBottom: '0.625rem' }}>
            {TECH_CATEGORIES.map(cat => {
              const catCount = (form.techniques[cat.id] || []).length;
              return (
                <button key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.375rem 0.625rem', border: `1px solid ${activeCategory === cat.id ? cat.color : '#2A2A2A'}`, background: activeCategory === cat.id ? cat.color + '30' : '#111', color: activeCategory === cat.id ? cat.color : '#555', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {cat.icon} {cat.label}{catCount > 0 ? ` (${catCount})` : ''}
                </button>
              );
            })}
          </div>
          {/* Techniques in active category */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {activeCat.techniques.map(tech => {
              const selected = (form.techniques[activeCat.id] || []).includes(tech);
              return (
                <button key={tech} type="button" onClick={() => toggleTechnique(activeCat.id, tech)} style={{ padding: '0.375rem 0.625rem', border: `1px solid ${selected ? activeCat.color : '#2A2A2A'}`, background: selected ? activeCat.color + '20' : '#111', color: selected ? activeCat.color : '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.03em', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {tech}
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* Academy / Professor */}
        {form.sessionType !== 'outros_treinos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
          {/* Academia */}
          <div style={{ position: 'relative' }}>
            <label className="bjj-label">ACADEMIA</label>
            <input
              type="text"
              value={form.academy}
              onChange={e => update('academy', e.target.value)}
              onFocus={() => setShowAcademySuggestions(true)}
              onBlur={() => setTimeout(() => setShowAcademySuggestions(false), 150)}
              placeholder="Nome da academia"
              className="bjj-input"
            />
            {showAcademySuggestions && (filteredAcademySuggestions.length > 0 || suggestionsLoading) && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1A1A', border: '1px solid #CC0000', zIndex: 50, maxHeight: '160px', overflowY: 'auto' }}>
                {suggestionsLoading && filteredAcademySuggestions.length === 0 ? (
                  <div style={{ padding: '0.5rem 0.75rem', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    CARREGANDO...
                  </div>
                ) : filteredAcademySuggestions.map(suggestion => (
                  <div key={suggestion.id} onMouseDown={() => { update('academy', suggestion.value); setShowAcademySuggestions(false); }} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: form.academy === suggestion.value ? '#CC0000' : '#CCCCCC', background: form.academy === suggestion.value ? '#1A0000' : 'transparent', borderBottom: '1px solid #2A2A2A' }}>
                    <div style={{ fontWeight: 700 }}>{suggestion.label}</div>
                    {suggestion.subtitle && <div style={{ marginTop: '0.15rem', color: '#777', fontSize: '0.68rem' }}>{suggestion.subtitle}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Professor */}
          <div style={{ position: 'relative' }}>
            <label className="bjj-label">PROFESSOR</label>
            <input
              type="text"
              value={form.professor}
              onChange={e => update('professor', e.target.value)}
              onFocus={() => setShowProfessorSuggestions(true)}
              onBlur={() => setTimeout(() => setShowProfessorSuggestions(false), 150)}
              placeholder="Nome do professor"
              className="bjj-input"
            />
            {showProfessorSuggestions && (filteredProfessorSuggestions.length > 0 || suggestionsLoading) && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1A1A', border: '1px solid #CC0000', zIndex: 50, maxHeight: '160px', overflowY: 'auto' }}>
                {suggestionsLoading && filteredProfessorSuggestions.length === 0 ? (
                  <div style={{ padding: '0.5rem 0.75rem', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    CARREGANDO...
                  </div>
                ) : filteredProfessorSuggestions.map(suggestion => (
                  <div key={suggestion.id} onMouseDown={() => { update('professor', suggestion.value); setShowProfessorSuggestions(false); }} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: form.professor === suggestion.value ? '#CC0000' : '#CCCCCC', background: form.professor === suggestion.value ? '#1A0000' : 'transparent', borderBottom: '1px solid #2A2A2A' }}>
                    <div style={{ fontWeight: 700 }}>{suggestion.label}</div>
                    {suggestion.subtitle && <div style={{ marginTop: '0.15rem', color: '#777', fontSize: '0.68rem' }}>{suggestion.subtitle}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* ── FOTO DO TREINO ── */}
        <div>
          <label className="bjj-label">FOTO DO TREINO</label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
          {photoPreview ? (
            <div className="bjj-card !bg-[#0A0A0A] !border-[#CC0000] flex items-center justify-center" style={{ minHeight: '120px', position: 'relative' }}>
              <img src={photoPreview} alt="Preview" style={{ width: '100%', height: 'auto', maxHeight: '320px', objectFit: 'contain', display: 'block' }} />
              <button type="button" onClick={handleRemovePhoto} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.75)', border: 'none', color: '#FFF', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', borderRadius: '2px' }}>×</button>
              <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.65)', padding: '4px 10px', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                <span style={{ color: '#FFFFFF', fontSize: '11px', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📷 Alterar</span>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="bjj-card !border-dashed !border-[#2A2A2A] flex flex-col items-center justify-center text-[#555] cursor-pointer" style={{ height: '100px', gap: '6px' }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#CC0000')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#2A2A2A')}>
              <span style={{ fontSize: '28px' }}>📷</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adicionar Foto do Treino</span>
              <span style={{ fontSize: '0.65rem', color: '#444' }}>Clique para selecionar da galeria</span>
            </button>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="bjj-label">OBSERVAÇÕES</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="O que você aprendeu hoje? Pontos a melhorar..." className="bjj-input !resize-none" rows={3} />
        </div>

        {/* XP Preview */}
        <div className="bjj-card" style={{ borderLeft: `3px solid ${form.sessionType === 'outros_treinos' ? '#0EA5E9' : '#CC0000'}` }}>
          <div>
            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888' }}>{isEditMode ? 'XP RECALCULADO' : (form.sessionType === 'outros_treinos' ? 'PONTOS EXTRAS' : 'XP A GANHAR')}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2.5rem', color: form.sessionType === 'outros_treinos' ? '#0EA5E9' : '#CC0000', lineHeight: 1 }}>+{form.sessionType === 'outros_treinos' ? calcExtraXP() : xp}</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', lineHeight: 1.8 }}>
            {form.sessionType === 'outros_treinos' ? (
              <>
                {extraData.duration >= 40 ? <div>40+ MIN: +5 XP EXTRA</div> : <div style={{ color: '#F59E0B' }}>MÍNIMO 40 MIN</div>}
              </>
            ) : (
              <>
                <div>BASE: 10 XP</div>
                {form.duration >= 60 && <div>60+ MIN: +5 XP</div>}
                {form.duration >= 90 && <div>90+ MIN: +5 XP</div>}
                {form.duration >= 120 && <div>120+ MIN: +5 XP</div>}
                {form.sessionType === 'treino_livre' && <div>TREINO LIVRE: +5 XP</div>}
                {form.sessionType === 'aula_particular' && <div>AULA PARTICULAR: +5 XP</div>}
                {form.sessionType === 'competicao' && <div>COMPETIÇÃO: +20 XP</div>}
                {form.sessionType === 'seminario' && <div>SEMINÁRIO: +10 XP</div>}
              </>
            )}
          </div>
        </div>

        {/* Save / Update */}
        <button
          onClick={handleSave}
          disabled={loading || deleting}
          className="bjj-btn-primary"
        >
          {loading
            ? (photoFile ? 'ENVIANDO FOTO...' : (isEditMode ? 'ATUALIZANDO...' : 'SALVANDO...'))
            : (isEditMode ? '✏️ SALVAR ALTERAÇÕES' : 'SALVAR TREINO 🥋')}
        </button>

        {/* Excluir treino — apenas no modo edição */}
        {isEditMode && (
          <div style={{ marginTop: '0.5rem' }}>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={loading || deleting}
                className="bjj-btn-outline !border-[#3A0000] !text-[#CC0000]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                EXCLUIR TREINO
              </button>
            ) : (
              <div className="bjj-card !bg-[#1A0000] !border-[#CC0000]">
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#FF4444', textTransform: 'uppercase', textAlign: 'center' }}>
                  ⚠️ Confirmar exclusão?
                </p>
                <p style={{ fontSize: '0.75rem', color: '#888', textAlign: 'center', lineHeight: 1.4 }}>
                  Esta ação não pode ser desfeita. O treino e o XP serão removidos permanentemente.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="bjj-btn-ghost !text-[#888]"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bjj-btn-primary !bg-[#CC0000]"
                  >
                    {deleting ? 'EXCLUINDO...' : 'SIM, EXCLUIR'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
