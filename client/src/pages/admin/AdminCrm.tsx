// BJJRats — Admin CRM completo

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import api, { type CrmData, type AdminMetrics } from '@/lib/api';
import { fadeUp, staggerContainer, tabVariant, tabTransition } from '@/lib/animations';
import { FONTS } from '@/lib/design';

type CrmTab = 'overview' | 'financial' | 'metrics';

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
    { id: 'financial' as CrmTab, label: 'FINANCEIRO' },
    { id: 'metrics' as CrmTab, label: 'MÉTRICAS' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            CRM
          </h1>
          <p style={{ color: '#666', fontSize: '0.85rem', fontFamily: FONTS.condensed, letterSpacing: '0.05em', marginTop: '0.125rem' }}>
            Receita de assinaturas da plataforma
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
        {tab === 'financial' && <FinancialTab data={data} />}
        {tab === 'metrics' && <MetricsTab />}
      </motion.div>
    </motion.div>
  );
}

// ─── Overview ──────────────────────────────────────────────────────────────

function OverviewTab({ data, onRefresh }: { data: CrmData; onRefresh: () => void }) {
  const { revenue, studentStats, defaultingStudents } = data;
  const mrr = revenue?.mrr ?? revenue?.projectedMonthly ?? 0;
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">

      {/* Revenue cards — plataforma */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <StatCard label="MRR" value={`R$ ${mrr.toFixed(0)}`} color="#22C55E" />
        <StatCard label="Previsto/ano" value={`R$ ${(mrr * 12).toFixed(0)}`} color="#3B82F6" />
        <StatCard label="Assinantes ativos" value={`${studentStats?.active ?? 0}`} color="#22C55E" />
        <StatCard label="Em trial" value={`${studentStats?.suspended ?? 0}`} color="#3B82F6" />
        <StatCard label="Inadimplentes" value={`${studentStats?.cancelled ?? 0}`} color="#CC0000" />
      </motion.div>

      {/* Subscriber distribution + evolution */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">ASSINANTES</p>
          <div className="flex items-stretch gap-2 mt-2" style={{ minHeight: '60px' }}>
            {[
              { label: 'Ativos', count: studentStats?.active ?? 0, color: '#22C55E' },
              { label: 'Trial', count: studentStats?.suspended ?? 0, color: '#3B82F6' },
              { label: 'Inadimplentes', count: studentStats?.cancelled ?? 0, color: '#CC0000' },
            ].map(s => (
              <div key={s.label} className="flex-1 flex flex-col items-center justify-center text-center" style={{ background: '#0A0A0A', borderRadius: '8px', padding: '0.5rem' }}>
                <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.25rem', color: s.color }}>{s.count}</span>
                <span style={{ fontFamily: FONTS.condensed, fontSize: '0.55rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {data.revenueMonthly.length > 0 && (
          <div className="bjj-card" style={{ padding: '1.25rem' }}>
            <p className="bjj-label">NOVAS ASSINATURAS POR MÊS</p>
            <RevenueChart data={data.revenueMonthly} />
          </div>
        )}
      </motion.div>

      {/* Defaulting subscribers */}
      {(defaultingStudents?.length ?? 0) > 0 && (
        <motion.div variants={fadeUp}>
          <p className="bjj-label" style={{ color: '#CC0000' }}>ASSINANTES INADIMPLENTES</p>
          <div className="bjj-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {defaultingStudents?.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #1A1A1A', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <span style={{ fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#CCC' }}>{p.studentName || p.id}</span>
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

// ─── Financial ─────────────────────────────────────────────────────────────

function FinancialTab({ data }: { data: CrmData }) {
  const { revenue, defaultingStudents } = data;
  const mrr = (revenue as any)?.mrr ?? revenue?.projectedMonthly ?? 0;
  const defaultingTotal = defaultingStudents?.reduce((a, p) => a + Number(p.amount), 0) ?? 0;
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatCard label="MRR" value={`R$ ${mrr.toFixed(2)}`} color="#22C55E" />
        <StatCard label="Previsto anual" value={`R$ ${(mrr * 12).toFixed(2)}`} color="#3B82F6" />
        <StatCard label="Assinantes ativos" value={`${revenue.activeEnrollments}`} color="#22C55E" />
        <StatCard label="Inadimplentes" value={`${defaultingStudents?.length ?? 0}`} color="#CC0000" />
        <StatCard label="Total inadimplência" value={`R$ ${defaultingTotal.toFixed(2)}`} color="#CC0000" />
        <StatCard label="Ticket médio" value={revenue.activeEnrollments > 0 ? `R$ ${(mrr / revenue.activeEnrollments).toFixed(2)}` : 'R$ 0,00'} color="#FFF" />
      </motion.div>

      {data.revenueMonthly.length > 0 && (
        <motion.div variants={fadeUp} className="bjj-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <p className="bjj-label">NOVAS ASSINATURAS POR MÊS</p>
          <RevenueChart data={data.revenueMonthly} height={160} showCount />
        </motion.div>
      )}

      {(defaultingStudents?.length ?? 0) > 0 && (
        <motion.div variants={fadeUp}>
          <p className="bjj-label" style={{ color: '#CC0000' }}>ASSINANTES INADIMPLENTES — Total: R$ {defaultingTotal.toFixed(2)}</p>
          <div className="bjj-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {defaultingStudents?.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1A1A1A', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <span style={{ fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#CCC' }}>{p.studentName || p.id}</span>
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

// ─── Metrics ──────────────────────────────────────────────────────────────

function MetricsTab() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.getMetrics()
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ color: '#666', fontFamily: FONTS.condensed, padding: '2rem 0', textAlign: 'center' }}>CARREGANDO...</div>;
  }

  if (!metrics) {
    return <div style={{ color: '#666', fontFamily: FONTS.condensed, padding: '2rem 0', textAlign: 'center' }}>Erro ao carregar métricas.</div>;
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      {/* Overview cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <StatCard label="Total faturado" value={fmt(metrics.overview.totalBilled)} color="#22C55E" />
        <StatCard label="Total recebido" value={fmt(metrics.overview.totalPaid)} color="#22C55E" />
        <StatCard label="Pendente" value={fmt(metrics.overview.totalPending)} color="#E87722" />
        <StatCard label="Vencido" value={fmt(metrics.overview.totalOverdue)} color="#CC0000" />
        <StatCard label="Taxa de recebimento" value={`${metrics.overview.paidRate}%`} color="#3B82F6" />
      </motion.div>

      {/* Second row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <StatCard label="Previsto/mês" value={fmt(metrics.overview.monthlyProjected)} color="#3B82F6" />
        <StatCard label="Total de registros" value={`${metrics.overview.totalRows ?? 0}`} color="#FFF" />
        <StatCard label="Pagos" value={`${metrics.overview.countPaid}`} color="#22C55E" />
        <StatCard label="Pendentes" value={`${metrics.overview.countPending}`} color="#E87722" />
        <StatCard label="Vencidos" value={`${metrics.overview.countOverdue}`} color="#CC0000" />
      </motion.div>

      {/* Revenue chart + Enrollment breakdown */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {metrics.monthlyRevenue.length > 0 && (
          <div className="bjj-card" style={{ padding: '1.25rem' }}>
            <p className="bjj-label">RECEITA MENSAL DA PLATAFORMA</p>
            <RevenueChart data={metrics.monthlyRevenue} height={160} />
          </div>
        )}
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">MATRÍCULAS</p>
          <div className="flex items-stretch gap-2 mt-2" style={{ minHeight: '60px' }}>
            {metrics.enrollmentBreakdown.map(s => {
              const color = s.status === 'active' ? '#22C55E' : s.status === 'suspended' ? '#E87722' : '#666';
              return (
                <div key={s.status} className="flex-1 flex flex-col items-center justify-center text-center" style={{ background: '#0A0A0A', borderRadius: '8px', padding: '0.5rem' }}>
                  <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '1.25rem', color }}>{s.count}</span>
                  <span style={{ fontFamily: FONTS.condensed, fontSize: '0.55rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.status === 'active' ? 'Ativas' : s.status === 'suspended' ? 'Suspensas' : s.status}</span>
                  <span style={{ fontFamily: FONTS.condensed, fontSize: '0.6rem', color: '#888', marginTop: '0.15rem' }}>{fmt(s.monthly)}/mês</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Top earners */}
      <motion.div variants={fadeUp}>
        <p className="bjj-label">TOP 20 — MAIORES FATURAMENTOS</p>
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          {metrics.topEarners.length === 0 ? (
            <p style={{ color: '#555', fontSize: '0.85rem', fontFamily: FONTS.condensed }}>Nenhum pagamento registrado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {metrics.topEarners.map((e, i) => (
                <div key={e.professorUid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1A1A1A', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.7rem', color: '#444', width: '24px', textAlign: 'right' }}>#{i + 1}</span>
                    <span style={{ fontFamily: FONTS.condensed, fontSize: '0.85rem', color: '#CCC' }}>{e.name}</span>
                    {e.role && (
                      <span style={{ fontFamily: FONTS.condensed, fontSize: '0.55rem', color: '#555', background: '#111', padding: '1px 6px', textTransform: 'uppercase' }}>{e.role === 'academy' ? 'Academia' : 'Professor'}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontFamily: FONTS.condensed, fontSize: '0.65rem', color: '#666' }}>{e.countPaid} pgto{e.countPaid !== 1 ? 's' : ''}</span>
                    <span style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.85rem', color: '#22C55E' }}>{fmt(e.totalPaid)}</span>
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
