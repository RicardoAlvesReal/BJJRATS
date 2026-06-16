// BJJRats — Financeiro da Academia
// Mesma lógica do ProfessorPanel, adaptada para o painel da academia

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import api, { type PaymentIntegrationSettings } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { BELT_COLORS } from '@/lib/bjjrats-constants';
import { FONTS } from '@/lib/design';
import { tabVariant, tabTransition } from '@/lib/animations';

type FinTab = 'enrollments' | 'payments' | 'suspensions' | 'integrations';

// Tipos locais — o servidor retorna mais campos que os tipos mínimos da API
interface Enrollment {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  studentBelt?: string;
  studentStripes?: number;
  studentPhoto?: string | null;
  professorUid?: string;
  monthlyFee: number;
  dueDay: number;
  status: string;
  pixKey?: string;
  notes?: string;
  suspendReason?: string;
}

interface Payment {
  id: string;
  enrollmentId?: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  amount: number;
  dueDate: string;
  paidAt?: string | null;
  status: string;
  month: string;
  receiptUrl?: string;
}

interface Member {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  belt: string;
  stripes?: number;
  xp?: number;
  totalTrainings?: number;
  photo?: string | null;
}

const inputStyle: React.CSSProperties = {
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

const ACCENT = '#E87722';

export default function AcademiaFinanceiro() {
  const { user } = useAuth();
  const [tab, setTab] = useState<FinTab>('enrollments');

  // Matrículas
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  // Pagamentos
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentMonth, setPaymentMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  // Suspensão automática
  const [autoSuspendDays, setAutoSuspendDays] = useState(10);
  const [autoSuspendInput, setAutoSuspendInput] = useState('10');
  const [savingSettings, setSavingSettings] = useState(false);

  // Integrações
  const [integration, setIntegration] = useState<PaymentIntegrationSettings | null>(null);
  const [integrationForm, setIntegrationForm] = useState({
    manualPaymentsEnabled: true,
    asaasEnabled: false,
    asaasBillingTypes: ['PIX'] as string[],
    asaasApiKey: '',
  });
  const [savingIntegration, setSavingIntegration] = useState(false);

  // Matrícula
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [enrollStudent, setEnrollStudent] = useState<Member | null>(null);
  const [enrollForm, setEnrollForm] = useState({ monthlyFee: '', dueDay: '5', pixKey: '', notes: '' });
  const [savingEnroll, setSavingEnroll] = useState(false);

  // Suspensão manual
  const [suspendTarget, setSuspendTarget] = useState<Enrollment | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  // ─── Carregar dados ─────────────────────────────────────────────────────

  const loadEnrollments = useCallback(async () => {
    if (!user) return;
    setEnrollmentsLoading(true);
    try {
      const docs = await api.enrollments.list({ professorUid: user.uid }) as unknown as Enrollment[];
      docs.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
      setEnrollments(docs);
    } catch { setEnrollments([]); }
    finally { setEnrollmentsLoading(false); }
  }, [user]);

  const loadMembers = useCallback(async () => {
    if (!user) return;
    try {
      const docs = await api.users.list({ academyId: user.uid }) as unknown as Member[];
      // Apenas alunos — excluir professores
      const students = docs.filter((m: any) => !m.role || m.role === 'student');
      students.sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));
      setMembers(students);
    } catch { setMembers([]); }
  }, [user]);

  const loadPayments = useCallback(async (month: string) => {
    if (!user) return;
    setPaymentsLoading(true);
    try {
      const all = await api.payments.list({ professorUid: user.uid }) as unknown as Payment[];
      const today = new Date().toISOString().slice(0, 10);
      const filtered = all
        .filter(p => (p.month === month) || (p.dueDate?.slice(0, 7) === month))
        .map(p => {
          if (p.status === 'pending' && p.dueDate < today) return { ...p, status: 'overdue' as const };
          return p;
        });
      const byStudent = new Map<string, Payment>();
      filtered.forEach(p => {
        const ex = byStudent.get(p.studentUid);
        if (!ex || new Date(p.dueDate).getTime() > new Date(ex.dueDate).getTime()) byStudent.set(p.studentUid, p);
      });
      const docs = Array.from(byStudent.values());
      docs.sort((a, b) => a.studentName.localeCompare(b.studentName));
      setPayments(docs);
    } catch { setPayments([]); }
    finally { setPaymentsLoading(false); }
  }, [user]);

  const loadSettings = useCallback(async () => {
    try {
      const s = await api.financialSettings.get();
      setAutoSuspendDays(s.autoSuspendAfterDays);
      setAutoSuspendInput(String(s.autoSuspendAfterDays));
    } catch { /* usa default */ }
  }, []);

  const loadIntegration = useCallback(async () => {
    try {
      const s = await api.paymentIntegrations.get();
      setIntegration(s);
      setIntegrationForm({
        manualPaymentsEnabled: s.manualPaymentsEnabled,
        asaasEnabled: s.asaasEnabled,
        asaasBillingTypes: (s as any).asaasBillingTypes || [(s as any).asaasBillingType || 'PIX'],
        asaasApiKey: '',
      });
    } catch { /* offline */ }
  }, []);

  useEffect(() => { loadEnrollments(); loadMembers(); loadSettings(); loadIntegration(); }, [loadEnrollments, loadMembers, loadSettings, loadIntegration]);
  useEffect(() => { loadPayments(paymentMonth); }, [paymentMonth, loadPayments]);

  // ─── Ações ──────────────────────────────────────────────────────────────

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setSuspending(true);
    try {
      await (api.enrollments.update as any)(suspendTarget.id, { status: 'suspended', suspendReason });
      toast.success('Aluno suspenso');
      setSuspendTarget(null);
      loadEnrollments();
    } catch { toast.error('Erro ao suspender'); }
    finally { setSuspending(false); }
  };

  const handleReactivate = async (enr: Enrollment) => {
    try {
      await api.enrollments.update(enr.id, { status: 'active' });
      toast.success('Aluno reativado');
      loadEnrollments();
    } catch { toast.error('Erro ao reativar'); }
  };

  const handleDeleteEnrollment = async (enr: Enrollment) => {
    if (!confirm(`Excluir matrícula de ${enr.studentName}?`)) return;
    try {
      await api.enrollments.update(enr.id, { status: 'cancelled' });
      toast.success('Matrícula cancelada');
      loadEnrollments();
    } catch { toast.error('Erro ao cancelar'); }
  };

  const handleMarkPaid = async (payment: Payment) => {
    try {
      await api.payments.update(payment.id, { status: 'paid', paidAt: new Date().toISOString().slice(0, 10) });
      toast.success('Pagamento registrado');
      loadPayments(paymentMonth);
    } catch { toast.error('Erro ao registrar pagamento'); }
  };

  const handleCreateEnrollment = async () => {
    if (!enrollStudent) return;
    setSavingEnroll(true);
    try {
      await api.enrollments.create({
        professorUid: user!.uid,
        professorName: (user as any)?.academyName || 'Academia',
        studentUid: enrollStudent.uid,
        studentName: enrollStudent.name,
        studentEmail: enrollStudent.email || '',
        studentPhone: enrollStudent.phone || '',
        studentBelt: enrollStudent.belt,
        monthlyFee: Number(enrollForm.monthlyFee) || 0,
        dueDay: Number(enrollForm.dueDay) || 5,
        pixKey: enrollForm.pixKey,
        notes: enrollForm.notes,
      } as any);
      toast.success('Matrícula criada');
      setShowEnroll(false);
      setEnrollStudent(null);
      setEnrollForm({ monthlyFee: '', dueDay: '5', pixKey: '', notes: '' });
      loadEnrollments();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar matrícula');
    } finally {
      setSavingEnroll(false);
    }
  };

  const handleSaveSettings = async () => {
    const n = Math.max(0, Math.min(365, Math.floor(Number(autoSuspendInput) || 0)));
    setSavingSettings(true);
    try {
      await api.financialSettings.update({ autoSuspendAfterDays: n });
      setAutoSuspendDays(n);
      setAutoSuspendInput(String(n));
      toast.success(n > 0 ? `Suspensão automática: ${n} dia(s)` : 'Suspensão automática desativada');
    } catch { toast.error('Erro ao salvar'); }
    finally { setSavingSettings(false); }
  };

  const handleSaveIntegration = async () => {
    setSavingIntegration(true);
    try {
      const payload = { ...integrationForm, asaasSandbox: false };
      if (!payload.asaasApiKey) delete (payload as any).asaasApiKey;
      const s = await api.paymentIntegrations.update(payload);
      setIntegration(s);
      toast.success('Integração salva');
    } catch { toast.error('Erro ao salvar integração'); }
    finally { setSavingIntegration(false); }
  };

  const handleGerarCobrancas = async () => {
    const ativas = enrollments.filter(e => e.status === 'active');
    if (ativas.length === 0) { toast.info('Nenhuma matrícula ativa'); return; }
    if (!confirm(`Gerar ${ativas.length} cobrança(s) para este mês?`)) return;
    let count = 0;
    for (const enr of ativas) {
      try {
        await api.payments.create({
          enrollmentId: enr.id,
          studentUid: enr.studentUid,
          studentName: enr.studentName,
          studentEmail: enr.studentEmail,
          amount: enr.monthlyFee,
          dueDate: `${paymentMonth}-${String(enr.dueDay).padStart(2, '0')}`,
          status: 'pending',
          month: paymentMonth,
          professorUid: user!.uid,
          pixKey: enr.pixKey || '',
        } as any);
        count++;
      } catch { /* continua */ }
    }
    toast.success(`${count} cobrança(s) gerada(s)`);
    loadPayments(paymentMonth);
  };

  // ─── Filtros ────────────────────────────────────────────────────────────

  const filteredPayments = payments.filter(p => {
    if (paymentFilter === 'all') return true;
    return p.status === paymentFilter;
  });

  const enrolledUids = new Set(enrollments.filter(e => e.status !== 'cancelled').map(e => e.studentUid));
  const membersSemMatricula = members.filter(m => !enrolledUids.has(m.uid));

  const activeCount = enrollments.filter(e => e.status === 'active').length;
  const suspendedCount = enrollments.filter(e => e.status === 'suspended').length;
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue').length;

  // ─── Render ─────────────────────────────────────────────────────────────

  const FIN_TABS: { id: FinTab; label: string; icon: string }[] = [
    { id: 'enrollments', label: 'MATRÍCULAS', icon: '📝' },
    { id: 'payments', label: 'MENSALIDADES', icon: '💳' },
    { id: 'suspensions', label: 'SUSPENSÕES', icon: '🚫' },
    { id: 'integrations', label: 'INTEGRAÇÕES', icon: '🔌' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Sub-abas */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1E1E1E' }}>
        {FIN_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '0.75rem 0.25rem', minHeight: '56px', background: 'transparent',
              border: 'none', borderBottom: tab === t.id ? `2px solid ${ACCENT}` : '2px solid transparent',
              color: tab === t.id ? '#FFF' : '#555',
              fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
              fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <motion.div key={tab} variants={tabVariant} initial="initial" animate="animate" transition={tabTransition}>

        {/* ─── MATRÍCULAS ─── */}
        {tab === 'enrollments' && (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.85rem', color: '#AAA', textTransform: 'uppercase' }}>
                  {enrollments.length} MATRÍCULA(S) · {activeCount} ATIVAS
                </span>
                {membersSemMatricula.length > 0 && (
                  <span style={{ marginLeft: '0.5rem', fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.6rem', color: ACCENT, border: `1px solid ${ACCENT}`, padding: '0.1rem 0.4rem', textTransform: 'uppercase' }}>
                    {membersSemMatricula.length} SEM MATRÍCULA
                  </span>
                )}
              </div>
              <button onClick={() => setShowEnroll(true)}
                style={{ background: ACCENT, border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem 0.8rem', cursor: 'pointer' }}>
                + MATRICULAR
              </button>
            </div>

            {enrollmentsLoading ? <Loading /> : enrollments.length === 0 ? <Empty text="Nenhuma matrícula" /> : (
              enrollments.map(enr => {
                const statusColor = enr.status === 'active' ? '#4CAF50' : enr.status === 'suspended' ? '#FF8C00' : enr.status === 'pending' ? '#1A6ECC' : '#555';
                const statusLabel = enr.status === 'active' ? 'ATIVO' : enr.status === 'suspended' ? 'SUSPENSO' : enr.status === 'pending' ? 'AGUARDANDO' : 'CANCELADO';
                const m = members.find(x => x.uid === enr.studentUid);
                const bc = BELT_COLORS[m?.belt || 'Branca'] || '#555';
                return (
                  <div key={enr.id} style={{ background: '#111', border: `1px solid #1E1E1E`, borderLeft: `3px solid ${statusColor}`, padding: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${bc}`, background: bc + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                          {m?.photo ? <img src={m.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.65rem', color: bc }}>{(enr.studentName || 'A')[0].toUpperCase()}</span>}
                        </div>
                        <div>
                          <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>{enr.studentName}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: bc, margin: 0 }}>Faixa {m?.belt || 'Branca'}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.6rem', color: statusColor, border: `1px solid ${statusColor}`, padding: '0.12rem 0.35rem', textTransform: 'uppercase', display: 'block' }}>{statusLabel}</span>
                        <span style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.85rem', color: ACCENT, marginTop: '0.2rem', display: 'block' }}>R$ {enr.monthlyFee.toFixed(2)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{ fontFamily: FONTS.condensed, fontSize: '0.65rem', color: '#555', textTransform: 'uppercase' }}>VENCE DIA {enr.dueDay}</span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {enr.status === 'active' && (
                          <button onClick={() => { setSuspendTarget(enr); setSuspendReason(''); }}
                            style={{ background: 'transparent', border: '1px solid #FF8C00', color: '#FF8C00', fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.35rem 0.6rem', cursor: 'pointer' }}>SUSPENDER</button>
                        )}
                        {enr.status === 'suspended' && (
                          <button onClick={() => handleReactivate(enr)}
                            style={{ background: 'transparent', border: '1px solid #4CAF50', color: '#4CAF50', fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.35rem 0.6rem', cursor: 'pointer' }}>REATIVAR</button>
                        )}
                        <button onClick={() => handleDeleteEnrollment(enr)}
                          style={{ background: 'transparent', border: '1px solid #CC0000', color: '#CC0000', fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.35rem 0.6rem', cursor: 'pointer' }}>EXCLUIR</button>
                      </div>
                    </div>
                    {enr.status === 'suspended' && enr.suspendReason && (
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#FF8C00', marginTop: '0.3rem' }}>Motivo: {enr.suspendReason}</p>
                    )}
                  </div>
                );
              })
            )}

            {/* Membros sem matrícula */}
            {membersSemMatricula.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.65rem', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>⚠ MEMBROS SEM MATRÍCULA</p>
                {membersSemMatricula.map(m => {
                  const bc = BELT_COLORS[m.belt] || '#555';
                  return (
                    <div key={m.uid} style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderLeft: `3px solid ${ACCENT}`, padding: '0.5rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.8rem', color: '#CCC', textTransform: 'uppercase' }}>{m.name}</span>
                      <button onClick={() => { setEnrollStudent(m); setShowEnroll(true); }}
                        style={{ background: 'transparent', border: `1px solid ${ACCENT}`, color: ACCENT, fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                        MATRICULAR
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── MENSALIDADES ─── */}
        {tab === 'payments' && (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="month" value={paymentMonth} onChange={e => setPaymentMonth(e.target.value)}
                style={{ ...inputStyle, width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} />
              <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as any)}
                style={{ ...inputStyle, width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontFamily: FONTS.condensed, fontWeight: 700, textTransform: 'uppercase' }}>
                <option value="all">TODOS</option>
                <option value="pending">PENDENTES</option>
                <option value="paid">PAGOS</option>
                <option value="overdue">VENCIDOS</option>
              </select>
              <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>
                {filteredPayments.length} cobrança(s)
              </span>
              <div style={{ flex: 1 }} />
              <button onClick={handleGerarCobrancas}
                style={{ background: ACCENT, border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.7rem', cursor: 'pointer' }}>
                + GERAR COBRANÇAS
              </button>
            </div>

            {paymentsLoading ? <Loading /> : filteredPayments.length === 0 ? <Empty text="Nenhuma cobrança" /> : (
              filteredPayments.map(p => {
                const statusColor = p.status === 'paid' ? '#4CAF50' : p.status === 'overdue' ? '#CC0000' : '#1A6ECC';
                const statusLabel = p.status === 'paid' ? 'PAGO' : p.status === 'overdue' ? 'VENCIDO' : 'PENDENTE';
                return (
                  <div key={p.id} style={{ background: '#111', border: `1px solid #1E1E1E`, borderLeft: `3px solid ${statusColor}`, padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.85rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>{p.studentName}</p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#666', margin: 0 }}>
                        Venc: {new Date(p.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        {p.paidAt ? ` · Pago: ${new Date(p.paidAt + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.85rem', color: ACCENT }}>R$ {p.amount.toFixed(2)}</span>
                      <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.6rem', color: statusColor, border: `1px solid ${statusColor}`, padding: '0.1rem 0.35rem', textTransform: 'uppercase' }}>{statusLabel}</span>
                      {(p.status === 'pending' || p.status === 'overdue') && (
                        <button onClick={() => handleMarkPaid(p)}
                          style={{ background: '#0A2A1A', border: '1px solid #4CAF50', color: '#4CAF50', fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>
                          PAGAR
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── SUSPENSÕES ─── */}
        {tab === 'suspensions' && (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
              <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.85rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>⚙ SUSPENSÃO AUTOMÁTICA</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', marginTop: '0.3rem', lineHeight: 1.5 }}>
                Alunos com mensalidade vencida há mais de X dias são suspensos automaticamente.
                Ao pagar, a reativação também é automática.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
                <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.75rem', color: '#888' }}>Dias de tolerância:</span>
                <input value={autoSuspendInput} onChange={e => setAutoSuspendInput(e.target.value)}
                  type="number" min={0} max={365}
                  style={{ ...inputStyle, width: '70px', padding: '0.4rem 0.5rem', textAlign: 'center' }} />
                <button onClick={handleSaveSettings} disabled={savingSettings}
                  style={{ background: savingSettings ? '#333' : ACCENT, border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
                  {savingSettings ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#555', marginTop: '0.4rem' }}>
                {autoSuspendDays > 0 ? `Atual: ${autoSuspendDays} dia(s). 0 = desativado.` : 'Suspensão automática desativada.'}
              </p>
            </div>

            {suspendedCount > 0 && (
              <div>
                <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.75rem', color: '#FF8C00', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  {suspendedCount} ALUNO(S) SUSPENSO(S)
                </p>
                {enrollments.filter(e => e.status === 'suspended').map(enr => (
                  <div key={enr.id} style={{ background: '#1A1000', border: '1px solid #FF8C0044', borderLeft: '3px solid #FF8C00', padding: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <div>
                      <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.8rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>{enr.studentName}</p>
                      {enr.suspendReason && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#FF8C00', margin: 0 }}>{enr.suspendReason}</p>}
                    </div>
                    <button onClick={() => handleReactivate(enr)}
                      style={{ background: 'transparent', border: '1px solid #4CAF50', color: '#4CAF50', fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
                      REATIVAR
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── INTEGRAÇÕES ─── */}
        {tab === 'integrations' && (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Manual */}
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={integrationForm.manualPaymentsEnabled}
                  onChange={e => setIntegrationForm(f => ({ ...f, manualPaymentsEnabled: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: ACCENT }} />
                <span style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.85rem', color: '#FFF', textTransform: 'uppercase' }}>💵 PAGAMENTO MANUAL</span>
              </div>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#888', lineHeight: 1.5 }}>
                Controle total: você registra cada pagamento manualmente. Ideal para quem recebe via PIX, dinheiro ou transferência.
              </p>
            </div>

            {/* Asaas */}
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input type="checkbox" checked={integrationForm.asaasEnabled}
                  onChange={e => setIntegrationForm(f => ({ ...f, asaasEnabled: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: ACCENT }} />
                <span style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.85rem', color: '#FFF', textTransform: 'uppercase' }}>🏦 ASAAS (AUTOMÁTICO)</span>
              </div>
              {integrationForm.asaasEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingLeft: '1.5rem' }}>
                  <div>
                    <p style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Tipos de cobrança</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {[
                        { id: 'PIX', label: 'PIX' },
                        { id: 'CREDIT_CARD', label: 'CARTÃO DE CRÉDITO' },
                        { id: 'DEBIT_CARD', label: 'CARTÃO DE DÉBITO' },
                      ].map(t => (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={integrationForm.asaasBillingTypes.includes(t.id)}
                            onChange={e => {
                              setIntegrationForm(f => ({
                                ...f,
                                asaasBillingTypes: e.target.checked
                                  ? [...f.asaasBillingTypes, t.id]
                                  : f.asaasBillingTypes.filter(x => x !== t.id),
                              }));
                            }}
                            style={{ width: 16, height: 16, accentColor: ACCENT }}
                          />
                          <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#CCC' }}>{t.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Chave de API</p>
                    <input value={integrationForm.asaasApiKey}
                      onChange={e => setIntegrationForm(f => ({ ...f, asaasApiKey: e.target.value }))}
                      type="password" placeholder={integration?.hasAsaasApiKey ? '•••••••• (mantida)' : '$aact_...'}
                      style={inputStyle} />
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleSaveIntegration} disabled={savingIntegration}
              style={{ background: savingIntegration ? '#333' : ACCENT, border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.7rem', cursor: 'pointer', width: '100%' }}>
              {savingIntegration ? 'SALVANDO...' : '💾 SALVAR INTEGRAÇÕES'}
            </button>
          </div>
        )}

      </motion.div>

      {/* ─── Modal: Matricular aluno ─── */}
      {showEnroll && (
        <Modal onClose={() => { setShowEnroll(false); setEnrollStudent(null); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>Nova matrícula</p>

            {!enrollStudent ? (
              <>
                <input value={enrollSearch} onChange={e => setEnrollSearch(e.target.value)}
                  placeholder="Buscar aluno por nome..." style={inputStyle} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '200px', overflow: 'auto' }}>
                  {members.filter(m => m.name.toLowerCase().includes(enrollSearch.toLowerCase()) && !enrolledUids.has(m.uid)).slice(0, 10).map(m => (
                    <button key={m.uid} onClick={() => setEnrollStudent(m)}
                      style={{ background: '#111', border: '1px solid #222', color: '#FFF', padding: '0.6rem', cursor: 'pointer', textAlign: 'left', fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.8rem' }}>
                      {m.name} · {m.belt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ background: '#111', border: '1px solid #222', padding: '0.7rem', fontFamily: FONTS.condensed, fontWeight: 900, color: '#FFF', fontSize: '0.85rem' }}>
                  {enrollStudent.name} · {enrollStudent.belt}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <p style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.6rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Mensalidade R$</p>
                    <input value={enrollForm.monthlyFee} onChange={e => setEnrollForm(f => ({ ...f, monthlyFee: e.target.value }))}
                      type="number" step="0.01" placeholder="0,00" style={inputStyle} />
                  </div>
                  <div>
                    <p style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.6rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Vence dia</p>
                    <input value={enrollForm.dueDay} onChange={e => setEnrollForm(f => ({ ...f, dueDay: e.target.value }))}
                      type="number" min={1} max={31} style={inputStyle} />
                  </div>
                </div>
                <input value={enrollForm.pixKey} onChange={e => setEnrollForm(f => ({ ...f, pixKey: e.target.value }))}
                  placeholder="Chave PIX (opcional)" style={inputStyle} />
                <input value={enrollForm.notes} onChange={e => setEnrollForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Observações" style={inputStyle} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setEnrollStudent(null)}
                    style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#777', fontFamily: FONTS.condensed, fontWeight: 800, padding: '0.65rem', cursor: 'pointer', textTransform: 'uppercase' }}>Voltar</button>
                  <button onClick={handleCreateEnrollment} disabled={!enrollForm.monthlyFee || savingEnroll}
                    style={{ flex: 2, background: (!enrollForm.monthlyFee || savingEnroll) ? '#333' : ACCENT, border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, padding: '0.65rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                    {savingEnroll ? 'Salvando...' : 'Matricular'}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ─── Modal: Suspender ─── */}
      {suspendTarget && (
        <Modal onClose={() => setSuspendTarget(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1rem', color: '#FF8C00', textTransform: 'uppercase', margin: 0 }}>Suspender {suspendTarget.studentName}</p>
            <input value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
              placeholder="Motivo da suspensão" style={inputStyle} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setSuspendTarget(null)}
                style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#777', fontFamily: FONTS.condensed, fontWeight: 800, padding: '0.65rem', cursor: 'pointer', textTransform: 'uppercase' }}>Cancelar</button>
              <button onClick={handleSuspend} disabled={suspending}
                style={{ flex: 2, background: suspending ? '#333' : '#FF8C00', border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, padding: '0.65rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                {suspending ? 'Suspendendo...' : 'Confirmar suspensão'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Componentes auxiliares ────────────────────────────────────────────────

function Loading() {
  return <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>;
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem', textAlign: 'center' }}>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#555', textTransform: 'uppercase', margin: 0 }}>{text}</p>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0A0A0A', border: '1px solid #222', padding: '1.25rem', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
