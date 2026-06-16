import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api, { type CrmData } from '@/lib/api';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { FONTS } from '@/lib/design';

type CrmTab = 'overview' | 'financial' | 'students' | 'leads' | 'attendance';

function money(value?: number) {
  return `R$ ${Number(value ?? 0).toFixed(2)}`;
}

export default function AcademiaCrm() {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<CrmTab>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.academy.getCrmData());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bjj-skeleton h-24 rounded-xl" />)}
      </motion.div>
    );
  }

  if (!data) {
    return (
      <div className="bjj-card" style={{ padding: '1.25rem' }}>
        <p style={{ color: '#E87722', fontFamily: FONTS.condensed, fontWeight: 800, textTransform: 'uppercase' }}>
          Erro ao carregar o CRM da academia.
        </p>
        <button onClick={load} className="bjj-btn-ghost" style={{ marginTop: '0.75rem' }}>TENTAR NOVAMENTE</button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as CrmTab, label: 'Visao geral' },
    { id: 'financial' as CrmTab, label: 'Financeiro' },
    { id: 'students' as CrmTab, label: 'Alunos' },
    { id: 'leads' as CrmTab, label: 'Leads' },
    { id: 'attendance' as CrmTab, label: 'Frequencia' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            CRM da Academia
          </h1>
          <p style={{ color: '#666', fontSize: '0.85rem', fontFamily: FONTS.condensed, letterSpacing: '0.05em', marginTop: '0.125rem' }}>
            Relacionamento, alunos, frequencia e financeiro da sua academia
          </p>
        </div>
        <button onClick={load} className="bjj-btn-ghost" style={{ fontSize: '0.7rem', padding: '0.4rem 0.75rem' }}>
          ATUALIZAR
        </button>
      </motion.div>

      <motion.div variants={fadeUp} className="flex gap-0 mb-5" style={{ background: '#111', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '2px', display: 'inline-flex', flexWrap: 'wrap' }}>
        {tabs.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              background: tab === item.id ? '#E87722' : 'transparent',
              color: tab === item.id ? '#FFF' : '#666',
              fontFamily: FONTS.condensed,
              fontWeight: 800,
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              padding: '0.4rem 1rem',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {item.label}
          </button>
        ))}
      </motion.div>

      {tab === 'overview' && <Overview data={data} />}
      {tab === 'financial' && <Financial data={data} />}
      {tab === 'students' && <Students data={data} />}
      {tab === 'leads' && <Leads data={data} />}
      {tab === 'attendance' && <Attendance data={data} />}
    </motion.div>
  );
}

function Overview({ data }: { data: CrmData }) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatCard label="Recebido" value={money(data.revenue.totalPaid)} color="#22C55E" />
        <StatCard label="Pendente" value={money(data.revenue.totalPending)} color="#E87722" />
        <StatCard label="Vencido" value={money(data.revenue.totalOverdue)} color="#CC0000" />
        <StatCard label="Mensal previsto" value={money(data.revenue.projectedMonthly)} color="#3B82F6" />
        <StatCard label="Alunos ativos" value={data.studentStats?.active ?? 0} color="#22C55E" />
        <StatCard label="Frequencia" value={`${data.attendance?.rate ?? 0}%`} color="#3B82F6" />
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentPayments data={data} />
        <AttentionList data={data} />
      </motion.div>
    </motion.div>
  );
}

function Financial({ data }: { data: CrmData }) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatCard label="Faturado" value={money(data.revenue.totalBilled)} color="#22C55E" />
        <StatCard label="Recebido" value={money(data.revenue.totalPaid)} color="#22C55E" />
        <StatCard label="Pendente" value={money(data.revenue.totalPending)} color="#E87722" />
        <StatCard label="Vencido" value={money(data.revenue.totalOverdue)} color="#CC0000" />
        <StatCard label="Mensal" value={money(data.revenue.projectedMonthly)} color="#3B82F6" />
        <StatCard label="Anual" value={money(data.revenue.projectedAnnual)} color="#3B82F6" />
      </motion.div>
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyRevenue data={data} />
        <Defaulting data={data} />
      </motion.div>
    </motion.div>
  );
}

function Students({ data }: { data: CrmData }) {
  const stats = data.studentStats;
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total" value={stats?.total ?? 0} color="#FFF" />
        <StatCard label="Ativos" value={stats?.active ?? 0} color="#22C55E" />
        <StatCard label="Suspensos" value={stats?.suspended ?? 0} color="#E87722" />
        <StatCard label="Cancelados" value={stats?.cancelled ?? 0} color="#CC0000" />
      </motion.div>
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BeltDistribution data={data} />
        <EnrollmentEvolution data={data} />
      </motion.div>
    </motion.div>
  );
}

function Leads({ data }: { data: CrmData }) {
  return (
    <motion.div variants={fadeUp} className="bjj-card" style={{ padding: '1.25rem' }}>
      <p className="bjj-label">Entradas recentes</p>
      <DataList
        empty="Nenhuma entrada registrada."
        rows={(data.leadsDetail ?? []).map(lead => ({
          id: lead.id,
          left: lead.studentName || 'Aluno',
          right: lead.status || 'pending',
          hint: [lead.studentBelt, lead.studentEmail].filter(Boolean).join(' - '),
        }))}
      />
    </motion.div>
  );
}

