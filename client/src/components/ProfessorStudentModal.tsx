// BJJRats — ProfessorStudentModal
// Modal para aluno acompanhar vínculo com professor particular:
// mensalidades, desafios, eventos e status da matrícula

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Target, Calendar, School, Loader2, Clock, CheckCircle, Circle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ProfessorStudentModalProps {
  professor: {
    uid: string;
    name?: string;
    photo?: string | null;
    academy?: string;
    academyName?: string;
    phone?: string;
  };
  onClose: () => void;
}

interface Payment {
  id: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: string;
  pixLink?: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  unit: string;
  participants: any[];
  createdAt: string;
  endsAt?: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  location?: string;
}

interface Schedule {
  id: string;
  days: string[];
  time: string;
  type?: string;
  mode?: string;
  className?: string;
  publico?: string;
  notes?: string;
}

function finFormatDate(ts: any): string {
  if (!ts) return '—';
  const date = typeof ts === 'string' ? new Date(ts + 'T00:00:00') : new Date(ts.seconds * 1000);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

function finFormatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ProfessorStudentModal({ professor, onClose }: ProfessorStudentModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [confirmedScheds, setConfirmedScheds] = useState<Set<string>>(new Set());
  const [confirmingSched, setConfirmingSched] = useState<string | null>(null);
  const [hasAsaas, setHasAsaas] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [enrollList, payList, challList, eventList, schedList, checkInList] = await Promise.all([
          api.enrollments.list({ studentUid: user.uid, professorUid: professor.uid }) as Promise<any[]>,
          api.payments.list({ studentUid: user.uid, professorUid: professor.uid }) as Promise<Payment[]>,
          api.challenges.list({ academyId: professor.uid }).catch(() => []) as Promise<Challenge[]>,
          api.events.list({ authorUid: professor.uid }).catch(() => []) as Promise<Event[]>,
          api.classes.listSchedules({ professorUid: professor.uid }).catch(() => []) as Promise<Schedule[]>,
          api.classes.listCheckIns({ studentUid: user.uid }).catch(() => []) as Promise<any[]>,
        ]);

        // Verifica se professor tem Asaas configurado
        try {
          const status = await api.payments.asaasStatus(professor.uid);
          setHasAsaas(status.configured);
        } catch { setHasAsaas(false); }

        const active = enrollList.find((e: any) => e.status === 'active' || e.status === 'suspended');
        setEnrollment(active || null);

        // Últimos 6 pagamentos, dedup por data
        const deduped: Payment[] = [];
        const seenDates = new Set<string>();
        for (const p of payList) {
          const key = p.dueDate || '';
          if (!seenDates.has(key)) {
            seenDates.add(key);
            deduped.push(p);
            if (deduped.length >= 6) break;
          }
        }
        setPayments(deduped);

        // Desafios onde o aluno participa ou desafios ativos do professor
        setChallenges(
          challList.filter((c: any) => {
            const parts = c.participants || [];
            return parts.some((p: any) => (typeof p === 'string' ? p : p?.uid) === user.uid);
          })
        );

        setEvents(eventList.slice(0, 5));
        // Schedules: dedup por id e filtra só os que têm dados
        const seenSched = new Set<string>();
        setSchedules(schedList.filter((s: any) => {
          if (!s.id || seenSched.has(s.id)) return false;
          seenSched.add(s.id);
          return s.className || s.type || s.time || (s.days && s.days.length > 0);
        }));
        // Presenças confirmadas: schedules com check-in do aluno
        setConfirmedScheds(new Set(
          (checkInList || []).map((c: any) => c.scheduleId).filter(Boolean)
        ));
      } catch (err) {
        console.error('[ProfessorStudentModal] Erro:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, professor.uid]);

  const handleConfirmPresenca = async (scheduleId: string, professorUid: string, academyId?: string) => {
    if (!user) return;
    setConfirmingSched(scheduleId);
    try {
      await api.classes.createCheckIn({
        scheduleId,
        professorUid,
        academyId: academyId || professorUid,
        studentUid: user.uid,
        checkInDate: new Date().toISOString().split('T')[0],
      });
      setConfirmedScheds(prev => new Set(prev).add(scheduleId));
      toast.success('Presença confirmada! Você receberá lembretes da aula.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao confirmar presença');
    } finally {
      setConfirmingSched(null);
    }
  };

  // Agendamento de aula
  const [showBookForm, setShowBookForm] = useState(false);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookScheduleId, setBookScheduleId] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  const [bookingSlot, setBookingSlot] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<{ time: string; scheduleId: string }[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  const DAY_MAP: Record<number, string> = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };

  const loadAvailableTimes = async (selectedDate: string) => {
    if (!selectedDate) { setAvailableTimes([]); return; }
    setLoadingTimes(true);
    try {
      const dayOfWeek = DAY_MAP[new Date(selectedDate + 'T00:00:00').getDay()];
      const booked = await api.bookedSlots.list({ professorUid: professor.uid }) as any[];
      const bookedTimes = new Set(
        booked
          .filter((b: any) => (b.date || '').split('T')[0] === selectedDate && b.status === 'confirmed')
          .map((b: any) => b.time)
      );

      // Filtra schedules que batem com o dia da semana e não estão reservados
      const times = schedules
        .filter((s: any) => {
          if (!s.time || bookedTimes.has(s.time)) return false;
          const days = s.days || [];
          return days.length === 0 || days.includes(dayOfWeek);
        })
        .map((s: any) => ({ time: s.time, scheduleId: s.id }))
        .sort((a, b) => a.time.localeCompare(b.time));
      // Dedup por time
      const seen = new Set<string>();
      setAvailableTimes(times.filter(t => { if (seen.has(t.time)) return false; seen.add(t.time); return true; }));
    } catch { setAvailableTimes([]); }
    finally { setLoadingTimes(false); }
  };

  const handleBookSlot = async () => {
    if (!user || !bookDate || !bookTime) return;
    setBookingSlot(true);
    try {
      await api.bookedSlots.create({
        professorUid: professor.uid,
        date: bookDate,
        time: bookTime,
        scheduleId: bookScheduleId || undefined,
        notes: bookNotes || undefined,
        studentName: user.name || '',
      });
      toast.success(`Aula agendada para ${new Date(bookDate + 'T00:00:00').toLocaleDateString('pt-BR')} às ${bookTime}!`);
      setShowBookForm(false);
      setBookDate(''); setBookTime(''); setBookScheduleId(''); setBookNotes('');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao agendar');
    } finally {
      setBookingSlot(false);
    }
  };

  const professorName = professor.name || 'Professor';
  const professorPhoto = professor.photo;
  const academyName = professor.academyName || professor.academy || 'Professor Particular';

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)',
      }} onClick={onClose}>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#0A0A0A',
            borderTop: '2px solid #CC0000',
            width: '100%', maxWidth: '500px', maxHeight: '90vh',
            overflowY: 'auto',
            borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
          }}
        >
          {/* Header */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden',
              border: '2px solid #CC0000', flexShrink: 0, background: '#1A0000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {professorPhoto ? (
                <img src={professorPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#CC0000' }}>
                  {professorName.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.15rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.1 }}>
                {professorName}
              </p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' }}>
                {academyName}
              </p>
              {enrollment && (
                <span style={{
                  display: 'inline-block', marginTop: '0.35rem',
                  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '0.15rem 0.45rem',
                  background: enrollment.status === 'active' ? '#0A1A0A' : '#1A0A00',
                  color: enrollment.status === 'active' ? '#4CAF50' : '#FF8C00',
                  border: `1px solid ${enrollment.status === 'active' ? '#4CAF50' : '#FF8C00'}`,
                }}>
                  {enrollment.status === 'active' ? 'ATIVO' : 'SUSPENSO'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'center' }}>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '0.5rem' }}>
                <X size={22} />
              </button>
              {professor.phone && (
                <a
                  href={`https://wa.me/55${professor.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#0D2A0D',
                    border: '1px solid #25D366',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  title="Falar no WhatsApp"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <Loader2 size={28} color="#CC0000" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', color: '#555', marginTop: '0.75rem', textTransform: 'uppercase' }}>Carregando...</p>
            </div>
          ) : (
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
              
              {/* Matrícula */}
              {enrollment && (
                <section>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                    <School size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
                    MATRÍCULA
                  </p>
                  <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>MENSALIDADE</p>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#CC0000', marginTop: '0.15rem' }}>{finFormatCurrency(enrollment.monthlyFee || 0)}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>VENCIMENTO</p>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFF', marginTop: '0.15rem' }}>DIA {enrollment.dueDay || 1}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>STATUS</p>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: enrollment.status === 'active' ? '#4CAF50' : '#FF8C00', marginTop: '0.15rem', textTransform: 'uppercase' }}>
                        {enrollment.status === 'active' ? 'ATIVO' : 'SUSPENSO'}
                      </p>
                    </div>
                  </div>
                  {/* Botão Assinatura Recorrente */}
                  {enrollment.status === 'active' && (enrollment.monthlyFee || 0) > 0 && (
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid #1E1E1E', paddingTop: '0.75rem' }}>
                      <button
                        onClick={async () => {
                          if (!user || !hasAsaas) return;
                          setConfirmingSched('_subscribe_' + enrollment.id);
                          try {
                            const result = await api.enrollments.asaasSubscribe(enrollment.id);
                            if (result.invoiceUrl) {
                              window.open(result.invoiceUrl, '_blank', 'noopener,noreferrer');
                              toast.success('Assinatura criada! Após o primeiro pagamento, as cobranças serão automáticas.');
                            } else {
                              toast.success('Assinatura configurada!');
                            }
                          } catch (err: any) {
                            toast.error(err?.message || 'Erro ao configurar assinatura');
                          } finally {
                            setConfirmingSched(null);
                          }
                        }}
                        disabled={confirmingSched === '_subscribe_' + enrollment.id || hasAsaas === false}
                        style={{
                          width: '100%',
                          background: confirmingSched === '_subscribe_' + enrollment.id ? '#1A1A1A' : hasAsaas === false ? '#1A1A1A' : '#CC0000',
                          border: hasAsaas === false ? '1px solid #333' : 'none',
                          color: hasAsaas === false ? '#555' : '#FFF',
                          fontFamily: 'Barlow Condensed, sans-serif',
                          fontWeight: 900,
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          padding: '0.6rem',
                          cursor: hasAsaas === false ? 'not-allowed' : confirmingSched ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          opacity: hasAsaas === false ? 0.5 : 1,
                        }}
                      >
                        {confirmingSched === '_subscribe_' + enrollment.id ? (
                          <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> ATIVANDO...</>
                        ) : hasAsaas === false ? (
                          <>🔒 COBRANÇA RECORRENTE INDISPONÍVEL</>
                        ) : (
                          <>🔄 ATIVAR COBRANÇA RECORRENTE</>
                        )}
                      </button>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.6rem', color: '#555', textAlign: 'center', marginTop: '0.35rem' }}>
                        {hasAsaas === false
                          ? 'Seu professor ainda não ativou a cobrança online. Enquanto isso, use o comprovante manual.'
                          : 'Cadastre seu cartão uma vez e esqueça — a mensalidade será cobrada automaticamente todo mês.'
                        }
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* Horários de Treino */}
              {schedules.length > 0 && (
                <section>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                    <Clock size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
                    HORÁRIOS DE TREINO
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {schedules.map(sched => {
                      const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
                      const days = (sched.days || []).length > 0
                        ? sched.days.map((d: any) => typeof d === 'number' ? diasSemana[d] : String(d).substring(0, 3).toUpperCase()).join(' · ')
                        : null;
                      const confirmed = confirmedScheds.has(sched.id);
                      const confirming = confirmingSched === sched.id;
                      return (
                        <div key={sched.id} style={{ background: '#111', border: `1px solid ${confirmed ? '#1A4A1A' : '#1E1E1E'}`, padding: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#FFF', textTransform: 'uppercase' }}>
                                {sched.className || sched.type || 'Aula'}
                              </p>
                              {days && (
                                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', color: '#CC0000', marginTop: '0.2rem', letterSpacing: '0.04em' }}>
                                  {days}
                                </p>
                              )}
                            </div>
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#FFF', flexShrink: 0 }}>
                              {sched.time || '—'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                            {sched.mode && (
                              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.62rem', color: '#888', textTransform: 'uppercase' }}>
                                {sched.mode === 'presencial' ? '📍 Presencial' : sched.mode === 'online' ? '💻 Online' : sched.mode}
                              </span>
                            )}
                            {sched.publico && (
                              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.62rem', color: '#888', textTransform: 'uppercase' }}>
                                👥 {sched.publico}
                              </span>
                            )}
                          </div>
                          {sched.notes && (
                            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#555', marginTop: '0.35rem' }}>{sched.notes}</p>
                          )}
                          {/* Botão Confirmar Presença */}
                          <div style={{ marginTop: '0.5rem', borderTop: '1px solid #1E1E1E', paddingTop: '0.5rem' }}>
                            {confirmed ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                <CheckCircle size={16} /> PRESENÇA CONFIRMADA
                              </div>
                            ) : (
                              <button
                                onClick={() => handleConfirmPresenca(sched.id, professor.uid)}
                                disabled={confirming}
                                style={{
                                  background: confirming ? '#1A1A1A' : '#0A1A0A',
                                  border: '1px solid #4CAF50',
                                  color: '#4CAF50',
                                  fontFamily: 'Barlow Condensed, sans-serif',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  padding: '0.35rem 0.75rem',
                                  cursor: confirming ? 'wait' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  width: '100%',
                                  justifyContent: 'center',
                                }}
                              >
                                {confirming ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Circle size={14} />}
                                {confirming ? 'CONFIRMANDO...' : 'CONFIRMAR PRESENÇA'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Agendar Aula */}
              {enrollment && enrollment.status === 'active' && (
                <section>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                    <Calendar size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
                    AGENDAR AULA
                  </p>
                  {!showBookForm ? (
                    <button
                      onClick={() => { setShowBookForm(true); setBookDate(''); setBookTime(''); setBookScheduleId(''); }}
                      style={{
                        width: '100%', background: '#CC0000', border: 'none', color: '#FFF',
                        fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem',
                        textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.6rem', cursor: 'pointer',
                      }}
                    >
                      📅 AGENDAR AULA PARTICULAR
                    </button>
                  ) : (
                    <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>DATA</label>
                        <input
                          type="date"
                          value={bookDate}
                          onChange={e => { setBookDate(e.target.value); setBookTime(''); loadAvailableTimes(e.target.value); }}
                          min={new Date().toISOString().split('T')[0]}
                          style={{ width: '100%', background: '#0A0A0A', border: '1px solid #333', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', padding: '0.4rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>HORÁRIO</label>
                        {loadingTimes ? (
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>Carregando horários...</p>
                        ) : !bookDate ? (
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>Selecione uma data primeiro</p>
                        ) : availableTimes.length === 0 ? (
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#CC0000' }}>Nenhum horário disponível nesta data</p>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                            {availableTimes.map(slot => (
                              <button
                                key={slot.scheduleId || slot.time}
                                onClick={() => { setBookTime(slot.time); setBookScheduleId(slot.scheduleId); }}
                                style={{
                                  background: bookTime === slot.time ? '#CC0000' : '#1E1E1E',
                                  border: bookTime === slot.time ? 'none' : '1px solid #333',
                                  color: bookTime === slot.time ? '#FFF' : '#AAA',
                                  fontFamily: 'Barlow Condensed, sans-serif',
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  padding: '0.4rem',
                                  cursor: 'pointer',
                                }}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>OBSERVAÇÕES</label>
                        <input
                          type="text"
                          value={bookNotes}
                          onChange={e => setBookNotes(e.target.value)}
                          placeholder="Ex: foco em guarda, treino de competição..."
                          style={{ width: '100%', background: '#0A0A0A', border: '1px solid #333', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', padding: '0.4rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => { setShowBookForm(false); setBookDate(''); setBookTime(''); setBookScheduleId(''); setBookNotes(''); }}
                          style={{ flex: 1, background: '#1E1E1E', border: 'none', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem', cursor: 'pointer' }}
                        >
                          CANCELAR
                        </button>
                        <button
                          onClick={handleBookSlot}
                          disabled={!bookDate || !bookTime || bookingSlot}
                          style={{ flex: 1, background: bookingSlot ? '#1A1A1A' : '#4CAF50', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem', cursor: bookingSlot ? 'wait' : 'pointer', opacity: !bookDate || !bookTime ? 0.5 : 1 }}
                        >
                          {bookingSlot ? 'AGENDANDO...' : 'CONFIRMAR AGENDAMENTO'}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Minhas Aulas Agendadas */}
              <MyBookedSlots professorUid={professor.uid} studentUid={user?.uid || ''} />

              {/* Mensalidades */}
              <section>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  <CreditCard size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
                  MENSALIDADES
                </p>
                {payments.length === 0 ? (
                  <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' }}>Nenhuma cobrança ainda</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {payments.map(pay => {
                      const isPending = pay.status === 'pending';
                      const isPendingApproval = pay.status === 'pending_approval';
                      const isPaid = pay.status === 'paid';
                      const isOverdue = pay.status === 'overdue';
                      const statusColor = isPaid ? '#4CAF50' : isOverdue ? '#CC0000' : isPendingApproval ? '#1A6ECC' : '#FF8C00';
                      const statusLabel = isPaid ? 'PAGO' : isOverdue ? 'ATRASADO' : isPendingApproval ? 'AGUARDANDO' : 'PENDENTE';
                      const receiptUrl = (pay as any).receiptUrl;
                      return (
                        <div key={pay.id} style={{ background: '#111', border: `1px solid #1E1E1E`, borderLeft: `3px solid ${statusColor}`, padding: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                            <div>
                              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.95rem', color: '#FFF' }}>{finFormatCurrency(pay.amount)}</p>
                              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#666', marginTop: '0.1rem' }}>
                                Venc: {finFormatDate(pay.dueDate)}
                                {pay.paidAt ? ` · Pago: ${finFormatDate(pay.paidAt)}` : ''}
                              </p>
                            </div>
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: statusColor, padding: '0.15rem 0.4rem', background: `${statusColor}15`, border: `1px solid ${statusColor}44` }}>
                              {statusLabel}
                            </span>
                          </div>
                          {/* Comprovante / Asaas */}
                          {(isPending || isOverdue) && (
                            <div style={{ marginTop: '0.4rem', borderTop: '1px solid #1E1E1E', paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              {/* Botão Pagar via Asaas */}
                              <button
                                onClick={async () => {
                                  if (!user) return;
                                  setConfirmingSched(pay.id);
                                  try {
                                    const result = await api.payments.asaasCheckout(pay.id);
                                    if (result.invoiceUrl) {
                                      window.open(result.invoiceUrl, '_blank', 'noopener,noreferrer');
                                      toast.success('Link de pagamento aberto! Após pagar, o status será atualizado.');
                                    } else if (result.pixQrCode?.payload) {
                                      await navigator.clipboard.writeText(result.pixQrCode.payload);
                                      toast.success('PIX copiado! Cole no app do seu banco.');
                                    }
                                  } catch (err: any) {
                                    // Se não tem Asaas, mostra o upload manual abaixo
                                    console.log('Pagamento online não disponível, use o comprovante manual');
                                  } finally {
                                    setConfirmingSched(null);
                                  }
                                }}
                                disabled={confirmingSched === pay.id}
                                style={{
                                  width: '100%',
                                  background: confirmingSched === pay.id ? '#1A1A1A' : '#0A1A2A',
                                  border: '1px solid #1A6ECC',
                                  color: '#1A6ECC',
                                  fontFamily: 'Barlow Condensed, sans-serif',
                                  fontWeight: 700,
                                  fontSize: '0.65rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  padding: '0.35rem',
                                  cursor: confirmingSched === pay.id ? 'wait' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.3rem',
                                }}
                              >
                                {confirmingSched === pay.id ? (
                                  <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> GERANDO...</>
                                ) : (
                                  <>💳 PAGAR ONLINE</>
                                )}
                              </button>
                              {/* Upload manual de comprovante */}
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                id={`receipt-${pay.id}`}
                                style={{ display: 'none' }}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file || !user) return;
                                  setConfirmingSched(pay.id);
                                  try {
                                    const url = await api.upload.file(file, 'comprovantes');
                                    await api.payments.update(pay.id, { receiptUrl: url });
                                    toast.success('Comprovante enviado! Aguardando aprovação.');
                                    // Atualiza pagamentos com dedup
                                    const updated = await api.payments.list({ studentUid: user.uid, professorUid: professor.uid }) as Payment[];
                                    const deduped: Payment[] = [];
                                    const seen = new Set<string>();
                                    for (const p of updated) {
                                      const key = p.dueDate || '';
                                      if (!seen.has(key)) { seen.add(key); deduped.push(p); if (deduped.length >= 6) break; }
                                    }
                                    setPayments(deduped);
                                  } catch (err: any) {
                                    toast.error(err?.message || 'Erro ao enviar comprovante');
                                  } finally {
                                    setConfirmingSched(null);
                                  }
                                }}
                              />
                              <button
                                onClick={() => document.getElementById(`receipt-${pay.id}`)?.click()}
                                disabled={confirmingSched === pay.id}
                                style={{
                                  width: '100%',
                                  background: confirmingSched === pay.id ? '#1A1A1A' : '#0A1A0A',
                                  border: '1px solid #4CAF50',
                                  color: '#4CAF50',
                                  fontFamily: 'Barlow Condensed, sans-serif',
                                  fontWeight: 700,
                                  fontSize: '0.65rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  padding: '0.35rem',
                                  cursor: confirmingSched === pay.id ? 'wait' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.3rem',
                                }}
                              >
                                {confirmingSched === pay.id ? (
                                  <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> ENVIANDO...</>
                                ) : (
                                  <>📎 ANEXAR COMPROVANTE</>
                                )}
                              </button>
                            </div>
                          )}
                          {receiptUrl && (
                            <div style={{ marginTop: '0.4rem' }}>
                              <a
                                href={receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  fontFamily: 'Barlow Condensed, sans-serif',
                                  fontWeight: 700,
                                  fontSize: '0.6rem',
                                  color: '#1A6ECC',
                                  textTransform: 'uppercase',
                                  textDecoration: 'none',
                                }}
                              >
                                📋 VER COMPROVANTE
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Desafios */}
              <section>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  <Target size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
                  MEUS DESAFIOS
                </p>
                {challenges.length === 0 ? (
                  <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' }}>Nenhum desafio ativo</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {challenges.map(ch => {
                      const myProgress = (ch.participants || []).find((p: any) =>
                        (typeof p === 'string' ? p : p?.uid) === user?.uid
                      );
                      const progress = typeof myProgress === 'object' ? (myProgress.progress || 0) : 0;
                      const pct = Math.min(100, Math.round((progress / ch.target) * 100));
                      return (
                        <div key={ch.id} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#FFF', textTransform: 'uppercase' }}>{ch.title}</p>
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', color: pct >= 100 ? '#4CAF50' : '#CC0000' }}>
                              {progress}/{ch.target} {ch.unit}
                            </span>
                          </div>
                          <div style={{ height: '4px', background: '#1E1E1E', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#4CAF50' : '#CC0000', borderRadius: '2px', transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Eventos */}
              {events.length > 0 && (
                <section>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                    <Calendar size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
                    PRÓXIMOS EVENTOS
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {events.map(ev => (
                      <div key={ev.id} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.75rem' }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#FFF', textTransform: 'uppercase' }}>{ev.title}</p>
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#888', marginTop: '0.2rem' }}>
                          {finFormatDate(ev.eventDate)}
                          {ev.location ? ` · ${ev.location}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── MyBookedSlots (mini-componente interno) ──────────────────────────────────
function MyBookedSlots({ professorUid, studentUid }: { professorUid: string; studentUid: string }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentUid) return;
    const load = async () => {
      setLoading(true);
      try {
        const list = await api.bookedSlots.list({ studentUid, professorUid }) as any[];
        setBookings(list);
      } catch { setBookings([]); }
      setLoading(false);
    };
    load();
  }, [studentUid, professorUid]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar esta aula agendada?')) return;
    try {
      await api.bookedSlots.update(id, { status: 'cancelled' });
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      toast.success('Aula cancelada');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao cancelar');
    }
  };

  if (loading || !studentUid) return null;

  const active = bookings.filter((b: any) => b.status === 'confirmed');

  return (
    <section>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
        <Calendar size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
        MINHAS AULAS AGENDADAS
        {active.length > 0 && <span style={{ color: '#4CAF50', marginLeft: '0.5rem' }}>{active.length}</span>}
      </p>
      {active.length === 0 ? (
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.72rem', color: '#555', textTransform: 'uppercase' }}>Nenhuma aula agendada</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {active.map((b: any) => (
            <div key={b.id} style={{ background: '#111', border: '1px solid #1A4A1A', borderLeft: '3px solid #4CAF50', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', color: '#FFF', textTransform: 'uppercase' }}>
                  {b.className || 'Aula'}
                </p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.68rem', color: '#4CAF50', marginTop: '0.15rem' }}>
                  📅 {new Date(b.date + 'T00:00:00').toLocaleDateString('pt-BR')} ⏰ {b.time}
                </p>
              </div>
              <button
                onClick={() => handleCancel(b.id)}
                style={{ background: 'transparent', border: '1px solid #CC0000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
              >
                CANCELAR
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
