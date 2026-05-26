// BJJRats — Admin CRM completo

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import api, { type CrmData } from '@/lib/api';
import { fadeUp, staggerContainer, tabVariant, tabTransition } from '@/lib/animations';
import { FONTS } from '@/lib/design';

type CrmTab = 'overview' | 'leads' | 'financial' | 'students' | 'attendance';

export default function AdminCrm() {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<CrmTab>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.admin.getCrmData();
      setData(d);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid grid-cols-4 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="bjj-skeleton h-24 rounded-xl" />)}
      </motion.div>
    );
  }

  if (!data) {
    return <p style={{ color: '#555', fontFamily: FONTS.condensed }}>Erro ao carregar dados do CRM.</p>;
  }

  const tabs = [
    { id: 'overview' as CrmTab, label: 'VISÃO GERAL' },
    { id: 'leads' as CrmTab, label: 'LEADS' },
    { id: 'financial' as CrmTab, label: 'FINANCEIRO' },
    { id: 'students' as CrmTab, label: 'ALUNOS' },
    { id: 'attendance' as CrmTab, label: 'FREQUÊNCIA' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            CRM
          </h1>
          <p style={{ color: '#666', fontSize: '0.85rem', fontFamily: FONTS.condensed, letterSpacing: '0.05em', marginTop: '0.125rem' }}>
            Relacionamento com academias e alunos
          </p>
        </div>
        <button onClick={load} className="bjj-btn-ghost" style={{ fontSize: '0.7rem', padding: '0.4rem 0.75rem' }}>
          ↻ ATUALIZAR
        </button>
      </motion.div>

      {/* Sub-tabs */}
      <motion.div variants={fadeUp} className="flex gap-0 mb-5" style={{ background: '#111', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '2px', display: 'inline-flex', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? '#CC0000' : 'transparent',
              color: tab === t.id ? '#FFF' : '#666',
              fontFamily: FONTS.condensed,
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              padding: '0.4rem 1rem',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </motion.div>

      <motion.div key={tab} variants={tabVariant} initial="initial" animate="animate" transition={tabTransition}>
        {tab === 'overview' && <OverviewTab data={data} onRefresh={load} />}
        {tab === 'leads' && <LeadsTab data={data} />}
        {tab === 'financial' && <FinancialTab data={data} />}
        {tab === 'students' && <StudentsTab data={data} />}
        {tab === 'attendance' && <AttendanceTab data={data} />}
      </motion.div>
    </motion.div>
  );
}

// ─── Overview ──────────────────────────────────────────────────────────────

function OverviewTab({ data, onRefresh }: { data: CrmData; onRefresh: () => void }) {
  const { revenue, studentStats, attendance, inactiveStudents, defaultingStudents } = data;
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">

      {/* Revenue cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatCard label="Faturado" value={`R$ ${revenue.totalBilled.toFixed(0)}`} color="#22C55E" />
        <StatCard label="Recebido" value={`R$ ${revenue.totalPaid.toFixed(0)}`} color="#22C55E" />
        <StatCard label="Pendente" value={`R$ ${revenue.totalPending.toFixed(0)}`} color="#E87722" />
        <StatCard label="Vencido" value={`R$ ${revenue.totalOverdue.toFixed(0)}`} color="#CC0000" />
        <StatCard label="Previsto/mês" value={`R$ ${revenue.projectedMonthly.toFixed(0)}`} color="#3B82F6" />
        <StatCard label="Previsto/ano" value={`R$ ${revenue.projectedAnnual.toFixed(0)}`} color="#3B82F6" />
      </motion.div>

      {/* Second row: students + attendance + inactive alert */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Student stats */}
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">ALUNOS</p>
          <div className="flex items-stretch gap-2 mt-2" style={{ minHeight: '60px' }}>
            {[
              { label: 'Ativos', count: studentStats?.active ?? 0, color: '#22C55E' },
              { label: 'Suspensos', count: studentStats?.suspended ?? 0, color: '#E87722' },
              { label: 'Cancelados', count: studentStats?.cancelled ?? 0, color: '#CC0000' },
            ].map(s => (
              <div key={s.label} className="flex-1 flex flex-col items-center justify-center text-center" style={{ background: '#0A0A0A', borderRadius: '8px', padding: '0.5rem' }}>
                <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.25rem', color: s.color }}>{s.count}</span>
                <span style={{ fontFamily: FONTS.condensed, fontSize: '0.55rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance rate */}
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">FREQUÊNCIA (30 DIAS)</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.75rem', color: '#3B82F6' }}>
              {attendance?.rate ?? 0}%
            </span>
            <span style={{ fontFamily: FONTS.condensed, fontSize: '0.75rem', color: '#666' }}>
              {attendance?.checkInsLast30Days ?? 0} check-ins / {attendance?.totalStudents ?? 0} alunos
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#1A1A1A', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(attendance?.rate ?? 0, 100)}%`, height: '100%', background: '#3B82F6', borderRadius: '3px' }} />
          </div>
        </div>

        {/* Inactive students alert */}
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">ALUNOS INATIVOS</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.75rem', color: (inactiveStudents?.length ?? 0) > 0 ? '#E87722' : '#22C55E' }}>
              {inactiveStudents?.length ?? 0}
            </span>
            <span style={{ fontFamily: FONTS.condensed, fontSize: '0.75rem', color: '#666' }}>
              sem treinar há 15+ dias
            </span>
          </div>
          {(inactiveStudents?.length ?? 0) > 0 && (
            <div style={{ marginTop: '0.5rem', maxHeight: '80px', overflowY: 'auto' }}>
              {inactiveStudents?.slice(0, 5).map(s => (
                <div key={s.studentUid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#888', fontFamily: FONTS.condensed, padding: '2px 0', borderBottom: '1px solid #1A1A1A' }}>
                  <span>{s.studentName}</span>
                  <span style={{ color: s.daysSinceLastCheckIn > 30 ? '#CC0000' : '#E87722' }}>{s.daysSinceLastCheckIn}d</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Lead pipeline + Revenue chart */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">PIPELINE DE LEADS</p>
          <PipelineBars data={data} />
        </div>
        {data.revenueMonthly.length > 0 && (
          <div className="bjj-card" style={{ padding: '1.25rem' }}>
            <p className="bjj-label">FATURAMENTO MENSAL (RECEBIDO)</p>
            <RevenueChart data={data.revenueMonthly} />
          </div>
        )}
      </motion.div>

      {/* Defaulting students */}
      {(defaultingStudents?.length ?? 0) > 0 && (
        <motion.div variants={fadeUp}>
          <p className="bjj-label" style={{ color: '#CC0000' }}>INADIMPLENTES</p>
          <div className="bjj-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {defaultingStudents?.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #1A1A1A', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <span style={{ fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#CCC' }}>{p.studentName || '—'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.85rem', color: '#CC0000' }}>R$ {Number(p.amount).toFixed(2)}</span>
                    <PaymentBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent payments */}
      <motion.div variants={fadeUp}>
        <p className="bjj-label">ÚLTIMOS PAGAMENTOS</p>
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          {data.recentPayments.length === 0 ? (
            <p style={{ color: '#555', fontSize: '0.85rem', fontFamily: FONTS.condensed }}>Nenhum pagamento registrado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {data.recentPayments.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1A1A1A', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <span style={{ fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#CCC' }}>{p.studentName || '—'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.85rem', color: p.status === 'paid' ? '#22C55E' : p.status === 'overdue' ? '#CC0000' : '#E87722' }}>
                      R$ {Number(p.amount).toFixed(2)}
                    </span>
                    <PaymentBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Leads ─────────────────────────────────────────────────────────────────

function LeadsTab({ data }: { data: CrmData }) {
  const pending = data.leads.find(l => l.status === 'pending')?.count ?? 0;
  const accepted = data.leads.find(l => l.status === 'accepted')?.count ?? 0;
  const rejected = data.leads.find(l => l.status === 'rejected')?.count ?? 0;
  const total = pending + accepted + rejected;

  const leadsList = data.leadsDetail ?? [];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="bjj-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <p className="bjj-label">HISTÓRICO DE ENTRADAS</p>
        <div className="flex flex-col gap-3 mt-2">
          <FunnelStage label="Automáticas" count={total} total={total} color="#22C55E" />
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <p className="bjj-label">TODAS AS ENTRADAS</p>
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          {leadsList.length === 0 ? (
            <p style={{ color: '#555', fontSize: '0.85rem', fontFamily: FONTS.condensed }}>Nenhuma entrada registrada.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {leadsList.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid #1A1A1A', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '150px' }}>
                    {l.studentPhoto ? (
                      <img src={l.studentPhoto} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTS.condensed, fontSize: '0.75rem', color: '#666' }}>
                        {l.studentName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#CCC', fontWeight: 600 }}>{l.studentName || '—'}</span>
                      <span style={{ fontFamily: FONTS.condensed, fontSize: '0.65rem', color: '#666' }}>
                        {l.studentBelt || 'Faixa não informada'} {l.studentEmail ? `• ${l.studentEmail}` : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontFamily: FONTS.condensed, fontSize: '0.65rem', color: '#22C55E' }}>
                    Matrícula criada
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Financial ─────────────────────────────────────────────────────────────

function FinancialTab({ data }: { data: CrmData }) {
  const { revenue, defaultingStudents } = data;
  const defaultingTotal = defaultingStudents?.reduce((a, p) => a + Number(p.amount), 0) ?? 0;
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatCard label="Total faturado" value={`R$ ${revenue.totalBilled.toFixed(2)}`} color="#22C55E" />
        <StatCard label="Total recebido" value={`R$ ${revenue.totalPaid.toFixed(2)}`} color="#22C55E" />
        <StatCard label="Pendente" value={`R$ ${revenue.totalPending.toFixed(2)}`} color="#E87722" />
        <StatCard label="Vencido" value={`R$ ${revenue.totalOverdue.toFixed(2)}`} color="#CC0000" />
        <StatCard label="Inadimplência" value={revenue.totalBilled > 0 ? `${((revenue.totalOverdue / revenue.totalBilled) * 100).toFixed(1)}%` : '0%'} color="#CC0000" />
        <StatCard label="A receber em aberto" value={`R$ ${(revenue.totalPending + revenue.totalOverdue).toFixed(2)}`} color="#E87722" />
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">RECEITA MENSAL PREVISTA</p>
          <p style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '2rem', color: '#3B82F6', margin: '0.5rem 0 0' }}>
            R$ {revenue.projectedMonthly.toFixed(2)}
          </p>
          <p style={{ fontFamily: FONTS.condensed, fontSize: '0.75rem', color: '#666' }}>
            {revenue.activeEnrollments} matrícula{revenue.activeEnrollments !== 1 ? 's' : ''} ativa{revenue.activeEnrollments !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">RECEITA ANUAL PREVISTA</p>
          <p style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '2rem', color: '#3B82F6', margin: '0.5rem 0 0' }}>
            R$ {revenue.projectedAnnual.toFixed(2)}
          </p>
          <p style={{ fontFamily: FONTS.condensed, fontSize: '0.75rem', color: '#666' }}>
            Projeção anual com base nas matrículas atuais
          </p>
        </div>
      </motion.div>

      {data.revenueMonthly.length > 0 && (
        <motion.div variants={fadeUp} className="bjj-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <p className="bjj-label">HISTÓRICO DE FATURAMENTO (RECEBIDO)</p>
          <RevenueChart data={data.revenueMonthly} height={160} showCount />
        </motion.div>
      )}

      {/* Defaulting */}
      {(defaultingStudents?.length ?? 0) > 0 && (
        <motion.div variants={fadeUp}>
          <p className="bjj-label" style={{ color: '#CC0000' }}>INADIMPLENTES — Total: R$ {defaultingTotal.toFixed(2)}</p>
          <div className="bjj-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {defaultingStudents?.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1A1A1A', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <span style={{ fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#CCC' }}>{p.studentName || '—'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.85rem', color: '#CC0000' }}>R$ {Number(p.amount).toFixed(2)}</span>
                    <PaymentBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Students ──────────────────────────────────────────────────────────────

function StudentsTab({ data }: { data: CrmData }) {
  const { studentStats, enrollmentEvolution, studentsByBelt, inactiveStudents } = data;

  const enrollmentTotal = enrollmentEvolution?.reduce((a, e) => a + e.newEnrollments, 0) ?? 0;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      {/* Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total de alunos" value={studentStats?.total ?? 0} color="#FFF" />
        <StatCard label="Matrículas ativas" value={studentStats?.active ?? 0} color="#22C55E" />
        <StatCard label="Suspensos" value={studentStats?.suspended ?? 0} color="#E87722" />
        <StatCard label="Cancelados" value={studentStats?.cancelled ?? 0} color="#CC0000" />
      </motion.div>

      {/* Enrollment evolution + Belt distribution */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Enrollments over time */}
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">MATRÍCULAS POR MÊS ({enrollmentTotal} total)</p>
          {enrollmentEvolution && enrollmentEvolution.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '120px', paddingTop: '0.5rem' }}>
              {enrollmentEvolution.map((r) => {
                const max = Math.max(...enrollmentEvolution.map(x => x.newEnrollments), 1);
                const h = (r.newEnrollments / max) * 100;
                return (
                  <div key={r.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ fontFamily: FONTS.condensed, fontSize: '0.6rem', color: '#888' }}>{r.newEnrollments}</span>
                    <div style={{ width: '100%', height: `${Math.max(h, 4)}%`, background: 'linear-gradient(to top, #3B82F6, #60A5FA)', borderRadius: '3px 3px 0 0', minHeight: '4px' }} />
                    <span style={{ fontFamily: FONTS.condensed, fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {new Date(r.month + '-01').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#555', fontSize: '0.85rem', fontFamily: FONTS.condensed, marginTop: '0.5rem' }}>Nenhuma matrícula registrada.</p>
          )}
        </div>

        {/* Belt distribution */}
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">ALUNOS POR FAIXA</p>
          {studentsByBelt && studentsByBelt.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
              {studentsByBelt.map(b => {
                const total = studentsByBelt.reduce((a, x) => a + x.count, 0) || 1;
                const pct = (b.count / total) * 100;
                const beltColors: Record<string, string> = {
                  'Branca': '#E5E7EB',
                  'Azul': '#3B82F6',
                  'Roxa': '#8B5CF6',
                  'Marrom': '#78350F',
                  'Preta': '#111',
                };
                return (
                  <div key={b.belt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: FONTS.condensed, fontSize: '0.75rem', color: '#CCC', width: '70px', flexShrink: 0 }}>{b.belt || 'Sem faixa'}</span>
                    <div style={{ flex: 1, height: '16px', background: '#1A1A1A', borderRadius: '8px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: beltColors[b.belt ?? ''] || '#555', borderRadius: '8px', minWidth: '4px' }} />
                    </div>
                    <span style={{ fontFamily: FONTS.condensed, fontSize: '0.7rem', color: '#888', width: '40px', textAlign: 'right' }}>{b.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#555', fontSize: '0.85rem', fontFamily: FONTS.condensed, marginTop: '0.5rem' }}>Nenhum aluno cadastrado.</p>
          )}
        </div>
      </motion.div>

      {/* Inactive students */}
      {(inactiveStudents?.length ?? 0) > 0 && (
        <motion.div variants={fadeUp}>
          <p className="bjj-label" style={{ color: '#E87722' }}>ALUNOS INATIVOS (15+ DIAS SEM TREINAR)</p>
          <div className="bjj-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {inactiveStudents?.map(s => (
                <div key={s.studentUid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1A1A1A', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <span style={{ fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#CCC' }}>{s.studentName || '—'}</span>
                  <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.8rem', color: s.daysSinceLastCheckIn > 30 ? '#CC0000' : '#E87722' }}>
                    {s.daysSinceLastCheckIn} dias sem treinar
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Attendance (Frequência) ──────────────────────────────────────────────

function AttendanceTab({ data }: { data: CrmData }) {
  const { attendance, inactiveStudents, studentStats } = data;
  const riskStudents = inactiveStudents?.filter(s => s.daysSinceLastCheckIn > 30) ?? [];
  const warningStudents = inactiveStudents?.filter(s => s.daysSinceLastCheckIn > 14 && s.daysSinceLastCheckIn <= 30) ?? [];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Check-ins (30d)" value={attendance?.checkInsLast30Days ?? 0} color="#3B82F6" />
        <StatCard label="Alunos" value={attendance?.totalStudents ?? 0} color="#FFF" />
        <StatCard label="Taxa de frequência" value={`${attendance?.rate ?? 0}%`} color="#22C55E" />
        <StatCard label="Matrículas ativas" value={studentStats?.active ?? 0} color="#22C55E" />
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Attendance rate card */}
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">TAXA DE FREQUÊNCIA</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.25rem' }}>
            <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '3rem', color: '#3B82F6' }}>
              {attendance?.rate ?? 0}%
            </span>
          </div>
          <div style={{ width: '100%', height: '10px', background: '#1A1A1A', borderRadius: '5px', marginTop: '0.5rem', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(attendance?.rate ?? 0, 100)}%`, height: '100%', background: 'linear-gradient(to right, #3B82F6, #22C55E)', borderRadius: '5px' }} />
          </div>
          <p style={{ fontFamily: FONTS.condensed, fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
            {attendance?.checkInsLast30Days ?? 0} check-ins nos últimos 30 dias entre {attendance?.totalStudents ?? 0} alunos
          </p>
        </div>

        {/* Evasion risk */}
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">RISCO DE EVASÃO</p>
          <div className="flex items-stretch gap-2 mt-3" style={{ minHeight: '60px' }}>
            <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ background: '#0A0A0A', borderRadius: '8px', padding: '0.75rem' }}>
              <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.5rem', color: '#E87722' }}>{warningStudents.length}</span>
              <span style={{ fontFamily: FONTS.condensed, fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Alerta (15-30d)</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ background: '#0A0A0A', borderRadius: '8px', padding: '0.75rem' }}>
              <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.5rem', color: '#CC0000' }}>{riskStudents.length}</span>
              <span style={{ fontFamily: FONTS.condensed, fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Crítico (30+ dias)</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ background: '#0A0A0A', borderRadius: '8px', padding: '0.75rem' }}>
              <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.5rem', color: '#22C55E' }}>{(studentStats?.active ?? 0) - (inactiveStudents?.length ?? 0)}</span>
              <span style={{ fontFamily: FONTS.condensed, fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Frequentes</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Inactive students detail */}
      {(inactiveStudents?.length ?? 0) > 0 && (
        <motion.div variants={fadeUp}>
          <p className="bjj-label">ALUNOS INATIVOS</p>
          <div className="bjj-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {inactiveStudents?.map(s => (
                <div key={s.studentUid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1A1A1A', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <span style={{ fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#CCC' }}>{s.studentName || '—'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '80px', height: '6px', background: '#1A1A1A', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min((s.daysSinceLastCheckIn / 60) * 100, 100)}%`,
                        height: '100%',
                        background: s.daysSinceLastCheckIn > 30 ? '#CC0000' : s.daysSinceLastCheckIn > 20 ? '#E87722' : '#E8772288',
                        borderRadius: '3px',
                      }} />
                    </div>
                    <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.8rem', color: s.daysSinceLastCheckIn > 30 ? '#CC0000' : '#E87722' }}>
                      {s.daysSinceLastCheckIn}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bjj-card" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1, fontFamily: FONTS.condensed }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem', fontFamily: FONTS.condensed }}>
        {label}
      </div>
    </div>
  );
}

function PaymentBadge({ status }: { status?: string | null }) {
  const colors: Record<string, string> = { paid: '#22C55E', pending: '#E87722', overdue: '#CC0000', suspended: '#666' };
  const labels: Record<string, string> = { paid: 'PAGO', pending: 'PENDENTE', overdue: 'VENCIDO', suspended: 'SUSPENSO' };
  const s = status || 'pending';
  return (
    <span style={{ background: (colors[s] ?? '#666') + '22', color: colors[s] ?? '#666', fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.55rem', letterSpacing: '0.08em', padding: '2px 6px' }}>
      {labels[s] ?? s}
    </span>
  );
}

function FunnelStage({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#CCC' }}>{label}</span>
        <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.85rem', color }}>
          {count} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div style={{ width: '100%', height: '8px', background: '#1A1A1A', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function PipelineBars({ data }: { data: CrmData }) {
  return (
    <div className="flex items-stretch gap-2 mt-3" style={{ minHeight: '80px' }}>
      {[
        { status: 'pending', label: 'Pendentes', color: '#E87722' },
        { status: 'accepted', label: 'Aceitos', color: '#22C55E' },
        { status: 'rejected', label: 'Rejeitados', color: '#CC0000' },
      ].map(s => {
        const found = data.leads.find(l => l.status === s.status);
        const count = found?.count ?? 0;
        const total = data.leads.reduce((a, l) => a + l.count, 0) || 1;
        const pct = (count / total) * 100;
        return (
          <div key={s.status} className="flex-1 flex flex-col items-center justify-center text-center" style={{ background: '#0A0A0A', borderRadius: '8px', padding: '0.75rem' }}>
            <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.5rem', color: s.color }}>{count}</span>
            <span style={{ fontFamily: FONTS.condensed, fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.125rem' }}>{s.label}</span>
            <div style={{ width: '100%', height: '4px', background: '#1A1A1A', borderRadius: '2px', marginTop: '0.375rem', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: '2px' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RevenueChart({ data, height = 120, showCount = false }: { data: { month: string; total: number; count: number }[]; height?: number; showCount?: boolean }) {
  const max = Math.max(...data.map(x => x.total), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: `${height}px`, paddingTop: showCount ? '1rem' : '0.5rem' }}>
      {data.map((r) => {
        const h = (r.total / max) * 100;
        return (
          <div key={r.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            {showCount && (
              <span style={{ fontFamily: FONTS.condensed, fontSize: '0.55rem', color: '#22C55E', whiteSpace: 'nowrap' }}>{r.count} pgto{r.count !== 1 ? 's' : ''}</span>
            )}
            <span style={{ fontFamily: FONTS.condensed, fontSize: '0.6rem', color: '#888' }}>R${(r.total / 1000).toFixed(1)}k</span>
            <div style={{ width: '100%', height: `${Math.max(h, 4)}%`, background: 'linear-gradient(to top, #22C55E, #4ADE80)', borderRadius: '3px 3px 0 0', minHeight: '4px' }} />
            <span style={{ fontFamily: FONTS.condensed, fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {new Date(r.month + '-01').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
