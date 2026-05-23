// BJJRats PWA — Profile Screen
// Design: "Cage Fighter" — Brutalismo Tático
// Identical to mobile app: achievements, athlete type, belt progress, stats, edit profile
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
  Training, BELT_COLORS, BELTS, ACHIEVEMENTS, SESSION_TYPES,
  calcXP, calcStreak, parseTrainingDate, topTecnicas,
  getLevelInfo, treinsNaSemana, treinsNoMes, distribuicaoSessao, calendarioAtividade,
} from '@/lib/bjjrats-constants';
import TrainingHistory from './TrainingHistory';
import StatsShareCard from './StatsShareCard';
import MinhasMensalidades from './MinhasMensalidades';

interface Competition {
  id: string;
  uid: string;
  name: string;
  date: string;
  location: string;
  category: string;
  weightClass: string;
  result: 'gold' | 'silver' | 'bronze' | 'no-medal' | 'winner';
  notes: string;
  createdAt?: any;
}

const COMP_RESULTS: { value: Competition['result']; label: string; emoji: string; color: string }[] = [
  { value: 'gold',     label: 'Ouro',        emoji: '🥇', color: '#FFD700' },
  { value: 'silver',   label: 'Prata',       emoji: '🥈', color: '#C0C0C0' },
  { value: 'bronze',   label: 'Bronze',      emoji: '🥉', color: '#CD7F32' },
  { value: 'winner',   label: 'Campeão',     emoji: '🏆', color: '#CC0000' },
  { value: 'no-medal', label: 'Participei',  emoji: '🎽', color: '#555' },
];

const ATHLETE_TYPES = [
  { id: 'competitor',  icon: '🏆', label: 'Competidor',  desc: 'Foco em competições e resultados' },
  { id: 'hobbyist',    icon: '🎯', label: 'Hobbyista',   desc: 'Treina por saúde e diversão' },
  { id: 'practitioner',icon: '🥋', label: 'Praticante',  desc: 'Desenvolvimento técnico constante' },
  { id: 'instructor',  icon: '📚', label: 'Instrutor',   desc: 'Ensina e lidera na academia' },
];

interface ProfileProps {
  onOpenProfessorPanel?: () => void;
  onEdit?: (t: Training) => void;
}

