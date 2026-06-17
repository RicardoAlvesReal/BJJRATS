import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, Handshake, RefreshCw, Search, Send, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import api, {
  type AcademyProfessorLink,
  type AcademyStudentProfessorAssignment,
  type UserProfile,
} from '@/lib/api';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { FONTS } from '@/lib/design';
import { BELT_COLORS } from '@/lib/bjjrats-constants';
import { useAuth } from '@/contexts/AuthContext';

type RelationType = 'internal' | 'partner';

const inputStyle: CSSProperties = {
  width: '100%',
  background: '#0A0A0A',
  border: '1px solid #2A2A2A',
  color: '#FFF',
  fontFamily: 'Barlow, sans-serif',
  fontSize: '0.875rem',
  padding: '0.7rem 0.8rem',
  outline: 'none',
  boxSizing: 'border-box',
};

function relationInfo(type?: string | null) {
  if (type === 'partner') {
    return {
      label: 'PARCEIRO',
      color: '#1A6ECC',
      description: 'Recebe indicacoes e decide se aceita cada aluno.',
    };
  }
  return {
    label: 'DA ACADEMIA',
    color: '#E87722',
    description: 'Fica vinculado a academia; alunos e mensalidades ficam sob controle da academia.',
  };
}

function assignmentStatus(status?: string | null) {
  if (status === 'active') return { label: 'ATRIBUIDO', color: '#22C55E' };
  if (status === 'accepted') return { label: 'ACEITO', color: '#22C55E' };
  if (status === 'pending') return { label: 'AGUARDANDO', color: '#1A6ECC' };
  if (status === 'rejected') return { label: 'RECUSADO', color: '#CC0000' };
  return { label: (status || 'INDEFINIDO').toUpperCase(), color: '#666' };
}

function linkStatusInfo(status?: string | null) {
  if (status === 'pending') return { label: 'CONVITE PENDENTE', color: '#1A6ECC' };
  if (status === 'rejected') return { label: 'RECUSADO', color: '#CC0000' };
  if (status === 'removed') return { label: 'REMOVIDO', color: '#666' };
  return { label: 'ATIVO', color: '#22C55E' };
}

