// BJJRats PWA — Minhas Mensalidades (visão do aluno)
// Design: "Cage Fighter" — Brutalismo Tático
// Exibe cobranças pendentes, link PIX e histórico de pagamentos confirmados pelo professor

import { useState, useEffect, useCallback } from 'react';
import api, { publicApi, type PaymentIntegrationSettings } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Payment {
  id: string;
  professorUid: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  amount: number;
  dueDate: string | null;  // YYYY-MM-DD
  paidAt: string | null;   // YYYY-MM-DD
  status: 'pending' | 'paid' | 'overdue' | 'suspended';
  pixLink?: string;
  createdAt: string | null;
}

interface Enrollment {
  id: string;
  professorUid: string;
  professorName: string;
  academyName: string;
  monthlyFee: number;
  dueDay: number;
  status: 'active' | 'suspended' | 'cancelled' | 'rejected';
  pixKey?: string;
}

function isOpenEnrollmentStatus(status: Enrollment['status'] | string | null | undefined): boolean {
  const normalized = String(status || '').toLowerCase();
  return normalized !== 'cancelled' && normalized !== 'rejected';
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 700,
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#666',
};

const valueStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 900,
  fontSize: '1.1rem',
  color: '#FFFFFF',
};

const STATUS_CONFIG = {
  pending:   { label: 'PENDENTE',   color: '#FF8C00', bg: '#1A0F00' },
  overdue:   { label: 'ATRASADO',   color: '#CC0000', bg: '#1A0000' },
  paid:      { label: 'PAGO',       color: '#4CAF50', bg: '#0A1A0A' },
  suspended: { label: 'SUSPENSO',   color: '#888',    bg: '#111' },
};

