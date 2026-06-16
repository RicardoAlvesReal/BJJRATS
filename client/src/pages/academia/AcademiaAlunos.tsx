import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Search, UserCheck, UserPlus, RefreshCw, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api, { type UserProfile } from '@/lib/api';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { FONTS } from '@/lib/design';
import { BELT_COLORS } from '@/lib/bjjrats-constants';
import { useAuth } from '@/contexts/AuthContext';

type SubTab = 'students' | 'requests' | 'enrollments';
type BillingMode = 'prorata' | 'rolling30';

interface AcademyEnrollment {
  id: string;
  professorUid: string;
  studentUid: string;
  studentName?: string | null;
  studentEmail?: string | null;
  studentPhone?: string | null;
  studentBelt?: string | null;
  monthlyFee?: number | null;
  dueDay?: number | null;
  status?: 'pending' | 'active' | 'suspended' | 'cancelled' | string;
  pixKey?: string | null;
  notes?: string | null;
  suspendReason?: string | null;
  createdAt?: string | null;
}

interface AcademyJoinRequest {
  id: string;
  studentUid: string;
  professorUid: string;
  type?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
  studentPhoto?: string | null;
  studentBelt?: string | null;
  academyName?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

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

function statusInfo(status?: string | null) {
  if (status === 'active') return { label: 'ATIVO', color: '#22C55E' };
  if (status === 'suspended') return { label: 'SUSPENSO', color: '#E87722' };
  if (status === 'pending') return { label: 'AGUARDANDO ALUNO', color: '#1A6ECC' };
  if (status === 'cancelled') return { label: 'CANCELADO', color: '#666' };
  return { label: (status || 'INDEFINIDO').toUpperCase(), color: '#666' };
}

function money(value?: number | null) {
  return `R$ ${Number(value ?? 0).toFixed(2)}`;
}

function calculateBillingTerms(fee: number, mode: BillingMode) {
  const today = new Date();
  if (mode === 'prorata') {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - today.getDate() + 1;
    const firstAmount = Math.round((fee / daysInMonth) * daysRemaining * 100) / 100;
    const firstDue = new Date(today.getFullYear(), today.getMonth() + 1, 5);
    return {
      dueDay: 5,
      firstAmount,
      firstDueDate: firstDue.toISOString().slice(0, 10),
      firstMonth: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
    };
  }

  const firstDue = new Date(today);
  firstDue.setDate(firstDue.getDate() + 30);
  return {
    dueDay: today.getDate(),
    firstAmount: fee,
    firstDueDate: firstDue.toISOString().slice(0, 10),
    firstMonth: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
  };
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

export default function AcademiaAlunos() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<SubTab>('students');
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<AcademyEnrollment[]>([]);
  const [requests, setRequests] = useState<AcademyJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [inviteForm, setInviteForm] = useState({ monthlyFee: '', pixKey: '', studentPhone: '', notes: '' });
  const [billingMode, setBillingMode] = useState<BillingMode>('rolling30');
  const [savingInvite, setSavingInvite] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<AcademyEnrollment | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actioning, setActioning] = useState<string | null>(null);