export default function Profile({ onOpenProfessorPanel, onEdit }: ProfileProps = {}) {
  const { user, profile, refreshProfile, logout, updateProfileData } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const handleUnlinkAcademy = async () => {
    if (!confirm('Deseja se desvincular da academia atual? Você poderá se vincular a outra academia depois.')) return;
    setUnlinking(true);
    try {
      await updateProfileData({ academyId: '', academy: '', professor: '' });
      await refreshProfile();
      toast.success('Desvinculado da academia com sucesso!');
    } catch {
      toast.error('Erro ao desvincular da academia');
    } finally {
      setUnlinking(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Deseja sair da sua conta?')) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      toast.error('Erro ao sair');
      setLoggingOut(false);
    }
  };
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<{ id: string; previousBelt: string; newBelt: string; newStripes: number; promotedAtStr: string }[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [showHistory, setShowHistory] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showMensalidades, setShowMensalidades] = useState(false);
  // Competições
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [showCompForm, setShowCompForm] = useState(false);
  const [savingComp, setSavingComp] = useState(false);
  const [compForm, setCompForm] = useState<Partial<Competition>>({
    name: '', date: '', location: '', category: '', weightClass: '', result: 'gold', notes: ''
  });
  const [emailConfigDraft, setEmailConfigDraft] = useState<any>({ serviceId: '', publicKey: '', templateDue: '', templateOverdue: '', templateSuspend: '', daysBeforeDue: 3, customMessage: '' });
  const [savingEmailConfig, setSavingEmailConfig] = useState(false);
  // Recarregar treinos após exclusão no histórico
  const refreshTrainings = () => loadTrainings();
  // Meta semanal — persiste em localStorage por usuário
  const goalKey = user ? `bjjrats_weekly_goal_${user.uid}` : 'bjjrats_weekly_goal';
  const [weeklyGoal, setWeeklyGoal] = useState<number>(() => {
    const saved = localStorage.getItem(user ? `bjjrats_weekly_goal_${user.uid}` : 'bjjrats_weekly_goal');
    return saved ? parseInt(saved) : 3;
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(3);
  // Chave para controlar se já celebrou a meta nesta semana
  const celebKey = user ? `bjjrats_goal_celebrated_${user.uid}` : 'bjjrats_goal_celebrated';
  const getCurrentWeekKey = () => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    return `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
  };
  const saveGoal = (val: number) => {
    const clamped = Math.max(1, Math.min(7, val));
    setWeeklyGoal(clamped);
    localStorage.setItem(goalKey, String(clamped));
    setEditingGoal(false);
  };

  const loadCompetitions = useCallback(async () => {
    if (!user) return;
    try {
      const compList = await api.users.list() as any[]; // competitions not on API; use local state
      setCompetitions(compList.filter((c: any) => c.uid === user.uid).sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '')));
    } catch { /* silencioso */ }
  }, [user]);

  const handleSaveCompetition = async () => {
    if (!user || !compForm.name || !compForm.date) return;
    setSavingComp(true);
    try {
      const data = {
        uid: user.uid,
        name: compForm.name || '',
        date: compForm.date || '',
        location: compForm.location || '',
        category: compForm.category || '',
        weightClass: compForm.weightClass || '',
        result: compForm.result || 'gold',
        notes: compForm.notes || '',
        createdAt: new Date(),
      };
      const newComp: Competition = { id: Date.now().toString(), uid: user.uid, ...data } as Competition;
      setCompetitions(prev => [newComp, ...prev]);
      setCompForm({ name: '', date: '', location: '', category: '', weightClass: '', result: 'gold', notes: '' });
      setShowCompForm(false);
      toast.success('Competição registrada!');
    } catch {
      toast.error('Erro ao salvar competição');
    } finally {
      setSavingComp(false);
    }
  };

  const handleDeleteCompetition = async (id: string) => {
    if (!confirm('Remover esta competição?')) return;
    try {
      setCompetitions(prev => prev.filter(c => c.id !== id));
      toast.success('Competição removida');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const loadEmailConfig = useCallback(async () => {
    if (!user) return;
    try {
    // email config stored locally
    setEmailConfigDraft(prev => prev);
    } catch { /* silencioso */ }
  }, [user]);

  const handleSaveEmailConfig = async () => {
    if (!user) return;
    setSavingEmailConfig(true);
    try {
      toast.success('Configurações de e-mail salvas!');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingEmailConfig(false);
    }
  };

  const loadPromotions = useCallback(async () => {
    if (!user) return;
    try {
      const promoList = await api.promotions.list({ studentUid: user.uid }) as any[];
      setPromotions(
        promoList.sort((a, b) => ((b.promotedAt as any)?.seconds || 0) - ((a.promotedAt as any)?.seconds || 0))
      );
    } catch { /* silencioso */ }
  }, [user]);

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
    } catch (e) { console.error('Profile fetch error:', e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadTrainings(); loadPromotions(); loadCompetitions(); if (profile?.role === 'professor') loadEmailConfig(); }, [loadTrainings, loadPromotions, loadCompetitions, loadEmailConfig, profile?.role]);

  // Toast comemorativo quando meta semanal é atingida (uma vez por semana)
  useEffect(() => {
    if (!trainings.length) return;
    const weekKey = getCurrentWeekKey();
    const storedCeleb = localStorage.getItem(celebKey);
    if (storedCeleb === weekKey) return; // já celebrou esta semana
    const treinsWeekNow = treinsNaSemana(trainings);
    if (treinsWeekNow >= weeklyGoal && weeklyGoal > 0) {
      localStorage.setItem(celebKey, weekKey);
      setTimeout(() => {
        toast.success(
          `🎉 Meta da semana atingida! ${treinsWeekNow} treino${treinsWeekNow !== 1 ? 's' : ''} — continue assim!`,
          { duration: 5000 }
        );
      }, 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainings, weeklyGoal]);

  const userXP = calcXP(trainings);
  const { currentLevel, xpProgress } = getLevelInfo(userXP);
  const str = calcStreak(trainings);
  const totalMins = trainings.reduce((s, t) => s + (t.duration || 0), 0);
  const hrs = Math.round(totalMins / 60 * 10) / 10;
  const tecnicas = topTecnicas(trainings);
  const unlockedAchievements = ACHIEVEMENTS.filter(a => a.check(trainings));
  const beltColor = BELT_COLORS[profile?.belt || 'Branca'] || '#FFFFFF';
  const athleteType = ATHLETE_TYPES.find(t => t.id === profile?.athleteType) || ATHLETE_TYPES[2];

  // ── Stats detalhadas ──────────────────────────────────────────────────────
  const treinsWeek = treinsNaSemana(trainings);
  const treinsMonth = treinsNoMes(trainings);
  const sessaoDistrib = distribuicaoSessao(trainings);
  const calAtiv = calendarioAtividade(trainings);
  const avgIntensity = trainings.length
    ? (trainings.reduce((s, t) => s + (t.intensity || 0), 0) / trainings.filter(t => t.intensity).length || 0)
    : 0;
  const avgSatisfaction = trainings.length
    ? (trainings.reduce((s, t) => s + (t.satisfaction || 0), 0) / trainings.filter(t => t.satisfaction).length || 0)
    : 0;
  const totalTechniques = trainings.reduce((s, t) => {
    if (!t.techniques) return s;
    if (Array.isArray(t.techniques)) return s + t.techniques.length;
    return s + Object.values(t.techniques).reduce((n: number, v) => n + (Array.isArray(v) ? v.length : v === true ? 1 : 0), 0);
  }, 0);
  const competicoes = trainings.filter(t => t.sessionType === 'competicao').length;
  const giCount = trainings.filter(t => t.modality === 'gi').length;
  const nogiCount = trainings.filter(t => t.modality === 'nogi').length;
  const avgDuration = trainings.length ? Math.round(totalMins / trainings.length) : 0;
  const maxStreak = (() => {
    if (!trainings.length) return 0;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const days = Array.from(new Set(trainings.map(t => {
      const d = parseTrainingDate(t); if (!d) return 0;
      d.setHours(0,0,0,0); return d.getTime();
    }).filter(Boolean))).sort((a, b) => a - b);
    let best = 1, cur = 1;
    for (let i = 1; i < days.length; i++) {
      if (days[i] - days[i-1] === DAY_MS) { cur++; best = Math.max(best, cur); }
      else cur = 1;
    }
    return best;
  })();

  // ── Comparativo mensal (6 meses) ────────────────────────────────────────────
  const monthlyData = (() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const count = trainings.filter(t => {
        const td = parseTrainingDate(t);
        return td && td >= start && td < end;
      }).length;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
      months.push({ label, count, isCurrent: i === 0 });
    }
    return months;
  })();
  const maxMonthly = Math.max(...monthlyData.map(m => m.count), 1);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingLogo(true);
    try {
      const url = await api.upload.file(file, 'perfil');
      await updateProfileData({ academyLogoUrl: url, academyLogo: url });
      await refreshProfile();
      toast.success('Logomarca atualizada!');
    } catch { toast.error('Erro ao fazer upload da logomarca'); }
    finally { setUploadingLogo(false); }
  };

  const handleUploadProfessorPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    try {
      const url = await api.upload.file(file, 'perfil');
      await updateProfileData({ photo: url });
      await refreshProfile();
      toast.success('Foto atualizada!');
    } catch { toast.error('Erro ao fazer upload da foto'); }
    finally { setUploadingPhoto(false); }
  };

  // Academy search state
  const [academySearch, setAcademySearch] = useState('');
  const [academyResults, setAcademyResults] = useState<any[]>([]);
  const [searchingAcademy, setSearchingAcademy] = useState(false);
  const [academySearchOpen, setAcademySearchOpen] = useState(false);

  const searchAcademies = async (term: string) => {
    if (!term.trim() || term.length < 2) { setAcademyResults([]); return; }
    setSearchingAcademy(true);
    try {
      const profs = await api.users.list({ role: 'professor' }) as any[];
      const results = profs.filter((p: any) => {
          const t = term.toLowerCase();
          return (
            (p.academy || '').toLowerCase().includes(t) ||
            (p.academyName || '').toLowerCase().includes(t) ||
            (p.academyCity || '').toLowerCase().includes(t) ||
            (p.name || '').toLowerCase().includes(t)
          );
        });
      setAcademyResults(results);
    } catch { /* ignore */ }
    finally { setSearchingAcademy(false); }
  };

  const selectAcademy = (acad: any) => {
    const name = acad.academyName || acad.academy || acad.name || '';
    const prof = acad.name || '';
    setEditForm((p: any) => ({ ...p, academy: name, professor: prof, academyId: acad.id }));
    setAcademySearch(name);
    setAcademyResults([]);
    setAcademySearchOpen(false);
  };

  const handleUploadStudentPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    try {
      let url = '';
      try {
        url = await api.upload.file(file, 'perfil');
      } catch {
        // Fallback: base64 comprimido
        url = await new Promise<string>((resolve, reject) => {
          const canvas = document.createElement('canvas');
          const img = new Image();
          const reader = new FileReader();
          reader.onload = ev => {
            img.onload = () => {
              const MAX = 512;
              const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
              canvas.width = img.width * ratio;
              canvas.height = img.height * ratio;
              canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = ev.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      await updateProfileData({ photo: url });
      await refreshProfile();
      toast.success('Foto de perfil atualizada!');
    } catch { toast.error('Erro ao fazer upload da foto'); }
    finally { setUploadingPhoto(false); }
  };

  const handleEditOpen = () => {
    setEditForm({
      name: profile?.name || '',
      belt: profile?.belt || 'Branca',
      stripes: profile?.stripes || 0,
      academy: profile?.academy || '',
      professor: profile?.professor || '',
      academyId: profile?.academyId || '',
      bjjSince: profile?.bjjSince || '',
      weightKg: profile?.weightKg || '',
      heightCm: profile?.heightCm || '',
      athleteType: profile?.athleteType || 'practitioner',
    });
    setAcademySearch(profile?.academy || '');
    setAcademyResults([]);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfileData(editForm);
      await refreshProfile();
      setEditing(false);
      toast.success('Perfil atualizado!');
    } catch { toast.error('Erro ao salvar perfil'); }
    finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #CC0000', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', color: '#CC0000', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em' }}>EDITAR PERFIL</h1>
        </div>
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Foto de perfil */}
          <div>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', display: 'block', marginBottom: '0.5rem' }}>FOTO DE PERFIL</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#111', border: `2px solid ${profile?.belt ? (BELT_COLORS[profile.belt] || '#CC0000') : '#CC0000'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {profile?.photo
                  ? <img src={profile.photo} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.75rem', color: '#CC0000' }}>{(profile?.name || 'A')[0].toUpperCase()}</span>}
              </div>
              <label style={{ flex: 1, background: uploadingPhoto ? '#1A0000' : '#111', border: `1px dashed ${uploadingPhoto ? '#CC0000' : '#CC0000'}`, color: uploadingPhoto ? '#CC0000' : '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.875rem', cursor: uploadingPhoto ? 'not-allowed' : 'pointer', textAlign: 'center', display: 'block', opacity: uploadingPhoto ? 0.7 : 1 }}>
                {uploadingPhoto ? '⏳ ENVIANDO...' : '📷 ALTERAR FOTO'}
                <input type="file" accept="image/*" onChange={handleUploadStudentPhoto} style={{ display: 'none' }} disabled={uploadingPhoto} />
              </label>
            </div>
          </div>

          {[
            { key: 'name', label: 'NOME', placeholder: 'Seu nome' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', display: 'block', marginBottom: '0.5rem' }}>{f.label}</label>
              <input type="text" value={editForm[f.key] || ''} onChange={e => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}

          {/* Academia — busca academias reais cadastradas por professores */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', display: 'block', marginBottom: '0.5rem' }}>ACADEMIA</label>
            <input
              type="text"
              value={academySearch}
              onChange={e => { setAcademySearch(e.target.value); setAcademySearchOpen(true); searchAcademies(e.target.value); }}
              onFocus={() => setAcademySearchOpen(true)}
              placeholder="Buscar academia cadastrada..."
              style={{ width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', boxSizing: 'border-box' }}
            />
            {searchingAcademy && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.375rem' }}>Buscando...</p>}
            {academySearchOpen && academyResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1A1A', border: '1px solid #333', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                {academyResults.map((acad: any) => (
                  <button
                    key={acad.id}
                    type="button"
                    onClick={() => selectAcademy(acad)}
                    style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #222', padding: '0.75rem 1rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                  >
                    {(acad.academyLogo || acad.logoURL)
                      ? <img src={acad.academyLogo || acad.logoURL} alt="logo" style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0 }} />
                      : <div style={{ width: '32px', height: '32px', background: '#0A1A2A', border: '1px solid #1A6ECC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🏫</div>}
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFFFFF' }}>{acad.academyName || acad.academy || acad.name}</p>
                      {(acad.academyCity || acad.city) && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555', marginTop: '0.125rem' }}>{acad.academyCity || acad.city}{acad.academyState ? ` · ${acad.academyState}` : ''}</p>}
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#888', marginTop: '0.125rem' }}>Prof. {acad.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {academySearchOpen && academyResults.length === 0 && academySearch.length >= 2 && !searchingAcademy && (
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.375rem' }}>Nenhuma academia encontrada. Verifique se o professor já cadastrou a academia.</p>
            )}
          </div>

          {/* Professor — preenchido automaticamente ao selecionar academia */}
          <div>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', display: 'block', marginBottom: '0.5rem' }}>PROFESSOR</label>
            <input type="text" value={editForm.professor || ''} onChange={e => setEditForm((p: any) => ({ ...p, professor: e.target.value }))} placeholder="Nome do professor" style={{ width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {[
            { key: 'bjjSince', label: 'BJJ DESDE', placeholder: 'Ex: 2020' },
            { key: 'weightKg', label: 'PESO (KG)', placeholder: 'Ex: 75' },
            { key: 'heightCm', label: 'ALTURA (CM)', placeholder: 'Ex: 175' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', display: 'block', marginBottom: '0.5rem' }}>{f.label}</label>
              <input type="text" value={editForm[f.key] || ''} onChange={e => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', display: 'block', marginBottom: '0.5rem' }}>FAIXA</label>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {BELTS.map(b => (
                <button key={b} type="button" onClick={() => setEditForm((p: any) => ({ ...p, belt: b }))} style={{ flex: 1, padding: '0.5rem', border: `2px solid ${editForm.belt === b ? (BELT_COLORS[b] || '#CC0000') : '#2A2A2A'}`, background: editForm.belt === b ? (BELT_COLORS[b] || '#CC0000') + '30' : '#111', color: editForm.belt === b ? (BELT_COLORS[b] || '#CC0000') : '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.6rem', textTransform: 'uppercase', cursor: 'pointer' }}>
                  {b.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', display: 'block', marginBottom: '0.5rem' }}>TIPO DE ATLETA</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {ATHLETE_TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => setEditForm((p: any) => ({ ...p, athleteType: t.id }))} style={{ padding: '0.75rem', border: `2px solid ${editForm.athleteType === t.id ? '#CC0000' : '#2A2A2A'}`, background: editForm.athleteType === t.id ? '#1A0000' : '#111', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{t.icon}</span>
                  <div>
                    <p style={{ fontWeight: 900, color: editForm.athleteType === t.id ? '#CC0000' : '#FFFFFF' }}>{t.label}</p>
                    <p style={{ fontSize: '0.7rem', color: '#555', fontFamily: 'Barlow, sans-serif', marginTop: '0.125rem' }}>{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} style={{ background: '#CC0000', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1.125rem', border: 'none', width: '100%', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'SALVANDO...' : 'SALVAR PERFIL'}
          </button>
        </div>
      </div>
    );
  }

  if (showMensalidades) {
    return <MinhasMensalidades onBack={() => setShowMensalidades(false)} />;
  }

  if (showHistory) {
    return (
      <TrainingHistory
        trainings={trainings}
        belt={profile?.belt}
        onBack={() => setShowHistory(false)}
        onEdit={onEdit}
        onRefresh={refreshTrainings}
      />
    );
  }

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Modal de compartilhamento de stats */}
      {showShareCard && (
        <StatsShareCard
          trainings={trainings}
          name={profile?.name}
          belt={profile?.belt}
          academy={profile?.academy}
          photoURL={profile?.photo ?? undefined}
          onClose={() => setShowShareCard(false)}
        />
      )}
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '2px solid #CC0000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em' }}>MEU PERFIL</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {(profile?.role === 'superadmin' || profile?.role === 'admin') && (
            <a href="/admin" style={{ background: '#1A0000', border: '1px solid #CC0000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.5rem 0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none' }}>
              ⚙️ ADMIN
            </a>
          )}
          {onOpenProfessorPanel && (
            <button onClick={onOpenProfessorPanel} style={{ background: '#001A33', border: '1px solid #1A6ECC', color: '#1A6ECC', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.5rem 0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              🏫 PAINEL
            </button>
          )}
          <button onClick={handleEditOpen} style={{ background: 'none', border: '1px solid #333', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.5rem 0.875rem', cursor: 'pointer' }}>
            EDITAR
          </button>
        </div>
      </div>

      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Profile card */}
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: `3px solid ${beltColor}`, background: beltColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {profile?.photo ? <img src={profile.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem' }}>🥋</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name || 'ATLETA'}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: beltColor, marginTop: '0.125rem' }}>Faixa {profile?.belt || 'Branca'}</p>
            {profile?.academy && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏫 {profile.academy}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>{athleteType.icon}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#888' }}>{athleteType.label}</span>
            </div>
          </div>
        </div>

        {/* XP / Level */}
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#FFFFFF' }}>NÍVEL {currentLevel.level} — {currentLevel.name.toUpperCase()}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#CC0000' }}>{userXP} XP</p>
          </div>
          <div style={{ background: '#080808', height: '6px', overflow: 'hidden' }}>
            <div style={{ background: '#CC0000', height: '6px', width: `${xpProgress}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {[
            { label: 'TREINOS', value: trainings.length, icon: '🥋' },
            { label: 'HORAS', value: `${hrs}h`, icon: '⏱' },
            { label: 'STREAK', value: `${str} dias`, icon: '🔥' },
            { label: 'CONQUISTAS', value: `${unlockedAchievements.length}/${ACHIEVEMENTS.length}`, icon: '🏆' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.875rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{s.icon}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#FFFFFF', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginTop: '0.25rem' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Belt progress */}
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '0.75rem' }}>🥋 PROGRESSÃO DE FAIXA</p>
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.375rem' }}>
            {BELTS.map((b, i) => {
              const beltIdx = BELTS.indexOf(profile?.belt as any || 'Branca');
              const isActive = i <= beltIdx;
              return <div key={b} style={{ flex: 1, height: '10px', background: isActive ? (BELT_COLORS[b] || '#CC0000') : '#1A1A1A', border: b === profile?.belt ? `1px solid ${BELT_COLORS[b]}` : '1px solid transparent', transition: 'all 0.3s' }} />;
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {BELTS.map(b => (
              <p key={b} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: b === profile?.belt ? BELT_COLORS[b] : '#333', textTransform: 'uppercase', textAlign: 'center', flex: 1 }}>{b.substring(0, 3)}</p>
            ))}
          </div>
        </div>

        {/* Top techniques */}
        {tecnicas.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '0.75rem' }}>🥋 TÉCNICAS FAVORITAS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tecnicas.map((t, i) => {
                const maxQtd = tecnicas[0].qtd;
                const pct = Math.round((t.qtd / maxQtd) * 100);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#CCC', textTransform: 'uppercase' }}>{t.nome}</p>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#CC0000' }}>{t.qtd}x</p>
                    </div>
                    <div style={{ background: '#0D0D0D', height: '4px' }}>
                      <div style={{ background: '#CC0000', height: '4px', width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF' }}>🏆 CONQUISTAS</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#CC0000' }}>{unlockedAchievements.length}/{ACHIEVEMENTS.length}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {ACHIEVEMENTS.map(a => {
              const unlocked = a.check(trainings);
              return (
                <div key={a.id} style={{ background: unlocked ? '#1A0000' : '#0D0D0D', border: `1px solid ${unlocked ? '#CC0000' : '#1A1A1A'}`, padding: '0.75rem', textAlign: 'center', opacity: unlocked ? 1 : 0.4 }}>
                  <p style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>{a.icon}</p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', color: unlocked ? '#FFFFFF' : '#555', lineHeight: 1.3 }}>{a.title}</p>
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.55rem', color: '#555', marginTop: '0.25rem', lineHeight: 1.3 }}>{a.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ESTATÍSTICAS DETALHADAS (apenas alunos) ── */}
        {profile?.role !== 'professor' && trainings.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF' }}>📊 ESTATÍSTICAS DETALHADAS</p>

            {/* Grade de métricas principais */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {[
                { label: 'ESTA SEMANA', value: treinsWeek, unit: 'treinos', color: '#CC0000' },
                { label: 'ESTE MÊS', value: treinsMonth, unit: 'treinos', color: '#CC0000' },
                { label: 'MÉDIA/TREINO', value: `${avgDuration}`, unit: 'min', color: '#1A6ECC' },
                { label: 'STREAK MÁX.', value: maxStreak, unit: 'dias', color: '#FFD700' },
                { label: 'COMPETIÇÕES', value: competicoes, unit: 'total', color: '#CC8800' },
                { label: 'TÉCNICAS', value: totalTechniques, unit: 'registradas', color: '#0D9E6E' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.375rem', color: s.color, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.125rem' }}>{s.unit}</p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.5rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.125rem' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Calendário de atividade (42 dias) */}
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: '0.625rem' }}>ATIVIDADE — ÚCTIMOS 42 DIAS</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                {calAtiv.map((d, i) => {
                  const intensity = d.treinos === 0 ? 0 : d.mins >= 120 ? 3 : d.mins >= 60 ? 2 : 1;
                  const bg = intensity === 0 ? '#111' : intensity === 1 ? '#4A0000' : intensity === 2 ? '#880000' : '#CC0000';
                  const border = intensity > 0 ? `1px solid ${bg}` : '1px solid #1A1A1A';
                  return (
                    <div
                      key={i}
                      title={`${d.date.toLocaleDateString('pt-BR')}: ${d.treinos} treino${d.treinos !== 1 ? 's' : ''}, ${d.mins}min`}
                      style={{ aspectRatio: '1', background: bg, border, borderRadius: '2px' }}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.55rem', color: '#444' }}>Menos</p>
                {['#111', '#4A0000', '#880000', '#CC0000'].map((c, i) => (
                  <div key={i} style={{ width: '10px', height: '10px', background: c, border: '1px solid #1A1A1A', borderRadius: '2px' }} />
                ))}
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.55rem', color: '#444' }}>Mais</p>
              </div>
            </div>

            {/* Distribuição por tipo de sessão */}
            {sessaoDistrib.length > 0 && (
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: '0.625rem' }}>TIPOS DE SESSÃO</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {sessaoDistrib.map(s => {
                    const pct = Math.round((s.qtd / trainings.length) * 100);
                    return (
                      <div key={s.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span style={{ fontSize: '0.875rem' }}>{s.icon}</span>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#CCC', textTransform: 'uppercase' }}>{s.label}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: s.color }}>{s.qtd}x</p>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#444' }}>{pct}%</p>
                          </div>
                        </div>
                        <div style={{ background: '#0D0D0D', height: '4px' }}>
                          <div style={{ background: s.color, height: '4px', width: `${pct}%`, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gi vs No-Gi + Intensidade média + Satisfação média */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Gi vs No-Gi */}
              {(giCount > 0 || nogiCount > 0) && (
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: '0.5rem' }}>MODALIDADE</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[
                      { label: 'GI', count: giCount, color: '#1A6ECC' },
                      { label: 'NO-GI', count: nogiCount, color: '#7C1ACC' },
                    ].map(m => (
                      <div key={m.label} style={{ flex: 1, background: '#0D0D0D', border: `1px solid ${m.color}33`, padding: '0.625rem', textAlign: 'center' }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: m.color, lineHeight: 1 }}>{m.count}</p>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', marginTop: '0.125rem' }}>{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Intensidade média */}
              {avgIntensity > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>INTENSIDADE MÉDIA</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#CC0000' }}>{avgIntensity.toFixed(1)}/5</p>
                  </div>
                  <div style={{ background: '#0D0D0D', height: '6px', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(90deg, #880000, #CC0000)', height: '6px', width: `${(avgIntensity / 5) * 100}%`, transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.55rem', color: '#333' }}>Leve</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.55rem', color: '#333' }}>Máximo</p>
                  </div>
                </div>
              )}

              {/* Satisfação média */}
              {avgSatisfaction > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>SATISFAÇÃO MÉDIA</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#0D9E6E' }}>{avgSatisfaction.toFixed(1)}/5</p>
                  </div>
                  <div style={{ background: '#0D0D0D', height: '6px', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(90deg, #0A4A2A, #0D9E6E)', height: '6px', width: `${(avgSatisfaction / 5) * 100}%`, transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.55rem', color: '#333' }}>Ruim</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.55rem', color: '#333' }}>Excelente</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── META SEMANAL ── */}
            <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>META SEMANAL</p>
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#333', marginTop: '0.125rem' }}>Seg — Dom</p>
                </div>
                {!editingGoal ? (
                  <button
                    onClick={() => { setGoalDraft(weeklyGoal); setEditingGoal(true); }}
                    style={{ background: 'none', border: '1px solid #2A2A2A', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.3rem 0.625rem', cursor: 'pointer', letterSpacing: '0.05em' }}
                  >ALTERAR META</button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <button onClick={() => setGoalDraft(g => Math.max(1, g - 1))} style={{ width: '28px', height: '28px', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#CC0000', minWidth: '1.5rem', textAlign: 'center' }}>{goalDraft}</span>
                    <button onClick={() => setGoalDraft(g => Math.min(7, g + 1))} style={{ width: '28px', height: '28px', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    <button onClick={() => saveGoal(goalDraft)} style={{ background: '#CC0000', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.3rem 0.625rem', cursor: 'pointer' }}>OK</button>
                    <button onClick={() => setEditingGoal(false)} style={{ background: 'none', border: '1px solid #2A2A2A', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.3rem 0.5rem', cursor: 'pointer' }}>X</button>
                  </div>
                )}
              </div>
              {/* Bolinhas de dias */}
              <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.625rem' }}>
                {Array.from({ length: weeklyGoal }).map((_, i) => {
                  const done = i < treinsWeek;
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: '36px',
                        background: done ? '#CC0000' : '#0D0D0D',
                        border: `1px solid ${done ? '#CC0000' : '#1A1A1A'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s',
                      }}
                    >
                      {done && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Texto de progresso */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: treinsWeek >= weeklyGoal ? '#0D9E6E' : '#888' }}>
                  {treinsWeek >= weeklyGoal ? '✓ META ATINGIDA!' : `${treinsWeek} de ${weeklyGoal} treinos`}
                </p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#444' }}>
                  {Math.max(0, weeklyGoal - treinsWeek)} restante{weeklyGoal - treinsWeek !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* ── COMPARATIVO MENSAL (6 MESES) ── */}
            <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '1rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: '0.75rem' }}>TREINOS POR MÊS — ÚCTIMOS 6 MESES</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.375rem', height: '80px' }}>
                {monthlyData.map((m, i) => {
                  const heightPct = maxMonthly > 0 ? (m.count / maxMonthly) * 100 : 0;
                  const isMax = m.count === maxMonthly && m.count > 0;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', height: '100%', justifyContent: 'flex-end' }}>
                      {m.count > 0 && (
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.6rem', color: m.isCurrent ? '#CC0000' : isMax ? '#FFD700' : '#555' }}>{m.count}</p>
                      )}
                      <div
                        style={{
                          width: '100%',
                          height: m.count === 0 ? '4px' : `${Math.max(heightPct, 8)}%`,
                          background: m.isCurrent ? '#CC0000' : isMax ? '#FFD700' : '#2A2A2A',
                          border: m.isCurrent ? '1px solid #CC0000' : isMax ? '1px solid #FFD700' : '1px solid #1A1A1A',
                          transition: 'height 0.4s ease',
                          opacity: m.count === 0 ? 0.3 : 1,
                        }}
                      />
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: m.isCurrent ? '#CC0000' : '#444', textTransform: 'uppercase', marginTop: '0.125rem' }}>{m.label}</p>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '0.875rem', marginTop: '0.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '8px', height: '8px', background: '#CC0000' }} />
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.55rem', color: '#444' }}>Mês atual</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '8px', height: '8px', background: '#FFD700' }} />
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.55rem', color: '#444' }}>Melhor mês</p>
                </div>
              </div>
            </div>

            {/* ── ÚCTIMOS TREINOS ── */}
            {trainings.length > 0 && (
              <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '1rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: '0.75rem' }}>
                  ⏱ ÚCTIMOS TREINOS
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {trainings.slice(0, 5).map((t, i) => {
                    const dateObj = parseTrainingDate(t);
                    const dateStr = dateObj
                      ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()
                      : '—';
                    const SESSION_MAP: Record<string, { label: string; color: string; icon: string }> = {
                      aula_coletiva:   { label: 'Aula Coletiva',   color: '#1A6ECC', icon: '🥋' },
                      aula_particular: { label: 'Aula Particular', color: '#7C1ACC', icon: '🎯' },
                      treino_livre:    { label: 'Treino Livre',    color: '#CC4400', icon: '🥊' },
                      competicao:      { label: 'Competição',      color: '#CC8800', icon: '🏆' },
                      seminario:       { label: 'Seminário',       color: '#0D9E6E', icon: '📚' },
                    };
                    const sess = SESSION_MAP[t.sessionType || ''] || { label: 'Treino', color: '#555', icon: '🥋' };
                    const modLabel = t.modality === 'gi' ? 'Gi' : t.modality === 'nogi' ? 'No-Gi' : null;
                    return (
                      <div
                        key={t.firestoreId || i}
                        style={{
                          background: '#0D0D0D',
                          border: '1px solid #1A1A1A',
                          padding: '0.625rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        {/* Ícone do tipo */}
                        <div style={{ width: '32px', height: '32px', background: sess.color + '18', border: `1px solid ${sess.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>
                          {sess.icon}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#CCC', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sess.label}</p>
                            {modLabel && (
                              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: t.modality === 'gi' ? '#1A6ECC' : '#7C1ACC', background: (t.modality === 'gi' ? '#1A6ECC' : '#7C1ACC') + '18', padding: '0.1rem 0.3rem', flexShrink: 0 }}>{modLabel}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
                            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#444' }}>{dateStr}</p>
                            {t.duration > 0 && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#444' }}>· {t.duration}min</p>}
                            {t.academy && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {t.academy}</p>}
                          </div>
                        </div>
                        {/* XP */}
                        {t.xp && t.xp > 0 && (
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#CC0000', flexShrink: 0 }}>+{t.xp} XP</p>
                        )}
                        {/* Intensidade */}
                        {t.intensity && t.intensity > 0 && (
                          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                            {[1,2,3,4,5].map(n => (
                              <div key={n} style={{ width: '4px', height: '12px', background: n <= t.intensity! ? '#CC0000' : '#1A1A1A' }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Botões de ação */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.625rem' }}>
                  <button
                    onClick={() => setShowHistory(true)}
                    style={{ flex: 1, background: '#111', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.625rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    VER HISTÓRICO COMPLETO {trainings.length > 5 ? `(+${trainings.length - 5})` : ''}
                  </button>
                  <button
                    onClick={() => setShowShareCard(true)}
                    style={{ background: '#1A0000', border: '1px solid #CC000044', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.625rem 0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    STATS
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Seção exclusiva do Professor */}
        {profile?.role === 'professor' && (
          <div style={{ background: '#001A33', border: '1px solid #1A6ECC', padding: '1rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1A6ECC', marginBottom: '1rem' }}>🏫 IDENTIDADE DA ACADEMIA</p>

            {/* Logomarca */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '0.5rem' }}>LOGOMARCA</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: '64px', height: '64px', background: '#0A0A0A', border: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {(profile as any)?.academyLogo
                    ? <img src={(profile as any).academyLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <span style={{ fontSize: '1.5rem' }}>🏫</span>}
                </div>
                <label style={{ flex: 1, background: uploadingLogo ? '#0A1A2A' : '#001A33', border: '1px dashed #1A6ECC', color: '#1A6ECC', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.75rem', cursor: uploadingLogo ? 'not-allowed' : 'pointer', textAlign: 'center', display: 'block' }}>
                  {uploadingLogo ? 'ENVIANDO...' : 'ALTERAR LOGOMARCA'}
                  <input type="file" accept="image/*" onChange={handleUploadLogo} style={{ display: 'none' }} disabled={uploadingLogo} />
                </label>
              </div>
            </div>

            {/* Foto do professor */}
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '0.5rem' }}>FOTO DO PROFESSOR</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#0A0A0A', border: '2px solid #1A6ECC', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {profile?.photo
                    ? <img src={profile.photo} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '1.5rem' }}>👤</span>}
                </div>
                <label style={{ flex: 1, background: uploadingPhoto ? '#0A1A2A' : '#001A33', border: '1px dashed #1A6ECC', color: '#1A6ECC', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.75rem', cursor: uploadingPhoto ? 'not-allowed' : 'pointer', textAlign: 'center', display: 'block' }}>
                  {uploadingPhoto ? 'ENVIANDO...' : 'ALTERAR FOTO'}
                  <input type="file" accept="image/*" onChange={handleUploadProfessorPhoto} style={{ display: 'none' }} disabled={uploadingPhoto} />
                </label>
              </div>
            </div>

            {/* Dados da academia */}
            {profile?.academy && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #0A2A4A' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: '0.5rem' }}>ACADEMIA CADASTRADA</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFFFFF' }}>{profile.academy}</p>
                {(profile as any)?.academyCity && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>{(profile as any).academyCity}{(profile as any)?.academyState ? ` · ${(profile as any).academyState}` : ''}</p>}
              </div>
            )}

            {/* Configurações EmailJS */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #0A2A4A' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FF8C00', marginBottom: '0.25rem' }}>📧 AVISOS AUTOMÁTICOS POR E-MAIL</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#666', marginBottom: '0.875rem', lineHeight: 1.5 }}>
                Configure o EmailJS para enviar avisos de vencimento, atraso e suspensão automaticamente.
                Crie uma conta gratuita em <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer" style={{ color: '#FF8C00' }}>emailjs.com</a> (até 200 e-mails/mês grátis).
              </p>
              {[
                { key: 'serviceId',       label: 'SERVICE ID',            placeholder: 'service_xxxxxxx' },
                { key: 'publicKey',       label: 'PUBLIC KEY',            placeholder: 'xxxxxxxxxxxxxxxxxxxx' },
                { key: 'templateDue',     label: 'TEMPLATE — VENCIMENTO', placeholder: 'template_xxxxxxx' },
                { key: 'templateOverdue', label: 'TEMPLATE — ATRASO',     placeholder: 'template_xxxxxxx' },
                { key: 'templateSuspend', label: 'TEMPLATE — SUSPENSÃO',  placeholder: 'template_xxxxxxx' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: '0.625rem' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '0.25rem' }}>{field.label}</p>
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={(emailConfigDraft as any)[field.key] || ''}
                    onChange={e => setEmailConfigDraft((prev: any) => ({ ...prev, [field.key]: e.target.value }))}
                    style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div style={{ marginBottom: '0.625rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '0.25rem' }}>DIAS DE ANTECEDÊNCIA</p>
                <select
                  value={emailConfigDraft.daysBeforeDue || 3}
                  onChange={e => setEmailConfigDraft((prev: any) => ({ ...prev, daysBeforeDue: Number(e.target.value) }))}
                  style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', padding: '0.5rem 0.625rem', outline: 'none' }}
                >
                  {[1,2,3,5,7].map(d => <option key={d} value={d}>{d} dia{d > 1 ? 's' : ''} antes do vencimento</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '0.875rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '0.25rem' }}>MENSAGEM PERSONALIZADA (opcional)</p>
                <textarea
                  placeholder="Ex: Olá {{student_name}}, sua mensalidade vence em {{days_until_due}} dias..."
                  value={emailConfigDraft.customMessage || ''}
                  onChange={e => setEmailConfigDraft((prev: any) => ({ ...prev, customMessage: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', padding: '0.5rem 0.625rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#555', marginTop: '0.25rem', lineHeight: 1.4 }}>
                  Variáveis: {'{{student_name}}'} {'{{due_date}}'} {'{{amount}}'} {'{{days_until_due}}'} {'{{professor_name}}'} {'{{academy_name}}'} {'{{pix_link}}'}
                </p>
              </div>
              <button
                onClick={handleSaveEmailConfig}
                disabled={savingEmailConfig}
                style={{ width: '100%', background: savingEmailConfig ? '#1A0F00' : '#FF8C00', border: 'none', color: '#000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.75rem', cursor: savingEmailConfig ? 'not-allowed' : 'pointer', opacity: savingEmailConfig ? 0.7 : 1 }}
              >
                {savingEmailConfig ? 'SALVANDO...' : '💾 SALVAR CONFIGURAÇÕES DE E-MAIL'}
              </button>
            </div>

            {/* Código de convite */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #0A2A4A' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: '0.5rem' }}>CÓDIGO DE CONVITE</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                Compartilhe este código com seus alunos para que eles se vinculem automaticamente à sua academia no cadastro.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ flex: 1, background: '#0A0A0A', border: '2px solid #1A6ECC', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#1A6ECC', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                    {user?.uid ? user.uid.substring(0, 6).toUpperCase() : '------'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const code = user?.uid ? user.uid.substring(0, 6).toUpperCase() : '';
                    navigator.clipboard.writeText(code).then(() => toast.success('Código copiado!')).catch(() => toast.error('Erro ao copiar'));
                  }}
                  style={{ background: '#1A6ECC', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.875rem 1rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  COPIAR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Histórico de promoções */}
        {promotions.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>🏅 HISTÓRICO DE PROMOÇÕES</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {promotions.map((p) => {
                const beltColors: Record<string, string> = { Branca: '#FFFFFF', Azul: '#1A6ECC', Roxa: '#7B2FBE', Marrom: '#8B4513', Preta: '#222' };
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: beltColors[p.newBelt] || '#CC0000', border: '2px solid #333', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#FFFFFF', textTransform: 'uppercase' }}>
                        Faixa {p.newBelt}{p.newStripes > 0 ? ` · ${p.newStripes}º grau` : ''}
                      </p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>{p.promotedAtStr}</p>
                    </div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: beltColors[p.previousBelt] || '#333', border: '1px solid #333', flexShrink: 0, opacity: 0.5 }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Histórico de Competições */}
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', margin: 0 }}>🏅 COMPETIÇÕES</p>
            <button
              onClick={() => setShowCompForm(v => !v)}
              style={{ background: showCompForm ? '#1A1A1A' : '#CC0000', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.35rem 0.75rem', cursor: 'pointer' }}
            >
              {showCompForm ? '✕ CANCELAR' : '+ ADICIONAR'}
            </button>
          </div>

          {/* Estatísticas de competições vindas dos treinos registrados (compData) */}
          {(() => {
            const compTrainings = trainings.filter(t => t.sessionType === 'competicao' && (t as any).compData);
            if (compTrainings.length === 0) return null;
            const gold = compTrainings.filter(t => (t as any).compData?.placement === '1º lugar').length;
            const silver = compTrainings.filter(t => (t as any).compData?.placement === '2º lugar').length;
            const bronze = compTrainings.filter(t => (t as any).compData?.placement === '3º lugar').length;
            const totalFights = compTrainings.reduce((s, t) => s + ((t as any).compData?.fights || 0), 0);
            return (
              <div style={{ marginBottom: '1rem' }}>
                {/* Resumo de medalhas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: '#0A0A0A', border: '1px solid #222', padding: '0.5rem', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#CC0000', margin: 0 }}>{compTrainings.length}</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', margin: 0 }}>TORNEIOS</p>
                  </div>
                  <div style={{ background: '#0A0A0A', border: '1px solid #222', padding: '0.5rem', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#FFD700', margin: 0 }}>🥇 {gold}</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', margin: 0 }}>OURO</p>
                  </div>
                  <div style={{ background: '#0A0A0A', border: '1px solid #222', padding: '0.5rem', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#C0C0C0', margin: 0 }}>🥈 {silver}</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', margin: 0 }}>PRATA</p>
                  </div>
                  <div style={{ background: '#0A0A0A', border: '1px solid #222', padding: '0.5rem', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#CD7F32', margin: 0 }}>🥉 {bronze}</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', margin: 0 }}>BRONZE</p>
                  </div>
                </div>
                {totalFights > 0 && (
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', margin: '0 0 0.5rem', letterSpacing: '0.05em' }}>
                    ⚔️ {totalFights} lutas registradas
                  </p>
                )}
                {/* Lista de treinos de competição */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {compTrainings.slice(0, 5).map((t, idx) => {
                    const cd = (t as any).compData;
                    const placementEmoji = cd.placement === '1º lugar' ? '🥇' : cd.placement === '2º lugar' ? '🥈' : cd.placement === '3º lugar' ? '🥉' : '🏆';
                    const placementColor = cd.placement === '1º lugar' ? '#FFD700' : cd.placement === '2º lugar' ? '#C0C0C0' : cd.placement === '3º lugar' ? '#CD7F32' : '#888';
                    return (
                      <div key={idx} style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', borderLeft: `3px solid ${placementColor}`, paddingLeft: '0.625rem', background: '#0A0A0A', padding: '0.5rem 0.625rem' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{placementEmoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', color: '#FFFFFF', textTransform: 'uppercase', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cd.tournament || 'Competição'}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#666', margin: '0.1rem 0 0' }}>
                            {[cd.weightCategory, cd.ageCategory, cd.city].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', flexShrink: 0 }}>{t.trainingDate}</span>
                      </div>
                    );
                  })}
                  {compTrainings.length > 5 && (
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#444', textAlign: 'center' }}>+ {compTrainings.length - 5} competições anteriores</p>
                  )}
                </div>
                <div style={{ borderTop: '1px solid #222', marginBottom: '0.75rem' }} />
              </div>
            );
          })()}

          {/* Formulário de nova competição */}
          {showCompForm && (
            <div style={{ background: '#0A0A0A', border: '1px solid #222', padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem' }}>NOME DO CAMPEONATO *</label>
                  <input
                    value={compForm.name || ''}
                    onChange={e => setCompForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Copa SP de Jiu-Jitsu"
                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem' }}>DATA *</label>
                  <input
                    type="date"
                    value={compForm.date || ''}
                    onChange={e => setCompForm(f => ({ ...f, date: e.target.value }))}
                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem' }}>LOCAL</label>
                  <input
                    value={compForm.location || ''}
                    onChange={e => setCompForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Cidade / Estado"
                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem' }}>CATEGORIA</label>
                  <input
                    value={compForm.category || ''}
                    onChange={e => setCompForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="Ex: Adulto Faixa Azul"
                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem' }}>PESO</label>
                  <input
                    value={compForm.weightClass || ''}
                    onChange={e => setCompForm(f => ({ ...f, weightClass: e.target.value }))}
                    placeholder="Ex: Leve / -76kg"
                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem' }}>RESULTADO</label>
                  <select
                    value={compForm.result || 'gold'}
                    onChange={e => setCompForm(f => ({ ...f, result: e.target.value as Competition['result'] }))}
                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem', boxSizing: 'border-box' }}
                  >
                    {COMP_RESULTS.map(r => (
                      <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem' }}>OBSERVAÇÕES</label>
                  <textarea
                    value={compForm.notes || ''}
                    onChange={e => setCompForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Detalhes, adversários, aprendizados..."
                    rows={2}
                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>
              </div>
              <button
                onClick={handleSaveCompetition}
                disabled={savingComp || !compForm.name || !compForm.date}
                style={{ background: savingComp || !compForm.name || !compForm.date ? '#1A1A1A' : '#CC0000', border: 'none', color: savingComp || !compForm.name || !compForm.date ? '#555' : '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.75rem', cursor: savingComp || !compForm.name || !compForm.date ? 'not-allowed' : 'pointer', width: '100%' }}
              >
                {savingComp ? 'SALVANDO...' : '✓ SALVAR COMPETIÇÃO'}
              </button>
            </div>
          )}

          {/* Lista de competições */}
          {competitions.length === 0 && !showCompForm ? (
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444', textAlign: 'center', padding: '1rem 0' }}>Nenhuma competição registrada ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {competitions.map(c => {
                const res = COMP_RESULTS.find(r => r.value === c.result) || COMP_RESULTS[4];
                const dateStr = c.date ? new Date(c.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                return (
                  <div key={c.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', borderLeft: `3px solid ${res.color}`, paddingLeft: '0.75rem' }}>
                    <div style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0, marginTop: '0.1rem' }}>{res.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#FFFFFF', textTransform: 'uppercase', margin: 0, lineHeight: 1.2 }}>{c.name}</p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: res.color, margin: '0.15rem 0 0', fontWeight: 700, textTransform: 'uppercase' }}>{res.label}</p>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {dateStr && <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>📅 {dateStr}</span>}
                        {c.location && <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>📍 {c.location}</span>}
                        {c.category && <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>🥋 {c.category}</span>}
                        {c.weightClass && <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>⚖️ {c.weightClass}</span>}
                      </div>
                      {c.notes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#444', margin: '0.25rem 0 0', fontStyle: 'italic' }}>{c.notes}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteCompetition(c.id)}
                      style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '0.25rem', flexShrink: 0, fontSize: '0.9rem', lineHeight: 1 }}
                      title="Remover"
                    >✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Profile info */}
        {(profile?.bjjSince || profile?.weightKg || profile?.heightCm || profile?.professor) && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '0.75rem' }}>📋 INFORMAÇÕES</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {profile?.professor && <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' }}>PROFESSOR</p><p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#CCC' }}>{profile.professor}</p></div>}
              {profile?.bjjSince && <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' }}>BJJ DESDE</p><p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#CCC' }}>{profile.bjjSince}</p></div>}
              {profile?.weightKg && <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' }}>PESO</p><p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#CCC' }}>{profile.weightKg} kg</p></div>}
              {profile?.heightCm && <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' }}>ALTURA</p><p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#CCC' }}>{profile.heightCm} cm</p></div>}
            </div>
          </div>
        )}

        {/* Minhas Mensalidades — só para alunos vinculados */}
        {profile?.academyId && profile?.role !== 'professor' && (
          <MensalidadesCard onOpen={() => setShowMensalidades(true)} userUid={user?.uid || ''} />
        )}
        {/* Desvincular academia — só para alunos vinculados */}
        {profile?.academyId && profile?.role !== 'professor' && (
          <div style={{ padding: '0.5rem 0' }}>
            <button
              onClick={handleUnlinkAcademy}
              disabled={unlinking}
              style={{
                width: '100%',
                background: 'none',
                border: '1px solid #1A2A3A',
                color: '#4A8AB5',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '0.875rem',
                cursor: unlinking ? 'not-allowed' : 'pointer',
                opacity: unlinking ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                <line x1="4" y1="4" x2="20" y2="20"/>
              </svg>
              {unlinking ? 'DESVINCULANDO...' : 'DESVINCULAR ACADEMIA'}
            </button>
          </div>
        )}

        {/* Logout */}
        <div style={{ padding: '0.5rem 0', borderTop: '1px solid #1A1A1A', marginTop: '0.5rem' }}>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              width: '100%',
              background: 'none',
              border: '1px solid #2A0000',
              color: '#CC0000',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700,
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0.875rem',
              cursor: loggingOut ? 'not-allowed' : 'pointer',
              opacity: loggingOut ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {loggingOut ? 'SAINDO...' : 'SAIR DA CONTA'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── MensalidadesCard ─────────────────────────────────────────────────────────
// Card no perfil do aluno com resumo de cobranças pendentes e acesso rápido
interface MensalidadesCardProps { onOpen: () => void; userUid: string; }
function MensalidadesCard({ onOpen, userUid }: MensalidadesCardProps) {
  const [summary, setSummary] = useState<{ pending: number; overdue: number; nextDue: string | null; pixKey: string | null } | null>(null);

  useEffect(() => {
    if (!userUid) return;
    const load = async () => {
      try {
        const qPay = query(
          collection(db, 'payments'),
          where('studentUid', '==', userUid),
          where('status', 'in', ['pending', 'overdue'])
        );
        const snap = await getDocs(qPay);
        const now = new Date();
        let pending = 0, overdue = 0, nextDue: string | null = null, pixKey: string | null = null;
        snap.docs.forEach(d => {
          const p = d.data() as any;
          const due = p.dueDate ? new Date(p.dueDate + 'T00:00:00') : null;
          if (due && due < now) { overdue += p.amount || 0; }
          else { pending += p.amount || 0; }
          if (!nextDue && p.dueDate) { nextDue = p.dueDate; pixKey = p.pixKey || null; }
        });
        setSummary({ pending, overdue, nextDue, pixKey });
      } catch { /* silencioso */ }
    };
    load();
  }, [userUid]);

  const hasAlert = summary && (summary.overdue > 0 || summary.pending > 0);

  return (
    <div style={{ padding: '0.25rem 0' }}>
      {/* Atalho secundário — financeiro principal está na aba ACADEMIA > 💳 FINANCEIRO */}
      <button
        onClick={onOpen}
        style={{
          width: '100%',
          background: 'transparent',
          border: `1px solid ${hasAlert ? (summary!.overdue > 0 ? '#4A0000' : '#1A3A1A') : '#1C1C1C'}`,
          color: '#FFFFFF',
          fontFamily: 'Barlow Condensed, sans-serif',
          padding: '0.5rem 0.875rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          textAlign: 'left',
          opacity: 0.8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={hasAlert ? (summary!.overdue > 0 ? '#CC0000' : '#4CAF50') : '#555'} strokeWidth="2.5">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: hasAlert ? (summary!.overdue > 0 ? '#CC0000' : '#4CAF50') : '#555', margin: 0 }}>
              MENSALIDADES
              <span style={{ fontWeight: 400, fontSize: '0.58rem', color: '#3A3A3A', marginLeft: '0.35rem', textTransform: 'none', letterSpacing: 0 }}>· atalho</span>
            </p>
            {summary && hasAlert && (
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.62rem', color: '#666', margin: '0.08rem 0 0' }}>
                {summary.overdue > 0
                  ? `⚠️ R$ ${summary.overdue.toFixed(2)} em atraso`
                  : `R$ ${summary.pending.toFixed(2)} pendente${summary.nextDue ? ` · vence ${new Date(summary.nextDue + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}`
                }
              </p>
            )}
            {summary && !hasAlert && (
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.62rem', color: '#3A7A3A', margin: '0.08rem 0 0' }}>✓ Em dia</p>
            )}
          </div>
        </div>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
  );
}
