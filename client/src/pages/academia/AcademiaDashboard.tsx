import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Banknote,
  CalendarCheck,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import api, { type AcademyProfessorLink, type CrmData } from '@/lib/api';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { FONTS } from '@/lib/design';
import { useAuth } from '@/contexts/AuthContext';

const ACCENT = '#E87722';

function money(value?: number | null) {
  return `R$ ${Number(value ?? 0).toFixed(2)}`;
}

function statusLabel(status?: string | null) {
  if (status === 'paid') return 'Pago';
  if (status === 'overdue') return 'Vencido';
  if (status === 'pending') return 'Pendente';
  if (status === 'active') return 'Ativo';
  if (status === 'suspended') return 'Suspenso';
  return status || 'Sem status';
}

function formatDate(value?: string | Date | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
}

function formatMonth(value: string) {
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

export default function AcademiaDashboard() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<CrmData | null>(null);
  const [professors, setProfessors] = useState<AcademyProfessorLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const academyName = (profile as any)?.academyName || (profile as any)?.academy || user?.name || 'Academia';

  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const [crmResult, professorResult] = await Promise.allSettled([
        api.academy.getCrmData(),
        api.academy.professors.list(),
      ]);

      if (crmResult.status === 'rejected') {
        throw crmResult.reason;
      }

      setData(crmResult.value);
      setProfessors(professorResult.status === 'fulfilled' ? professorResult.value : []);
    } catch {
      setData(null);
      setProfessors([]);
      setError('Nao foi possivel carregar o dashboard da academia.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeProfessors = useMemo(
    () => professors.filter(item => item.status === 'active'),
    [professors],
  );

  const partnerInvites = useMemo(
    () => professors.filter(item => item.relationType === 'partner' && item.status === 'pending'),
    [professors],
  );

  if (loading) {
    return (
      <motion.div initial="hidden" animate="show" variants={staggerContainer}>
        <div className="bjj-skeleton h-8 w-64 rounded-lg mb-2" />
        <div className="bjj-skeleton h-4 w-44 rounded mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(item => <div key={item} className="bjj-skeleton h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bjj-skeleton h-64 rounded-xl" />
          <div className="bjj-skeleton h-64 rounded-xl" />
        </div>
      </motion.div>
    );
  }

  if (!data) {
    return (
      <div className="bjj-card" style={{ padding: '1.25rem', borderLeft: `3px solid ${ACCENT}` }}>
        <p style={{ color: ACCENT, fontFamily: FONTS.condensed, fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
          {error || 'Dashboard indisponivel.'}
        </p>
        <button onClick={load} className="bjj-btn-ghost" style={{ marginTop: '0.75rem' }}>
          TENTAR NOVAMENTE
        </button>
      </div>
    );
  }

  const defaultingCount = data.defaultingStudents?.length ?? 0;
  const inactiveCount = data.inactiveStudents?.length ?? 0;
  const studentStats = data.studentStats;
  const attendance = data.attendance;

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Dashboard da Academia
          </h1>
          <p style={{ color: '#666', fontSize: '0.85rem', fontFamily: FONTS.condensed, letterSpacing: '0.05em', marginTop: '0.125rem' }}>
            {academyName}
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="bjj-btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', padding: '0.45rem 0.75rem' }}
        >
          <RefreshCw size={14} />
          {refreshing ? 'ATUALIZANDO...' : 'ATUALIZAR'}
        </button>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard icon={<Users size={18} />} label="Alunos ativos" value={studentStats?.active ?? 0} color="#22C55E" />
        <StatCard icon={<AlertTriangle size={18} />} label="Suspensos" value={studentStats?.suspended ?? 0} color="#E87722" />
        <StatCard icon={<UserCheck size={18} />} label="Professores" value={activeProfessors.length} color="#3B82F6" />
        <StatCard icon={<CalendarCheck size={18} />} label="Check-ins 30d" value={attendance?.checkInsLast30Days ?? 0} color="#0EA5E9" />
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Banknote size={18} />} label="Recebido" value={money(data.revenue.totalPaid)} color="#22C55E" />
        <StatCard icon={<Banknote size={18} />} label="Pendente" value={money(data.revenue.totalPending)} color={ACCENT} />
        <StatCard icon={<AlertTriangle size={18} />} label="Vencido" value={money(data.revenue.totalOverdue)} color="#CC0000" />
        <StatCard icon={<TrendingUp size={18} />} label="Mensal previsto" value={money(data.revenue.projectedMonthly)} color="#3B82F6" />
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <HealthCard
          title="Operacao"
          rows={[
            { label: 'Total de alunos', value: String(studentStats?.total ?? 0), color: '#FFF' },
            { label: 'Matriculas ativas', value: String(data.revenue.activeEnrollments ?? 0), color: '#22C55E' },
            { label: 'Frequencia media', value: `${attendance?.rate ?? 0}%`, color: '#0EA5E9' },
            { label: 'Convites parceiros', value: String(partnerInvites.length), color: ACCENT },
          ]}
        />
        <HealthCard
          title="Alertas"
          rows={[
            { label: 'Inadimplentes', value: String(defaultingCount), color: defaultingCount > 0 ? '#CC0000' : '#22C55E' },
            { label: 'Baixa frequencia', value: String(inactiveCount), color: inactiveCount > 0 ? ACCENT : '#22C55E' },
            { label: 'Receita vencida', value: money(data.revenue.totalOverdue), color: data.revenue.totalOverdue > 0 ? '#CC0000' : '#22C55E' },
          ]}
        />
        <RevenueChart rows={data.revenueMonthly ?? []} />
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataList
          title="Ultimos pagamentos"
          empty="Nenhum pagamento registrado."
          rows={(data.recentPayments ?? []).slice(0, 8).map(payment => ({
            id: payment.id,
            left: payment.studentName || 'Aluno',
            right: money(payment.amount),
            hint: [statusLabel(payment.status), formatDate(payment.paidAt || payment.dueDate)].filter(Boolean).join(' - '),
            color: payment.status === 'paid' ? '#22C55E' : payment.status === 'overdue' ? '#CC0000' : ACCENT,
          }))}
        />
        <DataList
          title="Alunos em atencao"
          empty="Nenhum aluno em alerta."
          rows={[
            ...(data.defaultingStudents ?? []).map(payment => ({
              id: `payment-${payment.id}`,
              left: payment.studentName || 'Aluno',
              right: money(payment.amount),
              hint: `Mensalidade ${statusLabel(payment.status).toLowerCase()}${payment.dueDate ? ` - ${formatDate(payment.dueDate)}` : ''}`,
              color: '#CC0000',
            })),
            ...(data.inactiveStudents ?? []).map(student => ({
              id: `inactive-${student.studentUid || student.studentName}`,
              left: student.studentName || 'Aluno',
              right: `${student.daysSinceLastCheckIn} dias`,
              hint: 'Sem check-in recente',
              color: ACCENT,
            })),
          ].slice(0, 8)}
        />
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bjj-card" style={{ padding: '1rem', minHeight: 104, borderLeft: `3px solid ${color}` }}>
      <div style={{ color, marginBottom: '0.55rem' }}>{icon}</div>
      <div style={{ fontSize: '1.45rem', fontWeight: 900, color, lineHeight: 1, fontFamily: FONTS.condensed }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.3rem', fontFamily: FONTS.condensed }}>
        {label}
      </div>
    </div>
  );
}

function HealthCard({ title, rows }: { title: string; rows: { label: string; value: string; color: string }[] }) {
  return (
    <div className="bjj-card" style={{ padding: '1.25rem' }}>
      <p className="bjj-label">{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.75rem' }}>
        {rows.map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid #1A1A1A', paddingBottom: '0.55rem' }}>
            <span style={{ fontFamily: FONTS.condensed, color: '#888', fontSize: '0.85rem', textTransform: 'uppercase' }}>{row.label}</span>
            <span style={{ fontFamily: FONTS.condensed, color: row.color, fontSize: '0.95rem', fontWeight: 900 }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueChart({ rows }: { rows: CrmData['revenueMonthly'] }) {
  const visibleRows = rows.slice(-6);
  const max = Math.max(...visibleRows.map(row => row.total), 1);

  return (
    <div className="bjj-card" style={{ padding: '1.25rem' }}>
      <p className="bjj-label">Receita mensal</p>
      {visibleRows.length === 0 ? (
        <p style={{ color: '#555', fontSize: '0.85rem', fontFamily: FONTS.condensed, marginTop: '0.75rem' }}>Nenhuma receita registrada.</p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 150, paddingTop: '1rem' }}>
          {visibleRows.map(row => (
            <div key={row.month} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontFamily: FONTS.condensed, fontSize: '0.6rem', color: '#888', whiteSpace: 'nowrap' }}>{money(row.total)}</span>
              <div style={{ width: '100%', height: `${Math.max((row.total / max) * 100, 5)}%`, background: `linear-gradient(to top, ${ACCENT}, #F59E0B)`, borderRadius: '3px 3px 0 0', minHeight: 6 }} />
              <span style={{ fontFamily: FONTS.condensed, fontSize: '0.58rem', color: '#555', textTransform: 'uppercase' }}>
                {formatMonth(row.month)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DataList({ title, rows, empty }: { title: string; rows: { id: string; left: string; right: string; hint?: string; color: string }[]; empty: string }) {
  return (
    <div className="bjj-card" style={{ padding: '1.25rem' }}>
      <p className="bjj-label">{title}</p>
      {rows.length === 0 ? (
        <p style={{ color: '#555', fontSize: '0.85rem', fontFamily: FONTS.condensed, marginTop: '0.75rem' }}>{empty}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.6rem' }}>
          {rows.map(row => (
            <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid #1A1A1A' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: FONTS.condensed, fontSize: '0.95rem', color: '#CCC', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.left}</p>
                {row.hint && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#666', margin: 0 }}>{row.hint}</p>}
              </div>
              <span style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.88rem', color: row.color, whiteSpace: 'nowrap' }}>{row.right}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
