// BJJRats PWA — Register Screen
// Design: "Cage Fighter" — Brutalismo Tático
// Fluxo Aluno:     1 (acesso) → 2 (tipo) → 3 (perfil atleta) → cadastro
// Fluxo Professor: 1 (acesso) → 2 (tipo) → 3 (perfil atleta) → 4 (academia) → 5 (logo/foto) → cadastro + upload

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import api from '@/lib/api';
import LegalModal from '@/components/LegalModal';
import { TermsContent, PrivacyContent } from '@/lib/legalContent';
import TurnstileWidget from '@/components/TurnstileWidget';
import { LocateFixed } from 'lucide-react';

const LOGO = '/favicon.png';

const BELTS = [
  { value: 'Branca', label: 'Branca', color: '#FFFFFF' },
  { value: 'Azul', label: 'Azul', color: '#1E40AF' },
  { value: 'Roxa', label: 'Roxa', color: '#7C3AED' },
  { value: 'Marrom', label: 'Marrom', color: '#92400E' },
  { value: 'Preta', label: 'Preta', color: '#111111' },
];

type Role = 'student' | 'professor' | 'academy' | null;

// Aluno: 1,2,3 | Professor/Academia: 1,2,3,4,5
const TOTAL_STEPS: Record<string, number> = { student: 3, professor: 5, academy: 5 };

const STEP_LABELS: Record<number, Record<string, string>> = {
  1: { student: 'DADOS DE ACESSO', professor: 'DADOS DE ACESSO', academy: 'DADOS DE ACESSO' },
  2: { student: 'TIPO DE PERFIL', professor: 'TIPO DE PERFIL', academy: 'TIPO DE PERFIL' },
  3: { student: 'PERFIL DE LUTADOR', professor: 'PERFIL DE LUTADOR', academy: 'PERFIL DE LUTADOR' },
  4: { professor: 'DADOS DA ACADEMIA', academy: 'DADOS DA ACADEMIA' },
  5: { professor: 'IDENTIDADE VISUAL', academy: 'IDENTIDADE VISUAL' },
};

function isValidEmail(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim());
}