export default function AcademiaProfessores() {
  const { user } = useAuth();
  const [links, setLinks] = useState<AcademyProfessorLink[]>([]);
  const [assignments, setAssignments] = useState<AcademyStudentProfessorAssignment[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showAssign, setShowAssign] = useState<AcademyProfessorLink | null>(null);
  const [professorSearch, setProfessorSearch] = useState('');
  const [professorResults, setProfessorResults] = useState<UserProfile[]>([]);
  const [professorSearching, setProfessorSearching] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<UserProfile | null>(null);
  const [relationType, setRelationType] = useState<RelationType>('internal');
  const [notes, setNotes] = useState('');
  const [partnerRevenueSharePercent, setPartnerRevenueSharePercent] = useState('50');
  const [partnerRevenueNotes, setPartnerRevenueNotes] = useState('');
  const [selectedStudentUid, setSelectedStudentUid] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<AcademyProfessorLink | null>(null);

  // ── Criar conta nova (professor da academia) ──
  const [createAccount, setCreateAccount] = useState(false);
  const [newProfessorName, setNewProfessorName] = useState('');
  const [newProfessorEmail, setNewProfessorEmail] = useState('');
  const [newProfessorPassword, setNewProfessorPassword] = useState('');
  const [createErrors, setCreateErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const validateCreateForm = (): boolean => {
    const errors: typeof createErrors = {};
    if (!newProfessorName.trim()) errors.name = 'Nome é obrigatório';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newProfessorEmail.trim()) errors.email = 'E-mail é obrigatório';
    else if (!emailRegex.test(newProfessorEmail.trim())) errors.email = 'E-mail inválido';
    if (!newProfessorPassword) errors.password = 'Senha é obrigatória';
    else if (newProfessorPassword.length < 6) errors.password = 'Mínimo 6 caracteres';
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [professorLinks, studentAssignments, academyStudents] = await Promise.all([
        api.academy.professors.list(),
        api.academy.studentAssignments.list(),
        api.users.list({ role: 'student', academyId: user.uid }),
      ]);
      setLinks(professorLinks);
      setAssignments(studentAssignments);
      setStudents(academyStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR')));
    } catch {
      toast.error('Erro ao carregar professores da academia.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const term = professorSearch.trim();
      setSelectedProfessor(null);
      if (term.length < 2) {
        setProfessorResults([]);
        return;
      }
      setProfessorSearching(true);
      try {
        const linked = new Set(links.map(link => link.professorUid));
        const rows = await api.users.list({ role: 'professor', search: term });
        if (cancelled) return;
        setProfessorResults(rows.filter(row => row.uid !== user?.uid && !linked.has(row.uid)).slice(0, 8));
      } catch {
        if (!cancelled) setProfessorResults([]);
      } finally {
        if (!cancelled) setProfessorSearching(false);
      }
    };
    const timer = window.setTimeout(run, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [links, professorSearch, user?.uid]);

  const internalLinks = useMemo(() => links.filter(link => link.relationType !== 'partner'), [links]);
  const partnerLinks = useMemo(() => links.filter(link => link.relationType === 'partner'), [links]);
  const activePartnerLinks = useMemo(() => partnerLinks.filter(link => link.status === 'active'), [partnerLinks]);
  const pendingPartnerLinks = useMemo(() => partnerLinks.filter(link => link.status === 'pending'), [partnerLinks]);
  const pendingPartnerAssignments = useMemo(() => assignments.filter(item => item.status === 'pending'), [assignments]);

  const resetAdd = () => {
    setShowAdd(false);
    setProfessorSearch('');
    setProfessorResults([]);
    setSelectedProfessor(null);
    setRelationType('internal');
    setNotes('');
    setPartnerRevenueSharePercent('50');
    setPartnerRevenueNotes('');
    setCreateAccount(false);
    setNewProfessorName('');
    setNewProfessorEmail('');
    setNewProfessorPassword('');
  };

  const createLink = async () => {
    if (createAccount && !validateCreateForm()) return;
    if (!createAccount && !selectedProfessor) return;
    setSaving(true);
    try {
      await api.academy.professors.create({
        professorUid: createAccount ? undefined : selectedProfessor!.uid,
        relationType,
        notes,
        partnerRevenueSharePercent: relationType === 'partner' ? Number(partnerRevenueSharePercent) || 0 : undefined,
        partnerRevenueNotes: relationType === 'partner' ? partnerRevenueNotes : undefined,
        createAccount,
        name: createAccount ? newProfessorName : undefined,
        email: createAccount ? newProfessorEmail : undefined,
        password: createAccount ? newProfessorPassword : undefined,
      } as any);
      toast.success(createAccount ? 'Conta de professor criada e vinculada a academia.' : relationType === 'internal' ? 'Professor vinculado a academia.' : 'Convite enviado ao professor parceiro.');
      resetAdd();
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao vincular professor.');
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (link: AcademyProfessorLink) => {
    if (!window.confirm(`Remover o vinculo com ${link.professorName || 'professor'}?`)) return;
    setActioning(link.id);
    try {
      await api.academy.professors.update(link.id, { status: 'removed' });
      toast.success('Vinculo removido.');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover vinculo.');
    } finally {
      setActioning(null);
    }
  };

  const openAssignment = (link: AcademyProfessorLink) => {
    if (link.status !== 'active') {
      toast.info('Aguarde o professor aceitar o convite de parceria.');
      return;
    }
    setShowAssign(link);
    setSelectedStudentUid('');
    setAssignmentNotes('');
  };

  const createAssignment = async () => {
    if (!showAssign || !selectedStudentUid) return;
    setSaving(true);
    try {
      await api.academy.studentAssignments.create(showAssign.professorUid, {
        studentUid: selectedStudentUid,
        notes: assignmentNotes,
      });
      toast.success(showAssign.relationType === 'partner' ? 'Indicacao enviada ao parceiro.' : 'Aluno atribuido ao professor.');
      setShowAssign(null);
      setSelectedStudentUid('');
      setAssignmentNotes('');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao distribuir aluno.');
    } finally {
      setSaving(false);
    }
  };

  const assignmentsByProfessor = useMemo(() => {
    const map = new Map<string, AcademyStudentProfessorAssignment[]>();
    for (const assignment of assignments) {
      const rows = map.get(assignment.professorUid) || [];
      rows.push(assignment);
      map.set(assignment.professorUid, rows);
    }
    return map;
  }, [assignments]);

  if (loading) {
    return (
      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bjj-skeleton h-28 rounded-xl" />)}
      </motion.div>
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Professores
          </h1>
          <p style={{ color: '#666', fontSize: '0.85rem', fontFamily: FONTS.condensed, letterSpacing: '0.05em', marginTop: '0.125rem' }}>
            Equipe fixa, parceiros e distribuicao de alunos
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={load} className="bjj-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.45rem 0.75rem' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={() => setShowAdd(true)} style={{ background: '#E87722', border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.55rem 0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <UserPlus size={15} /> Novo vinculo
          </button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Professores da academia" value={internalLinks.length} color="#E87722" icon={<Building2 size={18} />} />
        <StatCard label="Parceiros ativos" value={activePartnerLinks.length} color="#1A6ECC" icon={<Handshake size={18} />} />
        <StatCard label="Convites pendentes" value={pendingPartnerLinks.length} color="#8B5CF6" icon={<Send size={18} />} />
        <StatCard label="Alunos distribuidos" value={assignments.length} color="#FFF" icon={<Users size={18} />} />
        <StatCard label="Indicacoes pendentes" value={pendingPartnerAssignments.length} color="#1A6ECC" icon={<CheckCircle2 size={18} />} />
      </motion.div>

      <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <ProfessorGroup
          title="Professores da academia"
          empty="Nenhum professor interno vinculado."
          links={internalLinks}
          assignmentsByProfessor={assignmentsByProfessor}
          actioning={actioning}
          onAssign={openAssignment}
          onRemove={removeLink}
          onSelect={setSelectedLink}
        />
        <ProfessorGroup
          title="Professores parceiros"
          empty="Nenhum professor parceiro adicionado."
          links={partnerLinks}
          assignmentsByProfessor={assignmentsByProfessor}
          actioning={actioning}
          onAssign={openAssignment}
          onRemove={removeLink}
          onSelect={setSelectedLink}
        />
      </motion.div>

      <motion.div variants={fadeUp} className="bjj-card" style={{ marginTop: '1rem', padding: '1rem' }}>
        <p className="bjj-label">Historico de distribuicao</p>
        {assignments.length === 0 ? (
          <EmptyState text="Nenhum aluno distribuido ainda." compact />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.65rem' }}>
            {assignments.slice(0, 12).map(item => {
              const status = assignmentStatus(item.status);
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #222', background: '#0D0D0D', padding: '0.7rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#FFF', textTransform: 'uppercase', margin: 0 }}>{item.studentName || 'Aluno'}</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', color: '#777', fontSize: '0.73rem', margin: 0 }}>Professor: {item.professorName || 'Professor'}</p>
                  </div>
                  <Badge label={relationInfo(item.relationType).label} color={relationInfo(item.relationType).color} />
                  <Badge label={status.label} color={status.color} />
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {showAdd && (
        <Modal onClose={resetAdd}>
          <div>
            <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.15rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>Novo professor</p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.78rem', color: '#666', marginTop: '0.25rem' }}>Busque uma conta de professor e defina o tipo de vinculo.</p>
          </div>

          {relationType === 'internal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.85rem', border: '1px solid #E8772244', background: '#1A1208' }}>
              <p style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.7rem', color: '#D9A25B', textTransform: 'uppercase', margin: 0 }}>Login inicial do professor</p>
              <div>
                <input value={newProfessorName} onChange={e => { setNewProfessorName(e.target.value); setCreateErrors(p => ({ ...p, name: undefined })); }} placeholder="Nome do professor" style={{ ...inputStyle, borderColor: createErrors.name ? '#CC0000' : '#2A2A2A' }} />
                {createErrors.name && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.68rem', color: '#CC0000', margin: '0.2rem 0 0' }}>{createErrors.name}</p>}
              </div>
              <div>
                <input value={newProfessorEmail} onChange={e => { setNewProfessorEmail(e.target.value); setCreateAccount(!!e.target.value); setCreateErrors(p => ({ ...p, email: undefined })); }}
                  onBlur={() => { if (newProfessorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newProfessorEmail.trim())) setCreateErrors(p => ({ ...p, email: 'E-mail inválido' })); }}
                  placeholder="E-mail válido" type="email" style={{ ...inputStyle, borderColor: createErrors.email ? '#CC0000' : '#2A2A2A' }} />
                {createErrors.email && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.68rem', color: '#CC0000', margin: '0.2rem 0 0' }}>{createErrors.email}</p>}
              </div>
              <div>
                <input value={newProfessorPassword} onChange={e => { setNewProfessorPassword(e.target.value); setCreateAccount(!!e.target.value); setCreateErrors(p => ({ ...p, password: undefined })); }}
                  onBlur={() => { if (newProfessorPassword && newProfessorPassword.length < 6) setCreateErrors(p => ({ ...p, password: 'Mínimo 6 caracteres' })); }}
                  placeholder="Senha inicial (mínimo 6 caracteres)" type="password" style={{ ...inputStyle, borderColor: createErrors.password ? '#CC0000' : '#2A2A2A' }} />
                {createErrors.password && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.68rem', color: '#CC0000', margin: '0.2rem 0 0' }}>{createErrors.password}</p>}
              </div>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.68rem', color: '#A67B3D', margin: 0, lineHeight: 1.4 }}>
                Cria uma conta com role professor, faixa preta, vinculada a esta academia. O professor fara login com o e-mail e senha fornecidos.
              </p>
            </div>
          )}

          {relationType === 'partner' && (
          <>
          <div>
            <p className="bjj-label">Buscar professor</p>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input value={professorSearch} onChange={event => setProfessorSearch(event.target.value)} placeholder="Nome, email ou telefone" style={{ ...inputStyle, paddingLeft: '2.2rem' }} />
            </div>
            {professorSearching && <p style={{ fontFamily: FONTS.condensed, color: '#666', fontSize: '0.75rem', marginTop: '0.45rem' }}>Buscando...</p>}
            {professorResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                {professorResults.map(professor => (
                  <button key={professor.uid} onClick={() => { setSelectedProfessor(professor); setProfessorSearch(professor.name || ''); setProfessorResults([]); }} style={{ background: selectedProfessor?.uid === professor.uid ? '#1A1208' : '#111', border: `1px solid ${selectedProfessor?.uid === professor.uid ? '#E87722' : '#222'}`, color: '#FFF', padding: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
                    <Avatar name={professor.name} photo={professor.professorPhotoUrl || professor.photo} belt={professor.belt} />
                    <div>
                      <p style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.9rem', margin: 0 }}>{professor.name}</p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#777', margin: 0 }}>{professor.email || professor.phone || 'Professor BJJRats'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProfessor && (
            <div style={{ border: '1px solid #222', background: '#111', padding: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Avatar name={selectedProfessor.name} photo={selectedProfessor.professorPhotoUrl || selectedProfessor.photo} belt={selectedProfessor.belt} />
              <div>
                <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#FFF', margin: 0 }}>{selectedProfessor.name}</p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.74rem', color: '#777', margin: 0 }}>Professor selecionado</p>
              </div>
            </div>
          )}
          </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
            {(['internal', 'partner'] as RelationType[]).map(type => {
              const info = relationInfo(type);
              return (
                <button key={type} onClick={() => { setRelationType(type); if (type === 'partner') { setCreateAccount(false); setNewProfessorName(''); setNewProfessorEmail(''); setNewProfessorPassword(''); } }} style={{ background: relationType === type ? `${info.color}18` : '#0A0A0A', border: `1px solid ${relationType === type ? info.color : '#2A2A2A'}`, color: relationType === type ? '#FFF' : '#777', padding: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ display: 'block', fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase', color: relationType === type ? info.color : '#777' }}>{info.label}</span>
                  <span style={{ display: 'block', fontFamily: 'Barlow, sans-serif', fontSize: '0.68rem', lineHeight: 1.35, marginTop: '0.25rem' }}>
                    {type === 'partner' ? 'Envia convite; o professor decide se aceita a parceria.' : info.description}
                  </span>
                </button>
              );
            })}
          </div>

          {relationType === 'partner' ? (
            <div style={{ border: '1px solid #1A6ECC55', background: '#0A1424', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <p className="bjj-label" style={{ color: '#9ABCE8' }}>Divisao da mensalidade</p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#7FA7D6', marginTop: '0.2rem', lineHeight: 1.4 }}>
                  Proposta enviada no convite. O professor parceiro aceita ou recusa antes de receber alunos.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                <div>
                  <p className="bjj-label">Professor parceiro (%)</p>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={partnerRevenueSharePercent}
                    onChange={event => setPartnerRevenueSharePercent(event.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ border: '1px solid #1A6ECC44', background: '#07101F', padding: '0.7rem' }}>
                  <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#FFF', fontSize: '1rem', margin: 0 }}>
                    Academia {Math.max(0, 100 - (Number(partnerRevenueSharePercent) || 0)).toFixed(0)}%
                  </p>
                  <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#1A6ECC', fontSize: '1rem', margin: '0.2rem 0 0' }}>
                    Parceiro {Math.min(100, Math.max(0, Number(partnerRevenueSharePercent) || 0)).toFixed(0)}%
                  </p>
                </div>
              </div>
              <div>
                <p className="bjj-label">Termos da negociacao</p>
                <input
                  value={partnerRevenueNotes}
                  onChange={event => setPartnerRevenueNotes(event.target.value)}
                  placeholder="Ex: repasse mensal apos pagamento confirmado"
                  style={inputStyle}
                />
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid #E8772244', background: '#1A1208', padding: '0.75rem', color: '#D9A25B', fontFamily: 'Barlow, sans-serif', fontSize: '0.74rem', lineHeight: 1.45 }}>
              Professor da academia recebe salario/contrato interno. A academia controla as mensalidades e nao ha divisao de mensalidade neste vinculo.
            </div>
          )}

          <div>
            <p className="bjj-label">Observacoes</p>
            <input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Opcional" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button onClick={resetAdd} style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#777', fontFamily: FONTS.condensed, fontWeight: 800, padding: '0.75rem', cursor: 'pointer', textTransform: 'uppercase' }}>Cancelar</button>
            <button onClick={createLink} disabled={(createAccount ? !newProfessorName || !newProfessorEmail || !newProfessorPassword : !selectedProfessor) || saving} style={{ flex: 2, background: (createAccount ? !newProfessorName || !newProfessorEmail || !newProfessorPassword : !selectedProfessor) || saving ? '#333' : '#E87722', border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, padding: '0.75rem', cursor: (createAccount ? !newProfessorName || !newProfessorEmail || !newProfessorPassword : !selectedProfessor) || saving ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>{saving ? 'Salvando...' : createAccount ? 'Criar professor' : 'Salvar vinculo'}</button>
          </div>
        </Modal>
      )}

      {showAssign && (
        <Modal onClose={() => setShowAssign(null)}>
          <div>
            <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.15rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>{showAssign.relationType === 'partner' ? 'Enviar indicacao' : 'Atribuir aluno'}</p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.78rem', color: '#666', marginTop: '0.25rem' }}>
              {showAssign.professorName || 'Professor'} - {relationInfo(showAssign.relationType).description}
            </p>
          </div>
          <div>
            <p className="bjj-label">Aluno da academia</p>
            <select value={selectedStudentUid} onChange={event => setSelectedStudentUid(event.target.value)} style={inputStyle}>
              <option value="">Selecione um aluno</option>
              {students.map(student => <option key={student.uid} value={student.uid}>{student.name}</option>)}
            </select>
          </div>
          <div>
            <p className="bjj-label">Mensagem interna</p>
            <input value={assignmentNotes} onChange={event => setAssignmentNotes(event.target.value)} placeholder="Opcional" style={inputStyle} />
          </div>
          {showAssign.relationType === 'partner' && (
            <div style={{ background: '#0A1424', border: '1px solid #1A6ECC55', padding: '0.75rem', color: '#9ABCE8', fontFamily: 'Barlow, sans-serif', fontSize: '0.74rem', lineHeight: 1.45 }}>
              O parceiro recebera uma indicacao pendente e decide se aceita ou recusa.
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button onClick={() => setShowAssign(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#777', fontFamily: FONTS.condensed, fontWeight: 800, padding: '0.75rem', cursor: 'pointer', textTransform: 'uppercase' }}>Cancelar</button>
            <button onClick={createAssignment} disabled={!selectedStudentUid || saving} style={{ flex: 2, background: !selectedStudentUid || saving ? '#333' : '#E87722', border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, padding: '0.75rem', cursor: !selectedStudentUid || saving ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>{saving ? 'Enviando...' : showAssign.relationType === 'partner' ? 'Enviar indicacao' : 'Atribuir aluno'}</button>
          </div>
        </Modal>
      )}

      {selectedLink && (
        <Modal onClose={() => setSelectedLink(null)}>
          <ProfessorDetail
            link={selectedLink}
            assignments={assignmentsByProfessor.get(selectedLink.professorUid) || []}
            students={students}
            actioning={actioning}
            onRemove={(link) => { removeLink(link); setSelectedLink(null); }}
            onAssign={(link) => { setSelectedLink(null); openAssignment(link); }}
            onCreateAssignment={async (studentUid: string) => {
              if (!selectedLink) return;
              setSaving(true);
              try {
                await api.academy.studentAssignments.create(selectedLink.professorUid, { studentUid, notes: '' });
                toast.success('Aluno atribuido ao professor.');
                load();
              } catch (err: any) {
                toast.error(err?.message || 'Erro ao atribuir aluno.');
              } finally {
                setSaving(false);
              }
            }}
          />
        </Modal>
      )}
    </motion.div>
  );
}

function ProfessorDetail({ link, assignments, students, actioning, onRemove, onAssign, onCreateAssignment }: {
  link: AcademyProfessorLink;
  assignments: AcademyStudentProfessorAssignment[];
  students: UserProfile[];
  actioning: string | null;
  onRemove: (link: AcademyProfessorLink) => void;
  onAssign: (link: AcademyProfessorLink) => void;
  onCreateAssignment: (studentUid: string) => Promise<void>;
}) {
  const info = relationInfo(link.relationType);
  const status = linkStatusInfo(link.status);
  const [quickStudent, setQuickStudent] = useState('');
  const [removingAssignment, setRemovingAssignment] = useState<string | null>(null);

  const handleRemoveAssignment = async (assignmentId: string, studentName?: string | null) => {
    if (!confirm(`Remover ${studentName || 'aluno'} deste professor?`)) return;
    setRemovingAssignment(assignmentId);
    try {
      await api.academy.studentAssignments.cancel(assignmentId);
      toast.success('Aluno removido do professor.');
      // Recarrega fechando e reabrindo
      onRemove(link);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover atribuição');
    } finally {
      setRemovingAssignment(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Avatar name={link.professorName || 'Professor'} photo={link.professorPhotoUrl || link.professorPhoto || undefined} belt={link.professorBelt || 'Preta'} size={48} />
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.1rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>{link.professorName || 'Professor'}</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.78rem', color: '#888', margin: 0 }}>{link.professorEmail || link.professorPhone || 'Sem contato'}</p>
        </div>
        <Badge label={info.label} color={info.color} />
        <Badge label={status.label} color={status.color} />
      </div>

      {/* Info de parceiro */}
      {link.relationType === 'partner' && (
        <div style={{ background: '#0A1424', border: '1px solid #1A6ECC44', padding: '0.75rem' }}>
          <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#9ABCE8', fontSize: '0.75rem', textTransform: 'uppercase', margin: 0 }}>
            Divisao: parceiro {Number(link.partnerRevenueSharePercent ?? 50).toFixed(0)}% · academia {Math.max(0, 100 - Number(link.partnerRevenueSharePercent ?? 50)).toFixed(0)}%
          </p>
          {link.partnerRevenueNotes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#6688AA', margin: '0.25rem 0 0' }}>{link.partnerRevenueNotes}</p>}
        </div>
      )}

      {/* Alunos atribuídos */}
      <div>
        <p className="bjj-label" style={{ marginBottom: '0.5rem' }}>Alunos atribuidos ({assignments.filter(a => a.status === 'active' || a.status === 'accepted').length})</p>
        {assignments.filter(a => a.status === 'active' || a.status === 'accepted').length === 0 ? (
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.78rem', color: '#555' }}>Nenhum aluno atribuido a este professor.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {assignments.filter(a => a.status === 'active' || a.status === 'accepted').slice(0, 10).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#111', border: '1px solid #222', padding: '0.5rem 0.7rem' }}>
                <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.8rem', color: '#FFF', flex: 1 }}>{a.studentName || 'Aluno'}</span>
                <Badge label={assignmentStatus(a.status).label} color={assignmentStatus(a.status).color} />
                <button onClick={e => { e.stopPropagation(); handleRemoveAssignment(a.id, a.studentName); }}
                    disabled={removingAssignment === a.id}
                    style={{ background: 'none', border: '1px solid #CC000044', color: '#CC0000', cursor: removingAssignment === a.id ? 'not-allowed' : 'pointer', fontSize: '0.7rem', padding: '0.15rem 0.4rem', fontFamily: FONTS.condensed, fontWeight: 700 }}>
                    {removingAssignment === a.id ? '...' : '✕'}
                  </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Atribuir aluno rápido (apenas parceiro) */}
      {link.status === 'active' && link.relationType !== 'internal' && (
        <div style={{ border: '1px solid #222', background: '#0D0D0D', padding: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={quickStudent} onChange={e => setQuickStudent(e.target.value)} style={{ ...inputStyle, flex: 1, padding: '0.5rem 0.6rem' }}>
            <option value="">Atribuir aluno...</option>
            {students.filter(s => !assignments.some(a => a.studentUid === s.uid && (a.status === 'active' || a.status === 'accepted'))).map(s => (
              <option key={s.uid} value={s.uid}>{s.name}</option>
            ))}
          </select>
          <button onClick={async () => { if (quickStudent) { await onCreateAssignment(quickStudent); setQuickStudent(''); } }} disabled={!quickStudent}
            style={{ background: quickStudent ? '#E87722' : '#333', border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', cursor: quickStudent ? 'pointer' : 'not-allowed' }}>
            + Atribuir
          </button>
        </div>
      )}

      {link.notes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#777', margin: 0, lineHeight: 1.5 }}>📝 {link.notes}</p>}

      {/* Ações (apenas parceiro) */}
      {link.relationType !== 'internal' && (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {link.status === 'active' && (
          <button onClick={() => onAssign(link)} style={{ flex: 1, background: `${info.color}18`, border: `1px solid ${info.color}66`, color: info.color, fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.75rem', padding: '0.65rem', cursor: 'pointer', textTransform: 'uppercase' }}>
            📤 Enviar indicacao
          </button>
        )}
        <button onClick={() => onRemove(link)} disabled={actioning === link.id}
          style={{ flex: 1, background: '#1A0000', border: '1px solid #CC000066', color: '#CC0000', fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.75rem', padding: '0.65rem', cursor: actioning === link.id ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
          {actioning === link.id ? 'Removendo...' : '🗑 Remover vinculo'}
        </button>
      </div>
      )}
    </div>
  );
}

function ProfessorGroup({ title, empty, links, assignmentsByProfessor, actioning, onAssign, onRemove, onSelect }: {
  title: string;
  empty: string;
  links: AcademyProfessorLink[];
  assignmentsByProfessor: Map<string, AcademyStudentProfessorAssignment[]>;
  actioning: string | null;
  onAssign: (link: AcademyProfessorLink) => void;
  onRemove: (link: AcademyProfessorLink) => void;
  onSelect: (link: AcademyProfessorLink) => void;
}) {
  return (
    <div className="bjj-card" style={{ padding: '1rem' }}>
      <p className="bjj-label" style={{ marginBottom: '0.75rem' }}>{title}</p>
      {links.length === 0 ? <EmptyState text={empty} compact /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {links.map(link => (
            <ProfessorCard
              key={link.id}
              link={link}
              assignments={assignmentsByProfessor.get(link.professorUid) || []}
              actioning={actioning}
              onAssign={onAssign}
              onRemove={onRemove}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfessorCard({ link, assignments, actioning, onAssign, onRemove, onSelect }: {
  link: AcademyProfessorLink;
  assignments: AcademyStudentProfessorAssignment[];
  actioning: string | null;
  onAssign: (link: AcademyProfessorLink) => void;
  onRemove: (link: AcademyProfessorLink) => void;
  onSelect: (link: AcademyProfessorLink) => void;
}) {
  const info = relationInfo(link.relationType);
  const status = linkStatusInfo(link.status);
  const canAssign = link.status === 'active';
  const activeCount = assignments.filter(item => item.status === 'active' || item.status === 'accepted').length;
  const pendingCount = assignments.filter(item => item.status === 'pending').length;

  return (
    <div onClick={() => onSelect(link)} style={{ border: `1px solid ${info.color}44`, borderLeft: `3px solid ${info.color}`, background: '#0D0D0D', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'pointer', transition: 'border-color 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Avatar name={link.professorName || 'Professor'} photo={link.professorPhotoUrl || link.professorPhoto || undefined} belt={link.professorBelt || 'Preta'} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#FFF', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.professorName || 'Professor'}</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', color: '#777', fontSize: '0.73rem', margin: 0 }}>{link.professorEmail || link.professorPhone || 'Sem contato'}</p>
        </div>
        <Badge label={info.label} color={info.color} />
        <Badge label={status.label} color={status.color} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <MiniMetric label="Alunos" value={activeCount} color="#22C55E" />
        <MiniMetric label="Pendentes" value={pendingCount} color="#1A6ECC" />
      </div>
      {link.notes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#777', margin: 0 }}>{link.notes}</p>}
      {link.relationType === 'partner' && link.status === 'pending' && (
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#9ABCE8', margin: 0 }}>
          Convite enviado. O parceiro ainda precisa aceitar para receber indicacoes de alunos.
        </p>
      )}
      {link.relationType === 'partner' && (
        <div style={{ background: '#0A1424', border: '1px solid #1A6ECC44', padding: '0.6rem' }}>
          <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#9ABCE8', fontSize: '0.72rem', textTransform: 'uppercase', margin: 0 }}>
            Divisao: parceiro {Number(link.partnerRevenueSharePercent ?? 50).toFixed(0)}% · academia {Math.max(0, 100 - Number(link.partnerRevenueSharePercent ?? 50)).toFixed(0)}%
          </p>
          {link.partnerRevenueNotes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.68rem', color: '#6688AA', margin: '0.25rem 0 0' }}>{link.partnerRevenueNotes}</p>}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {link.relationType !== 'internal' && (
          <button disabled={!canAssign} onClick={e => { e.stopPropagation(); onAssign(link); }} style={{ flex: 1, background: canAssign ? `${info.color}18` : '#111', border: `1px solid ${canAssign ? `${info.color}66` : '#333'}`, color: canAssign ? info.color : '#555', fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.72rem', padding: '0.55rem', cursor: canAssign ? 'pointer' : 'not-allowed', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
            <Send size={14} /> Aluno
          </button>
        )}
        {link.relationType !== 'internal' && (
          <button onClick={e => { e.stopPropagation(); onRemove(link); }} disabled={actioning === link.id} style={{ width: 42, background: '#1A0000', border: '1px solid #CC000066', color: '#CC0000', cursor: actioning === link.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={15} />
          </button>
        )}
        {link.relationType === 'internal' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.55rem', background: '#0D0D0D', border: '1px solid #1E1E1E' }}>
            <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.65rem', color: '#555', textTransform: 'uppercase' }}>Gerenciado pela academia</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: ReactNode }) {
  return (
    <div className="bjj-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: 38, height: 38, border: `1px solid ${color}55`, background: `${color}14`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.35rem', fontWeight: 900, color, lineHeight: 1, fontFamily: FONTS.condensed }}>{value}</div>
        <div style={{ fontSize: '0.62rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem', fontFamily: FONTS.condensed }}>{label}</div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #222', padding: '0.55rem' }}>
      <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontFamily: FONTS.condensed, color: '#666', fontSize: '0.6rem', textTransform: 'uppercase', margin: '0.2rem 0 0' }}>{label}</p>
    </div>
  );
}

function Avatar({ name, photo, belt, size = 42 }: { name?: string | null; photo?: string | null; belt?: string | null; size?: number }) {
  const color = BELT_COLORS[belt || 'Preta'] || '#333';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${color}`, background: '#1A1A1A', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: FONTS.condensed, color: '#777', fontWeight: 900, fontSize: size > 40 ? '0.9rem' : '0.75rem' }}>{(name || '?').charAt(0).toUpperCase()}</span>}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: `${color}22`, border: `1px solid ${color}66`, color, fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.18rem 0.45rem', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function EmptyState({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div style={{ padding: compact ? '1rem' : '2rem', textAlign: 'center', border: '1px solid #222', background: '#0D0D0D' }}>
      <p style={{ fontFamily: FONTS.condensed, fontWeight: 800, color: '#555', textTransform: 'uppercase', margin: 0 }}>{text}</p>
    </div>
  );
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={event => event.stopPropagation()}
        style={{ width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#0D0D0D', border: '1px solid #2A2A2A', borderTop: '3px solid #E87722', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
