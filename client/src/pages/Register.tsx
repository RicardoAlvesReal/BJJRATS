// BJJRats PWA — Register Screen
// Design: "Cage Fighter" — Brutalismo Tático
// Fluxo Aluno:     1 (acesso) → 2 (tipo) → 3 (perfil atleta) → cadastro
// Fluxo Professor: 1 (acesso) → 2 (tipo) → 3 (perfil atleta) → 4 (academia) → 5 (logo/foto) → cadastro + upload

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import api from '@/lib/api';

const LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663343500922/eZPracQhphsa87KDbjhHAd/bjjrats-logo-hero-mmgzpqY4ZnMgeAjjykaT4c.webp';

const BELTS = [
  { value: 'Branca', label: 'Branca', color: '#FFFFFF' },
  { value: 'Azul', label: 'Azul', color: '#1E40AF' },
  { value: 'Roxa', label: 'Roxa', color: '#7C3AED' },
  { value: 'Marrom', label: 'Marrom', color: '#92400E' },
  { value: 'Preta', label: 'Preta', color: '#111111' },
];

type Role = 'student' | 'professor' | 'admin' | null;

// Aluno: 1,2,3 | Professor/Academia: 1,2,3,4,5
const TOTAL_STEPS: Record<string, number> = { student: 3, professor: 5, admin: 5 };

const STEP_LABELS: Record<number, Record<string, string>> = {
  1: { student: 'DADOS DE ACESSO', professor: 'DADOS DE ACESSO', admin: 'DADOS DE ACESSO' },
  2: { student: 'TIPO DE PERFIL', professor: 'TIPO DE PERFIL', admin: 'TIPO DE PERFIL' },
  3: { student: 'PERFIL DE LUTADOR', professor: 'PERFIL DE LUTADOR', admin: 'PERFIL DE LUTADOR' },
  4: { professor: 'DADOS DA ACADEMIA', admin: 'DADOS DA ACADEMIA' },
  5: { professor: 'IDENTIDADE VISUAL', admin: 'IDENTIDADE VISUAL' },
};