  const academyName = (profile as any)?.academyName || (profile as any)?.academy || user?.name || 'Academia';

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [studentRows, enrollmentRows, requestRows] = await Promise.all([
        api.users.list({ role: 'student', academyId: user.uid }),
        api.enrollments.list({ professorUid: user.uid }) as Promise<AcademyEnrollment[]>,
        api.academyRequests.list({ professorUid: user.uid }) as Promise<AcademyJoinRequest[]>,
      ]);
      setMembers(studentRows.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR')));
      setEnrollments(enrollmentRows);
      setRequests(requestRows.filter(request => request.status === 'pending' && request.type !== 'treino'));
    } catch {
      toast.error('Erro ao carregar alunos da academia.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const term = search.trim();
      setSelectedStudent(null);
      if (term.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const enrolledUids = new Set(
          enrollments
            .filter(enrollment => enrollment.status !== 'cancelled')
            .map(enrollment => enrollment.studentUid),
        );
        const rows = await api.users.list({ role: 'student', search: term });
        if (cancelled) return;
        setResults(rows.filter(row => row.uid !== user?.uid && !enrolledUids.has(row.uid)).slice(0, 8));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    };

    const timer = window.setTimeout(run, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enrollments, search, user?.uid]);

  const pendingRequests = useMemo(() => requests.filter(request => request.status === 'pending'), [requests]);
  const activeMembers = useMemo(() => enrollments.filter(enrollment => enrollment.status === 'active'), [enrollments]);
  const suspendedMembers = useMemo(() => enrollments.filter(enrollment => enrollment.status === 'suspended'), [enrollments]);
  const pendingEnrollments = useMemo(() => enrollments.filter(enrollment => enrollment.status === 'pending'), [enrollments]);

  const resetInvite = () => {
    setShowInvite(false);
    setSearch('');
    setResults([]);
    setSelectedStudent(null);
    setInviteForm({ monthlyFee: '', pixKey: '', studentPhone: '', notes: '' });
    setBillingMode('rolling30');
  };

  const openInvite = (student?: UserProfile) => {
    setSelectedStudent(student || null);
    setSearch(student?.name || '');
    setResults([]);
    setInviteForm({ monthlyFee: '', pixKey: '', studentPhone: student?.phone || '', notes: '' });
    setBillingMode('rolling30');
    setShowInvite(true);
  };

  const createInvite = async () => {
    if (!user?.uid || !selectedStudent || !inviteForm.monthlyFee.trim()) return;
    setSavingInvite(true);
    try {
      const fee = Number(inviteForm.monthlyFee) || 0;
      const terms = calculateBillingTerms(fee, billingMode);
      await api.enrollments.create({
        professorUid: user.uid,
        professorName: academyName,
        academyName,
        studentUid: selectedStudent.uid,
        studentName: selectedStudent.name,
        studentEmail: selectedStudent.email || '',
        studentPhone: inviteForm.studentPhone.trim(),
        studentBelt: selectedStudent.belt || 'Branca',
        studentStripes: selectedStudent.stripes ?? 0,
        monthlyFee: fee,
        dueDay: terms.dueDay,
        billingMode,
        firstAmount: terms.firstAmount,
        firstDueDate: terms.firstDueDate,
        firstMonth: terms.firstMonth,
        status: 'pending',
        pixKey: inviteForm.pixKey.trim(),
        notes: inviteForm.notes.trim(),
      } as any);
      toast.success(`Convite enviado. Primeiro vencimento: ${formatDate(terms.firstDueDate)} (${money(terms.firstAmount)}).`);
      resetInvite();
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar convite de matricula.');
    } finally {
      setSavingInvite(false);
    }
  };

  const updateRequest = async (request: AcademyJoinRequest, status: 'accepted' | 'rejected') => {
    setActioning(request.id);
    try {
      await api.academyRequests.update(request.id, { status });
      toast.success(status === 'accepted' ? 'Pedido aprovado.' : 'Pedido recusado.');
      load();
    } catch {
      toast.error('Erro ao atualizar pedido.');
    } finally {
      setActioning(null);
    }
  };

  const reactivate = async (enrollment: AcademyEnrollment) => {
    setActioning(enrollment.id);
    try {
      await api.enrollments.update(enrollment.id, { status: 'active', suspendReason: '' } as any);
      toast.success('Matricula reativada.');
      load();
    } catch {
      toast.error('Erro ao reativar matricula.');
    } finally {
      setActioning(null);
    }
  };

  const suspend = async () => {
    if (!suspendTarget || !suspendReason.trim()) return;
    setActioning(suspendTarget.id);
    try {
      await api.enrollments.update(suspendTarget.id, { status: 'suspended', suspendReason } as any);
      await api.notifications.create({
        toUid: suspendTarget.studentUid,
        type: 'payment_suspended',
        title: 'Matricula suspensa',
        message: `Sua matricula em ${academyName} foi suspensa. Motivo: ${suspendReason}`,
        data: { enrollmentId: suspendTarget.id, reason: suspendReason },
        read: false,
      } as any);
      toast.success('Aluno suspenso e notificado.');
      setSuspendTarget(null);
      setSuspendReason('');
      load();
    } catch {
      toast.error('Erro ao suspender aluno.');
    } finally {
      setActioning(null);
    }
  };

  const deleteEnrollment = async (enrollment: AcademyEnrollment) => {
    if (!window.confirm(`Excluir a matricula de ${enrollment.studentName || 'aluno'}?`)) return;
    setActioning(enrollment.id);
    try {
      await api.enrollments.delete(enrollment.id);
      toast.success('Matricula excluida.');
      load();
    } catch {
      toast.error('Erro ao excluir matricula.');
    } finally {
      setActioning(null);
    }
  };

  const inviteFee = Number(inviteForm.monthlyFee) || 0;
  const inviteTerms = calculateBillingTerms(inviteFee, billingMode);

  if (loading) {
    return (
      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bjj-skeleton h-24 rounded-xl" />)}
      </motion.div>
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Alunos da Academia
          </h1>
          <p style={{ color: '#666', fontSize: '0.85rem', fontFamily: FONTS.condensed, letterSpacing: '0.05em', marginTop: '0.125rem' }}>
            Matriculas, pedidos e alunos vinculados
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={load} className="bjj-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.45rem 0.75rem' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={() => openInvite()} style={{ background: '#E87722', border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.55rem 0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <UserPlus size={15} /> Nova matricula
          </button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Alunos vinculados" value={members.length} color="#FFF" />
        <StatCard label="Matriculas ativas" value={activeMembers.length} color="#22C55E" />
        <StatCard label="Aguardando aceite" value={pendingEnrollments.length} color="#1A6ECC" />
        <StatCard label="Suspensos" value={suspendedMembers.length} color="#E87722" />
      </motion.div>

      <motion.div variants={fadeUp} className="flex gap-0 mb-5" style={{ background: '#111', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '2px', display: 'inline-flex', flexWrap: 'wrap' }}>
        {[
          { id: 'students' as const, label: `Alunos (${members.length})` },
          { id: 'requests' as const, label: `Pedidos (${pendingRequests.length})` },
          { id: 'enrollments' as const, label: `Matriculas (${enrollments.length})` },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{ background: tab === item.id ? '#E87722' : 'transparent', color: tab === item.id ? '#FFF' : '#666', fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.1em', padding: '0.4rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            {item.label}
          </button>
        ))}
      </motion.div>

      {tab === 'students' && <StudentsList members={members} enrollments={enrollments} onInvite={openInvite} />}
      {tab === 'requests' && <RequestsList requests={requests} actioning={actioning} onAction={updateRequest} />}
      {tab === 'enrollments' && (
        <EnrollmentsList
          enrollments={enrollments}
          actioning={actioning}
          onSuspend={setSuspendTarget}
          onReactivate={reactivate}
          onDelete={deleteEnrollment}
        />
      )}

      {showInvite && (
        <div onClick={resetInvite} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={event => event.stopPropagation()}
            style={{ width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#0D0D0D', border: '1px solid #2A2A2A', borderTop: '3px solid #E87722', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
          >
            <div>
              <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.15rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>Nova matricula</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.78rem', color: '#666', marginTop: '0.25rem' }}>Envie um convite. O aluno precisa aceitar para ativar o vinculo.</p>
            </div>

            <div>
              <p className="bjj-label">Buscar aluno</p>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome, email ou telefone" style={{ ...inputStyle, paddingLeft: '2.2rem' }} />
              </div>
              {searching && <p style={{ fontFamily: FONTS.condensed, color: '#666', fontSize: '0.75rem', marginTop: '0.45rem' }}>Buscando...</p>}
              {results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {results.map(student => (
                    <button key={student.uid} onClick={() => { setSelectedStudent(student); setSearch(student.name || ''); setResults([]); }} style={{ background: selectedStudent?.uid === student.uid ? '#1A1208' : '#111', border: `1px solid ${selectedStudent?.uid === student.uid ? '#E87722' : '#222'}`, color: '#FFF', padding: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
                      <Avatar user={student} />
                      <div>
                        <p style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.9rem', margin: 0 }}>{student.name}</p>
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#777', margin: 0 }}>{student.email || student.phone || 'Aluno BJJRats'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent && (
              <div style={{ border: '1px solid #222', background: '#111', padding: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Avatar user={selectedStudent} />
                <div>
                  <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#FFF', margin: 0 }}>{selectedStudent.name}</p>
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.74rem', color: '#777', margin: 0 }}>Faixa {selectedStudent.belt || 'Branca'}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Mensalidade *"><input type="number" value={inviteForm.monthlyFee} onChange={event => setInviteForm(form => ({ ...form, monthlyFee: event.target.value }))} placeholder="150.00" style={inputStyle} /></Field>
              <Field label="WhatsApp do aluno"><input type="tel" value={inviteForm.studentPhone} onChange={event => setInviteForm(form => ({ ...form, studentPhone: event.target.value }))} placeholder="11999999999" style={inputStyle} /></Field>
              <Field label="Chave PIX"><input value={inviteForm.pixKey} onChange={event => setInviteForm(form => ({ ...form, pixKey: event.target.value }))} placeholder="CPF, email ou chave" style={inputStyle} /></Field>
              <Field label="Cobranca inicial">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                  {[
                    { id: 'rolling30' as BillingMode, label: '30 dias corridos', hint: `vence ${formatDate(calculateBillingTerms(inviteFee, 'rolling30').firstDueDate)}` },
                    { id: 'prorata' as BillingMode, label: 'Pro-rata dia 5', hint: `${money(calculateBillingTerms(inviteFee, 'prorata').firstAmount)}` },
                  ].map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setBillingMode(option.id)}
                      style={{ background: billingMode === option.id ? '#1A1208' : '#0A0A0A', border: `1px solid ${billingMode === option.id ? '#E87722' : '#2A2A2A'}`, color: billingMode === option.id ? '#FFF' : '#777', fontFamily: FONTS.condensed, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.55rem', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ display: 'block', fontSize: '0.72rem' }}>{option.label}</span>
                      <span style={{ display: 'block', fontSize: '0.6rem', color: billingMode === option.id ? '#E87722' : '#555', marginTop: '0.15rem' }}>{option.hint}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <div style={{ background: '#111', border: '1px solid #222', padding: '0.75rem', fontFamily: 'Barlow, sans-serif', fontSize: '0.76rem', color: '#777', lineHeight: 1.45 }}>
              Primeiro pagamento: <strong style={{ color: '#FFF' }}>{money(inviteTerms.firstAmount)}</strong> com vencimento em <strong style={{ color: '#FFF' }}>{formatDate(inviteTerms.firstDueDate)}</strong>.
            </div>
            <Field label="Observacoes"><input value={inviteForm.notes} onChange={event => setInviteForm(form => ({ ...form, notes: event.target.value }))} placeholder="Opcional" style={inputStyle} /></Field>

            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button onClick={resetInvite} style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#777', fontFamily: FONTS.condensed, fontWeight: 800, padding: '0.75rem', cursor: 'pointer', textTransform: 'uppercase' }}>Cancelar</button>
              <button onClick={createInvite} disabled={savingInvite || !selectedStudent || !inviteForm.monthlyFee.trim()} style={{ flex: 2, background: savingInvite || !selectedStudent || !inviteForm.monthlyFee.trim() ? '#333' : '#E87722', border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, padding: '0.75rem', cursor: savingInvite ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
                {savingInvite ? 'Enviando...' : 'Enviar convite'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {suspendTarget && (
        <div onClick={() => setSuspendTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={event => event.stopPropagation()} style={{ width: 'min(420px, 100%)', background: '#0D0D0D', border: '1px solid #3A2410', borderTop: '3px solid #E87722', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.1rem', color: '#E87722', textTransform: 'uppercase', margin: 0 }}>Suspender aluno</p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', margin: 0 }}>{suspendTarget.studentName || 'Aluno'}</p>
            <textarea value={suspendReason} onChange={event => setSuspendReason(event.target.value)} rows={4} placeholder="Motivo da suspensao" style={{ ...inputStyle, resize: 'none' }} />
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button onClick={() => setSuspendTarget(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#777', fontFamily: FONTS.condensed, fontWeight: 800, padding: '0.75rem', cursor: 'pointer', textTransform: 'uppercase' }}>Cancelar</button>
              <button onClick={suspend} disabled={!suspendReason.trim() || actioning === suspendTarget.id} style={{ flex: 2, background: suspendReason.trim() ? '#E87722' : '#333', border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, padding: '0.75rem', cursor: 'pointer', textTransform: 'uppercase' }}>Suspender</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bjj-card" style={{ padding: '1.1rem' }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, color, lineHeight: 1, fontFamily: FONTS.condensed }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem', fontFamily: FONTS.condensed }}>{label}</div>
    </div>
  );
}

function StudentsList({ members, enrollments, onInvite }: { members: UserProfile[]; enrollments: AcademyEnrollment[]; onInvite: (student: UserProfile) => void }) {
  const enrollmentByStudent = new Map(
    enrollments
      .filter(enrollment => enrollment.status !== 'cancelled' && enrollment.status !== 'rejected')
      .map(enrollment => [enrollment.studentUid, enrollment]),
  );
  if (members.length === 0) return <EmptyState text="Nenhum aluno vinculado ainda." />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {members.map(member => {
        const enrollment = enrollmentByStudent.get(member.uid);
        return (
          <div key={member.uid} className="bjj-card" style={{ padding: '1rem', display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
            <Avatar user={member} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#FFF', fontSize: '1rem', margin: 0 }}>{member.name}</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', color: '#777', fontSize: '0.75rem', margin: 0 }}>{member.email || member.phone || 'Sem contato'}</p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                <Badge label={`Faixa ${member.belt || 'Branca'}`} color={BELT_COLORS[member.belt || 'Branca'] || '#777'} />
                {enrollment && <Badge label={statusInfo(enrollment.status).label} color={statusInfo(enrollment.status).color} />}
                {!enrollment && <Badge label="SEM MATRICULA" color="#E87722" />}
              </div>
            </div>
            {!enrollment && (
              <IconButton title="Convidar para matricula" color="#E87722" onClick={() => onInvite(member)}>
                <UserPlus size={16} />
              </IconButton>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RequestsList({ requests, actioning, onAction }: { requests: AcademyJoinRequest[]; actioning: string | null; onAction: (request: AcademyJoinRequest, status: 'accepted' | 'rejected') => void }) {
  if (requests.length === 0) return <EmptyState text="Nenhum pedido de entrada." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {requests.map(request => {
        const pending = request.status === 'pending';
        return (
          <div key={request.id} className="bjj-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <Avatar user={{ name: request.studentName || 'Aluno', photo: request.studentPhoto || undefined, belt: request.studentBelt || 'Branca' } as UserProfile} />
            <div style={{ flex: 1, minWidth: '180px' }}>
              <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#FFF', fontSize: '1rem', margin: 0 }}>{request.studentName || 'Aluno'}</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', color: '#777', fontSize: '0.75rem', margin: 0 }}>{request.studentEmail || request.studentBelt || 'Pedido de entrada'}</p>
            </div>
            <Badge label={(request.status || 'pending').toUpperCase()} color={pending ? '#E87722' : request.status === 'accepted' ? '#22C55E' : '#666'} />
            {pending && (
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <IconButton title="Aprovar" color="#22C55E" disabled={actioning === request.id} onClick={() => onAction(request, 'accepted')}><CheckCircle2 size={16} /></IconButton>
                <IconButton title="Recusar" color="#CC0000" disabled={actioning === request.id} onClick={() => onAction(request, 'rejected')}><Ban size={16} /></IconButton>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EnrollmentsList({ enrollments, actioning, onSuspend, onReactivate, onDelete }: { enrollments: AcademyEnrollment[]; actioning: string | null; onSuspend: (enrollment: AcademyEnrollment) => void; onReactivate: (enrollment: AcademyEnrollment) => void; onDelete: (enrollment: AcademyEnrollment) => void }) {
  if (enrollments.length === 0) return <EmptyState text="Nenhuma matricula cadastrada." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {enrollments.map(enrollment => {
        const status = statusInfo(enrollment.status);
        return (
          <div key={enrollment.id} className="bjj-card" style={{ padding: '1rem', borderLeft: `3px solid ${status.color}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#FFF', fontSize: '1rem', margin: 0 }}>{enrollment.studentName || 'Aluno'}</p>
                <p style={{ fontFamily: 'Barlow, sans-serif', color: '#777', fontSize: '0.75rem', margin: 0 }}>
                  {money(enrollment.monthlyFee)} {enrollment.dueDay ? `- vence dia ${enrollment.dueDay}` : ''}
                </p>
                {enrollment.suspendReason && <p style={{ fontFamily: 'Barlow, sans-serif', color: '#E87722', fontSize: '0.75rem', marginTop: '0.35rem' }}>Motivo: {enrollment.suspendReason}</p>}
              </div>
              <Badge label={status.label} color={status.color} />
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                {enrollment.status === 'active' && <IconButton title="Suspender" color="#E87722" disabled={actioning === enrollment.id} onClick={() => onSuspend(enrollment)}><Ban size={16} /></IconButton>}
                {enrollment.status === 'suspended' && <IconButton title="Reativar" color="#22C55E" disabled={actioning === enrollment.id} onClick={() => onReactivate(enrollment)}><UserCheck size={16} /></IconButton>}
                <IconButton title="Excluir" color="#CC0000" disabled={actioning === enrollment.id} onClick={() => onDelete(enrollment)}><Trash2 size={16} /></IconButton>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <p className="bjj-label" style={{ marginBottom: '0.35rem' }}>{label}</p>
      {children}
    </label>
  );
}

function Avatar({ user }: { user: Partial<UserProfile> }) {
  return (
    <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${BELT_COLORS[user.belt || 'Branca'] || '#333'}`, background: '#1A1A1A', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {user.photo ? <img src={user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: FONTS.condensed, color: '#777', fontWeight: 900 }}>{(user.name || '?').charAt(0).toUpperCase()}</span>}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: `${color}22`, border: `1px solid ${color}66`, color, fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.18rem 0.45rem' }}>
      {label}
    </span>
  );
}

function IconButton({ title, color, disabled, onClick, children }: { title: string; color: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled} style={{ width: 36, height: 36, background: `${color}14`, border: `1px solid ${color}66`, color, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bjj-card" style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ fontFamily: FONTS.condensed, fontWeight: 800, color: '#555', textTransform: 'uppercase', margin: 0 }}>{text}</p>
    </div>
  );
}