function formatDate(ts: string | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(`${ts}T00:00:00`);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

function formatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface Props {
  onBack: () => void;
}

export default function MinhasMensalidades({ onBack }: Props) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<Record<string, PaymentIntegrationSettings | null>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const enrollList = await api.enrollments.list({ studentUid: user.uid }) as Enrollment[];
      setEnrollments(enrollList);

      // Busca métodos de pagamento de cada professor/academia
      const methodsMap: Record<string, PaymentIntegrationSettings | null> = {};
      await Promise.all(enrollList.filter((enroll) => isOpenEnrollmentStatus(enroll.status)).map(async (enroll) => {
        try {
          methodsMap[enroll.professorUid] = await publicApi.getPaymentMethods(enroll.professorUid);
        } catch {
          methodsMap[enroll.professorUid] = null;
        }
      }));
      setPaymentMethods(methodsMap);

      const now = new Date();
      const rawPayments = await api.payments.list({ studentUid: user.uid }) as Payment[];
      const today = now.toISOString().slice(0, 10);
      const payList = rawPayments
        .sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''))
        .map(p => {
          if (p.status === 'pending' && p.dueDate && p.dueDate < today) {
            return { ...p, status: 'overdue' as const };
          }
          return p;
        });
      setPayments(payList);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar mensalidades');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);
  const openEnrollments = enrollments.filter((enroll) => isOpenEnrollmentStatus(enroll.status));

  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const totalPaid    = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  const copyPix = (key: string) => {
    navigator.clipboard.writeText(key).then(() => toast.success('Chave PIX copiada!'));
  };

  const openPaymentAccess = (value: string) => {
    if (/^https?:\/\//.test(value)) {
      window.open(value, '_blank', 'noopener,noreferrer');
      return;
    }
    copyPix(value);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FFFFFF', paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ background: '#111', borderBottom: '2px solid #CC0000', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <button
          onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: '#CC0000', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>
          MINHAS MENSALIDADES
        </p>
      </div>

      <div style={{ padding: '1.25rem' }}>

        {/* Matrículas ativas */}
        {openEnrollments.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>ACADEMIA VINCULADA</p>
            {openEnrollments.map(enroll => {
              const methods = paymentMethods[enroll.professorUid];
              return (
              <div key={enroll.id} style={{ background: '#111', border: `1px solid ${enroll.status === 'active' ? '#1A4A1A' : enroll.status === 'suspended' ? '#3A1A00' : '#333'}`, borderRadius: '0', padding: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFFFFF', margin: 0, textTransform: 'uppercase' }}>
                      {enroll.academyName || 'Academia'}
                    </p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', margin: '0.2rem 0 0' }}>
                      Prof. {enroll.professorName || '—'}
                    </p>
                  </div>
                  <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem',
                    textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.2rem 0.5rem',
                    background: enroll.status === 'active' ? '#0A1A0A' : enroll.status === 'suspended' ? '#1A0A00' : '#111',
                    color: enroll.status === 'active' ? '#4CAF50' : enroll.status === 'suspended' ? '#FF8C00' : '#888',
                    border: `1px solid ${enroll.status === 'active' ? '#4CAF50' : enroll.status === 'suspended' ? '#FF8C00' : '#333'}`,
                  }}>
                    {enroll.status === 'active' ? 'ATIVO' : enroll.status === 'suspended' ? 'SUSPENSO' : 'CANCELADO'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <p style={labelStyle}>MENSALIDADE</p>
                    <p style={{ ...valueStyle, color: '#CC0000' }}>{formatCurrency(enroll.monthlyFee)}</p>
                  </div>
                  <div>
                    <p style={labelStyle}>VENCIMENTO</p>
                    <p style={valueStyle}>DIA {enroll.dueDay}</p>
                  </div>
                </div>

                {/* Métodos de pagamento disponíveis */}
                {methods && enroll.status === 'active' && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #222' }}>
                    <p style={{ ...labelStyle, marginBottom: '0.5rem' }}>FORMAS DE PAGAMENTO</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {methods.manualPaymentsEnabled && (
                        <>
                          {methods.pixKey && (
                            <button
                              onClick={() => copyPix(methods.pixKey!)}
                              style={{ background: '#1A0F00', border: '1px solid #FF8C00', color: '#FF8C00', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.35rem 0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              COPIAR PIX
                            </button>
                          )}
                          {methods.pixQrCodeUrl && (
                            <button
                              onClick={() => window.open(methods.pixQrCodeUrl!, '_blank', 'noopener,noreferrer')}
                              style={{ background: '#1A0F00', border: '1px solid #FF8C00', color: '#FF8C00', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.35rem 0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                              QR CODE PIX
                            </button>
                          )}
                          {!methods.pixKey && !methods.pixQrCodeUrl && (
                            <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#888' }}>PIX (chave não configurada)</span>
                          )}
                        </>
                      )}
                      {methods.asaasEnabled && (
                        <span style={{ background: '#0A1A2A', border: '1px solid #2A6FAF', color: '#5AA9FF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.35rem 0.65rem' }}>
                          {methods.asaasBillingType === 'PIX' ? 'PIX VIA ASAAS' :
                           methods.asaasBillingType === 'CREDIT_CARD' ? 'CARTÃO DE CRÉDITO' : 'ONLINE'}
                        </span>
                      )}
                      {!methods.manualPaymentsEnabled && !methods.asaasEnabled && (
                        <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#666' }}>Nenhum método configurado</span>
                      )}
                    </div>
                  </div>
                )}

                {enroll.status === 'suspended' && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#1A0800', border: '1px solid #FF8C00', borderRadius: '0' }}>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#FF8C00', margin: 0 }}>
                      ⚠️ Sua matrícula está suspensa. Entre em contato com seu professor para regularizar.
                    </p>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}

        {/* Resumo financeiro */}
        {payments.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'PENDENTE', value: totalPending, color: '#FF8C00' },
              { label: 'ATRASADO', value: totalOverdue, color: '#CC0000' },
              { label: 'PAGO',     value: totalPaid,    color: '#4CAF50' },
            ].map(item => (
              <div key={item.label} style={{ background: '#111', border: '1px solid #222', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                <p style={{ ...labelStyle, marginBottom: '0.25rem' }}>{item.label}</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.95rem', color: item.color, margin: 0 }}>
                  {formatCurrency(item.value)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        {payments.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {(['all', 'pending', 'overdue', 'paid'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? '#CC0000' : 'transparent',
                  border: `1px solid ${filter === f ? '#CC0000' : '#333'}`,
                  color: filter === f ? '#FFFFFF' : '#888',
                  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
                  fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '0.3rem 0.75rem', cursor: 'pointer',
                }}
              >
                {f === 'all' ? 'TODOS' : f === 'pending' ? 'PENDENTES' : f === 'overdue' ? 'ATRASADOS' : 'PAGOS'}
              </button>
            ))}
          </div>
        )}

        {/* Lista de cobranças */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #333', borderTopColor: '#CC0000', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>CARREGANDO...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>💰</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {payments.length === 0 ? 'NENHUMA COBRANÇA AINDA' : 'NENHUM RESULTADO'}
            </p>
            {payments.length === 0 && (
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', marginTop: '0.5rem' }}>
                Quando seu professor gerar uma cobrança, ela aparecerá aqui.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map(pay => {
              const cfg = STATUS_CONFIG[pay.status] || STATUS_CONFIG.pending;
              return (
                <div key={pay.id} style={{ background: '#111', border: `1px solid #222`, borderLeft: `3px solid ${cfg.color}`, padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#FFFFFF', margin: 0 }}>
                        {formatCurrency(pay.amount)}
                      </p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#666', margin: '0.15rem 0 0' }}>
                        Vencimento: {formatDate(pay.dueDate)}
                        {pay.paidAt && ` · Pago em: ${formatDate(pay.paidAt)}`}
                      </p>
                    </div>
                    <span style={{
                      fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem',
                      textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.2rem 0.5rem',
                      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}`,
                    }}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Botão PIX para cobranças pendentes/atrasadas */}
                  {(pay.status === 'pending' || pay.status === 'overdue') && pay.pixLink && (
                    <button
                      onClick={() => openPaymentAccess(pay.pixLink!)}
                      style={{
                        width: '100%', background: '#0A1A0A', border: '1px solid #4CAF50',
                        color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
                        fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                        padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '0.4rem',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      {/^https?:\/\//.test(pay.pixLink) ? 'ABRIR LINK DE PAGAMENTO' : 'COPIAR CHAVE PIX PARA PAGAMENTO'}
                    </button>
                  )}

                  {/* Cobranças atrasadas sem PIX */}
                  {pay.status === 'overdue' && !pay.pixLink && (
                    <div style={{ padding: '0.4rem 0.6rem', background: '#1A0000', border: '1px solid #CC0000' }}>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#CC0000', margin: 0 }}>
                        ⚠️ Entre em contato com seu professor para regularizar.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Estado vazio — sem matrícula */}
        {!loading && openEnrollments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#111', border: '1px solid #222' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏫</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              NENHUMA ACADEMIA VINCULADA
            </p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', marginTop: '0.5rem', lineHeight: 1.5 }}>
              {payments.length > 0
                ? 'Você não está vinculado a uma academia no momento. Cobranças antigas continuam disponíveis para regularização.'
                : 'Peça ao seu professor para te vincular à academia ou acesse o link de convite enviado por ele.'}
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