export default function Register() {
  const { register, updateProfileData } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(false);

  // Upload refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    // Passo 1
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Passo 3 — perfil atleta (compartilhado)
    belt: 'Branca',
    stripes: 0,
    academy: '',
    professor: '',
    dob: '',
    sex: '',
    weightKg: '',
    heightCm: '',
    bjjSince: '',
    inviteCode: '',
    // Passo 4 — academia (professor)
    academyName: '',
    academyAddress: '',
    academyCity: '',
    academyState: '',
  });

  // Estado para o professor encontrado pelo código de convite
  const [inviteProfessor, setInviteProfessor] = useState<{ uid: string; name: string; academyName: string } | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  // Busca de academias no cadastro
  const [academyResults, setAcademyResults] = useState<{ name: string; professor: string; uid: string }[]>([]);
  const [academyDropOpen, setAcademyDropOpen] = useState(false);
  const [searchingAcademy, setSearchingAcademy] = useState(false);
  // Busca de professores no cadastro
  const [professorResults, setProfessorResults] = useState<{ uid: string; name: string; academyName: string }[]>([]);
  const [professorDropOpen, setProfessorDropOpen] = useState(false);
  const [searchingProfessor, setSearchingProfessor] = useState(false);

  const handleCheckInviteCode = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    update('inviteCode', trimmed);
    if (trimmed.length < 6) { setInviteProfessor(null); return; }
    setCheckingCode(true);
    try {
      const match = await api.public.checkInviteCode(trimmed);
      setInviteProfessor({ uid: match.uid, name: match.name, academyName: match.academyName || match.name });
    } catch { setInviteProfessor(null); }
    finally { setCheckingCode(false); }
  };

  const searchAcademiesRegister = async (term: string) => {
    update('academy', term);
    if (!term.trim() || term.length < 2) { setAcademyResults([]); setAcademyDropOpen(false); return; }
    setSearchingAcademy(true);
    setAcademyDropOpen(true);
    try {
      const professors = await api.public.searchProfessors(term);
      const results = professors.map((u: any) => ({
        uid: u.uid,
        name: u.academyName || u.name || '',
        professor: u.name || '',
      }));
      setAcademyResults(results);
    } catch { setAcademyResults([]); }
    finally { setSearchingAcademy(false); }
  };

  const searchProfessorsRegister = async (term: string) => {
    update('professor', term);
    if (!term.trim() || term.length < 2) { setProfessorResults([]); setProfessorDropOpen(false); return; }
    setSearchingProfessor(true);
    setProfessorDropOpen(true);
    try {
      const results = await api.public.searchProfessors(term);
      setProfessorResults(results.map((u: any) => ({ uid: u.uid, name: u.name || '', academyName: u.academyName || '' })));
    } catch { setProfessorResults([]); }
    finally { setSearchingProfessor(false); }
  };

  const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const totalSteps = role ? TOTAL_STEPS[role] : 3;
  const stepLabel = STEP_LABELS[step]?.[role ?? 'student'] ?? '';

  // ── Upload helper ──────────────────────────────────────────────────────────
  const uploadFile = async (file: File): Promise<string> => {
    return api.upload.file(file, 'perfil');
  };

  // ── Passo 1: Dados de acesso ───────────────────────────────────────────────
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Preencha todos os campos');
    if (form.password.length < 6) return toast.error('Senha deve ter no mínimo 6 caracteres');
    if (form.password !== form.confirmPassword) return toast.error('Senhas não conferem');
    setStep(2);
  };

  // ── Passo 2: Seleção de tipo ───────────────────────────────────────────────
  const handleStep2 = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep(3);
  };

  // ── Passo 3: Perfil atleta — avança ou finaliza (aluno) ───────────────────
  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.academy) return toast.error('Informe sua academia');

    if (role === 'professor' || role === 'admin') {
      setStep(4);
      return;
    }

    // Aluno — finaliza cadastro
    setLoading(true);
    try {
      // Se há código de convite válido, usa os dados da academia do professor
      const academyName = inviteProfessor ? inviteProfessor.academyName : form.academy;
      const professorName = inviteProfessor ? inviteProfessor.name : form.professor;
      const academyId = inviteProfessor ? inviteProfessor.uid : null;

      await register({
        email: form.email,
        password: form.password,
        name: form.name,
        belt: form.belt,
        academy: academyName,
        professor: professorName,
        dob: form.dob,
        sex: form.sex,
        weightKg: form.weightKg,
        heightCm: form.heightCm,
        bjjSince: form.bjjSince,
        role: 'student',
        academyId: academyId || undefined,
      });

      // Se vinculou via código, cria notificação para o professor
      if (inviteProfessor) {
        try {
          await api.notifications.create({
            toUid: inviteProfessor.uid,
            type: 'new_member',
            title: 'Novo membro',
            message: `${form.name} (${form.belt}) se vinculou à ${inviteProfessor.academyName}`,
            read: false,
          });
        } catch { /* silencioso */ }
        toast.success(`Vinculado à ${inviteProfessor.academyName}! Bem-vindo ao tatami, Rata! 🥋`);
      } else {
        toast.success('Bem-vindo ao tatami, Rata! 🥋');
      }
      navigate('/app');
    } catch (err: any) {
      toast.error(err.code === 'auth/email-already-in-use' ? 'Este email já está cadastrado' : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  // ── Passo 4: Dados da academia (professor) ────────────────────────────────
  const handleStep4 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.academyName) return toast.error('Informe o nome da academia');
    if (!form.academyCity) return toast.error('Informe a cidade');
    if (!form.academyState) return toast.error('Selecione o estado (UF)');
    setStep(5);
  };

  // ── Passo 5: Logo/foto + finaliza cadastro professor ──────────────────────
  const handleStep5 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Criar conta
      await register({
        email: form.email,
        password: form.password,
        name: form.name,
        belt: form.belt,
        academy: form.academyName,
        professor: '',
        dob: form.dob,
        sex: form.sex,
        weightKg: form.weightKg,
        heightCm: form.heightCm,
        bjjSince: form.bjjSince,
        role,
        academyName: form.academyName,
        academyAddress: form.academyAddress,
        academyCity: form.academyCity,
        academyState: form.academyState,
      });

      // 2. Agora autenticado — fazer upload das imagens
      let academyLogoUrl = '';
      let professorPhotoUrl = '';

      if (logoFile) {
        try {
          academyLogoUrl = await uploadFile(logoFile);
        } catch { /* upload opcional, não bloqueia */ }
      }
      if (photoFile) {
        try {
          professorPhotoUrl = await uploadFile(photoFile);
        } catch { /* upload opcional, não bloqueia */ }
      }

      // 3. Atualizar perfil com as URLs
      if (academyLogoUrl || professorPhotoUrl) {
        await updateProfileData({
          ...(academyLogoUrl && { academyLogoUrl }),
          ...(professorPhotoUrl && { professorPhotoUrl, photo: professorPhotoUrl }),
        });
      }

      const msg = role === 'admin' ? 'Academia cadastrada! Bem-vindo! 🏛️' : 'Academia cadastrada! Bem-vindo, Professor! 🏫';
      toast.success(msg);
      navigate('/app');
    } catch (err: any) {
      toast.error(err.code === 'auth/email-already-in-use' ? 'Este email já está cadastrado' : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1) navigate('/login');
    else setStep(s => s - 1);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bjj-app-wrapper min-h-screen flex flex-col">
      {/* Header */}
      <div style={{ background: '#0D0D0D', borderBottom: '2px solid #CC0000', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', color: '#CC0000', padding: '0.25rem', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <img src={LOGO} alt="BJJRats" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1 }}>
            CRIAR CONTA
          </h1>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            PASSO {step} DE {totalSteps} — {stepLabel}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: '#1A1A1A' }}>
        <div style={{ height: '100%', background: '#CC0000', width: `${(step / totalSteps) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>

      {/* ── PASSO 1: Dados de acesso ── */}
      {step === 1 && (
        <div className="flex-1 px-6 py-8">
          <form onSubmit={handleStep1} className="flex flex-col gap-5">
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1.1rem', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              DADOS DE ACESSO
            </p>
            <div>
              <label className="bjj-label">Nome completo</label>
              <input className="bjj-input" placeholder="Seu nome" value={form.name} onChange={e => update('name', e.target.value)} />
            </div>
            <div>
              <label className="bjj-label">Email</label>
              <input type="email" className="bjj-input" placeholder="seu@email.com" value={form.email} onChange={e => update('email', e.target.value)} />
            </div>
            <div>
              <label className="bjj-label">Senha</label>
              <input type="password" className="bjj-input" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => update('password', e.target.value)} />
            </div>
            <div>
              <label className="bjj-label">Confirmar senha</label>
              <input type="password" className="bjj-input" placeholder="Repita a senha" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
            </div>
            <button type="submit" className="bjj-btn-primary" style={{ marginTop: '0.5rem' }}>PRÓXIMO →</button>
          </form>
        </div>
      )}

      {/* ── PASSO 2: Seleção Aluno / Professor / Academia ── */}
      {step === 2 && (
        <div className="flex-1 px-6 py-8 flex flex-col gap-6">
          <div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1.1rem', textTransform: 'uppercase', color: '#888', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>VOCÊ É...</p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#555', lineHeight: 1.5 }}>
              Escolha seu perfil para personalizar sua experiência no BJJRats.
            </p>
          </div>

          {/* Card Aluno */}
          <button onClick={() => handleStep2('student')} style={{ background: '#111', border: '2px solid #CC0000', padding: '1.5rem', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '56px', height: '56px', background: '#1A0000', border: '2px solid #CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0 }}>🥋</div>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1 }}>ALUNO</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>R$ 19,90 / mês</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {['Registrar treinos e evoluir XP', 'Histórico completo e streak', 'Comunidade, conquistas e desafios'].map(item => (
                <p key={item} style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#CC0000', fontWeight: 700 }}>✓</span> {item}
                </p>
              ))}
            </div>
          </button>

          {/* Card Professor */}
          <button onClick={() => handleStep2('professor')} style={{ background: '#111', border: '2px solid #8B5CF6', padding: '1.5rem', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '56px', height: '56px', background: '#1A0033', border: '2px solid #8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0 }}>👨‍🏫</div>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1 }}>PROFESSOR</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>R$ 47,90 / mês</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {['Todas as funções de atleta', 'Alunos ilimitados', 'Matrículas, pagamentos e check-in', 'Promoções de faixa e agenda'].map(item => (
                <p key={item} style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#8B5CF6', fontWeight: 700 }}>✓</span> {item}
                </p>
              ))}
            </div>
          </button>

          {/* Card Academia */}
          <button onClick={() => handleStep2('admin')} style={{ background: '#111', border: '2px solid #CC0000', padding: '1.5rem', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '56px', height: '56px', background: '#1A0000', border: '2px solid #CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0 }}>🏛️</div>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1 }}>ACADEMIA</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>R$ 97,90 / mês</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {['Dashboard administrativo', 'Gestão de usuários e professores', 'CRM completo e relatórios', 'Múltiplos professores na equipe'].map(item => (
                <p key={item} style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#CC0000', fontWeight: 700 }}>✓</span> {item}
                </p>
              ))}
            </div>
          </button>
        </div>
      )}

      {/* ── PASSO 3: Perfil de Atleta (Aluno e Professor) ── */}
      {step === 3 && (
        <div className="flex-1 px-6 py-8">
          <form onSubmit={handleStep3} className="flex flex-col gap-5">
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1.1rem', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              PERFIL DE LUTADOR
            </p>

            {/* Belt selector */}
            <div>
              <label className="bjj-label">Faixa</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {BELTS.map(b => (
                  <button key={b.value} type="button" onClick={() => update('belt', b.value)}
                    style={{ padding: '0.5rem 1rem', border: `2px solid ${form.belt === b.value ? '#CC0000' : '#333'}`, background: form.belt === b.value ? '#1A0000' : '#111', color: form.belt === b.value ? '#FFF' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.375rem', transition: 'all 0.15s' }}>
                    <span style={{ display: 'inline-block', width: '16px', height: '6px', background: b.color, border: b.value === 'Branca' ? '1px solid #333' : 'none' }} />
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stripes */}
            <div>
              <label className="bjj-label">Graus ({form.stripes})</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {[0, 1, 2, 3, 4].map(n => (
                  <button key={n} type="button" onClick={() => update('stripes', n)}
                    style={{ width: '44px', height: '44px', border: `2px solid ${form.stripes === n ? '#CC0000' : '#333'}`, background: form.stripes === n ? '#CC0000' : '#111', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', transition: 'all 0.15s', cursor: 'pointer' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <label className="bjj-label">Academia {role === 'professor' || role === 'admin' ? '(onde você treina)' : ''}</label>
              <input
                className="bjj-input"
                placeholder={role === 'student' ? 'Buscar academia cadastrada...' : 'Nome da sua academia'}
                value={form.academy}
                onChange={e => role === 'student' ? searchAcademiesRegister(e.target.value) : update('academy', e.target.value)}
                onFocus={() => role === 'student' && form.academy.length >= 2 && setAcademyDropOpen(true)}
                onBlur={() => setTimeout(() => setAcademyDropOpen(false), 200)}
                autoComplete="off"
              />
              {role === 'student' && searchingAcademy && (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>Buscando academias...</p>
              )}
              {role === 'student' && academyDropOpen && academyResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid #333', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                  {academyResults.map((acad, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => {
                        update('academy', acad.name);
                        setAcademyDropOpen(false);
                        setAcademyResults([]);
                      }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid #1E1E1E', padding: '0.75rem 1rem', cursor: 'pointer', color: '#FFF' }}
                    >
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#FFF', margin: 0 }}>{acad.name}</p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#888', margin: 0 }}>Prof. {acad.professor}</p>
                    </button>
                  ))}
                </div>
              )}
              {role === 'student' && academyDropOpen && academyResults.length === 0 && form.academy.length >= 2 && !searchingAcademy && (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>Nenhuma academia encontrada. Você pode digitar o nome manualmente.</p>
              )}
            </div>

            {role === 'student' && (
              <div style={{ position: 'relative' }}>
                <label className="bjj-label">Professor (opcional)</label>
                <input
                  className="bjj-input"
                  placeholder="Buscar professor cadastrado..."
                  value={form.professor}
                  onChange={e => searchProfessorsRegister(e.target.value)}
                  onFocus={() => form.professor.length >= 2 && setProfessorDropOpen(true)}
                  onBlur={() => setTimeout(() => setProfessorDropOpen(false), 200)}
                  autoComplete="off"
                />
                {searchingProfessor && (
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>Buscando professores...</p>
                )}
                {professorDropOpen && professorResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid #333', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                    {professorResults.map((prof, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => {
                          update('professor', prof.name);
                          setProfessorDropOpen(false);
                          setProfessorResults([]);
                        }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid #1E1E1E', padding: '0.75rem 1rem', cursor: 'pointer', color: '#FFF' }}
                      >
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#FFF', margin: 0 }}>{prof.name}</p>
                        {prof.academyName && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#888', margin: 0 }}>{prof.academyName}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {professorDropOpen && professorResults.length === 0 && form.professor.length >= 2 && !searchingProfessor && (
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>Nenhum professor encontrado.</p>
                )}
              </div>
            )}

            {/* Código de convite — apenas para alunos */}
            {role === 'student' && (
              <div style={{ background: '#001A33', border: '1px solid #1A6ECC22', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1A6ECC' }}>
                  🔑 CÓDIGO DE CONVITE (OPCIONAL)
                </label>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', lineHeight: 1.5 }}>
                  Se seu professor te passou um código, insira aqui para se vincular automaticamente à academia.
                </p>
                <input
                  className="bjj-input"
                  placeholder="Ex: A1B2C3"
                  value={form.inviteCode}
                  onChange={e => handleCheckInviteCode(e.target.value)}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, fontSize: '1.1rem' }}
                />
                {checkingCode && (
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555' }}>Verificando código...</p>
                )}
                {!checkingCode && form.inviteCode.length === 6 && inviteProfessor && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem', background: '#001A33', border: '1px solid #1A6ECC' }}>
                    <span style={{ color: '#1A6ECC', fontSize: '1rem' }}>✓</span>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFF' }}>{inviteProfessor.academyName}</p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888' }}>Prof. {inviteProfessor.name}</p>
                    </div>
                  </div>
                )}
                {!checkingCode && form.inviteCode.length === 6 && !inviteProfessor && (
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#CC0000' }}>Código inválido. Verifique com seu professor.</p>
                )}
              </div>
            )}

            {/* Dados pessoais opcionais */}
            <div style={{ borderTop: '1px solid #1E1E1E', paddingTop: '1rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>DADOS PESSOAIS (OPCIONAL)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="bjj-label">Nascimento</label>
                  <input type="date" className="bjj-input" value={form.dob} onChange={e => update('dob', e.target.value)} style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="bjj-label">Sexo</label>
                  <select className="bjj-input" value={form.sex} onChange={e => update('sex', e.target.value)}>
                    <option value="">—</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="bjj-label">Peso (kg)</label>
                  <input type="number" className="bjj-input" placeholder="70" value={form.weightKg} onChange={e => update('weightKg', e.target.value)} />
                </div>
                <div>
                  <label className="bjj-label">Altura (cm)</label>
                  <input type="number" className="bjj-input" placeholder="175" value={form.heightCm} onChange={e => update('heightCm', e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label className="bjj-label">Pratica BJJ desde</label>
                <input type="date" className="bjj-input" value={form.bjjSince} onChange={e => update('bjjSince', e.target.value)} style={{ colorScheme: 'dark' }} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ background: role === 'professor' || role === 'admin' ? '#CC0000' : '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '0.5rem' }}>
              {loading ? 'CRIANDO CONTA...' : role === 'professor' || role === 'admin' ? 'PRÓXIMO →' : 'ENTRAR NO TATAMI 🥋'}
            </button>
          </form>
        </div>
      )}

      {/* ── PASSO 4: Dados da Academia ── */}
      {step === 4 && (role === 'professor' || role === 'admin') && (
        <div className="flex-1 px-6 py-8">
          <form onSubmit={handleStep4} className="flex flex-col gap-5">
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1.1rem', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              DADOS DA ACADEMIA
            </p>
            <div>
              <label className="bjj-label">Nome da academia *</label>
              <input className="bjj-input" placeholder="Ex: Team Templo BJJ" value={form.academyName} onChange={e => update('academyName', e.target.value)} />
            </div>
            <div>
              <label className="bjj-label">Endereço</label>
              <input className="bjj-input" placeholder="Rua, número, bairro" value={form.academyAddress} onChange={e => update('academyAddress', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '0.75rem' }}>
              <div>
                <label className="bjj-label">Cidade *</label>
                <input className="bjj-input" placeholder="Sua cidade" value={form.academyCity} onChange={e => update('academyCity', e.target.value)} />
              </div>
              <div>
                <label className="bjj-label">UF *</label>
                <select className="bjj-input" value={form.academyState} onChange={e => update('academyState', e.target.value)}
                  style={{ cursor: 'pointer' }}>
                  <option value="">UF</option>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" style={{ background: '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1rem', border: 'none', cursor: 'pointer', marginTop: '0.5rem' }}>
              PRÓXIMO →
            </button>
          </form>
        </div>
      )}

      {/* ── PASSO 5: Logo + Foto ── */}
      {step === 5 && (role === 'professor' || role === 'admin') && (
        <div className="flex-1 px-6 py-8">
          <form onSubmit={handleStep5} className="flex flex-col gap-6">
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1.1rem', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              IDENTIDADE VISUAL
            </p>

            {/* Logomarca */}
            <div>
              <label className="bjj-label">Logomarca da academia (opcional)</label>
              <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); } }} />
              <div onClick={() => logoInputRef.current?.click()}
                style={{ marginTop: '0.5rem', border: '2px dashed #333', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', background: '#0D0D0D', minHeight: '120px' }}>
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
                  : <><span style={{ fontSize: '2rem' }}>🏷️</span><p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>CLIQUE PARA FAZER UPLOAD DA LOGOMARCA</p></>
                }
              </div>
              {logoPreview && <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }} style={{ background: 'none', border: 'none', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer', marginTop: '0.375rem' }}>REMOVER</button>}
            </div>

            {/* Foto do professor */}
            <div>
              <label className="bjj-label">Foto do professor (opcional)</label>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }} />
              <div onClick={() => photoInputRef.current?.click()}
                style={{ marginTop: '0.5rem', border: '2px dashed #333', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', background: '#0D0D0D', minHeight: '120px' }}>
                {photoPreview
                  ? <img src={photoPreview} alt="Foto" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%' }} />
                  : <><span style={{ fontSize: '2rem' }}>📷</span><p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>CLIQUE PARA FAZER UPLOAD DA SUA FOTO</p></>
                }
              </div>
              {photoPreview && <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} style={{ background: 'none', border: 'none', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer', marginTop: '0.375rem' }}>REMOVER</button>}
            </div>

              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#444', lineHeight: 1.5, textAlign: 'center' }}>
                Após criar sua conta, escolha um plano de assinatura para liberar todos os recursos.
              </p>

            <button type="submit" disabled={loading}
              style={{ background: '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'CRIANDO CONTA...' : 'CADASTRAR 🏛️'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