function isValidWhatsApp(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export default function Register() {
  const { register, updateProfileData } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [locatingAcademy, setLocatingAcademy] = useState(false);

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
    phone: '',
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
    selectedAcademyUid: '',
    // Passo 4 — academia (professor)
    academyName: '',
    academyAddress: '',
    academyCity: '',
    academyState: '',
    academyLatitude: null as number | null,
    academyLongitude: null as number | null,
  });

  // Busca de academias no cadastro
  const [academyResults, setAcademyResults] = useState<{ name: string; professor: string; uid: string; logo?: string }[]>([]);
  const [academyDropOpen, setAcademyDropOpen] = useState(false);
  const [searchingAcademy, setSearchingAcademy] = useState(false);
  // Busca de professores no cadastro
  const [professorResults, setProfessorResults] = useState<{ uid: string; name: string; academyName: string }[]>([]);
  const [professorDropOpen, setProfessorDropOpen] = useState(false);
  const [searchingProfessor, setSearchingProfessor] = useState(false);

  const searchAcademiesRegister = async (term: string) => {
    update('academy', term);
    if (!term.trim()) {
      setAcademyResults([]);
      setAcademyDropOpen(false);
      return;
    }
    setSearchingAcademy(true);
    setAcademyDropOpen(true);
    try {
      const academies = await api.public.searchAcademies(term);
      const results = academies.map((u: any) => ({
        uid: u.uid,
        name: u.academyName || u.academy || u.name || '',
        professor: u.name || '',
        logo: u.academyLogoUrl || u.photo || '',
      }));
      setAcademyResults(results);
    } catch { setAcademyResults([]); }
    finally { setSearchingAcademy(false); }
  };

  const loadAllAcademies = async () => {
    setSearchingAcademy(true);
    setAcademyDropOpen(true);
    try {
      const academies = await api.public.searchAcademies('');
      const results = academies.map((u: any) => ({
        uid: u.uid,
        name: u.academyName || u.academy || u.name || '',
        professor: u.name || '',
        logo: u.academyLogoUrl || u.photo || '',
      }));
      setAcademyResults(results);
    } catch { setAcademyResults([]); }
    finally { setSearchingAcademy(false); }
  };

  const searchProfessorsRegister = async (term: string) => {
    update('professor', term);
    if (!term.trim()) { setProfessorResults([]); setProfessorDropOpen(false); return; }
    setSearchingProfessor(true);
    setProfessorDropOpen(true);
    try {
      const results = await api.public.searchProfessors(term);
      setProfessorResults(results.map((u: any) => ({ uid: u.uid, name: u.name || '', academyName: u.academyName || u.academy || '' })));
    } catch { setProfessorResults([]); }
    finally { setSearchingProfessor(false); }
  };

  const loadAllProfessors = async () => {
    setSearchingProfessor(true);
    setProfessorDropOpen(true);
    try {
      const results = await api.public.searchProfessors('');
      setProfessorResults(results.map((u: any) => ({ uid: u.uid, name: u.name || '', academyName: u.academyName || u.academy || '' })));
    } catch { setProfessorResults([]); }
    finally { setSearchingProfessor(false); }
  };

  const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const useAcademyGps = () => {
    if (!navigator.geolocation) {
      toast.error('GPS nao disponivel neste navegador');
      return;
    }

    setLocatingAcademy(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        update('academyLatitude', position.coords.latitude);
        update('academyLongitude', position.coords.longitude);
        setLocatingAcademy(false);
        toast.success('Localizacao GPS da academia registrada');
      },
      () => {
        setLocatingAcademy(false);
        toast.error('Nao foi possivel acessar sua localizacao');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const totalSteps = role ? TOTAL_STEPS[role] : 3;
  const stepLabel = STEP_LABELS[step]?.[role ?? 'student'] ?? '';

  // ── Upload helper ──────────────────────────────────────────────────────────
  const uploadFile = async (file: File): Promise<string> => {
    return api.upload.file(file, 'perfil');
  };

  // ── Passo 1: Dados de acesso ───────────────────────────────────────────────
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) return toast.error('Preencha nome, email, WhatsApp e senha');
    if (!isValidEmail(form.email)) return toast.error('Informe um email valido');
    if (!isValidWhatsApp(form.phone)) return toast.error('Informe um WhatsApp valido com DDD');
    if (form.password.length < 6) return toast.error('Senha deve ter no mínimo 6 caracteres');
    if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password))
      return toast.error('A senha deve conter letras e números');
    if (form.password !== form.confirmPassword) return toast.error('Senhas não conferem');
    if (!acceptPrivacy) return toast.error('Você precisa aceitar a Política de Privacidade');
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
    if (role === 'professor' || role === 'academy') {
      setStep(4);
      return;
    }

    // Aluno — finaliza cadastro
    setLoading(true);
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
        belt: form.belt,
        academy: form.academy,
        professor: form.professor,
        dob: form.dob,
        sex: form.sex,
        weightKg: form.weightKg,
        heightCm: form.heightCm,
        bjjSince: form.bjjSince,
        role: 'student',
        turnstileToken,
      });

      if (form.selectedAcademyUid) {
        try {
          await api.academyRequests.create({
            professorUid: form.selectedAcademyUid,
            academyName: form.academy,
            studentName: form.name,
            studentBelt: form.belt,
          });
          toast.success(`Solicitação enviada para ${form.academy}! Aguarde aprovação.`);
        } catch { /* silencioso */ }
      } else {
        const genero = form.sex === 'F' ? 'Rata' : 'Rato';
        const bemVindo = form.sex === 'F' ? 'Bem-vinda' : 'Bem-vindo';
        toast.success(`${bemVindo} ao tatami, ${genero}! 🥋`);
      }
      // Aluno novo → direto pra página de planos
      navigate('/pricing');
    } catch (err: any) {
      toast.error(err.status === 409 ? 'Este email já está cadastrado' : err.body?.error || 'Erro ao criar conta');
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
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
        belt: form.belt,
        academy: form.academyName,
        professor: '',
        dob: form.dob,
        sex: form.sex,
        weightKg: form.weightKg,
        heightCm: form.heightCm,
        bjjSince: form.bjjSince,
        role: role === 'academy' ? 'academy' : 'professor',
        turnstileToken,
        isAcademyAdmin: role === 'academy',
        academyName: form.academyName,
        academyAddress: form.academyAddress,
        academyCity: form.academyCity,
        academyState: form.academyState,
        academyLatitude: form.academyLatitude,
        academyLongitude: form.academyLongitude,
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

      const msg = role === 'academy' ? 'Academia cadastrada! Bem-vindo! 🏛️' : 'Academia cadastrada! Bem-vindo, Professor! 🏫';
      toast.success(msg);
      navigate('/pricing');
    } catch (err: any) {
      toast.error(err.status === 409 ? 'Este email já está cadastrado' : err.body?.error || 'Erro ao criar conta');
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
      <div style={{ background: '#0D0D0D', borderBottom: '2px solid #CC0000', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', color: '#CC0000', padding: '0.25rem', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <img src={LOGO} alt="BJJRats" style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1 }}>
            CRIAR CONTA
          </h1>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {stepLabel}
          </p>
        </div>
        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => {
            const isPast = s < step;
            const isCurrent = s === step;
            return (
              <button key={s} type="button" disabled={!isPast} onClick={() => setStep(s)}
                style={{ width: '26px', height: '26px', borderRadius: '50%', border: `2px solid ${isPast ? '#CC0000' : isCurrent ? '#CC0000' : '#333'}`, background: isCurrent ? '#CC0000' : 'transparent', color: isPast || isCurrent ? '#FFF' : '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', cursor: isPast ? 'pointer' : 'default', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}>
                {s}
              </button>
            );
          })}
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
              <label className="bjj-label">WhatsApp *</label>
              <input type="tel" inputMode="tel" autoComplete="tel" className="bjj-input" placeholder="(11) 99999-9999" value={form.phone} onChange={e => update('phone', e.target.value)} />
            </div>
            <div>
              <label className="bjj-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} className="bjj-input" placeholder="Letras, números e caracteres especiais" value={form.password} onChange={e => update('password', e.target.value)} style={{ paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0.25rem', lineHeight: 1 }}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {form.password.length > 0 && <PasswordStrength password={form.password} />}
            </div>
            <div>
              <label className="bjj-label">Confirmar senha</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} className="bjj-input" placeholder="Repita a senha" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} style={{ paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0.25rem', lineHeight: 1 }}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            {/* LGPD Consent */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="privacyConsent"
                checked={acceptPrivacy}
                onChange={e => setAcceptPrivacy(e.target.checked)}
                style={{ marginTop: '0.2rem', cursor: 'pointer', accentColor: '#CC0000', width: '16px', height: '16px', flexShrink: 0 }}
              />
              <label htmlFor="privacyConsent" style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', lineHeight: 1.4, cursor: 'pointer' }}>
                Li e aceito os{' '}
                <span onClick={() => setLegalModal('terms')} style={{ color: '#CC0000', textDecoration: 'underline', cursor: 'pointer' }}>Termos de Uso</span>
                {' '}e a{' '}
                <span onClick={() => setLegalModal('privacy')} style={{ color: '#CC0000', textDecoration: 'underline', cursor: 'pointer' }}>Política de Privacidade</span>.
              </label>
            </div>

            {(() => {
              const step1Valid = form.name.trim() && form.email.trim() && form.phone.trim() && form.password && form.confirmPassword && acceptPrivacy;
              return (
                <button type="submit" className="bjj-btn-primary"
                  disabled={!step1Valid}
                  style={{
                    marginTop: '0.5rem',
                    opacity: step1Valid ? 1 : 0.45,
                    cursor: step1Valid ? 'pointer' : 'not-allowed',
                    transition: 'opacity 0.2s ease',
                  }}
                >PRÓXIMO →</button>
              );
            })()}
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
          <button onClick={() => handleStep2('academy')} style={{ background: '#111', border: '2px solid #CC0000', padding: '1.5rem', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
          {/* Card do plano específico */}
          {role === 'student' && <PlanCard icon="🥋" name="Aluno" price="19,90" color="#3B82F6" features={['Registro de treinos', 'Histórico completo', 'Sequência (streak)', 'Comunidade', 'Conquistas', 'Competições', 'Metas e desafios']} />}
          {role === 'professor' && <PlanCard icon="👨‍🏫" name="Professor Particular" price="47,90" color="#8B5CF6" features={['Todas as funções de atleta', 'Alunos ilimitados', 'Matrículas e pagamentos', 'Promoções de faixa', 'Chamada (check-in)', 'Agenda de aulas', 'Atendimento exclusivo']} />}
          {role === 'academy' && <PlanCard icon="🏛️" name="Academia" price="97,90" color="#CC0000" features={['Dashboard administrativo', 'Gestão de usuários', 'CRM completo', 'Múltiplos professores', 'Relatórios', 'Analytics financeiro', 'Todos os recursos professores']} />}

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
              <label className="bjj-label">Academia {role === 'student' ? '(opcional)' : role === 'professor' || role === 'academy' ? '(onde você treina)' : ''}</label>
              <input
                className="bjj-input"
                placeholder={role === 'student' ? 'Buscar academia (opcional)...' : 'Nome da sua academia'}
                value={form.academy}
                onChange={e => role === 'student' ? searchAcademiesRegister(e.target.value) : update('academy', e.target.value)}
                onFocus={() => { if (role === 'student') { if (!form.academy.trim()) loadAllAcademies(); else if (form.academy.length >= 1) searchAcademiesRegister(form.academy); } }}
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
                        update('selectedAcademyUid', acad.uid);
                        setAcademyDropOpen(false);
                        setAcademyResults([]);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid #1E1E1E', padding: '0.75rem 1rem', cursor: 'pointer', color: '#FFF' }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#0A0A0A', border: '1px solid #2A2A2A', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {acad.logo ? (
                          <img src={acad.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '1rem' }}>🏫</span>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#FFF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acad.name}</p>
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#888', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Prof. {acad.professor}</p>
                      </div>
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
                  placeholder="Buscar professor (opcional)..."
                  value={form.professor}
                  onChange={e => searchProfessorsRegister(e.target.value)}
                  onFocus={() => { if (!form.professor.trim()) loadAllProfessors(); else if (form.professor.length >= 1) searchProfessorsRegister(form.professor); }}
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

            <TurnstileWidget onSuccess={t => setTurnstileToken(t)} />

            <button type="submit" disabled={loading || (role === 'student' && !turnstileToken)}
              style={{ background: '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1rem', border: 'none', cursor: (loading || (role === 'student' && !turnstileToken)) ? 'not-allowed' : 'pointer', opacity: (loading || (role === 'student' && !turnstileToken)) ? 0.45 : 1, marginTop: '0.5rem', transition: 'opacity 0.2s ease' }}>
              {loading ? 'CRIANDO CONTA...' : role === 'professor' || role === 'academy' ? 'PRÓXIMO →' : 'ENTRAR NO TATAMI 🥋'}
            </button>
          </form>
        </div>
      )}

      {/* ── PASSO 4: Dados da Academia ── */}
      {step === 4 && (role === 'professor' || role === 'academy') && (
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
            <div>
              <label className="bjj-label">GPS DA ACADEMIA</label>
              <button
                type="button"
                onClick={useAcademyGps}
                disabled={locatingAcademy}
                style={{
                  width: '100%',
                  background: form.academyLatitude != null && form.academyLongitude != null ? '#063820' : '#111',
                  border: `1px dashed ${form.academyLatitude != null && form.academyLongitude != null ? '#0D9E6E' : '#CC0000'}`,
                  color: form.academyLatitude != null && form.academyLongitude != null ? '#0DFF9A' : '#CC0000',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '0.875rem',
                  cursor: locatingAcademy ? 'not-allowed' : 'pointer',
                  opacity: locatingAcademy ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <LocateFixed size={16} />
                {locatingAcademy ? 'LOCALIZANDO...' : form.academyLatitude != null && form.academyLongitude != null ? 'ATUALIZAR GPS' : 'USAR GPS DA ACADEMIA'}
              </button>
              {form.academyLatitude != null && form.academyLongitude != null && (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#0D9E6E', marginTop: '0.375rem' }}>
                  GPS salvo para busca por distancia.
                </p>
              )}
            </div>
            <button type="submit" style={{ background: '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1rem', border: 'none', cursor: 'pointer', marginTop: '0.5rem' }}>
              PRÓXIMO →
            </button>
          </form>
        </div>
      )}

      {/* ── PASSO 5: Logo + Foto ── */}
      {step === 5 && (role === 'professor' || role === 'academy') && (
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

            <TurnstileWidget onSuccess={t => setTurnstileToken(t)} />

            <button type="submit" disabled={loading || !turnstileToken}
              style={{ background: '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1rem', border: 'none', cursor: (loading || !turnstileToken) ? 'not-allowed' : 'pointer', opacity: (loading || !turnstileToken) ? 0.45 : 1, transition: 'opacity 0.2s ease' }}>
              {loading ? 'CRIANDO CONTA...' : 'CADASTRAR 🏛️'}
            </button>
          </form>
        </div>
      )}

      {/* Modais legais (não tiram o usuário da página de cadastro) */}
      <LegalModal open={legalModal === 'terms'} title="Termos de Uso" onClose={() => setLegalModal(null)}>
        <TermsContent />
      </LegalModal>

      <LegalModal open={legalModal === 'privacy'} title="Política de Privacidade" onClose={() => setLegalModal(null)}>
        <PrivacyContent />
      </LegalModal>

      {/* RAOS Tecnologia */}
      <div style={{ marginTop: 'auto', padding: '0.75rem 1rem', borderTop: '1px solid #1A1A1A', textAlign: 'center' }}>
        <a href="https://raostecnologia.com.br" target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
        >
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555', opacity: 0.4, transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
          >Desenvolvido por</span>
          <img src="/raos-logo.png" alt="RAOS Tecnologia" style={{ height: '24px', width: 'auto', objectFit: 'contain', opacity: 0.65, transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.65')}
          />
        </a>
      </div>
    </div>
  );
}

/** Card do plano exibido no passo 3 do cadastro */
function PlanCard({ icon, name, price, color, features }: { icon: string; name: string; price: string; color: string; features: string[] }) {
  return (
    <div style={{
      background: '#111',
      border: `2px solid ${color}`,
      padding: '1rem',
      marginBottom: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1, margin: 0 }}>
            Plano {name}
          </p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', color, margin: 0 }}>
            R$ {price} / mês
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.75rem' }}>
        {features.slice(0, 4).map(f => (
          <span key={f} style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#777', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ color, fontWeight: 700 }}>✓</span> {f}
          </span>
        ))}
        {features.length > 4 && (
          <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>+{features.length - 4} itens</span>
        )}
      </div>
    </div>
  );
}

/** Medidor de força da senha */
function PasswordStrength({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Muito fraca', color: '#CC0000', min: 0 },
    { label: 'Fraca', color: '#E67E00', min: 1 },
    { label: 'Média', color: '#E6C300', min: 2 },
    { label: 'Forte', color: '#22C55E', min: 4 },
    { label: 'Muito forte', color: '#0EA5E9', min: 5 },
  ];

  const level = [...levels].reverse().find(l => score >= l.min)!;
  const pct = Math.min(100, (score / 5) * 100);

  return (
    <div style={{ marginTop: '0.4rem' }}>
      <div style={{ height: '4px', background: '#1A1A1A', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: level.color,
          borderRadius: '2px',
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      </div>
      <span style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: '0.65rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: level.color,
        display: 'block',
        marginTop: '0.2rem',
        transition: 'color 0.3s ease',
      }}>
        {level.label}
      </span>
    </div>
  );
}