function Attendance({ data }: { data: CrmData }) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Check-ins 30d" value={data.attendance?.checkInsLast30Days ?? 0} color="#3B82F6" />
        <StatCard label="Alunos" value={data.attendance?.totalStudents ?? 0} color="#FFF" />
        <StatCard label="Taxa" value={`${data.attendance?.rate ?? 0}%`} color="#22C55E" />
        <StatCard label="Inativos" value={data.inactiveStudents?.length ?? 0} color="#E87722" />
      </motion.div>
      <motion.div variants={fadeUp}>
        <AttentionList data={data} />
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bjj-card" style={{ padding: '1.1rem' }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, color, lineHeight: 1, fontFamily: FONTS.condensed }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem', fontFamily: FONTS.condensed }}>
        {label}
      </div>
    </div>
  );
}

function RecentPayments({ data }: { data: CrmData }) {
  return (
    <div className="bjj-card" style={{ padding: '1.25rem' }}>
      <p className="bjj-label">Ultimos pagamentos</p>
      <DataList
        empty="Nenhum pagamento registrado."
        rows={data.recentPayments.map(payment => ({
          id: payment.id,
          left: payment.studentName || 'Aluno',
          right: money(payment.amount),
          hint: payment.status || 'pending',
        }))}
      />
    </div>
  );
}

function AttentionList({ data }: { data: CrmData }) {
  return (
    <div className="bjj-card" style={{ padding: '1.25rem' }}>
      <p className="bjj-label">Alunos que precisam de atencao</p>
      <DataList
        empty="Nenhum aluno em alerta."
        rows={(data.inactiveStudents ?? []).map(student => ({
          id: student.studentUid || student.studentName || 'inactive',
          left: student.studentName || 'Aluno',
          right: `${student.daysSinceLastCheckIn} dias`,
          hint: 'Sem check-in recente',
        }))}
      />
    </div>
  );
}

function Defaulting({ data }: { data: CrmData }) {
  return (
    <div className="bjj-card" style={{ padding: '1.25rem' }}>
      <p className="bjj-label">Inadimplentes</p>
      <DataList
        empty="Nenhuma cobranca vencida."
        rows={(data.defaultingStudents ?? []).map(payment => ({
          id: payment.id,
          left: payment.studentName || 'Aluno',
          right: money(payment.amount),
          hint: payment.status || 'overdue',
        }))}
      />
    </div>
  );
}

function MonthlyRevenue({ data }: { data: CrmData }) {
  const max = Math.max(...data.revenueMonthly.map(row => row.total), 1);
  return (
    <div className="bjj-card" style={{ padding: '1.25rem' }}>
      <p className="bjj-label">Receita mensal</p>
      {data.revenueMonthly.length === 0 ? (
        <p style={{ color: '#555', fontSize: '0.85rem', fontFamily: FONTS.condensed, marginTop: '0.5rem' }}>Nenhuma receita registrada.</p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 140, paddingTop: '1rem' }}>
          {data.revenueMonthly.map(row => (
            <div key={row.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontFamily: FONTS.condensed, fontSize: '0.58rem', color: '#888' }}>{money(row.total)}</span>
              <div style={{ width: '100%', height: `${Math.max((row.total / max) * 100, 4)}%`, background: 'linear-gradient(to top, #22C55E, #4ADE80)', borderRadius: '3px 3px 0 0' }} />
              <span style={{ fontFamily: FONTS.condensed, fontSize: '0.55rem', color: '#555', textTransform: 'uppercase' }}>
                {new Date(`${row.month}-01`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BeltDistribution({ data }: { data: CrmData }) {
  return (
    <div className="bjj-card" style={{ padding: '1.25rem' }}>
      <p className="bjj-label">Alunos por faixa</p>
      <DataList
        empty="Nenhum aluno cadastrado."
        rows={(data.studentsByBelt ?? []).map(row => ({
          id: row.belt || 'sem-faixa',
          left: row.belt || 'Sem faixa',
          right: String(row.count),
        }))}
      />
    </div>
  );
}

function EnrollmentEvolution({ data }: { data: CrmData }) {
  return (
    <div className="bjj-card" style={{ padding: '1.25rem' }}>
      <p className="bjj-label">Matriculas por mes</p>
      <DataList
        empty="Nenhuma matricula registrada."
        rows={(data.enrollmentEvolution ?? []).map(row => ({
          id: row.month,
          left: new Date(`${row.month}-01`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          right: String(row.newEnrollments),
        }))}
      />
    </div>
  );
}

function DataList({ rows, empty }: { rows: { id: string; left: string; right: string; hint?: string }[]; empty: string }) {
  if (rows.length === 0) {
    return <p style={{ color: '#555', fontSize: '0.85rem', fontFamily: FONTS.condensed, marginTop: '0.5rem' }}>{empty}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
      {rows.slice(0, 12).map(row => (
        <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.55rem 0', borderBottom: '1px solid #1A1A1A' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: FONTS.condensed, fontSize: '0.9rem', color: '#CCC', margin: 0 }}>{row.left}</p>
            {row.hint && <p style={{ fontFamily: FONTS.condensed, fontSize: '0.68rem', color: '#666', margin: 0 }}>{row.hint}</p>}
          </div>
          <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.85rem', color: '#E87722', whiteSpace: 'nowrap' }}>{row.right}</span>
        </div>
      ))}
    </div>
  );
}
