// BJJRats PWA — Professor Panel
// Design: "Cage Fighter" — Brutalismo Tático
// Painel de gestão da academia: Visão Geral, Feed, Eventos, Desafios, Membros

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { tabVariant, tabTransition } from '@/lib/animations';
import { BELT_COLORS, getLevelInfo, ACHIEVEMENTS, topTecnicas, calcStreak, LEVEL_COLORS, Training } from '@/lib/bjjrats-constants';
import { formatCep, getEventAddressLabel, getEventGoogleMapsUrl, getEventLocationLabel, getEventMapEmbedUrl, getEventMapDestination, getEventWazeUrl } from '@/lib/eventLocation';
import api, { type AcademyProfessorLink, type AcademyStudentProfessorAssignment, type PaymentIntegrationSettings, type WhatsAppAutomationResult } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  Camera,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  DollarSign,
  ExternalLink,
  Flame,
  Handshake,
  LayoutDashboard,
  LogOut,
  MapPin,
  Medal,
  MessageSquare,
  Navigation,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

interface Post {
  id: string;
  text: string;
  photoURL?: string;
  type: string;
  authorName: string;
  academyName: string;
  academyLogo?: string;
  createdAtStr: string;
  createdAt?: { toMillis: () => number } | null;
  reactions?: Record<string, string[]>;
}

const PROFESSOR_POST_FILTERS = [
  { value: 'all', label: 'TODOS' },
  { value: 'geral', label: 'GERAL' },
  { value: 'aviso', label: 'NOTIFICACAO' },
  { value: 'novidade', label: 'NOVIDADE' },
  { value: 'resultado', label: 'RESULTADO' },
];

function getProfessorPostType(post: Post) {
  const type = post.type || (post as any).trainingData?.category || 'geral';
  return typeof type === 'string' && type.trim() ? type.trim() : 'geral';
}

interface AcademyEvent {
  id: string;
  title: string;
  description?: string;
  type: string;
  date: string;
  time?: string;
  location?: string;
  locationCep?: string;
  locationAddress?: string;
  locationNumber?: string;
  locationNeighborhood?: string;
  locationCity?: string;
  locationState?: string;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  slots?: number;
  price?: string;
  registrations?: string[];
  registrationNames?: Record<string, string>;
  registrationBelts?: Record<string, string>;
  registrationsClosed?: boolean;
  createdAtStr?: string;
}

const EMPTY_EVENT_FORM = {
  title: '',
  description: '',
  type: 'outro',
  date: '',
  time: '',
  location: '',
  locationCep: '',
  locationAddress: '',
  locationNumber: '',
  locationNeighborhood: '',
  locationCity: '',
  locationState: '',
  locationLatitude: null as number | null,
  locationLongitude: null as number | null,
  slots: '',
  price: '',
};

interface Challenge {
  id: string;
  title: string;
  description?: string;
  goal: number;
  goalType: string;
  startDate: string;
  endDate: string;
  xpReward: number;
  createdAtStr?: string;
  creatorUid?: string;
}

interface TrialRequest {
  id: string;
  name: string;
  phone: string;
  email?: string;
  belt: string;
  age?: string;
  preferredDay?: string;
  message?: string;
  status: 'pending' | 'contacted' | 'converted' | 'cancelled';
  createdAtStr?: string;
}

type PanelTab = 'overview' | 'avisos' | 'feed' | 'events' | 'challenges' | 'members' | 'financial' | 'frequencia' | 'horarios' | 'relatorios' | 'promocao' | 'leads' | 'whatsapp';
type PanelGroup = 'principal' | 'alunos' | 'gestao' | 'comunidade';
type FinancialSubTab = 'enrollments' | 'payments' | 'suspensions' | 'integrations';

interface Enrollment {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  studentBelt?: string;
  studentStripes?: number;
  studentPhoto?: string | null;
  monthlyFee: number;
  dueDay: number;
  enrolledAt?: any;
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
  pixKey?: string;
  notes?: string;
  suspendReason?: string;
  suspendedAt?: any;
}

interface Payment {
  id: string;
  enrollmentId: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  amount: number;
  dueDate: string;  // YYYY-MM-DD
  paidAt?: string | null;
  status: 'pending' | 'paid' | 'overdue';
  pixKey?: string;
  pixLink?: string;
  paymentLink?: string;
  paymentProvider?: 'manual' | 'asaas';
  asaasError?: string | null;
  reactivatedEnrollments?: Array<{ id: string; studentUid?: string; status?: string }>;
  suspendedEnrollments?: Array<{ id: string; studentUid?: string; status?: string }>;
  notifiedDue?: boolean;
  notifiedOverdue?: boolean;
  professorUid?: string;
  receiptUrl?: string;
  month: string;   // YYYY-MM
}

type PaymentLike = {
  id?: string;
  studentUid?: string;
  dueDate?: string;
  createdAt?: string;
  month?: string;
  status?: string;
  paidAt?: string | null;
};

function isFinancialPaymentPaid(payment: PaymentLike) {
  return payment.status === 'paid' || Boolean(payment.paidAt);
}

function paymentCompetencyMonth(payment: PaymentLike) {
  return payment.month || payment.dueDate?.slice(0, 7) || '';
}

function paymentDateTime(value?: string | null) {
  if (!value) return 0;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function shouldReplaceFinancialPayment(current: PaymentLike, candidate: PaymentLike) {
  const currentPaid = isFinancialPaymentPaid(current);
  const candidatePaid = isFinancialPaymentPaid(candidate);
  if (candidatePaid !== currentPaid) return candidatePaid;

  const candidateDue = paymentDateTime(candidate.dueDate);
  const currentDue = paymentDateTime(current.dueDate);
  if (candidateDue !== currentDue) return candidateDue > currentDue;

  const candidateCreated = paymentDateTime(candidate.createdAt);
  const currentCreated = paymentDateTime(current.createdAt);
  if (candidateCreated !== currentCreated) return candidateCreated > currentCreated;

  return String(candidate.id || '') > String(current.id || '');
}

function currentEffectivePaymentsByStudent<T extends PaymentLike>(rows: T[], now = new Date()) {
  const paidCompetencies = new Set<string>();
  for (const payment of rows) {
    const key = `${payment.studentUid || ''}:${paymentCompetencyMonth(payment)}`;
    if (payment.studentUid && paymentCompetencyMonth(payment) && isFinancialPaymentPaid(payment)) {
      paidCompetencies.add(key);
    }
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const byStudent = new Map<string, T>();

  for (const payment of rows) {
    if (!payment.studentUid || !payment.dueDate) continue;
    const competency = paymentCompetencyMonth(payment);
    const key = `${payment.studentUid}:${competency}`;
    if (paidCompetencies.has(key) && !isFinancialPaymentPaid(payment)) continue;

    const due = new Date(`${payment.dueDate.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(due.getTime()) || due.getTime() > today.getTime()) continue;

    const current = byStudent.get(payment.studentUid);
    if (!current || shouldReplaceFinancialPayment(current, payment)) {
      byStudent.set(payment.studentUid, payment);
    }
  }

  return byStudent;
}

interface Props {
  onBack: () => void;
  onLogout?: () => void;
  notificationSlot?: React.ReactNode;
}

interface Member {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  belt: string;
  stripes?: number;
  xp?: number;
  totalTrainings?: number;
  totalMinutes?: number;
  photo?: string | null;
  athleteType?: string;
  bjjSince?: string;
  lastTrainingDate?: string;
}

interface JoinRequest {
  id: string;
  studentUid: string;
  studentName: string;
  studentBelt: string;
  studentStripes: number;
  studentPhoto?: string | null;
  academyName: string;
  createdAtStr: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface TrainRequest {
  id: string;
  professorUid: string;
  academyName: string;
  requesterName: string;
  requesterCpf?: string;
  requesterBelt?: string;
  requesterUid?: string;
  trainType: 'matricula' | 'diaria';
  billingMode?: 'prorata' | 'corrido';
  status: 'pending' | 'accepted' | 'rejected';
  createdAtStr: string;
  read: boolean;
}

const PANEL_TAB_GROUPS: { id: PanelGroup; label: string }[] = [
  { id: 'principal', label: 'PRINCIPAL' },
  { id: 'alunos', label: 'ALUNOS' },
  { id: 'gestao', label: 'GESTÃO' },
  { id: 'comunidade', label: 'COMUNIDADE' },
];

const PANEL_TABS: { id: PanelTab; label: string; group: PanelGroup; icon: LucideIcon }[] = [
  { id: 'overview', label: 'VISÃO GERAL', group: 'principal', icon: LayoutDashboard },
  { id: 'avisos', label: 'NOTIFICAÇÕES', group: 'principal', icon: Bell },
  { id: 'members', label: 'MEMBROS', group: 'alunos', icon: Users },
  { id: 'frequencia', label: 'FREQUÊNCIA', group: 'alunos', icon: CalendarCheck },
  { id: 'promocao', label: 'PROMOÇÃO', group: 'alunos', icon: UserCheck },
  { id: 'financial', label: 'FINANCEIRO', group: 'gestao', icon: CreditCard },
  { id: 'horarios', label: 'HORÁRIOS', group: 'gestao', icon: Clock },
  { id: 'relatorios', label: 'RELATÓRIOS', group: 'gestao', icon: BarChart3 },
  { id: 'feed', label: 'FEED', group: 'comunidade', icon: Newspaper },
  { id: 'events', label: 'EVENTOS', group: 'comunidade', icon: CalendarDays },
  { id: 'challenges', label: 'DESAFIOS', group: 'comunidade', icon: Trophy },
  { id: 'leads', label: 'LEADS', group: 'comunidade', icon: Target },
  { id: 'whatsapp', label: 'WHATSAPP', group: 'gestao', icon: MessageSquare },
];

const INTERNAL_PROFESSOR_HIDDEN_TABS: PanelTab[] = ['financial', 'relatorios', 'whatsapp', 'avisos', 'leads'];

const WHATSAPP_CONNECTION_ATTEMPT_TIMEOUT_MS = 10 * 60 * 1000;

function formatAttemptRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getWhatsAppAutomationToast(
  whatsapp?: WhatsAppAutomationResult,
  baseMessage = 'Notificação enviada',
) {
  if (whatsapp?.enabled && whatsapp.recipients > 0) {
    const failedLabel = whatsapp.failed > 0 ? ` (${whatsapp.failed} falhou)` : '';
    return `${baseMessage}! WhatsApp: ${whatsapp.sent}/${whatsapp.recipients}${failedLabel}`;
  }
  if (whatsapp?.enabled) {
    return `${baseMessage} no app. Nenhum telefone encontrado para WhatsApp.`;
  }
  return `${baseMessage} no app. Conecte o WhatsApp para envio automático.`;
}

function WhatsAppTab() {
  const [status, setStatus] = useState<{ connected: boolean; instance: { id: string; status: string; phone?: string | null } | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [attemptExpired, setAttemptExpired] = useState(false);
  const [attemptStartedAt, setAttemptStartedAt] = useState<number | null>(null);
  const [attemptTimeoutMs, setAttemptTimeoutMs] = useState(WHATSAPP_CONNECTION_ATTEMPT_TIMEOUT_MS);
  const [attemptRemainingMs, setAttemptRemainingMs] = useState(WHATSAPP_CONNECTION_ATTEMPT_TIMEOUT_MS);

  const expireConnectionAttempt = useCallback((showToast = true) => {
    setStatus({ connected: false, instance: null });
    setQrcode(null);
    setQrCodeText(null);
    setPolling(false);
    setConnecting(false);
    setAttemptExpired(true);
    setAttemptStartedAt(null);
    setAttemptRemainingMs(0);
    if (showToast) {
      toast.error('Tentativa expirada. Gere uma nova conexao.');
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.whatsapp.status();
      setAttemptTimeoutMs(res.attemptTimeoutMs ?? WHATSAPP_CONNECTION_ATTEMPT_TIMEOUT_MS);
      if (res.expired) {
        expireConnectionAttempt(false);
        return;
      }
      setStatus(res);
      setQrcode(null);
      setQrCodeText(null);
      setAttemptExpired(false);
      setAttemptStartedAt(null);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [expireConnectionAttempt]);

  // Carrega status ao montar e recarrega quando a aba/janela volta ao foco
  useEffect(() => {
    loadStatus();
    const onFocus = () => { if (!polling) loadStatus(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !polling) loadStatus();
    });
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [loadStatus, polling]);

  useEffect(() => {
    if (!polling || !attemptStartedAt) return;

    const tick = () => {
      setAttemptRemainingMs(Math.max(0, attemptStartedAt + attemptTimeoutMs - Date.now()));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [attemptStartedAt, attemptTimeoutMs, polling]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.whatsapp.status();
        setAttemptTimeoutMs(res.attemptTimeoutMs ?? WHATSAPP_CONNECTION_ATTEMPT_TIMEOUT_MS);
        if (res.expired) {
          expireConnectionAttempt();
          return;
        }
        if (res.connected) {
          setStatus(res);
          setQrcode(null);
          setQrCodeText(null);
          setPolling(false);
          setConnecting(false);
          setAttemptExpired(false);
          setAttemptStartedAt(null);
          toast.success('WhatsApp conectado!');
          return;
        }

      } catch { /* silencioso */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [expireConnectionAttempt, polling]);

  const handleConnect = async () => {
    setConnecting(true);
    setAttemptExpired(false);
    try {
      const res = await api.whatsapp.connect();
      setQrcode(res.qrcode ?? null);
      setQrCodeText(res.qrCodeText ?? null);
      const timeoutMs = res.attemptTimeoutMs ?? WHATSAPP_CONNECTION_ATTEMPT_TIMEOUT_MS;
      setAttemptTimeoutMs(timeoutMs);
      setAttemptStartedAt(Date.now());
      setAttemptRemainingMs(timeoutMs);
      setPolling(true);
      if (!res.qrcode) {
        toast.error('A Evolution API criou a instância, mas não retornou QR Code.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao conectar WhatsApp');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    try {
      await api.whatsapp.disconnect();
      setStatus({ connected: false, instance: null });
      setQrcode(null);
      setQrCodeText(null);
      setPolling(false);
      setAttemptExpired(false);
      setAttemptStartedAt(null);
      toast.success('WhatsApp desconectado');
    } catch {
      toast.error('Erro ao desconectar');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #333', borderTopColor: '#25D366', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>CARREGANDO...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF', margin: 0 }}>📱 WHATSAPP</p>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>Conecte seu WhatsApp para enviar mensagens automáticas aos alunos</p>
      </div>

      {status?.connected ? (
        <div style={{ background: '#0A1A0A', border: '1px solid #1A4A1A', borderLeft: '3px solid #25D366', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#25D366', textTransform: 'uppercase', margin: 0 }}>✅ CONECTADO</p>
              {status.instance?.phone && (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>{status.instance.phone}</p>
              )}
            </div>
            <button onClick={handleDisconnect} style={{ background: 'transparent', border: '1px solid #CC0000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>DESCONECTAR</button>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#111', border: '1px solid #222' }}>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', margin: 0, lineHeight: 1.5 }}>
              As mensagens de cobrança, suspensão e baixa frequência serão enviadas automaticamente pelo seu WhatsApp quando você usar os botões correspondentes.
            </p>
          </div>
        </div>
      ) : attemptExpired ? (
        <div style={{ background: '#180F06', border: '1px solid #5A2F08', borderLeft: '3px solid #F59E0B', padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#F59E0B', textTransform: 'uppercase', margin: 0 }}>TENTATIVA EXPIRADA</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#A98758', marginTop: '0.5rem', marginBottom: '1rem', lineHeight: 1.5 }}>
            A instancia anterior foi removida por seguranca. Reinicie a tentativa para gerar um novo QR Code.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{ background: '#F59E0B', border: 'none', color: '#111', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.75rem 1.25rem', cursor: connecting ? 'not-allowed' : 'pointer', opacity: connecting ? 0.65 : 1, width: '100%' }}
          >
            {connecting ? 'RESETANDO...' : 'RESETAR TENTATIVA'}
          </button>
        </div>
      ) : qrcode || qrCodeText ? (
        <div style={{ background: '#111', border: '1px solid #222', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase', marginBottom: '1rem' }}>ESCANEIE O QR CODE</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', marginBottom: '1rem' }}>Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo</p>
          {qrcode ? (
            <img src={qrcode} alt="QR Code" style={{ maxWidth: '280px', width: '100%', border: '4px solid #FFF', borderRadius: '8px' }} />
          ) : (
            <div style={{ background: '#1A1A1A', border: '1px solid #333', padding: '1rem', color: '#888', fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem' }}>
              QR Code indisponivel. Reinicie a tentativa para gerar um novo QR Code.
            </div>
          )}
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: attemptRemainingMs <= 30000 ? '#F59E0B' : '#555', marginTop: '1rem' }}>
            Aguardando conexao... Tempo restante: {formatAttemptRemaining(attemptRemainingMs)}
          </p>
        </div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #222', borderLeft: '3px solid #555', padding: '1.25rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#888', textTransform: 'uppercase', margin: 0 }}>DESCONECTADO</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.5rem', marginBottom: '1rem', lineHeight: 1.5 }}>
            Conecte seu WhatsApp para enviar mensagens automáticas de cobrança, suspensão e lembretes diretamente aos seus alunos.
          </p>
          <button onClick={handleConnect} disabled={connecting} style={{ background: '#25D366', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.75rem 1.25rem', cursor: connecting ? 'not-allowed' : 'pointer', opacity: connecting ? 0.6 : 1, width: '100%' }}>
            {connecting ? 'CONECTANDO...' : '📱 CONECTAR WHATSAPP'}
          </button>
        </div>
      )}

      <div style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', padding: '1rem' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>COMO FUNCIONA</p>
        <ul style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#666', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
          <li>Cada professor conecta seu próprio WhatsApp</li>
          <li>Mensagens são enviadas do seu número pessoal</li>
          <li>Cobranças, suspensões e lembretes automáticos</li>
          <li>Sem custo por mensagem</li>
        </ul>
      </div>
    </div>
  );
}

export default function ProfessorPanel({ onBack, onLogout, notificationSlot }: Props) {
  const { user, profile, updateProfileData } = useAuth();
  const [activeTab, setActiveTab] = useState<PanelTab>('overview');
  const [activeTabGroup, setActiveTabGroup] = useState<PanelGroup>('principal');
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBelt, setFilterBelt] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [membersSubTab, setMembersSubTab] = useState<'list' | 'requests' | 'ranking'>('list');
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [partnerAssignments, setPartnerAssignments] = useState<AcademyStudentProfessorAssignment[]>([]);
  const [partnerAssignmentsLoading, setPartnerAssignmentsLoading] = useState(false);
  const [processingPartnerAssignment, setProcessingPartnerAssignment] = useState<string | null>(null);
  const [partnerInvites, setPartnerInvites] = useState<AcademyProfessorLink[]>([]);
  const [partnerInvitesLoading, setPartnerInvitesLoading] = useState(false);
  const [processingPartnerInvite, setProcessingPartnerInvite] = useState<string | null>(null);

  // ── Solicitações de treino (QUERO TREINAR AQUI) ───────────────────────────
  const [trainRequests, setTrainRequests] = useState<TrainRequest[]>([]);
  const [showTrainRequests, setShowTrainRequests] = useState(false);
  const [acceptingTrainReq, setAcceptingTrainReq] = useState<string | null>(null);

  // ── Feed ──────────────────────────────────────────────────────────────────
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [postText, setPostText] = useState('');
  const [postType, setPostType] = useState('geral');
  const [postFilter, setPostFilter] = useState('all');
  const [postPhoto, setPostPhoto] = useState<File | null>(null);
  const [postPhotoPreview, setPostPhotoPreview] = useState<string | null>(null);
  const [savingPost, setSavingPost] = useState(false);
  const postPhotoRef = useRef<HTMLInputElement>(null);

  // ── Eventos ───────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<AcademyEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [fetchingEventCep, setFetchingEventCep] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<{ name: string; cep: string; address: string; number: string; neighborhood: string; city: string; state: string; label: string }[]>([]);

  // ── Desafios ──────────────────────────────────────────────────────────────
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [challengeRanking, setChallengeRanking] = useState<{ challengeId: string; entries: { uid: string; name: string; belt: string; progress: number; completed: boolean }[] } | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [showNewChallenge, setShowNewChallenge] = useState(false);
  const [challengeForm, setChallengeForm] = useState({ title: '', description: '', goal: '', goalType: 'trainings', startDate: '', endDate: '', xpReward: '50' });
  const [savingChallenge, setSavingChallenge] = useState(false);

  const accentColor = '#1A6ECC';
  const isAcademyOwner = profile?.role === 'academy' || profile?.role === 'admin' || (profile as any)?.isAcademyAdmin === true;
  // Professor vinculado a uma academia (academyId aponta para um admin acima dele)
  const isProfessorUnderAcademy = profile?.role === 'professor' && !!(profile as any)?.academyId;
  const canCreateEvents = !isProfessorUnderAcademy;
  const visiblePanelTabs = PANEL_TABS.filter(tab => !isProfessorUnderAcademy || !INTERNAL_PROFESSOR_HIDDEN_TABS.includes(tab.id));

  // ── Dados da Academia (diretório) ────────────────────────────────────────
  const [academyProfile, setAcademyProfile] = useState<any>(null);
  const [academyDojoStats, setAcademyDojoStats] = useState<{ enrollments: number; members: number; revenue: number } | null>(null);
  const [showAcademyForm, setShowAcademyForm] = useState(false);
  const [academyFormData, setAcademyFormData] = useState({
    cep: '', city: '', state: '', address: '', phone: '', instagram: '', style: '',
    franchise: '', monthlyFee: '', dailyFee: '', pixKey: '', photoUrls: [] as string[],
  });
  const [fetchingCep, setFetchingCep] = useState(false);
  const [savingAcademyData, setSavingAcademyData] = useState(false);
  const [confirmClearAddress, setConfirmClearAddress] = useState(false);
  const [clearingAddress, setClearingAddress] = useState(false);

  // Professor interno: carrega dados da academia para exibir no local de atendimento
  useEffect(() => {
    if (isProfessorUnderAcademy && (profile as any)?.academyId) {
      const academyUid = (profile as any).academyId as string;
      api.users.get(academyUid).then(data => setAcademyProfile(data)).catch(() => setAcademyProfile(null));
      // Carrega dados da academia para o poder do dojo
      Promise.all([
        api.enrollments.list({ professorUid: academyUid }).catch(() => []),
        api.users.list({ academyId: academyUid }).catch(() => []),
        api.payments.list({ professorUid: academyUid }).catch(() => []),
      ]).then(([enrolls, members, payments]) => {
        const activeEnrollments = (enrolls as any[]).filter((e: any) => e.status === 'active').length;
        const activeMembers = (members as any[]).length;
        const paidRevenue = (payments as any[]).filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + (p.amount || 0), 0);
        setAcademyDojoStats({ enrollments: activeEnrollments, members: activeMembers, revenue: paidRevenue });
      }).catch(() => setAcademyDojoStats(null));
    }
  }, [isProfessorUnderAcademy, profile]);

  const handleClearAddress = async () => {
    if (!user) return;
    setClearingAddress(true);
    try {
      await api.users.update(user.uid, {
        academyCep: null, academyCity: null, academyState: null, academyAddress: null,
      });
      toast.success('Local de atendimento removido.');
      setConfirmClearAddress(false);
    } catch { toast.error('Erro ao remover local.'); }
    finally { setClearingAddress(false); }
  };

  const handleCepChange = async (raw: string) => {
    const cep = raw.replace(/\D/g, '').slice(0, 8);
    setAcademyFormData(p => ({ ...p, cep }));
    if (cep.length === 8) {
      setFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAcademyFormData(p => ({
            ...p,
            city: data.localidade || p.city,
            state: data.uf || p.state,
            address: [data.logradouro, data.bairro].filter(Boolean).join(', ') || p.address,
          }));
        }
      } catch {
        // silencia erro de rede — usuário pode preencher manualmente
      } finally {
        setFetchingCep(false);
      }
    }
  };

  const loadLocationSuggestions = useCallback(async () => {
    if (locationSuggestions.length > 0) return; // já carregou
    try {
      const academies = await api.public.searchAcademies('');
      const items = (academies as any[])
        .map(p => ({
          name: (p.academyName || p.name || '').trim(),
          cep: p.academyCep || '',
          address: p.academyAddress || '',
          number: p.academyNumber || '',
          neighborhood: p.academyNeighborhood || '',
          city: p.academyCity || '',
          state: p.academyState || '',
          label: (p.academyCity && p.academyState ? `${p.academyCity} - ${p.academyState}` : p.academyCity || ''),
        }))
        .filter(p => p.name)
        .filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i);
      setLocationSuggestions(items);
    } catch { /* silencia — o campo ainda funciona sem sugestões */ }
  }, [locationSuggestions.length]);

  const handleEventCepChange = async (raw: string) => {
    const cep = raw.replace(/\D/g, '').slice(0, 8);
    setEventForm(p => ({ ...p, locationCep: cep, locationLatitude: null, locationLongitude: null }));
    if (cep.length !== 8) return;

    setFetchingEventCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data?.erro) {
        toast.warning('CEP nao encontrado.');
        return;
      }
      setEventForm(p => ({
        ...p,
        locationCep: cep,
        locationAddress: data.logradouro || p.locationAddress,
        locationNeighborhood: data.bairro || p.locationNeighborhood,
        locationCity: data.localidade || p.locationCity,
        locationState: data.uf || p.locationState,
        locationLatitude: null,
        locationLongitude: null,
      }));
    } catch {
      toast.warning('Nao foi possivel buscar o CEP. Preencha o endereco manualmente.');
    } finally {
      setFetchingEventCep(false);
    }
  };
  const [uploadingAcademyPhoto, setUploadingAcademyPhoto] = useState(false);
  const [uploadingProfessorPhoto, setUploadingProfessorPhoto] = useState(false);
  const academyPhotoInputRef = useRef<HTMLInputElement>(null);

  // ── Sincronização academyId ─────────────────────────────────────────────
  const [syncingAcademyId, setSyncingAcademyId] = useState(false);

  // ── Leads (Aulas Experimentais) ───────────────────────────────────────────────
  const [leads, setLeads] = useState<TrialRequest[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [trialSettingSaving, setTrialSettingSaving] = useState(false);

  // ── Waiver / Contrato Digital ───────────────────────────────────────────────
  const [waiverText, setWaiverText] = useState('');
  const [waiverLoading, setWaiverLoading] = useState(false);
  const [savingWaiver, setSavingWaiver] = useState(false);
  const [showWaiverEditor, setShowWaiverEditor] = useState(false);

  const DEFAULT_WAIVER = `TERMO DE RESPONSABILIDADE E MATRÍCULA

Ao realizar a matrícula ou solicitar participação em aulas, o aluno (ou responsável legal, no caso de menores de idade) declara estar ciente e de acordo com as seguintes condições:

1. RISCOS DA ATIVIDADE
O Jiu-Jitsu é uma arte marcial de contato que envolve riscos inerentes à prática, como quedas, torções e contato físico. O aluno declara estar em condições físicas adequadas para a prática e assume os riscos decorrentes.

2. RESPONSABILIDADE
A academia e o professor ficam isentos de responsabilidade por lesões decorrentes de acidentes durante os treinos, desde que não haja negligência comprovada por parte dos instrutores.

3. SAÚDE
O aluno declara não possuir contraindicação médica para a prática de atividades físicas de alto impacto. Recomenda-se avaliação médica prévia.

4. CONDUTA
O aluno compromete-se a respeitar colegas, professores e as regras da academia, seguindo as normas de higiene, pontualidade e disciplina exigidas.

5. IMAGEM
O aluno autoriza o uso de sua imagem em fotos e vídeos produzidos durante os treinos para fins de divulgação nas redes sociais da academia, podendo revogar essa autorização a qualquer momento mediante solicitação.

6. PAGAMENTOS
O aluno compromete-se a manter os pagamentos em dia conforme o plano escolhido. O não pagamento poderá resultar na suspensão do acesso às aulas.

Ao confirmar a matrícula ou participação, o aluno declara ter lido, compreendido e concordado com todos os termos acima.`;

  const handleSyncAcademyId = useCallback(async () => {
    if (!user) return;
    setSyncingAcademyId(true);
    try {
      const enrolls = await api.enrollments.list({ professorUid: user.uid });
      const active = (enrolls as any[]).filter(e => e.status === 'active' || e.status === 'suspended');
      let updated = 0;
      let skipped = 0;
      for (const enr of active) {
        if (!enr.studentUid) continue;
        try {
          const userData = await api.users.get(enr.studentUid);
          if (!(userData as any).academyId) {
            await api.users.update(enr.studentUid, {
              academyId: user.uid,
              academy: enr.academyName || '',
            });
            updated++;
          } else {
            skipped++;
          }
        } catch { skipped++; }
      }
      toast.success(`✅ Sincronização concluída: ${updated} aluno(s) atualizado(s), ${skipped} já tinham academyId.`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao sincronizar academyId dos alunos');
    } finally {
      setSyncingAcademyId(false);
    }
  }, [user]);

  // ── Financeiro ────────────────────────────────────────────────────────────
  const [financialSubTab, setFinancialSubTab] = useState<FinancialSubTab>('enrollments');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentMonthFilter, setPaymentMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [autoSuspendAfterDays, setAutoSuspendAfterDays] = useState(10);
  const [autoSuspendInput, setAutoSuspendInput] = useState('10');
  const [savingFinancialSettings, setSavingFinancialSettings] = useState(false);
  const [paymentIntegration, setPaymentIntegration] = useState<PaymentIntegrationSettings | null>(null);
  const [paymentIntegrationForm, setPaymentIntegrationForm] = useState({
    manualPaymentsEnabled: true,
    asaasEnabled: false,
    asaasSandbox: true,
    asaasBillingType: 'PIX' as 'PIX' | 'BOLETO' | 'CREDIT_CARD',
    asaasApiKey: '',
    pixKey: '',
    pixQrCodeUrl: '',
  });
  const [savingPaymentIntegration, setSavingPaymentIntegration] = useState(false);
  const [testingPaymentIntegration, setTestingPaymentIntegration] = useState(false);
  // Tela de revisão/aprovação de cobranças
  const [showBillingReview, setShowBillingReview] = useState(false);
  const [billingReviewItems, setBillingReviewItems] = useState<{ enrollmentId: string; studentName: string; studentUid: string; studentEmail: string; amount: number; dueDate: string; pixKey: string; billingMode: string; excluded: boolean }[]>([]);
  const [billingReviewLoading, setBillingReviewLoading] = useState(false);
  const [billingApproving, setBillingApproving] = useState(false);
  // WhatsApp substitui EmailJS — sem estado de config necessário

  // Modais financeiros
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<Payment | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState<Enrollment | null>(null);
  const [suspendConfirmStep, setSuspendConfirmStep] = useState<1 | 2>(1);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  // Busca de aluno para matrícula
  const [enrollSearchTerm, setEnrollSearchTerm] = useState('');
  const [enrollSearchResults, setEnrollSearchResults] = useState<Member[]>([]);
  const [enrollSearching, setEnrollSearching] = useState(false);
  const [enrollSelectedStudent, setEnrollSelectedStudent] = useState<Member | null>(null);
  const [enrollForm, setEnrollForm] = useState({ monthlyFee: '', pixKey: '', notes: '', studentPhone: '' });
  const [enrollBillingMode, setEnrollBillingMode] = useState<'prorata' | 'corrido' | null>(null);
  const [enrollStep, setEnrollStep] = useState<1 | 2 | 3>(1); // 1=buscar aluno, 2=dados, 3=modalidade
  const [savingEnroll, setSavingEnroll] = useState(false);

  // ── Carregar membros ──────────────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    if (!user) return;
    setMembersLoading(true);
    try {
      // Professor interno: carrega apenas alunos atribuídos a ele
      const searchAcademyId = isProfessorUnderAcademy ? ((profile as any)?.academyId as string || user.uid) : user.uid;
      const memberFetch = isProfessorUnderAcademy
        ? api.users.list({ academyId: searchAcademyId }) as Promise<Member[]>
        : api.users.list({ academyId: user.uid }) as Promise<Member[]>;

      let [linkedDocs, enrollmentDocs, assignedDocs] = await Promise.all([
        memberFetch,
        api.enrollments.list({ professorUid: user.uid }) as unknown as Promise<Enrollment[]>,
        isProfessorUnderAcademy || profile?.role === 'professor'
          ? api.academy.studentAssignments.mine() as unknown as Promise<{ studentUid: string }[]>
          : Promise.resolve([]),
      ]);

      // Para professor (interno/parceiro): filtra apenas alunos atribuídos
      if (assignedDocs.length > 0) {
        const assignedUids = new Set(assignedDocs.map(a => a.studentUid));
        if (isProfessorUnderAcademy) {
          linkedDocs = linkedDocs.filter(m => assignedUids.has(m.uid));
        }
      } else if (isProfessorUnderAcademy) {
        linkedDocs = [];
      }
      const activeEnrollmentDocs = enrollmentDocs.filter(enr => ['active', 'suspended'].includes(enr.status) && !!enr.studentUid);
      const byUid = new Map<string, Member>();

      linkedDocs.forEach(student => {
        if (student.uid) byUid.set(student.uid, student);
      });

      const missingUids = Array.from(new Set(activeEnrollmentDocs.map(enr => enr.studentUid)))
        .filter(uid => uid && !byUid.has(uid));
      const fetchedStudents = await Promise.all(missingUids.map(async uid => {
        try {
          return await api.users.get(uid) as Member;
        } catch {
          return null;
        }
      }));

      fetchedStudents.forEach(student => {
        if (student?.uid) byUid.set(student.uid, student);
      });

      activeEnrollmentDocs.forEach(enr => {
        if (!byUid.has(enr.studentUid)) {
          byUid.set(enr.studentUid, {
            uid: enr.studentUid,
            name: enr.studentName || 'Aluno',
            email: enr.studentEmail || '',
            phone: enr.studentPhone || '',
            belt: enr.studentBelt || 'Branca',
            stripes: enr.studentStripes ?? 0,
            photo: enr.studentPhoto || null,
          });
        }
      });

      const docs = Array.from(byUid.values());
      // Ordenar por XP desc; desempate por total de treinos desc
      docs.sort((a, b) => {
        const xpDiff = (b.xp ?? 0) - (a.xp ?? 0);
        if (xpDiff !== 0) return xpDiff;
        return (b.totalTrainings ?? 0) - (a.totalTrainings ?? 0);
      });
      setMembers(docs);
      setMemberCount(docs.length);
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [user, isProfessorUnderAcademy, profile]);

  // Carregar membros ao montar — único ponto de carga
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // ── Financeiro: funções ────────────────────────────────────────────────────────────
  const loadEnrollments = useCallback(async () => {
    if (!user) return;
    setEnrollmentsLoading(true);
    try {
      const docs: Enrollment[] = await api.enrollments.list({ professorUid: user.uid });
      docs.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
      setEnrollments(docs);
    } catch { setEnrollments([]); }
    finally { setEnrollmentsLoading(false); }
  }, [user]);

  const loadPayments = useCallback(async (month: string) => {
    if (!user || isProfessorUnderAcademy) {
      setPayments([]);
      setPaymentsLoading(false);
      return;
    }
    setPaymentsLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const allDocs: Payment[] = await api.payments.list({ professorUid: user.uid });
      const filtered = allDocs
        .filter(p => (p.month === month) || (p.dueDate?.slice(0, 7) === month))
        .map(data => {
          if (data.status === 'pending' && data.dueDate < today) data.status = 'overdue';
          return data;
        });
      // Deduplicar: 1 cobrança por aluno por mês (a mais recente)
      const byStudent = new Map<string, Payment>();
      filtered.forEach(p => {
        const existing = byStudent.get(p.studentUid);
        if (!existing || shouldReplaceFinancialPayment(existing, p)) byStudent.set(p.studentUid, p);
      });
      const docs = Array.from(byStudent.values());
      docs.sort((a, b) => a.studentName.localeCompare(b.studentName));
      setPayments(docs);
      await loadEnrollments();
    } catch { setPayments([]); }
    finally { setPaymentsLoading(false); }
  }, [user, isProfessorUnderAcademy, loadEnrollments]);

  const loadFinancialSettings = useCallback(async () => {
    if (isProfessorUnderAcademy) {
      setAutoSuspendAfterDays(10);
      setAutoSuspendInput('10');
      return;
    }
    try {
      const settings = await api.financialSettings.get();
      setAutoSuspendAfterDays(settings.autoSuspendAfterDays);
      setAutoSuspendInput(String(settings.autoSuspendAfterDays));
    } catch {
      setAutoSuspendAfterDays(10);
      setAutoSuspendInput('10');
    }
  }, [isProfessorUnderAcademy]);

  const saveFinancialSettings = useCallback(async () => {
    const parsed = Number(autoSuspendInput);
    const nextValue = Number.isFinite(parsed) ? Math.max(0, Math.min(365, Math.floor(parsed))) : 10;
    setSavingFinancialSettings(true);
    try {
      const settings = await api.financialSettings.update({ autoSuspendAfterDays: nextValue });
      setAutoSuspendAfterDays(settings.autoSuspendAfterDays);
      setAutoSuspendInput(String(settings.autoSuspendAfterDays));
      toast.success(settings.autoSuspendAfterDays > 0
        ? `Suspensão automática configurada para ${settings.autoSuspendAfterDays} dia(s)`
        : 'Suspensão automática desativada');
      await loadPayments(paymentMonthFilter);
    } catch {
      toast.error('Erro ao salvar configuração de suspensão');
    } finally {
      setSavingFinancialSettings(false);
    }
  }, [autoSuspendInput, loadPayments, paymentMonthFilter]);

  const applyPaymentIntegrationState = useCallback((settings: PaymentIntegrationSettings) => {
    setPaymentIntegration(settings);
    setPaymentIntegrationForm({
      manualPaymentsEnabled: settings.manualPaymentsEnabled,
      asaasEnabled: settings.asaasEnabled,
      asaasSandbox: settings.asaasSandbox,
      asaasBillingType: settings.asaasBillingType,
      asaasApiKey: '',
      pixKey: settings.pixKey || '',
      pixQrCodeUrl: settings.pixQrCodeUrl || '',
    });
  }, []);

  const loadPaymentIntegration = useCallback(async () => {
    if (isProfessorUnderAcademy) {
      setPaymentIntegration(null);
      return;
    }
    try {
      const settings = await api.paymentIntegrations.get();
      applyPaymentIntegrationState(settings);
    } catch {
      setPaymentIntegration(null);
    }
  }, [applyPaymentIntegrationState, isProfessorUnderAcademy]);

  const savePaymentIntegration = useCallback(async () => {
    setSavingPaymentIntegration(true);
    try {
      const settings = await api.paymentIntegrations.update({
        ...paymentIntegrationForm,
        asaasApiKey: paymentIntegrationForm.asaasApiKey.trim() || undefined,
      });
      applyPaymentIntegrationState(settings);
      toast.success(settings.asaasEnabled ? 'Integração Asaas salva' : 'Pagamentos manuais mantidos');
    } catch {
      toast.error('Erro ao salvar integração de pagamentos');
    } finally {
      setSavingPaymentIntegration(false);
    }
  }, [applyPaymentIntegrationState, paymentIntegrationForm]);

  const testPaymentIntegration = useCallback(async () => {
    setTestingPaymentIntegration(true);
    try {
      await api.paymentIntegrations.test({
        asaasApiKey: paymentIntegrationForm.asaasApiKey.trim() || undefined,
        asaasSandbox: paymentIntegrationForm.asaasSandbox,
      });
      toast.success('Conexão com Asaas validada');
    } catch {
      toast.error('Não foi possível validar a chave Asaas');
    } finally {
      setTestingPaymentIntegration(false);
    }
  }, [paymentIntegrationForm.asaasApiKey, paymentIntegrationForm.asaasSandbox]);

  const generateMonthlyPayments = useCallback(async (month: string, silent = false) => {
    if (!user || enrollments.length === 0) return;
    const activeEnrollments = enrollments.filter(e => e.status === 'active');
    if (activeEnrollments.length === 0) { if (!silent) toast.info('Nenhuma matrícula ativa'); return; }
    const [y, m] = month.split('-').map(Number);
    let created = 0;
    const existingPayments: Payment[] = await api.payments.list({ professorUid: user.uid });
    for (const enr of activeEnrollments) {
      const billingMode = (enr as any).billingMode || 'prorata';
      let dueDate: string;
      if (billingMode === 'corrido') {
        const lastPaid = existingPayments
          .filter(p => p.enrollmentId === enr.id && p.status === 'paid')
          .sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || ''))[0];
        if (lastPaid) {
          const base = new Date((lastPaid.paidAt || lastPaid.dueDate) + 'T00:00:00');
          base.setDate(base.getDate() + 30);
          dueDate = base.toISOString().slice(0, 10);
        } else {
          dueDate = `${y}-${String(m).padStart(2, '0')}-${String(enr.dueDay).padStart(2, '0')}`;
        }
      } else {
        dueDate = `${y}-${String(m).padStart(2, '0')}-05`;
      }
      const alreadyExists = existingPayments.some(p =>
        p.studentUid === enr.studentUid &&
        (p.dueDate?.slice(0,7) === month || p.month === month)
      );
      if (alreadyExists) continue;
      let createdPayment: any;
      try {
        createdPayment = await api.payments.create({
        enrollmentId: enr.id,
        professorUid: user.uid,
        studentUid: enr.studentUid,
        studentName: enr.studentName,
        studentEmail: enr.studentEmail,
        amount: enr.monthlyFee,
        dueDate,
        paidAt: null,
        status: 'pending',
        pixKey: enr.pixKey || '',
        notifiedDue: false,
        notifiedOverdue: false,
        month,
        billingMode,
        });
      } catch (err: any) {
        if (err?.status === 409 || err?.response?.status === 409) continue;
        throw err;
      }
      const dueDateFormatted = new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR');
      const paymentLink = createdPayment.paymentLink || createdPayment.pixLink;
      const paymentText = paymentLink && /^https?:\/\//.test(paymentLink)
        ? `Acesse o link de pagamento: ${paymentLink}`
        : 'Pague via PIX para continuar treinando.';
      try {
        await api.notifications.create({
          toUid: enr.studentUid,
          type: 'payment_due',
          message: `💳 Nova mensalidade gerada — R$ ${enr.monthlyFee.toFixed(2)} — vence em ${dueDateFormatted}. ${paymentText}`,
          data: { amount: enr.monthlyFee, dueDate, pixKey: enr.pixKey || '', paymentLink },
          read: false,
        });
      } catch { /* notificação não crítica */ }
      created++;
    }
    if (!silent) toast.success(`${created} cobrança(s) gerada(s)`);
    await loadPayments(month);
  }, [user, enrollments, loadPayments]);

  // Abrir tela de revisão de cobranças — calcula dueDate para cada matrícula ativa
  const handleOpenBillingReview = useCallback(async () => {
    if (!user) return;
    const activeEnrollments = enrollments.filter(e => e.status === 'active');
    if (activeEnrollments.length === 0) { toast.info('Nenhuma matrícula ativa'); return; }
    setBillingReviewLoading(true);
    setShowBillingReview(true);
    const [y, m] = paymentMonthFilter.split('-').map(Number);
    const existingPayments: Payment[] = await api.payments.list({ professorUid: user.uid });
    const items: typeof billingReviewItems = [];
    for (const enr of activeEnrollments) {
      const alreadyExists = existingPayments.some(p => p.enrollmentId === enr.id && p.month === paymentMonthFilter);
      const billingMode = (enr as any).billingMode || 'prorata';
      let dueDate: string;
      if (billingMode === 'corrido') {
        const lastPaid = existingPayments
          .filter(p => p.enrollmentId === enr.id && p.status === 'paid')
          .sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || ''))[0];
        if (lastPaid) {
          const base = new Date((lastPaid.paidAt || lastPaid.dueDate) + 'T00:00:00');
          base.setDate(base.getDate() + 30);
          dueDate = base.toISOString().slice(0, 10);
        } else {
          dueDate = `${y}-${String(m).padStart(2, '0')}-${String(enr.dueDay).padStart(2, '0')}`;
        }
      } else {
        dueDate = `${y}-${String(m).padStart(2, '0')}-05`;
      }
      items.push({
        enrollmentId: enr.id,
        studentName: enr.studentName,
        studentUid: enr.studentUid,
        studentEmail: enr.studentEmail,
        amount: enr.monthlyFee,
        dueDate,
        pixKey: enr.pixKey || '',
        billingMode,
        excluded: alreadyExists,
      });
    }
    setBillingReviewItems(items);
    setBillingReviewLoading(false);
  }, [user, enrollments, paymentMonthFilter, billingReviewItems]);

  // Confirmar aprovação e gerar cobranças com os itens revisados
  const handleApproveBilling = useCallback(async () => {
    if (!user) return;
    const toGenerate = billingReviewItems.filter(i => !i.excluded);
    if (toGenerate.length === 0) { toast.info('Nenhum item para gerar'); return; }
    setBillingApproving(true);
    const existingPayments: Payment[] = await api.payments.list({ professorUid: user.uid });
    let created = 0;
    for (const item of toGenerate) {
      const alreadyExists = existingPayments.some(p =>
        p.studentUid === item.studentUid &&
        (p.dueDate?.slice(0,7) === paymentMonthFilter || p.month === paymentMonthFilter)
      );
      if (alreadyExists) continue;
      let createdPayment: any;
      try {
        createdPayment = await api.payments.create({
        enrollmentId: item.enrollmentId,
        professorUid: user.uid,
        studentUid: item.studentUid,
        studentName: item.studentName,
        studentEmail: item.studentEmail,
        amount: item.amount,
        dueDate: item.dueDate,
        paidAt: null,
        status: 'pending',
        pixKey: item.pixKey,
        notifiedDue: false,
        notifiedOverdue: false,
        month: paymentMonthFilter,
        billingMode: item.billingMode,
        });
      } catch (err: any) {
        if (err?.status === 409 || err?.response?.status === 409) continue;
        throw err;
      }
      const dueDateFormatted = new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR');
      const paymentLink = createdPayment.paymentLink || createdPayment.pixLink;
      const paymentText = paymentLink && /^https?:\/\//.test(paymentLink)
        ? `Acesse o link de pagamento: ${paymentLink}`
        : 'Pague via PIX para continuar treinando.';
      const pushTitle = '💳 Nova mensalidade gerada';
      const pushBody = `R$ ${item.amount.toFixed(2)} — vence em ${dueDateFormatted}. ${paymentText}`;
      try {
        await api.notifications.create({
          toUid: item.studentUid, type: 'payment_due', message: `${pushTitle} — ${pushBody}`,
          data: { amount: item.amount, dueDate: item.dueDate, pixKey: item.pixKey, paymentLink }, read: false,
        });
      } catch { /* notificação não crítica */ }
      created++;
    }
    setBillingApproving(false);
    setShowBillingReview(false);
    toast.success(`${created} cobrança(s) gerada(s) e enviada(s) aos alunos!`);
    await loadPayments(paymentMonthFilter);
  }, [user, billingReviewItems, paymentMonthFilter, loadPayments]);


  const handleMarkPaid = useCallback(async (payment: Payment, receiptUrl?: string) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const updatedPayment = await api.payments.update(payment.id, {
        status: 'paid',
        paidAt: today,
        ...(receiptUrl ? { receiptUrl } : {}),
      });
      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: 'paid', paidAt: today } : p));

      // Reativar matrícula suspensa por inadimplência automaticamente
      const reactivatedIds = new Set((updatedPayment.reactivatedEnrollments || []).map(enr => enr.id));
      if (reactivatedIds.size > 0) {
        setEnrollments(prev => prev.map(enr => reactivatedIds.has(enr.id) ? { ...enr, status: 'active', suspendReason: '' } : enr));
      }

      if (reactivatedIds.size > 0) {
        toast.success('Pagamento confirmado e matrícula reativada!');
      } else {
        toast.success('Pagamento confirmado!');
      }
    } catch { toast.error('Erro ao confirmar pagamento'); }
  }, []);

  const handleConfirmPaymentWithReceipt = useCallback(async () => {
    if (!showPaymentModal) return;
    setUploadingReceipt(true);
    try {
      let receiptUrl: string | undefined;
      if (receiptFile) {
        receiptUrl = await api.upload.file(receiptFile, 'mensalidades');
      }
      await handleMarkPaid(showPaymentModal, receiptUrl);
      setShowPaymentModal(null);
      setReceiptFile(null);
      setReceiptPreview(null);
    } catch { toast.error('Erro ao confirmar pagamento'); }
    finally { setUploadingReceipt(false); }
  }, [showPaymentModal, receiptFile, handleMarkPaid]);

  const handleRevertPaid = useCallback(async (payment: Payment) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const dueStatus = payment.dueDate < today ? 'overdue' : 'pending';
      const updatedPayment = await api.payments.update(payment.id, { status: dueStatus, paidAt: null }) as Payment;
      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: dueStatus, paidAt: null } : p));
      const suspendedIds = new Set((updatedPayment.suspendedEnrollments || []).map(enr => enr.id));
      if (suspendedIds.size > 0) {
        setEnrollments(prev => prev.map(enr => suspendedIds.has(enr.id) ? { ...enr, status: 'suspended', suspendReason: 'Pagamento estornado' } : enr));
      }
      toast.success(suspendedIds.size > 0 ? 'Pagamento estornado e matrícula suspensa!' : 'Pagamento estornado');
    } catch { toast.error('Erro ao estornar'); }
  }, []);

  const handleSuspend = useCallback(async (enrollment: Enrollment, reason: string) => {
    if (!user) return;
    setSuspending(true);
    try {
      await api.enrollments.update(enrollment.id, {
        status: 'suspended',
        suspendReason: reason,
      });
      setEnrollments(prev => prev.map(e => e.id === enrollment.id ? { ...e, status: 'suspended', suspendReason: reason } : e));
      try {
        const notification = await api.notifications.create({
          toUid: enrollment.studentUid,
          type: 'payment_suspended',
          message: `Seu acesso foi temporariamente suspenso${reason ? ` — Motivo: ${reason}` : ''}. Entre em contato com o professor para regularizar sua situação.`,
          data: { enrollmentId: enrollment.id, reason },
          read: false,
        });
        toast.success(getWhatsAppAutomationToast(notification.whatsapp, 'Aluno suspenso e notificado'));
      } catch {
        toast.success('Aluno suspenso! Não foi possível enviar a notificação automática.');
      }
      setShowSuspendModal(null);
      setSuspendReason('');
      setSuspendConfirmStep(1);
    } catch { toast.error('Erro ao suspender'); }
    finally { setSuspending(false); }
  }, [user, profile]);

  const handleReactivate = useCallback(async (enrollment: Enrollment) => {
    try {
      await api.enrollments.update(enrollment.id, { status: 'active', suspendReason: '' });
      setEnrollments(prev => prev.map(e => e.id === enrollment.id ? { ...e, status: 'active', suspendReason: '' } : e));
      toast.success('Matrícula reativada!');
    } catch { toast.error('Erro ao reativar'); }
  }, []);

  const handleDeleteEnrollment = useCallback(async (enrollment: Enrollment) => {
    if (!window.confirm(`Tem certeza que deseja excluir a matrícula de ${enrollment.studentName}? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.enrollments.delete(enrollment.id);
      setEnrollments(prev => prev.filter(e => e.id !== enrollment.id));
      toast.success('Matrícula excluída!');
    } catch { toast.error('Erro ao excluir matrícula'); }
  }, []);

  // Carregar dados financeiros ao montar (para exibir resumo na visão geral)
  useEffect(() => { loadEnrollments(); }, [loadEnrollments]);
  useEffect(() => { loadPayments(paymentMonthFilter); }, [loadPayments, paymentMonthFilter]);
  useEffect(() => { loadFinancialSettings(); }, [loadFinancialSettings]);
  useEffect(() => { loadPaymentIntegration(); }, [loadPaymentIntegration]);

  useEffect(() => {
    if (activeTab === 'financial') {
      loadEnrollments();
    }
  }, [activeTab, loadEnrollments]);

  useEffect(() => {
    if (activeTab === 'financial') loadPayments(paymentMonthFilter);
  }, [activeTab, paymentMonthFilter, loadPayments]);

  // Auto-gera cobranças do mês corrente silenciosamente ao abrir aba financeira
  const autoGenerateRef = React.useRef(false);
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (activeTab === 'financial' && enrollments.length > 0 && paymentMonthFilter === currentMonth && !autoGenerateRef.current) {
      autoGenerateRef.current = true;
      generateMonthlyPayments(currentMonth, true);
    }
    if (activeTab !== 'financial') autoGenerateRef.current = false;
  }, [activeTab, enrollments, paymentMonthFilter, generateMonthlyPayments]);

  const exportFinancialPDF = useCallback(() => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const accentR = 204, accentG = 0, accentB = 0;
    const [y, m] = paymentMonthFilter.split('-').map(Number);
    const monthName = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();

    // Header
    pdf.setFillColor(10, 10, 10);
    pdf.rect(0, 0, 210, 297, 'F');
    pdf.setFillColor(accentR, accentG, accentB);
    pdf.rect(0, 0, 210, 18, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('BJJRATS — RELATÓRIO FINANCEIRO', 14, 12);
    pdf.setFontSize(9);
    pdf.text(monthName, 196, 12, { align: 'right' });

    // Resumo
    const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
    const overdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
    let cy = 28;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(150, 150, 150);
    pdf.text('RESUMO', 14, cy); cy += 5;
    const summaryItems = [
      { label: 'RECEBIDO', value: paid, color: [76, 175, 80] as [number,number,number] },
      { label: 'PENDENTE', value: pending, color: [255, 140, 0] as [number,number,number] },
      { label: 'ATRASADO', value: overdue, color: [204, 0, 0] as [number,number,number] },
    ];
    summaryItems.forEach((item, i) => {
      const x = 14 + i * 62;
      pdf.setFillColor(20, 20, 20);
      pdf.rect(x, cy, 58, 14, 'F');
      pdf.setDrawColor(...item.color); pdf.rect(x, cy, 58, 14, 'S');
      pdf.setTextColor(...item.color); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7);
      pdf.text(item.label, x + 4, cy + 5);
      pdf.setFontSize(10);
      pdf.text(`R$ ${item.value.toFixed(2)}`, x + 4, cy + 11);
    });
    cy += 22;

    // Tabela
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(150, 150, 150);
    pdf.text('COBRANÇAS', 14, cy); cy += 4;
    pdf.setFillColor(25, 25, 25);
    pdf.rect(14, cy, 182, 7, 'F');
    pdf.setTextColor(200, 200, 200); pdf.setFontSize(7);
    pdf.text('ALUNO', 16, cy + 4.5);
    pdf.text('VALOR', 110, cy + 4.5);
    pdf.text('VENCIMENTO', 135, cy + 4.5);
    pdf.text('STATUS', 175, cy + 4.5);
    cy += 8;

    payments.forEach((p, idx) => {
      if (cy > 270) { pdf.addPage(); cy = 20; }
      pdf.setFillColor(idx % 2 === 0 ? 15 : 20, idx % 2 === 0 ? 15 : 20, idx % 2 === 0 ? 15 : 20);
      pdf.rect(14, cy - 1, 182, 7, 'F');
      const statusColor: [number,number,number] = p.status === 'paid' ? [76, 175, 80] : p.status === 'overdue' ? [204, 0, 0] : [255, 140, 0];
      const statusLabel = p.status === 'paid' ? 'PAGO' : p.status === 'overdue' ? 'ATRASADO' : 'PENDENTE';
      pdf.setTextColor(220, 220, 220); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
      pdf.text(p.studentName.slice(0, 30), 16, cy + 3.5);
      pdf.text(`R$ ${p.amount.toFixed(2)}`, 110, cy + 3.5);
      pdf.text(new Date(p.dueDate + 'T00:00:00').toLocaleDateString('pt-BR'), 135, cy + 3.5);
      pdf.setTextColor(...statusColor); pdf.setFont('helvetica', 'bold');
      pdf.text(statusLabel, 175, cy + 3.5);
      cy += 7;
    });

    // Footer
    pdf.setTextColor(60, 60, 60); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
    pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} — BJJRats App`, 14, 290);

    pdf.save(`bjjrats-financeiro-${paymentMonthFilter}.pdf`);
    toast.success('PDF exportado!');
  }, [payments, paymentMonthFilter]);

  const handleSearchStudents = useCallback(async (term: string) => {
    const normalizedTerm = term.trim().toLowerCase();
    if (!normalizedTerm) { setEnrollSearchResults([]); return; }
    setEnrollSearching(true);
    try {
      // Busca alunos cadastrados globalmente e oculta quem ja esta matriculado aqui.
      const enrolledUids = new Set(
        enrollments
          .filter(enr => enr.status !== 'cancelled')
          .map(enr => enr.studentUid)
          .filter(Boolean)
      );
      const matchesTerm = (student: Member) => {
        const haystack = [
          student.name,
          student.email,
          student.phone,
          student.belt,
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(normalizedTerm);
      };
      const merged = new Map<string, Member>();
      const remoteStudents = await api.users.list({ role: 'student', search: normalizedTerm }) as Member[];
      [...remoteStudents, ...members].forEach(student => {
        if (!student.uid || student.uid === user?.uid) return;
        if (student.role && student.role !== 'student') return;
        if (enrolledUids.has(student.uid)) return;
        if (!matchesTerm(student)) return;
        merged.set(student.uid, student);
      });
      const results = Array.from(merged.values())
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
        .slice(0, 8);
      setEnrollSearchResults(results);
    } catch { setEnrollSearchResults([]); }
    finally { setEnrollSearching(false); }
  }, [enrollments, members, user]);

  const handleCreateEnrollment = useCallback(async () => {
    if (!user || !enrollSelectedStudent || !enrollForm.monthlyFee || !enrollBillingMode) return;
    setSavingEnroll(true);
    try {
      const fee = parseFloat(enrollForm.monthlyFee);
      const today = new Date();

      // Calcular os termos que o aluno vai aceitar no convite.
      let dueDay: number;
      let firstDueDate: string;
      let firstAmount: number;
      let firstMonth: string;

      if (enrollBillingMode === 'prorata') {
        // Pró-rata: vencimento fixo dia 5, primeira cobrança proporcional ao restante do mês
        dueDay = 5;
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const dayOfMonth = today.getDate();
        const daysRemaining = daysInMonth - dayOfMonth + 1; // inclui hoje
        const dailyRate = fee / daysInMonth;
        firstAmount = Math.round(dailyRate * daysRemaining * 100) / 100;
        // Vencimento: dia 5 do mês seguinte
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 5);
        firstDueDate = nextMonth.toISOString().slice(0, 10);
        firstMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      } else {
        // 30 dias corridos: vencimento = hoje + 30 dias
        dueDay = today.getDate(); // dia do mês da matrícula
        const due = new Date(today);
        due.setDate(due.getDate() + 30);
        firstDueDate = due.toISOString().slice(0, 10);
        firstAmount = fee;
        firstMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      }

      await api.enrollments.create({
        professorUid: user.uid,
        professorName: profile?.name || user.email || 'Professor',
        academyName: profile?.academyName || profile?.academy || '',
        studentUid: enrollSelectedStudent.uid,
        studentName: enrollSelectedStudent.name,
        studentEmail: (enrollSelectedStudent as any).email || '',
        studentPhone: enrollForm.studentPhone.trim(),
        studentBelt: enrollSelectedStudent.belt || 'Branca',
        studentStripes: enrollSelectedStudent.stripes ?? 0,
        monthlyFee: fee,
        dueDay,
        billingMode: enrollBillingMode,
        firstAmount,
        firstDueDate,
        firstMonth,
        pixKey: enrollForm.pixKey,
        notes: enrollForm.notes,
        status: 'pending',
      } as any);

      const modeLabel = enrollBillingMode === 'prorata'
        ? `Pró-rata R$ ${firstAmount.toFixed(2)} — vence ${new Date(firstDueDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
        : `R$ ${firstAmount.toFixed(2)} — vence em 30 dias (${new Date(firstDueDate + 'T00:00:00').toLocaleDateString('pt-BR')})`;

      toast.success(`Convite enviado! O aluno precisa aceitar. Termos: ${modeLabel}`);
      setShowEnrollModal(false);
      setEnrollSelectedStudent(null);
      setEnrollSearchTerm('');
      setEnrollSearchResults([]);
      setEnrollForm({ monthlyFee: '', pixKey: '', notes: '', studentPhone: '' });
      setEnrollBillingMode(null);
      setEnrollStep(1);
      await loadEnrollments();
    } catch (err: any) { console.error(err); toast.error(err?.message || 'Erro ao enviar convite de matrícula'); }
    finally { setSavingEnroll(false); }
  }, [user, profile, enrollSelectedStudent, enrollForm, enrollBillingMode, loadEnrollments]);

  // ── Carregar solicitações de treino ─────────────────────────────────────────
  const loadTrainRequests = useCallback(async () => {
    if (!user) return;
    try {
      const docs: TrainRequest[] = await api.academyRequests.list({ professorUid: user.uid })
        .then((reqs: any[]) => reqs
          .filter((r: any) => r.type === 'treino' && r.status === 'pending')
          .map((r: any) => ({
            ...r,
            createdAtStr: r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : '',
            read: r.read ?? false,
          }))
          .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        );
      setTrainRequests(docs);
    } catch (err) { console.error('Erro ao carregar solicitações de treino:', err); }
  }, [user]);

  useEffect(() => {
    loadTrainRequests();
  }, [loadTrainRequests]);

  const handleAcceptTrainRequest = async (req: TrainRequest) => {
    if (!user) return;
    setAcceptingTrainReq(req.id);
    try {
      await api.academyRequests.update(req.id, { status: 'accepted', read: true });
      if (req.requesterUid) {
        await api.notifications.create({
          toUid: req.requesterUid,
          type: 'train_request_accepted',
          message: `✅ SOLICITAÇÃO ACEITA! Sua solicitação de ${req.trainType === 'matricula' ? 'matrícula' : 'aula avulsa'} em ${req.academyName} foi aceita! Entre em contato com o professor.`,
          data: { academyName: req.academyName },
          read: false,
        });
      }
      setTrainRequests(prev => prev.filter(r => r.id !== req.id));
      toast.success(`Solicitação de ${req.requesterName} aceita!`);
      if (req.trainType === 'matricula') {
        setShowTrainRequests(false);
        setActiveTab('financial');
        setFinancialSubTab('enrollments');
        setShowEnrollModal(true);
        setEnrollStep(1);
        setEnrollSearchTerm(req.requesterName);
        toast.info('Busque o aluno para completar a matrícula');
      }
    } catch { toast.error('Erro ao aceitar solicitação'); }
    finally { setAcceptingTrainReq(null); }
  };

  const handleRejectTrainRequest = async (req: TrainRequest) => {
    try {
      await api.academyRequests.update(req.id, { status: 'rejected', read: true });
      if (req.requesterUid) {
        await api.notifications.create({
          toUid: req.requesterUid,
          type: 'train_request_rejected',
          message: `❌ SOLICITAÇÃO RECUSADA — Sua solicitação de ${req.trainType === 'matricula' ? 'matrícula' : 'aula avulsa'} em ${req.academyName} foi recusada.`,
          data: { academyName: req.academyName },
          read: false,
        });
      }
      setTrainRequests(prev => prev.filter(r => r.id !== req.id));
      toast.success('Solicitação recusada.');
    } catch { toast.error('Erro ao recusar solicitação'); }
  };

  // ── Solicitações de vínculo pendentes ──────────────────────────────────────
  const loadJoinRequests = useCallback(async () => {
    if (!user) return;
    setRequestsLoading(true);
    try {
      const all = await api.academyRequests.list({ professorUid: user.uid });
      const sorted = (all as any[])
        .filter((r: any) => r.status === 'pending' && r.type !== 'treino')
        .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || '')) as JoinRequest[];
      setJoinRequests(sorted);
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err);
      setJoinRequests([]);
    } finally { setRequestsLoading(false); }
  }, [user]);
  useEffect(() => { loadJoinRequests(); }, [loadJoinRequests]);

  const handleApproveRequest = async (req: JoinRequest) => {
    if (!user) return;
    setProcessingRequest(req.id);
    try {
      await api.academyRequests.update(req.id, { status: 'accepted' });
      setJoinRequests(prev => prev.filter(r => r.id !== req.id));
      loadMembers();
      toast.success(`${req.studentName} aprovado!`);
    } catch { toast.error('Erro ao aprovar solicitação'); }
    finally { setProcessingRequest(null); }
  };

  const handleRejectRequest = async (req: JoinRequest) => {
    setProcessingRequest(req.id);
    try {
      await api.academyRequests.update(req.id, { status: 'rejected' });
      setJoinRequests(prev => prev.filter(r => r.id !== req.id));
      toast.success(`Solicitação de ${req.studentName} recusada.`);
    } catch { toast.error('Erro ao recusar solicitação'); }
    finally { setProcessingRequest(null); }
  };

  // ── Carregar Feed ──────────────────────────────────────────────────────────
  const loadPartnerAssignments = useCallback(async () => {
    if (!user || profile?.role !== 'professor') return;
    setPartnerAssignmentsLoading(true);
    try {
      const rows = await api.academy.studentAssignments.mine();
      setPartnerAssignments(rows);
    } catch {
      setPartnerAssignments([]);
    } finally {
      setPartnerAssignmentsLoading(false);
    }
  }, [user, profile?.role]);

  useEffect(() => { loadPartnerAssignments(); }, [loadPartnerAssignments]);

  const loadPartnerInvites = useCallback(async () => {
    if (!user || profile?.role !== 'professor') return;
    setPartnerInvitesLoading(true);
    try {
      const rows = await api.academy.professors.mine();
      setPartnerInvites(rows);
    } catch {
      setPartnerInvites([]);
    } finally {
      setPartnerInvitesLoading(false);
    }
  }, [user, profile?.role]);

  useEffect(() => { loadPartnerInvites(); }, [loadPartnerInvites]);

  const handlePartnerAssignment = async (assignment: AcademyStudentProfessorAssignment, status: 'accepted' | 'rejected') => {
    setProcessingPartnerAssignment(assignment.id);
    try {
      await api.academy.studentAssignments.respond(assignment.id, status);
      setPartnerAssignments(prev => prev.map(item => item.id === assignment.id ? { ...item, status } : item));
      toast.success(status === 'accepted' ? 'Indicacao aceita.' : 'Indicacao recusada.');
    } catch {
      toast.error('Erro ao responder indicacao.');
    } finally {
      setProcessingPartnerAssignment(null);
    }
  };

  const handlePartnerInvite = async (invite: AcademyProfessorLink, status: 'accepted' | 'rejected') => {
    setProcessingPartnerInvite(invite.id);
    try {
      await api.academy.professors.respond(invite.id, status);
      setPartnerInvites(prev => prev.filter(item => item.id !== invite.id));
      toast.success(status === 'accepted' ? 'Convite de parceria aceito.' : 'Convite de parceria recusado.');
    } catch {
      toast.error('Erro ao responder convite de parceria.');
    } finally {
      setProcessingPartnerInvite(null);
    }
  };

  const loadPosts = useCallback(async () => {
    if (!user) return;
    setPostsLoading(true);
    try {
      const all = await api.posts.list({ authorUid: user.uid });
      const sorted = (all as Post[]).sort((a, b) => (b.createdAtStr || '').localeCompare(a.createdAtStr || ''));
      setPosts(sorted);
    } catch (err) {
      console.error('Erro ao carregar posts:', err);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [user]);

  const handleSavePost = async () => {
    if (!user || !profile || !postText.trim()) return;
    setSavingPost(true);
    try {
      let photoURL: string | null = null;

      if (postPhoto) {
        try {
          photoURL = await api.upload.file(postPhoto, 'comunidade');
        } catch {
          toast.warning('Não foi possível fazer upload da foto. Post será publicado sem imagem.');
        }
      }

      const publishAsAcademy = profile.role === 'academy' || profile.role === 'admin' || (profile as any).isAcademyAdmin === true;
      const publisherName = publishAsAcademy ? (profile.academyName || profile.name) : (profile.name || 'Professor');
      const publisherLogo = publishAsAcademy
        ? (profile.academyLogoUrl || (profile as any).academyLogo || '')
        : ((profile as any).professorPhotoUrl || profile.photo || '');

      await api.posts.create({
        uid: user.uid,
        authorUid: user.uid,
        academyId: user.uid,
        authorName: profile.name,
        authorPhotoURL: profile.photo || null,
        authorBelt: (profile as any).belt || 'Preta',
        academyName: publisherName,
        academyLogo: publisherLogo,
        text: postText.trim(),
        type: postType,
        photoURL,
        feedTarget: 'academy',
        isAcademyPost: true,
        likes: [],
        reactions: {},
        createdAtStr: new Date().toLocaleDateString('pt-BR'),
      });
      toast.success('Post publicado!');
      setPostText(''); setPostType('geral'); setPostPhoto(null); setPostPhotoPreview(null); setShowNewPost(false);
      loadPosts();
    } catch (err) {
      console.error('Erro ao publicar post:', err);
      toast.error('Erro ao publicar post. Tente novamente.');
    } finally {
      setSavingPost(false);
    }
  };

  // ── Carregar Eventos ──────────────────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    if (!user) return;
    setEventsLoading(true);
    try {
      const all = await api.events.list({ authorUid: user.uid });
      const sorted = (all as AcademyEvent[]).sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
      setEvents(sorted);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
      setEvents([]);
    } finally { setEventsLoading(false); }
  }, [user]);

  const handleSaveEvent = async () => {
    if (!user || !profile || !eventForm.title.trim() || !eventForm.date || !eventForm.description.trim() || !eventForm.slots || !eventForm.time || !eventForm.type) return;
    if (!canCreateEvents) {
      toast.error('Eventos sao gerenciados pela academia.');
      setShowNewEvent(false);
      return;
    }
    setSavingEvent(true);
    try {
      const publishAsAcademy = profile.role === 'academy' || profile.role === 'admin' || (profile as any).isAcademyAdmin === true;
      const publisherName = publishAsAcademy ? (profile.academyName || profile.name) : (profile.name || 'Professor');
      const publisherLogo = publishAsAcademy
        ? (profile.academyLogoUrl || (profile as any).academyLogo || '')
        : ((profile as any).professorPhotoUrl || profile.photo || '');
      const eventAddressLabel = getEventAddressLabel(eventForm);
      const newEvent = await api.events.create({
        authorUid: user.uid,
        academyId: user.uid,
        academyName: publisherName,
        academyLogo: publisherLogo,
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || null,
        type: eventForm.type,
        date: eventForm.date,
        time: eventForm.time || null,
        location: eventForm.location.trim() || eventAddressLabel || null,
        locationCep: eventForm.locationCep.replace(/\D/g, '') || null,
        locationAddress: eventForm.locationAddress.trim() || null,
        locationNumber: eventForm.locationNumber.trim() || null,
        locationNeighborhood: eventForm.locationNeighborhood.trim() || null,
        locationCity: eventForm.locationCity.trim() || null,
        locationState: eventForm.locationState.trim() || null,
        locationLatitude: eventForm.locationLatitude,
        locationLongitude: eventForm.locationLongitude,
        slots: eventForm.slots ? parseInt(eventForm.slots) : null,
        price: (eventForm.price === '' || Number(eventForm.price) === 0) ? 'Gratuito' : `R$ ${Number(eventForm.price).toFixed(2)}`,
        registrations: [],
        createdAtStr: new Date().toLocaleDateString('pt-BR'),
      });
      toast.success('Evento criado!');
      setEventForm(EMPTY_EVENT_FORM);
      setShowNewEvent(false);
      loadEvents();
    } catch { toast.error('Erro ao criar evento'); } finally { setSavingEvent(false); }
  };

  // ── Carregar Desafios ─────────────────────────────────────────────────────
  const loadChallenges = useCallback(async () => {
    if (!user) return;
    setChallengesLoading(true);
    try {
      const all = await api.challenges.list({ academyId: user.uid });
      const sorted = (all as Challenge[]).sort((a, b) => (b.startDate > a.startDate ? 1 : b.startDate < a.startDate ? -1 : 0));
      setChallenges(sorted);
    } catch (err) {
      console.error('Erro ao carregar desafios:', err);
      setChallenges([]);
    } finally { setChallengesLoading(false); }
  }, [user]);

  const handleSaveChallenge = async () => {
    if (!user || !profile || !challengeForm.title.trim() || !challengeForm.goal || !challengeForm.startDate || !challengeForm.endDate) return;
    setSavingChallenge(true);
    try {
      const publishAsAcademy = profile.role === 'academy' || profile.role === 'admin' || (profile as any).isAcademyAdmin === true;
      const publisherName = publishAsAcademy ? (profile.academyName || profile.name) : (profile.name || 'Professor');
      const publisherLogo = publishAsAcademy
        ? (profile.academyLogoUrl || (profile as any).academyLogo || '')
        : ((profile as any).professorPhotoUrl || profile.photo || '');
      const newChallenge = await api.challenges.create({
        authorUid: user.uid,
        academyId: user.uid,
        academyName: publisherName,
        academyLogo: publisherLogo,
        title: challengeForm.title.trim(),
        description: challengeForm.description.trim() || null,
        goal: parseInt(challengeForm.goal),
        goalType: challengeForm.goalType,
        startDate: challengeForm.startDate,
        endDate: challengeForm.endDate,
        xpReward: parseInt(challengeForm.xpReward) || 50,
        createdAtStr: new Date().toLocaleDateString('pt-BR'),
      });
      toast.success('Desafio criado!');
      setChallengeForm({ title: '', description: '', goal: '', goalType: 'trainings', startDate: '', endDate: '', xpReward: '50' });
      setShowNewChallenge(false);
      loadChallenges();
    } catch { toast.error('Erro ao criar desafio'); } finally { setSavingChallenge(false); }
  };

  useEffect(() => { if (activeTab === 'feed') loadPosts(); }, [activeTab, loadPosts]);
  useEffect(() => { if (activeTab === 'events') loadEvents(); }, [activeTab, loadEvents]);
  useEffect(() => { if (activeTab === 'challenges') loadChallenges(); }, [activeTab, loadChallenges]);

  const loadLeads = useCallback(async () => {
    // Leads/trial requests not available in SQL backend
    setLeads([]);
    setLeadsLoading(false);
  }, []);

  useEffect(() => { if (activeTab === 'leads') loadLeads(); }, [activeTab, loadLeads]);

  const trialRequestsEnabled = profile?.trialRequestsEnabled !== false;

  const handleToggleTrialRequests = async () => {
    if (!user) return;
    const nextValue = !trialRequestsEnabled;
    setTrialSettingSaving(true);
    try {
      await updateProfileData({ trialRequestsEnabled: nextValue });
      toast.success(nextValue ? 'Aula gratis ativada' : 'Aula gratis desativada');
    } catch {
      toast.error('Erro ao atualizar aula gratis');
    } finally {
      setTrialSettingSaving(false);
    }
  };

  const handleUploadProfessorPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file || !user) return;
    setUploadingProfessorPhoto(true);
    try {
      const url = await api.upload.file(file, 'perfil');
      await updateProfileData({ professorPhotoUrl: url, photo: url });
      toast.success('Foto do professor atualizada');
    } catch {
      toast.error('Erro ao enviar foto do professor');
    } finally {
      input.value = '';
      setUploadingProfessorPhoto(false);
    }
  };

  const handleUpdateLeadStatus = async (_leadId: string, _status: TrialRequest['status']) => {
    toast.error('Funcionalidade temporariamente indisponível');
  };

  const loadWaiver = useCallback(async () => {
    if (!user) return;
    setWaiverLoading(true);
    try {
      const data = await api.users.get(user.uid);
      if (data) setWaiverText((data as any).academyWaiverText || '');
    } catch (err) {
      console.error(err);
    } finally {
      setWaiverLoading(false);
    }
  }, [user]);

  const handleSaveWaiver = async () => {
    if (!user) return;
    setSavingWaiver(true);
    try {
      await api.users.update(user.uid, { academyWaiverText: waiverText });
      toast.success('✅ Contrato/waiver salvo com sucesso!');
      setShowWaiverEditor(false);
    } catch {
      toast.error('Erro ao salvar waiver');
    } finally {
      setSavingWaiver(false);
    }
  };

  useEffect(() => { if (activeTab === 'overview') loadWaiver(); }, [activeTab, loadWaiver]);

  // ── Filtros de membros ────────────────────────────────────────────────────────────────────────────────────────
  const filteredMembers = members.filter(m => {
    const matchName = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBelt = filterBelt ? m.belt === filterBelt : true;
    return matchName && matchBelt;
  });

  const activeTabInfo = visiblePanelTabs.find(tab => tab.id === activeTab) || visiblePanelTabs[0] || PANEL_TABS[0];
  const activeGroupTabs = visiblePanelTabs.filter(tab => tab.group === activeTabGroup);
  const pendingPartnerAssignments = partnerAssignments.filter(item => item.status === 'pending');
  const pendingPartnerInvites = partnerInvites.filter(item => item.status === 'pending');
  const pendingJoinCount = joinRequests.filter(r => r.status === 'pending').length + pendingPartnerAssignments.length + pendingPartnerInvites.length;
  const activeEnrollmentCount = enrollments.filter(e => e.status === 'active').length;
  const suspendedEnrollmentCount = enrollments.filter(e => e.status === 'suspended').length;
  const overduePaymentCount = payments.filter(p => p.status === 'overdue').length;
  const pendingLeadCount = leads.filter(l => l.status === 'pending').length;
  const financialAttentionCount = isProfessorUnderAcademy ? 0 : overduePaymentCount + suspendedEnrollmentCount;
  const paidRevenue = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const visibleMemberCount = memberCount ?? members.length;
  const totalAttentionCount = pendingJoinCount + pendingLeadCount + financialAttentionCount;
  const dojoPower = isProfessorUnderAcademy && academyDojoStats
    ? Math.max(0, Math.round(academyDojoStats.enrollments * 140 + academyDojoStats.members * 35 + Math.min(academyDojoStats.revenue, 20000) / 20))
    : Math.max(0, Math.round(activeEnrollmentCount * 140 + visibleMemberCount * 35 + Math.min(paidRevenue, 20000) / 20 + Math.max(0, pendingLeadCount) * 45));
  const dojoLevel = Math.max(1, Math.floor(dojoPower / 1000) + 1);
  const dojoProgress = dojoPower % 1000;
  const dojoProgressPercent = Math.min(100, Math.round((dojoProgress / 1000) * 100));
  const professorDisplayPhoto = profile?.professorPhotoUrl || profile?.photo || '';
  const headerAcademyLogo = isAcademyOwner ? (profile?.academyLogoUrl || (profile as any)?.academyLogo || '') : '';
  const headerIdentityImage = headerAcademyLogo || professorDisplayPhoto;
  const headerIdentityIsProfessorPhoto = !headerAcademyLogo && !!professorDisplayPhoto;
  const academyDisplayName = isAcademyOwner ? (profile?.academyName || 'Academia') : (profile?.name || 'Professor Particular');
  const directoryPanelTitle = isAcademyOwner ? 'DADOS DA ACADEMIA' : 'LOCAL DE ATENDIMENTO';
  const directoryPanelSubtitle = isAcademyOwner ? 'Apareca no diretorio de academias da comunidade' : 'Mostre onde voce atende como professor particular';
  const directoryEmptyText = isAcademyOwner
    ? 'Nenhum dado cadastrado. Clique em EDITAR para aparecer no diretorio.'
    : 'Nenhum local cadastrado. Clique em EDITAR para mostrar onde voce atende.';
  const directoryAddressLabel = isAcademyOwner ? 'ENDERECO DA ACADEMIA' : 'LOCAL / ENDERECO DE ATENDIMENTO';
  const directoryInstagramPlaceholder = isAcademyOwner ? '@academia' : '@professor';
  const directoryStyleLabel = isAcademyOwner ? 'LINHA DE TREINO' : 'LINHA DE TREINO';
  const directoryFranchiseLabel = isAcademyOwner ? 'FRANQUIA / EQUIPE' : 'EQUIPE / AFILIACAO';
  const directoryMonthlyLabel = isAcademyOwner ? 'MENSALIDADE (R$)' : 'PLANO MENSAL (R$)';
  const directoryDailyLabel = isAcademyOwner ? 'DIARIA (R$)' : 'AULA AVULSA (R$)';
  const directoryPhotoLabel = isAcademyOwner ? 'FOTOS DA ACADEMIA' : 'FOTOS DO LOCAL';
  const directoryPhotoHint = isAcademyOwner
    ? 'Selecione varias fotos de uma vez. Aparecerao na galeria da academia no diretorio.'
    : 'Selecione fotos do local onde atende. Elas ajudam alunos a reconhecer o espaco.';
  const directorySaveLabel = isAcademyOwner ? 'SALVAR E PUBLICAR NO DIRETORIO' : 'SALVAR LOCAL DE ATENDIMENTO';
  const directorySaveToast = isAcademyOwner ? 'Dados da academia atualizados!' : 'Local de atendimento atualizado!';
  const commandStatus = !isProfessorUnderAcademy && overduePaymentCount > 0
    ? { label: 'ATENCAO', color: '#CC0000', icon: Flame }
    : totalAttentionCount > 0
      ? { label: 'EM MISSAO', color: '#FFD166', icon: Zap }
      : { label: 'DOMINANDO', color: '#0D9E6E', icon: ShieldCheck };
  const CommandStatusIcon = commandStatus.icon;
  const missionCards = [
    {
      label: 'Entradas pendentes',
      value: pendingJoinCount,
      color: '#FFD166',
      icon: UserPlus,
      onClick: () => { setActiveTabGroup('alunos'); setActiveTab('members'); setMembersSubTab('requests'); },
    },
    {
      label: 'Aulas gratis',
      value: pendingLeadCount,
      color: '#0D9E6E',
      icon: Target,
      onClick: () => { setActiveTabGroup('comunidade'); setActiveTab('leads'); },
    },
    {
      label: 'Financeiro',
      value: overduePaymentCount,
      color: overduePaymentCount > 0 ? '#CC0000' : '#1A6ECC',
      icon: CreditCard,
      onClick: () => { setActiveTabGroup('gestao'); setActiveTab('financial'); },
    },
    {
      label: 'Agenda',
      value: 'Horarios',
      color: '#9B7CFF',
      icon: CalendarDays,
      onClick: () => { setActiveTabGroup('gestao'); setActiveTab('horarios'); },
    },
  ].filter(card => !(isProfessorUnderAcademy && (card.label === 'Financeiro' || card.label === 'Aulas gratis')));
  const filteredPosts = postFilter === 'all'
    ? posts
    : posts.filter(post => getProfessorPostType(post) === postFilter);
  const postFilterCounts = PROFESSOR_POST_FILTERS.reduce<Record<string, number>>((acc, filter) => {
    acc[filter.value] = filter.value === 'all'
      ? posts.length
      : posts.filter(post => getProfessorPostType(post) === filter.value).length;
    return acc;
  }, {});
  const eventAddressPreview = getEventAddressLabel(eventForm);
  const eventLocationPreview = getEventLocationLabel(eventForm);
  const eventHasMapPreview = Boolean(eventAddressPreview || eventForm.location.trim());

  const handleGroupSelect = (groupId: PanelGroup) => {
    setActiveTabGroup(groupId);
    if (activeTabInfo.group !== groupId) {
      const firstTab = visiblePanelTabs.find(tab => tab.group === groupId);
      if (firstTab) setActiveTab(firstTab.id);
    }
  };

  const getTabBadge = (tabId: PanelTab) => {
    if (tabId === 'members') return pendingJoinCount || memberCount || null;
    if (tabId === 'financial') return overduePaymentCount || null;
    if (tabId === 'leads') return pendingLeadCount || null;
    return null;
  };

  useEffect(() => {
    if (activeTabInfo.group !== activeTabGroup) setActiveTabGroup(activeTabInfo.group);
  }, [activeTabGroup, activeTabInfo.group]);

  useEffect(() => {
    if (isProfessorUnderAcademy && INTERNAL_PROFESSOR_HIDDEN_TABS.includes(activeTab)) {
      setActiveTab('overview');
      setActiveTabGroup('principal');
    }
  }, [activeTab, isProfessorUnderAcademy]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="prof-panel-root" style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div className="prof-panel-header" style={{ background: 'linear-gradient(135deg, #0D0D0D 0%, #111722 52%, #0B1510 100%)', borderBottom: `1px solid ${accentColor}55`, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', flexShrink: 0 }}>
        {onLogout ? (
          <button onClick={onLogout} title="Sair da conta" style={{ width: '40px', height: '40px', background: '#160A0A', border: '1px solid #CC333344', color: '#CC3333', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={20} strokeWidth={2.5} />
          </button>
        ) : (
          <button onClick={onBack} style={{ width: '40px', height: '40px', background: '#101821', border: `1px solid ${accentColor}55`, color: accentColor, padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
        )}
        {headerIdentityImage ? (
          <img className="prof-panel-emblem" src={headerIdentityImage} alt={headerIdentityIsProfessorPhoto ? 'Foto do professor' : 'Logo'} style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: headerIdentityIsProfessorPhoto ? '50%' : 0, border: `1px solid ${accentColor}`, background: '#0A0A0A' }} />
        ) : (
          <div className="prof-panel-emblem" style={{ width: '52px', height: '52px', background: '#111', border: `1px solid ${accentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Crown size={24} color={accentColor} strokeWidth={2.4} />
          </div>
        )}
        <div className="prof-panel-title" style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            <span style={{ background: `${commandStatus.color}20`, border: `1px solid ${commandStatus.color}`, color: commandStatus.color, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.18rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <CommandStatusIcon size={12} strokeWidth={2.4} />
              {commandStatus.label}
            </span>
            <span style={{ background: '#111', border: '1px solid #2A2A2A', color: '#AAA', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.18rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Medal size={12} color="#FFD166" strokeWidth={2.4} />
              Nivel {dojoLevel}
            </span>
          </div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.75rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 0.95, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0' }}>
            {academyDisplayName}
          </h1>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#7FADEB', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '0.35rem' }}>
            MESTRE BJJRATS
          </p>
        </div>
        <div className="prof-panel-power" style={{ minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.62rem', textTransform: 'uppercase', color: '#777', letterSpacing: '0.08em' }}>PODER DO DOJO</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', color: '#FFD166' }}>{dojoPower}</span>
          </div>
          <div style={{ height: '8px', background: '#0A0A0A', border: '1px solid #252525', overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(6, dojoProgressPercent)}%`, height: '100%', background: 'linear-gradient(90deg, #1A6ECC, #0D9E6E, #FFD166)' }} />
          </div>
        </div>
        <div className="prof-panel-notifications">{notificationSlot}</div>
        <button
          onClick={() => window.location.href = '/app/subscription'}
          title="Minha Assinatura"
          style={{
            width: '36px', height: '36px', background: '#111', border: '1px solid #333',
            color: '#AAA', padding: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        </button>
      </div>

      {/* Sub-nav organizada por grupos */}
      <div style={{ background: '#0B0B0B', borderBottom: '1px solid #20242A', flexShrink: 0 }}>
        <div className="prof-panel-nav-shell" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0.625rem 1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="prof-panel-group-tabs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: '0.375rem' }}>
            {PANEL_TAB_GROUPS.map(group => {
              const isActive = activeTabGroup === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => handleGroupSelect(group.id)}
                  style={{
                    background: isActive ? '#151C2A' : '#101010',
                    border: `1px solid ${isActive ? `${accentColor}88` : '#242424'}`,
                    color: isActive ? '#FFFFFF' : '#666',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    padding: '0.625rem 0.25rem',
                    minHeight: '44px',
                    cursor: 'pointer',
                    minWidth: 0,
                    borderRadius: '6px',
                    boxShadow: isActive ? `0 0 0 1px ${accentColor}22 inset` : 'none',
                  }}
                >
                  {group.label}
                </button>
              );
            })}
          </div>

          <div className="prof-panel-tabs" style={{ display: 'flex', overflowX: 'auto', gap: '0.375rem', paddingBottom: '0.125rem' }}>
            {activeGroupTabs.map(tab => {
              const Icon = tab.icon;
              const badge = getTabBadge(tab.id);
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '0.625rem 0.875rem',
                    background: isActive ? accentColor : '#111',
                    border: `1px solid ${isActive ? accentColor : '#2A2A2A'}`,
                    color: isActive ? '#FFFFFF' : '#888',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s',
                    minHeight: '44px',
                    borderRadius: '6px',
                    boxShadow: isActive ? `0 8px 22px ${accentColor}30` : 'none',
                  }}
                >
                  <Icon size={15} strokeWidth={2.4} />
                  {tab.label}
                  {badge !== null && (
                    <span style={{ background: isActive ? '#FFFFFF' : accentColor, color: isActive ? accentColor : '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.58rem', padding: '0.05rem 0.35rem', borderRadius: '999px', minWidth: '18px', textAlign: 'center' }}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="prof-panel-content" style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            variants={tabVariant}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={tabTransition}
            className="prof-panel-motion"
            style={{ maxWidth: '1180px', width: '100%', margin: '0 auto' }}
          >        {/* ── Visão Geral ── */}
        {activeTab === 'overview' && (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="prof-panel-command-card" style={{ background: 'linear-gradient(135deg, #111 0%, #131923 58%, #0D1611 100%)', border: `1px solid ${accentColor}44`, borderLeft: `4px solid ${commandStatus.color}`, padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
                  <label title="Alterar foto do professor" style={{ width: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flexShrink: 0, cursor: uploadingProfessorPhoto ? 'not-allowed' : 'pointer', opacity: uploadingProfessorPhoto ? 0.65 : 1 }}>
                    {professorDisplayPhoto ? (
                      <img src={professorDisplayPhoto} alt={profile?.name || 'Professor'} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '50%', border: `2px solid ${accentColor}`, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '64px', height: '64px', background: '#101821', border: `2px solid ${accentColor}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ShieldCheck size={28} color={accentColor} strokeWidth={2.3} />
                      </div>
                    )}
                    <span style={{ width: '100%', background: '#101010', border: `1px solid ${accentColor}55`, color: accentColor, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.52rem', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '0.18rem 0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                      <Camera size={10} strokeWidth={2.5} />
                      {uploadingProfessorPhoto ? '...' : 'Foto'}
                    </span>
                    <input type="file" accept="image/*" onChange={handleUploadProfessorPhoto} style={{ display: 'none' }} disabled={uploadingProfessorPhoto} />
                  </label>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.45rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name || 'Professor'}</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#7FADEB', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.3rem' }}>
                      Mestre BJJRats
                    </p>
                  </div>
                </div>

                <div className="prof-panel-compact-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem' }}>
                  {[
                    { label: 'Dojo', value: `Nv. ${dojoLevel}`, icon: Sparkles, color: '#FFD166' },
                    { label: 'Alunos', value: visibleMemberCount, icon: Users, color: accentColor },
                    { label: 'Status', value: commandStatus.label, icon: CommandStatusIcon, color: commandStatus.color },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} style={{ background: '#0A0A0A99', border: `1px solid ${item.color}33`, padding: '0.75rem', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                          <Icon size={14} color={item.color} strokeWidth={2.4} />
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.58rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</span>
                        </div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFF', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: '#0A0A0ACC', border: '1px solid #242424', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Progressao do mes</p>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#FFD166' }}>{dojoProgress}/1000</span>
                  </div>
                  <div style={{ height: '12px', background: '#111', border: '1px solid #2A2A2A', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(6, dojoProgressPercent)}%`, height: '100%', background: 'linear-gradient(90deg, #1A6ECC, #0D9E6E, #FFD166)' }} />
                  </div>
                </div>

                <div className="prof-panel-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {!isProfessorUnderAcademy && (
                    <button onClick={() => setActiveTab('financial')} style={{ background: '#101010', border: '1px solid #2A2A2A', color: '#DDD', padding: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'center' }}>
                      <TrendingUp size={15} color="#0D9E6E" strokeWidth={2.4} />
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase' }}>Financeiro</span>
                    </button>
                  )}
                  <button onClick={() => setActiveTab('members')} style={{ background: '#101010', border: '1px solid #2A2A2A', color: '#DDD', padding: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'center' }}>
                    <Users size={15} color={accentColor} strokeWidth={2.4} />
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase' }}>Membros</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Academia info */}
            <div style={{ display: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {professorDisplayPhoto ? (
                  <img src={professorDisplayPhoto} alt={profile?.name || 'Professor'} style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '50%', border: `2px solid ${accentColor}` }} />
                ) : (
                  <div style={{ width: '52px', height: '52px', background: '#001A33', border: `2px solid ${accentColor}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🥋</div>
                )}
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1 }}>{profile?.name}</p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: accentColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>
                    PROFESSOR
                  </p>
                </div>
              </div>
              {(profile?.academyCity || profile?.academyState) && (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  📍 {[profile?.academyAddress, profile?.academyCity, profile?.academyState].filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'ALUNOS', value: memberCount ?? '—', icon: Users, color: accentColor },
                { label: 'MATRÍCULAS ATIVAS', value: enrollmentsLoading ? '...' : activeEnrollmentCount, icon: UserPlus, color: '#0D9E6E' },
                { label: 'PENDÊNCIAS', value: pendingJoinCount + overduePaymentCount + suspendedEnrollmentCount, icon: Bell, color: pendingJoinCount + overduePaymentCount + suspendedEnrollmentCount > 0 ? '#CC0000' : '#555' },
                { label: 'RECEBIDO NO MÊS', value: paymentsLoading ? '...' : `R$ ${paidRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: DollarSign, color: '#0D9E6E' },
              ].filter(stat => !isProfessorUnderAcademy || !['MATRÍCULAS ATIVAS', 'PENDÊNCIAS', 'RECEBIDO NO MÊS'].includes(stat.label)).map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: `3px solid ${stat.color}`, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '104px' }}>
                    <Icon size={20} color={stat.color} strokeWidth={2.4} />
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.35rem', color: '#FFFFFF', lineHeight: 1 }}>{stat.value}</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.62rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Zap size={15} color="#FFD166" strokeWidth={2.4} />
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#DDD', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Missoes rapidas</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.625rem' }}>
                {missionCards.map(mission => {
                  const Icon = mission.icon;
                  const isHot = typeof mission.value === 'number' && mission.value > 0;
                  return (
                    <button key={mission.label} onClick={mission.onClick} style={{ background: isHot ? `${mission.color}16` : '#111', border: `1px solid ${isHot ? mission.color : '#242424'}`, borderLeft: `3px solid ${mission.color}`, color: '#FFF', padding: '0.875rem', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem', minHeight: '74px' }}>
                      <div style={{ width: '34px', height: '34px', background: '#0A0A0A', border: `1px solid ${mission.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={17} color={mission.color} strokeWidth={2.4} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: mission.color, lineHeight: 1 }}>{mission.value}</p>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.62rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mission.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {!isProfessorUnderAcademy && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                💰 FINANCEIRO · {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
              </p>
              <div className="prof-panel-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div style={{ background: '#0D1A0D', border: '1px solid #0D9E6E33', padding: '0.875rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>✅</span>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.15rem', color: '#0D9E6E', lineHeight: 1 }}>
                    {paymentsLoading ? '...' : `R$\u00a0${paidRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                  </p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em' }}>RECEBIDO</p>
                </div>
                <div
                  onClick={() => setActiveTab('financial')}
                  style={{ background: overduePaymentCount > 0 ? '#1A0D0D' : '#111', border: `1px solid ${overduePaymentCount > 0 ? '#CC000044' : '#1E1E1E'}`, padding: '0.875rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.15rem', color: overduePaymentCount > 0 ? '#CC0000' : '#444', lineHeight: 1 }}>
                    {paymentsLoading ? '...' : overduePaymentCount}
                  </p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em' }}>VENCIDOS</p>
                </div>
                <div
                  onClick={() => setActiveTab('financial')}
                  style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.875rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '1.1rem' }}>📋</span>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.15rem', color: '#FFF', lineHeight: 1 }}>
                    {enrollmentsLoading ? '...' : activeEnrollmentCount}
                  </p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ATIVOS</p>
                </div>
              </div>
            </div>
            )}

            {/* Alertas */}
            {(joinRequests.filter(r => r.status === 'pending').length > 0 ||
              (!isProfessorUnderAcademy && (
                enrollments.filter(e => e.status === 'suspended').length > 0 ||
                payments.filter(p => p.status === 'overdue').length > 0
              ))) && (
              <div style={{ background: '#140E00', border: '1px solid #CC660033', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#CC7700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🔔 REQUER ATENÇÃO</p>
                {joinRequests.filter(r => r.status === 'pending').length > 0 && (
                  <button
                    onClick={() => { setActiveTab('members'); setMembersSubTab('requests'); }}
                    style={{ background: 'none', border: '1px solid #CC660022', padding: '0.5rem 0.75rem', color: '#DDD', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%' }}
                  >
                    <span>🙋</span>
                    <span>{joinRequests.filter(r => r.status === 'pending').length} solicitação(ões) de entrada pendente(s)</span>
                    <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CC7700" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                )}
                {!isProfessorUnderAcademy && payments.filter(p => p.status === 'overdue').length > 0 && (
                  <button
                    onClick={() => setActiveTab('financial')}
                    style={{ background: 'none', border: '1px solid #CC000022', padding: '0.5rem 0.75rem', color: '#DDD', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%' }}
                  >
                    <span>💳</span>
                    <span>{payments.filter(p => p.status === 'overdue').length} pagamento(s) vencido(s)</span>
                    <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                )}
                {!isProfessorUnderAcademy && enrollments.filter(e => e.status === 'suspended').length > 0 && (
                  <button
                    onClick={() => setActiveTab('financial')}
                    style={{ background: 'none', border: '1px solid #33330022', padding: '0.5rem 0.75rem', color: '#DDD', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%' }}
                  >
                    <span>⏸️</span>
                    <span>{enrollments.filter(e => e.status === 'suspended').length} aluno(s) suspenso(s)</span>
                    <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                )}
              </div>
            )}

            {/* Perfil no diretório */}
            <div style={{ background: '#111', border: `1px solid ${accentColor}22`, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#FFF' }}>
                    {isProfessorUnderAcademy ? 'DADOS DA ACADEMIA' : directoryPanelTitle}
                  </p>
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.2rem' }}>
                    {isProfessorUnderAcademy ? `Vinculado a ${academyProfile?.academyName || academyProfile?.name || 'academia'}. Gerenciado pela academia.` : directoryPanelSubtitle}
                  </p>
                </div>
                {!isProfessorUnderAcademy && (
                  <button
                    onClick={() => {
                      setAcademyFormData({
                        cep: (profile as any)?.academyCep || '',
                        city: (profile as any)?.academyCity || '',
                        state: (profile as any)?.academyState || '',
                        address: (profile as any)?.academyAddress || '',
                        phone: (profile as any)?.academyPhone || '',
                        instagram: (profile as any)?.academyInstagram || '',
                        style: (profile as any)?.academyStyle || '',
                        franchise: (profile as any)?.academyFranchise || '',
                        monthlyFee: (profile as any)?.academyMonthlyFee ? String((profile as any).academyMonthlyFee) : '',
                        dailyFee: (profile as any)?.academyDailyFee ? String((profile as any).academyDailyFee) : '',
                        pixKey: (profile as any)?.academyPixKey || '',
                        photoUrls: (profile as any)?.academyPhotoUrls || [],
                      });
                      setShowAcademyForm(v => !v);
                    }}
                    style={{ background: showAcademyForm ? accentColor : 'transparent', border: `1px solid ${accentColor}`, color: showAcademyForm ? '#FFF' : accentColor, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.375rem 0.75rem', cursor: 'pointer' }}
                  >
                    {showAcademyForm ? 'FECHAR' : 'EDITAR'}
                  </button>
                )}
              </div>

              {/* Info atual */}
              {!showAcademyForm && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(isProfessorUnderAcademy && academyProfile) ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {(academyProfile.academyCity || academyProfile.academyState) && (
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: '1px solid #E87722', color: '#E87722', background: '#E8772215' }}>
                          📍 {[academyProfile.academyCity, academyProfile.academyState].filter(Boolean).join(' — ')}
                        </span>
                      )}
                      {academyProfile.academyPhone && (
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: '1px solid #333', color: '#888' }}>📱 {academyProfile.academyPhone}</span>
                      )}
                      {academyProfile.academyInstagram && (
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: '1px solid #333', color: '#888' }}>📸 @{academyProfile.academyInstagram}</span>
                      )}
                      {academyProfile.academyAddress && (
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: '1px solid #333', color: '#888' }}>🏠 {academyProfile.academyAddress}</span>
                      )}
                      {!academyProfile.academyCity && !academyProfile.academyAddress && (
                        <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#444' }}>Academia ainda não cadastrou endereço no diretório.</span>
                      )}
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                        {(profile as any)?.academyCity || (profile as any)?.academyState ? (
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: '1px solid #CC0000', color: '#CC0000', background: '#CC000015' }}>
                        📍 {[(profile as any)?.academyCity, (profile as any)?.academyState].filter(Boolean).join(' — ')}
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#444' }}>{directoryEmptyText}</span>
                    )}
                    {(profile as any)?.academyPhone && (
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: '1px solid #333', color: '#888' }}>📱 {(profile as any)?.academyPhone}</span>
                    )}
                    {(profile as any)?.academyInstagram && (
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: '1px solid #333', color: '#888' }}>📸 @{(profile as any)?.academyInstagram}</span>
                    )}
                  </div>
                  {((profile as any)?.academyCity || (profile as any)?.academyState) && !isProfessorUnderAcademy && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {!confirmClearAddress ? (
                        <button
                          onClick={() => setConfirmClearAddress(true)}
                          style={{ background: 'none', border: '1px solid #CC000044', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.25rem 0.625rem', cursor: 'pointer', letterSpacing: '0.05em' }}
                        >
                          🗑 EXCLUIR LOCAL
                        </button>
                      ) : (
                        <>
                          <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#888' }}>Confirmar exclusão?</span>
                          <button
                            onClick={handleClearAddress}
                            disabled={clearingAddress}
                            style={{ background: '#CC0000', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.25rem 0.625rem', cursor: clearingAddress ? 'default' : 'pointer', letterSpacing: '0.05em' }}
                          >
                            {clearingAddress ? 'REMOVENDO...' : 'SIM, EXCLUIR'}
                          </button>
                          <button
                            onClick={() => setConfirmClearAddress(false)}
                            disabled={clearingAddress}
                            style={{ background: 'none', border: '1px solid #333', color: '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.25rem 0.625rem', cursor: 'pointer', letterSpacing: '0.05em' }}
                          >
                            CANCELAR
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  </>
                )}
                </div>
              )}
              {/* Formulário de edição */}
              {showAcademyForm && !isProfessorUnderAcademy && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>CEP</p>
                    <div style={{ position: 'relative' }}>
                      <input type="text" value={academyFormData.cep} onChange={e => handleCepChange(e.target.value)} placeholder="00000-000" maxLength={9}
                        style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${accentColor}44`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }} />
                      {fetchingCep && (
                        <span style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#888', fontFamily: 'Barlow, sans-serif' }}>buscando...</span>
                      )}
                    </div>
                  </div>
                  <div className="prof-panel-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>CIDADE *</p>
                      <input type="text" value={academyFormData.city} onChange={e => setAcademyFormData(p => ({ ...p, city: e.target.value }))} placeholder="Ex: São Paulo"
                        style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${accentColor}44`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>ESTADO *</p>
                      <select value={academyFormData.state} onChange={e => setAcademyFormData(p => ({ ...p, state: e.target.value }))}
                        style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${accentColor}44`, color: academyFormData.state ? '#FFF' : '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.5rem 0.5rem', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}>
                        <option value="">UF</option>
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{directoryAddressLabel}</p>
                    <input type="text" value={academyFormData.address} onChange={e => setAcademyFormData(p => ({ ...p, address: e.target.value }))} placeholder="Rua, número, bairro"
                      style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${accentColor}44`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div className="prof-panel-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>WHATSAPP</p>
                      <input type="tel" value={academyFormData.phone} onChange={e => setAcademyFormData(p => ({ ...p, phone: e.target.value }))} placeholder="11999999999"
                        style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${accentColor}44`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>INSTAGRAM</p>
                      <input type="text" value={academyFormData.instagram} onChange={e => setAcademyFormData(p => ({ ...p, instagram: e.target.value }))} placeholder={directoryInstagramPlaceholder}
                        style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${accentColor}44`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div className="prof-panel-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{directoryStyleLabel}</p>
                      <input type="text" value={academyFormData.style} onChange={e => setAcademyFormData(p => ({ ...p, style: e.target.value }))} placeholder="Ex: Gi, No-Gi, Competicao"
                        style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${accentColor}44`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{directoryFranchiseLabel}</p>
                      <input type="text" value={academyFormData.franchise} onChange={e => setAcademyFormData(p => ({ ...p, franchise: e.target.value }))} placeholder="Ex: Gracie Barra, Alliance"
                        style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${accentColor}44`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div className="prof-panel-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{directoryMonthlyLabel}</p>
                      <input type="number" value={academyFormData.monthlyFee} onChange={e => setAcademyFormData(p => ({ ...p, monthlyFee: e.target.value }))} placeholder="0.00"
                        style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${accentColor}44`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{directoryDailyLabel}</p>
                      <input type="number" value={academyFormData.dailyFee} onChange={e => setAcademyFormData(p => ({ ...p, dailyFee: e.target.value }))} placeholder="0.00"
                        style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${accentColor}44`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>CHAVE PIX</p>
                      <input type="text" value={academyFormData.pixKey} onChange={e => setAcademyFormData(p => ({ ...p, pixKey: e.target.value }))} placeholder="CPF, email ou chave"
                        style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${accentColor}44`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{directoryPhotoLabel}</p>
                    {/* Galeria de miniaturas */}
                    {academyFormData.photoUrls.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        {academyFormData.photoUrls.map((url, idx) => (
                          <div key={idx} style={{ position: 'relative', width: '72px', height: '72px', border: `1px solid ${accentColor}44`, overflow: 'hidden' }}>
                            <img src={url} alt={`foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              onClick={() => setAcademyFormData(p => ({ ...p, photoUrls: p.photoUrls.filter((_, i) => i !== idx) }))}
                              style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.75)', border: 'none', color: '#FFF', fontSize: '0.65rem', cursor: 'pointer', padding: '0.1rem 0.25rem', lineHeight: 1 }}
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Botao de upload */}
                    <input
                      ref={academyPhotoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (!files.length || !user) return;
                        setUploadingAcademyPhoto(true);
                        try {
                          const urls: string[] = [];
                          for (const file of files) {
                            const url = await api.upload.file(file, 'perfil');
                            urls.push(url);
                          }
                          setAcademyFormData(p => ({ ...p, photoUrls: [...p.photoUrls, ...urls] }));
                          toast.success(`${urls.length} foto(s) enviada(s)!`);
                        } catch {
                          toast.error('Erro ao enviar foto(s). Tente novamente.');
                        } finally {
                          setUploadingAcademyPhoto(false);
                          if (academyPhotoInputRef.current) academyPhotoInputRef.current.value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => academyPhotoInputRef.current?.click()}
                      disabled={uploadingAcademyPhoto}
                      style={{ width: '100%', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.625rem', background: uploadingAcademyPhoto ? '#1A1A1A' : '#0A0A0A', border: `1px dashed ${accentColor}44`, color: uploadingAcademyPhoto ? '#555' : '#888', cursor: uploadingAcademyPhoto ? 'default' : 'pointer', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      <span style={{ fontSize: '1rem' }}>📷</span>
                      {uploadingAcademyPhoto ? 'ENVIANDO...' : `+ ADICIONAR FOTOS${academyFormData.photoUrls.length > 0 ? ` (${academyFormData.photoUrls.length} foto${academyFormData.photoUrls.length > 1 ? 's' : ''})` : ''}`}
                    </button>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#444', marginTop: '0.2rem' }}>{directoryPhotoHint}</p>
                  </div>
                  <button
                    disabled={savingAcademyData || !academyFormData.city || !academyFormData.state}
                    onClick={async () => {
                      if (!user || !profile) return;
                      setSavingAcademyData(true);
                      try {
                        const updates = {
                          academyCep: academyFormData.cep.replace(/\D/g, ''),
                          academyCity: academyFormData.city.trim(),
                          academyState: academyFormData.state,
                          academyAddress: academyFormData.address.trim(),
                          academyPhone: academyFormData.phone.trim(),
                          academyInstagram: academyFormData.instagram.replace('@', '').trim(),
                          academyStyle: academyFormData.style.trim(),
                          academyFranchise: academyFormData.franchise.trim(),
                          academyMonthlyFee: academyFormData.monthlyFee ? parseFloat(academyFormData.monthlyFee) : null,
                          academyDailyFee: academyFormData.dailyFee ? parseFloat(academyFormData.dailyFee) : null,
                          academyPixKey: academyFormData.pixKey.trim(),
                          academyPhotoUrls: academyFormData.photoUrls,
                        };
                        await api.users.update(user.uid, updates);
                        toast.success(directorySaveToast);
                        setShowAcademyForm(false);
                      } catch { toast.error('Erro ao salvar dados.'); }
                      finally { setSavingAcademyData(false); }
                    }}
                    style={{ background: savingAcademyData || !academyFormData.city || !academyFormData.state ? '#333' : accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.75rem', cursor: savingAcademyData || !academyFormData.city || !academyFormData.state ? 'not-allowed' : 'pointer', width: '100%' }}
                  >
                    {savingAcademyData ? 'SALVANDO...' : directorySaveLabel}
                  </button>
                </div>
              )}
            </div>

            {/* Waiver / Contrato Digital */}
            {!isProfessorUnderAcademy && (
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#FFF', margin: 0 }}>📄 CONTRATO / WAIVER</p>
                <button
                  onClick={() => {
                    if (!showWaiverEditor && !waiverText) setWaiverText(DEFAULT_WAIVER);
                    setShowWaiverEditor(!showWaiverEditor);
                  }}
                  style={{ background: showWaiverEditor ? accentColor : 'transparent', border: `1px solid ${accentColor}`, color: showWaiverEditor ? '#FFF' : accentColor, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.375rem 0.75rem', cursor: 'pointer' }}
                >
                  {showWaiverEditor ? 'FECHAR' : waiverText ? 'EDITAR' : 'CRIAR'}
                </button>
              </div>
              {!showWaiverEditor && (
                waiverText
                  ? <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#666', margin: 0, whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'hidden' }}>{waiverText.slice(0, 200)}{waiverText.length > 200 ? '...' : ''}</p>
                  : <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#444', margin: 0 }}>Nenhum contrato cadastrado. Alunos precisarão aceitar os termos ao se matricular.</p>
              )}
              {showWaiverEditor && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', margin: 0 }}>Este texto será exibido para o aluno ao fazer matrícula ou aula experimental. O aluno deverá aceitar antes de prosseguir.</p>
                    <button
                      onClick={() => setWaiverText(DEFAULT_WAIVER)}
                      style={{ flexShrink: 0, marginLeft: '0.75rem', background: 'none', border: '1px solid #333', color: '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.25rem 0.625rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      ↩ USAR PADRÃO
                    </button>
                  </div>
                  <textarea
                    value={waiverText}
                    onChange={e => setWaiverText(e.target.value)}
                    placeholder="Ex: Ao se matricular, o aluno declara estar ciente dos riscos inerentes à prática de artes marciais e isenta a academia de responsabilidade por lesões decorrentes de acidentes durante os treinos..."
                    rows={8}
                    style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${accentColor}44`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', padding: '0.75rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={handleSaveWaiver}
                    disabled={savingWaiver || !waiverText.trim()}
                    style={{ background: savingWaiver || !waiverText.trim() ? '#333' : accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.75rem', cursor: savingWaiver || !waiverText.trim() ? 'not-allowed' : 'pointer' }}
                  >
                    {savingWaiver ? 'SALVANDO...' : '✓ SALVAR CONTRATO'}
                  </button>
                </div>
              )}
            </div>
            )}

            {/* Quick actions */}
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>AÇÕES RÁPIDAS</p>
                <div className="prof-panel-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {visiblePanelTabs.filter(action => action.id !== 'overview' && action.id !== 'avisos').map(action => {
                  const Icon = action.icon;
                  return (
                  <button key={action.id} onClick={() => setActiveTab(action.id)}
                    style={{ background: '#111', border: `1px solid ${accentColor}22`, padding: '0.875rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', textAlign: 'left' }}>
                    <Icon size={17} color={accentColor} strokeWidth={2.4} />
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: '#CCC', letterSpacing: '0.05em' }}>{action.label}</span>
                    <ChevronRight size={14} color={accentColor} strokeWidth={2.4} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                  </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'avisos' && (
          <AvisosTab user={user} profile={profile} accentColor={accentColor} />
        )}

        {/* ── Feed ── */}
        {activeTab === 'feed' && (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Botão novo post */}
            <button
              onClick={() => setShowNewPost(true)}
              style={{ background: accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.875rem', cursor: 'pointer', width: '100%' }}
            >
              + NOVO POST
            </button>

            {/* Formulário novo post */}
            {showNewPost && (
              <div style={{ background: '#111', border: `1px solid ${accentColor}`, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#FFF' }}>NOVO POST</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[{ v: 'geral', l: 'GERAL' }, { v: 'aviso', l: '⚠️ NOTIFICAÇÃO' }, { v: 'novidade', l: '🎉 NOVIDADE' }, { v: 'resultado', l: '🏆 RESULTADO' }].map(t => (
                    <button key={t.v} onClick={() => setPostType(t.v)}
                      style={{ padding: '0.3rem 0.625rem', background: postType === t.v ? accentColor : '#1A1A1A', border: `1px solid ${postType === t.v ? accentColor : '#333'}`, color: postType === t.v ? '#FFF' : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', cursor: 'pointer' }}>
                      {t.l}
                    </button>
                  ))}
                </div>
                <textarea
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder="Escreva sua mensagem para os alunos..."
                  rows={4}
                  style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', resize: 'none', width: '100%', boxSizing: 'border-box' }}
                />
                {/* Upload foto */}
                <div>
                  <input ref={postPhotoRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setPostPhoto(f); setPostPhotoPreview(URL.createObjectURL(f)); } }}
                  />
                  {postPhotoPreview ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={postPhotoPreview} alt="preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                      <button onClick={() => { setPostPhoto(null); setPostPhotoPreview(null); }}
                        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#FFF', cursor: 'pointer', padding: '0.25rem 0.5rem', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem' }}>REMOVER</button>
                    </div>
                  ) : (
                    <button onClick={() => postPhotoRef.current?.click()}
                      style={{ background: '#1A1A1A', border: '1px dashed #333', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.625rem 1rem', cursor: 'pointer', width: '100%' }}>
                      🖼️ ADICIONAR FOTO
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button onClick={() => { setShowNewPost(false); setPostText(''); setPostPhoto(null); setPostPhotoPreview(null); }}
                    style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer' }}>CANCELAR</button>
                  <button onClick={handleSavePost} disabled={savingPost || !postText.trim()}
                    style={{ flex: 2, background: savingPost || !postText.trim() ? '#333' : accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.625rem', cursor: savingPost || !postText.trim() ? 'default' : 'pointer' }}>
                    {savingPost ? 'PUBLICANDO...' : 'PUBLICAR'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de posts */}
            <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {PROFESSOR_POST_FILTERS.map(filter => {
                const active = postFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setPostFilter(filter.value)}
                    style={{
                      flex: '0 0 auto',
                      background: active ? accentColor + '22' : '#111',
                      border: `1px solid ${active ? accentColor : '#2A2A2A'}`,
                      color: active ? accentColor : '#666',
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontWeight: 900,
                      fontSize: '0.68rem',
                      textTransform: 'uppercase',
                      padding: '0.4rem 0.625rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {filter.label} ({postFilterCounts[filter.value] || 0})
                  </button>
                );
              })}
            </div>
            {postsLoading && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>CARREGANDO...</p>}
            {!postsLoading && filteredPosts.length === 0 && !showNewPost && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📡</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>{posts.length === 0 ? 'NENHUM POST AINDA' : 'NENHUM POST NESTE FILTRO'}</p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#444', marginTop: '0.5rem' }}>{posts.length === 0 ? 'Publique novidades, notificacoes e resultados para seus alunos.' : 'Escolha outro filtro para ver mais posts.'}</p>
              </div>
            )}
            {filteredPosts.map(post => (
              <div key={post.id} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ background: accentColor + '22', border: `1px solid ${accentColor}`, color: accentColor, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem' }}>{getProfessorPostType(post).toUpperCase()}</span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#444' }}>{post.createdAtStr}</span>
                </div>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#CCC', lineHeight: 1.5 }}>{post.text}</p>
                {post.photoURL && (
                  <div style={{ width: '100%', maxHeight: '280px', overflow: 'hidden', borderRadius: '2px' }}>
                    <img src={post.photoURL} alt="" style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`).catch(() => {}); toast.success('Link copiado!'); }}
                    style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem', cursor: 'pointer' }}>
                    🔗 COPIAR LINK
                  </button>
                  <button
                    onClick={async () => { await api.posts.delete(post.id); setPosts(prev => prev.filter(p => p.id !== post.id)); toast.success('Post removido'); }}
                    style={{ background: '#1A0000', border: '1px solid #3A0000', color: '#CC3333', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Eventos ── */}
        {activeTab === 'events' && (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {canCreateEvents ? (
              <button onClick={() => setShowNewEvent(true)}
                style={{ background: accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.875rem', cursor: 'pointer', width: '100%' }}>
                + NOVO EVENTO
              </button>
            ) : (
              <div style={{ background: '#101010', border: '1px solid #2A2A2A', borderLeft: `3px solid ${accentColor}`, padding: '1rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', color: '#FFF', marginBottom: '0.25rem' }}>EVENTOS GERENCIADOS PELA ACADEMIA</p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#666', lineHeight: 1.45 }}>Professores subordinados podem acompanhar os eventos, mas a criacao fica no painel da academia.</p>
              </div>
            )}

            {canCreateEvents && showNewEvent && (
              <div style={{ background: '#111', border: `1px solid ${accentColor}`, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#FFF' }}>NOVO EVENTO</p>
                {[{ k: 'title', l: 'TÍTULO *', ph: 'Ex: Open Match Interno' }, { k: 'description', l: 'DESCRIÇÃO *', ph: 'Detalhes do evento...' }].map(f => (
                  <div key={f.k}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{f.l}</p>
                    <input type="text" value={(eventForm as Record<string,string>)[f.k]} onChange={e => setEventForm(prev => ({ ...prev, [f.k]: e.target.value }))}
                      placeholder={f.ph}
                      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
                {/* Vagas e Valor — campos numéricos */}
                <div className="prof-panel-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>VAGAS *</p>
                    <input type="number" min={1} step={1} value={eventForm.slots} onChange={e => setEventForm(prev => ({ ...prev, slots: e.target.value }))}
                      placeholder="Ex: 30"
                      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>VALOR (R$) — deixe 0 para gratuito</p>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#666', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', pointerEvents: 'none' }}>R$</span>
                      <input type="number" min={0} step={0.01} value={eventForm.price} onChange={e => setEventForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0,00"
                        style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem 0.625rem 2.2rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    {(eventForm.price === '' || Number(eventForm.price) === 0) && (
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#25D366', marginTop: '0.25rem', letterSpacing: '0.04em' }}>✓ GRATUITO</p>
                    )}
                  </div>
                </div>
                <div style={{ border: '1px solid #1E1E1E', background: '#0D0D0D', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <MapPin size={15} style={{ color: accentColor }} />
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LOCAL DO EVENTO</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>NOME DO LOCAL</p>
                    <input type="text" list="event-location-suggestions" value={eventForm.location}
                      onChange={e => {
                        const val = e.target.value;
                        const match = locationSuggestions.find(s => s.name === val);
                        if (match) {
                          setEventForm(prev => ({
                            ...prev,
                            location: val,
                            locationCep: match.cep.replace(/\D/g, ''),
                            locationAddress: match.address || prev.locationAddress,
                            locationNumber: match.number || prev.locationNumber,
                            locationNeighborhood: match.neighborhood || prev.locationNeighborhood,
                            locationCity: match.city || prev.locationCity,
                            locationState: match.state || prev.locationState,
                            locationLatitude: null,
                            locationLongitude: null,
                          }));
                        } else {
                          setEventForm(prev => ({ ...prev, location: val }));
                        }
                      }}
                      onFocus={loadLocationSuggestions}
                      placeholder="Ex: Academia Templo, Ginasio Municipal"
                      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                    <datalist id="event-location-suggestions">
                      {locationSuggestions.map((s, i) => (
                        <option key={i} value={s.name}>{s.label ? `${s.name} — ${s.label}` : s.name}</option>
                      ))}
                    </datalist>
                  </div>
                  <div className="prof-panel-grid-2" style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 0.45fr) minmax(0, 1fr)', gap: '0.625rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>CEP</p>
                      <div style={{ position: 'relative' }}>
                        <input type="text" value={formatCep(eventForm.locationCep)} onChange={e => handleEventCepChange(e.target.value)} placeholder="00000-000" maxLength={9}
                          style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${eventForm.locationCep.length === 8 ? accentColor : '#2A2A2A'}`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                        {fetchingEventCep && <span style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#777', fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem' }}>buscando...</span>}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>ENDERECO</p>
                      <input type="text" value={eventForm.locationAddress} onChange={e => setEventForm(prev => ({ ...prev, locationAddress: e.target.value }))}
                        placeholder="Rua / Avenida"
                        style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div className="prof-panel-grid-2" style={{ display: 'grid', gridTemplateColumns: '0.45fr 1fr', gap: '0.625rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>NUMERO</p>
                      <input type="text" value={eventForm.locationNumber} onChange={e => setEventForm(prev => ({ ...prev, locationNumber: e.target.value }))}
                        placeholder="123"
                        style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>BAIRRO</p>
                      <input type="text" value={eventForm.locationNeighborhood} onChange={e => setEventForm(prev => ({ ...prev, locationNeighborhood: e.target.value }))}
                        placeholder="Bairro"
                        style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div className="prof-panel-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 0.35fr', gap: '0.625rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>CIDADE</p>
                      <input type="text" value={eventForm.locationCity} onChange={e => setEventForm(prev => ({ ...prev, locationCity: e.target.value }))}
                        placeholder="Cidade"
                        style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>UF</p>
                      <input type="text" value={eventForm.locationState} onChange={e => setEventForm(prev => ({ ...prev, locationState: e.target.value.toUpperCase().slice(0, 2) }))}
                        placeholder="SP" maxLength={2}
                        style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }} />
                    </div>
                  </div>
                  {eventHasMapPreview && (
                    <div style={{ border: '1px solid #222', background: '#080808', overflow: 'hidden' }}>
                      <iframe
                        title="Mapa do evento"
                        src={getEventMapEmbedUrl(eventForm)}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        style={{ width: '100%', height: '180px', border: 'none', display: 'block', background: '#0A0A0A' }}
                      />
                      <div style={{ padding: '0.625rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.625rem', borderTop: '1px solid #1A1A1A' }}>
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#777', lineHeight: 1.35, margin: 0 }}>{eventLocationPreview}</p>
                        <a href={getEventGoogleMapsUrl(eventForm)} target="_blank" rel="noreferrer" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', color: accentColor, textDecoration: 'none', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          <Navigation size={14} /> MAPS
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>DATA *</p>
                    <input type="date" value={eventForm.date} min={new Date().toISOString().split('T')[0]} onChange={e => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                      style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${eventForm.date ? accentColor : '#2A2A2A'}`, color: eventForm.date ? '#FFF' : '#666', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>HORÁRIO *</p>
                    <input type="time" value={eventForm.time} onChange={e => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>TIPO *</p>
                  <select value={eventForm.type} onChange={e => setEventForm(prev => ({ ...prev, type: e.target.value }))}
                    style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }}>
                    {[['competicao', '🏆 COMPETIÇÃO'], ['seminario', '📚 SEMINÁRIO'], ['aula_especial', '🥋 AULA ESPECIAL'], ['open_match', '⚔️ OPEN MATCH'], ['outro', '📅 OUTRO']].map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button onClick={() => { setShowNewEvent(false); setEventForm(EMPTY_EVENT_FORM); }}
                    style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer' }}>CANCELAR</button>
                  <button onClick={handleSaveEvent} disabled={savingEvent || !eventForm.title.trim() || !eventForm.date || !eventForm.description.trim() || !eventForm.slots || !eventForm.time || !eventForm.type}
                    style={{ flex: 2, background: savingEvent || !eventForm.title.trim() || !eventForm.date || !eventForm.description.trim() || !eventForm.slots || !eventForm.time || !eventForm.type ? '#333' : accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer' }}>
                    {savingEvent ? 'SALVANDO...' : '📅 CRIAR EVENTO'}
                  </button>
                </div>
              </div>
            )}

            {eventsLoading && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>CARREGANDO...</p>}
            {!eventsLoading && events.length === 0 && !showNewEvent && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM EVENTO CRIADO</p>
              </div>
            )}
            {events.map(ev => (
              <EventCard
                key={ev.id}
                ev={ev}
                accentColor={accentColor}
                professorProfile={profile}
                onDelete={async () => {
                  await api.events.delete(ev.id);
                  setEvents(prev => prev.filter(e => e.id !== ev.id));
                  toast.success('Evento removido');
                }}
              />
            ))}
          </div>
        )}

        {/* ── Desafios ── */}
        {activeTab === 'challenges' && (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button onClick={() => setShowNewChallenge(true)}
              style={{ background: accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.875rem', cursor: 'pointer', width: '100%' }}>
              + NOVO DESAFIO
            </button>

            {showNewChallenge && (
              <div style={{ background: '#111', border: `1px solid ${accentColor}`, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#FFF' }}>NOVO DESAFIO</p>
                {[{ k: 'title', l: 'TÍTULO *', ph: 'Ex: Desafio 30 Treinos' }, { k: 'description', l: 'DESCRIÇÃO', ph: 'Explique o desafio...' }].map(f => (
                  <div key={f.k}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{f.l}</p>
                    <input type="text" value={(challengeForm as Record<string,string>)[f.k]} onChange={e => setChallengeForm(prev => ({ ...prev, [f.k]: e.target.value }))}
                      placeholder={f.ph}
                      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>META (TIPO)</p>
                    <select value={challengeForm.goalType} onChange={e => setChallengeForm(prev => ({ ...prev, goalType: e.target.value }))}
                      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }}>
                      <option value="trainings">Nº DE TREINOS</option>
                      <option value="minutes">MINUTOS DE TREINO</option>
                      <option value="xp">XP ACUMULADO</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>META (VALOR) *</p>
                    <input type="number" value={challengeForm.goal} onChange={e => setChallengeForm(prev => ({ ...prev, goal: e.target.value }))}
                      placeholder="Ex: 30"
                      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>INÍCIO *</p>
                    <input type="date" value={challengeForm.startDate} onChange={e => setChallengeForm(prev => ({ ...prev, startDate: e.target.value }))}
                      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>TÉRMINO *</p>
                    <input type="date" value={challengeForm.endDate} onChange={e => setChallengeForm(prev => ({ ...prev, endDate: e.target.value }))}
                      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>RECOMPENSA XP</p>
                  <input type="number" value={challengeForm.xpReward} onChange={e => setChallengeForm(prev => ({ ...prev, xpReward: e.target.value }))}
                    placeholder="Ex: 100"
                    style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button onClick={() => { setShowNewChallenge(false); setChallengeForm({ title: '', description: '', goal: '', goalType: 'trainings', startDate: '', endDate: '', xpReward: '50' }); }}
                    style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer' }}>CANCELAR</button>
                  <button onClick={handleSaveChallenge} disabled={savingChallenge || !challengeForm.title.trim() || !challengeForm.goal || !challengeForm.startDate || !challengeForm.endDate}
                    style={{ flex: 2, background: savingChallenge || !challengeForm.title.trim() || !challengeForm.goal || !challengeForm.startDate || !challengeForm.endDate ? '#333' : accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer' }}>
                    {savingChallenge ? 'SALVANDO...' : '⭐ CRIAR DESAFIO'}
                  </button>
                </div>
              </div>
            )}

            {challengesLoading && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>CARREGANDO...</p>}
            {!challengesLoading && challenges.length === 0 && !showNewChallenge && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⭐</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM DESAFIO CRIADO</p>
              </div>
            )}
            {challenges.map(ch => (
              <div key={ch.id} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1 }}>{ch.title}</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: accentColor, textTransform: 'uppercase', marginTop: '0.25rem' }}>{ch.startDate} → {ch.endDate}</p>
                  </div>
                  <span style={{ background: '#FFD70022', border: '1px solid #FFD700', color: '#FFD700', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', flexShrink: 0 }}>+{ch.xpReward} XP</span>
                </div>
                {ch.description && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#666', lineHeight: 1.4 }}>{ch.description}</p>}
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#888' }}>META: {ch.goal} {ch.goalType === 'trainings' ? 'TREINOS' : ch.goalType === 'minutes' ? 'MINUTOS' : 'XP'}</p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button onClick={async () => {
                    if (challengeRanking?.challengeId === ch.id) { setChallengeRanking(null); return; }
                    setRankingLoading(true);
                    try {
                      // Ranking via trainings API — filter by challenge dates
                      const trainings = await api.trainings.list();
                      const entries: { uid: string; name: string; belt: string; progress: number; completed: boolean }[] = [];
                      const byUser: Record<string, typeof trainings> = {};
                      for (const t of (trainings as any[])) {
                        if (!t.trainingDate || t.trainingDate < ch.startDate || t.trainingDate > ch.endDate) continue;
                        if (!byUser[t.uid]) byUser[t.uid] = [];
                        byUser[t.uid].push(t);
                      }
                      for (const [uid, ts] of Object.entries(byUser)) {
                        const first = (ts as any[])[0];
                        let progress = 0;
                        if (ch.goalType === 'trainings') progress = (ts as any[]).length;
                        else if (ch.goalType === 'xp') progress = (ts as any[]).reduce((s: number, t: any) => s + (t.xp || 0), 0);
                        else if (ch.goalType === 'minutes') progress = (ts as any[]).reduce((s: number, t: any) => s + (t.duration || 0), 0);
                        entries.push({ uid, name: first.userName || 'Atleta', belt: first.userBelt || 'Branca', progress, completed: progress >= ch.goal });
                      }
                      entries.sort((a, b) => b.progress - a.progress);
                      setChallengeRanking({ challengeId: ch.id, entries });
                    } catch { toast.error('Erro ao carregar ranking'); }
                    finally { setRankingLoading(false); }
                  }}
                    style={{ background: '#1A1A2A', border: '1px solid #2A2A4A', color: '#8888CC', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer' }}>
                    {rankingLoading && challengeRanking?.challengeId !== ch.id ? '...' : challengeRanking?.challengeId === ch.id ? '✖ FECHAR' : '🏆 RANKING'}
                  </button>
                  <button onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/desafio/${ch.id}`).catch(() => {}); toast.success('Link copiado!'); }}
                    style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer' }}>
                    🔗 LINK
                  </button>
                  {(profile?.role === 'superadmin' || profile?.communityModerator || user?.uid === ch.creatorUid) && (
                    <button onClick={async () => { await api.challenges.delete(ch.id); setChallenges(prev => prev.filter(c => c.id !== ch.id)); toast.success('Desafio removido'); }}
                      style={{ background: '#1A0000', border: '1px solid #3A0000', color: '#CC3333', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer' }}>
                      🗑️
                    </button>
                  )}
                </div>
                {/* Ranking expandido */}
                {challengeRanking?.challengeId === ch.id && (
                  <div style={{ marginTop: '0.5rem', borderTop: '1px solid #1E1E1E', paddingTop: '0.75rem' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', color: accentColor, marginBottom: '0.5rem' }}>
                      🏆 RANKING — {challengeRanking.entries.length} PARTICIPANTE{challengeRanking.entries.length !== 1 ? 'S' : ''}
                    </p>
                    {challengeRanking.entries.length === 0 ? (
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', textAlign: 'center', padding: '0.75rem 0' }}>Nenhum inscrito ainda</p>
                    ) : challengeRanking.entries.map((entry, idx) => (
                      <div key={entry.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0', borderBottom: '1px solid #111' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#555', minWidth: '1.25rem', textAlign: 'center' }}>{idx + 1}</span>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BELT_COLORS[entry.belt] || '#888', border: '1px solid #333', flexShrink: 0 }} />
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#FFF', textTransform: 'uppercase', flex: 1, margin: 0 }}>{entry.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <div style={{ width: '60px', height: '4px', background: '#1E1E1E', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, (entry.progress / ch.goal) * 100)}%`, height: '100%', background: entry.completed ? '#22C55E' : accentColor }} />
                          </div>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: entry.completed ? '#22C55E' : '#888' }}>{entry.progress}/{ch.goal}</span>
                          {entry.completed && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Membros ── */}
        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            {/* Sub-abas */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1E1E1E' }}>
              {([
                { id: 'list' as const, label: 'MEMBROS', icon: '👥' },
                { id: 'requests' as const, label: pendingJoinCount > 0 ? `PEDIDOS (${pendingJoinCount})` : 'PEDIDOS', icon: '📩' },
                { id: 'ranking' as const, label: 'RANKING', icon: '🏆' },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setMembersSubTab(t.id)}
                  style={{ flex: 1, padding: '0.75rem 0.25rem', background: 'none', border: 'none', borderBottom: membersSubTab === t.id ? `2px solid ${accentColor}` : '2px solid transparent', color: membersSubTab === t.id ? '#FFF' : '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <motion.div
              key={membersSubTab}
              variants={tabVariant}
              initial="initial"
              animate="animate"
              transition={tabTransition}
            >            {/* Sub-aba: Lista */}
            {membersSubTab === 'list' && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, background: '#111', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.875rem', outline: 'none' }} />
                  <select value={filterBelt} onChange={e => setFilterBelt(e.target.value)} style={{ background: '#111', border: '1px solid #2A2A2A', color: filterBelt ? '#FFF' : '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.625rem 0.75rem', outline: 'none', cursor: 'pointer' }}>
                    <option value="">TODAS AS FAIXAS</option>
                    {['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'].map(b => <option key={b} value={b}>{b.toUpperCase()}</option>)}
                  </select>
                </div>
                {!membersLoading && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{filteredMembers.length} ALUNO{filteredMembers.length !== 1 ? 'S' : ''} ENCONTRADO{filteredMembers.length !== 1 ? 'S' : ''}</p>}
                {membersLoading && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>CARREGANDO...</p>}
                {!membersLoading && members.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM ALUNO VINCULADO</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#444', marginTop: '0.5rem', lineHeight: 1.5 }}>Quando um aluno buscar e se vincular à sua academia, ele aparecerá aqui.</p>
                  </div>
                )}
                {!membersLoading && filteredMembers.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {filteredMembers.map((member, index) => (
                      <button key={member.uid} onClick={() => setSelectedMember(member)} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <div style={{ width: '24px', textAlign: 'center', flexShrink: 0 }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: index < 3 ? accentColor : '#444' }}>#{index + 1}</p>
                        </div>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${BELT_COLORS[member.belt] || '#555'}`, flexShrink: 0, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {member.photo ? <img src={member.photo} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.25rem' }}>🥋</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9375rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: BELT_COLORS[member.belt] || '#555', border: member.belt === 'Branca' ? '1px solid #444' : 'none', flexShrink: 0 }} />
                              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>{member.belt}{(member.stripes ?? 0) > 0 && ` · ${member.stripes}º`}</span>
                            </div>
                            <span style={{ color: '#333' }}>·</span>
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#666' }}>{member.totalTrainings ?? 0} treinos</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: accentColor, lineHeight: 1 }}>{(member.xp ?? 0).toLocaleString('pt-BR')}</p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>XP</p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-aba: Pedidos */}
            {membersSubTab === 'requests' && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {(requestsLoading || partnerAssignmentsLoading || partnerInvitesLoading) && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>CARREGANDO...</p>}
                {!requestsLoading && !partnerAssignmentsLoading && !partnerInvitesLoading && joinRequests.length === 0 && pendingPartnerAssignments.length === 0 && pendingPartnerInvites.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📩</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM PEDIDO PENDENTE</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#444', marginTop: '0.5rem', lineHeight: 1.5 }}>Quando um aluno solicitar ingresso na sua academia, aparecerá aqui para aprovação.</p>
                  </div>
                )}
                {pendingPartnerInvites.map(invite => {
                  const isProc = processingPartnerInvite === invite.id;
                  return (
                    <div key={invite.id} style={{ background: '#171024', border: '1px solid #8B5CF655', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #8B5CF6', background: '#8B5CF622', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Handshake size={22} color="#8B5CF6" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Convite de parceria</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#C4B5FD', marginTop: '0.25rem' }}>
                            {invite.academyName || invite.academy || 'Academia'} quer adicionar voce como professor parceiro.
                          </p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#FFF', marginTop: '0.35rem', textTransform: 'uppercase' }}>
                            Proposta: {Number(invite.partnerRevenueSharePercent ?? 50).toFixed(0)}% da mensalidade para voce
                          </p>
                          {invite.notes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.68rem', color: '#A78BFA', marginTop: '0.25rem' }}>{invite.notes}</p>}
                          {invite.partnerRevenueNotes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.68rem', color: '#A78BFA', marginTop: '0.25rem' }}>{invite.partnerRevenueNotes}</p>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.625rem' }}>
                        <button onClick={() => handlePartnerInvite(invite, 'rejected')} disabled={isProc} style={{ flex: 1, background: '#1A0000', border: '1px solid #3A0000', color: '#CC3333', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem', cursor: isProc ? 'not-allowed' : 'pointer', opacity: isProc ? 0.5 : 1 }}>RECUSAR</button>
                        <button onClick={() => handlePartnerInvite(invite, 'accepted')} disabled={isProc} style={{ flex: 2, background: isProc ? '#333' : '#8B5CF6', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.625rem', cursor: isProc ? 'not-allowed' : 'pointer', opacity: isProc ? 0.7 : 1 }}>{isProc ? 'PROCESSANDO...' : 'ACEITAR PARCERIA'}</button>
                      </div>
                    </div>
                  );
                })}
                {pendingPartnerAssignments.map(assignment => {
                  const isProc = processingPartnerAssignment === assignment.id;
                  return (
                    <div key={assignment.id} style={{ background: '#0A1424', border: '1px solid #1A6ECC55', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #1A6ECC', background: '#1A6ECC22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Users size={22} color="#1A6ECC" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignment.studentName || 'Aluno indicado'}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#9ABCE8', marginTop: '0.25rem' }}>
                            Indicacao da academia {assignment.academyName || assignment.academy || 'parceira'}
                          </p>
                          {assignment.notes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.68rem', color: '#6688AA', marginTop: '0.25rem' }}>{assignment.notes}</p>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.625rem' }}>
                        <button onClick={() => handlePartnerAssignment(assignment, 'rejected')} disabled={isProc} style={{ flex: 1, background: '#1A0000', border: '1px solid #3A0000', color: '#CC3333', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem', cursor: isProc ? 'not-allowed' : 'pointer', opacity: isProc ? 0.5 : 1 }}>RECUSAR</button>
                        <button onClick={() => handlePartnerAssignment(assignment, 'accepted')} disabled={isProc} style={{ flex: 2, background: isProc ? '#333' : '#1A6ECC', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.625rem', cursor: isProc ? 'not-allowed' : 'pointer', opacity: isProc ? 0.7 : 1 }}>{isProc ? 'PROCESSANDO...' : 'ACEITAR INDICACAO'}</button>
                      </div>
                    </div>
                  );
                })}
                {joinRequests.map(req => {
                  const bc = BELT_COLORS[req.studentBelt] || '#555';
                  const isProc = processingRequest === req.id;
                  return (
                    <div key={req.id} style={{ background: '#111', border: '1px solid #1A6ECC33', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${bc}`, flexShrink: 0, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {req.studentPhoto ? <img src={req.studentPhoto} alt={req.studentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.25rem' }}>🥋</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.studentName}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: bc, border: req.studentBelt === 'Branca' ? '1px solid #444' : 'none', flexShrink: 0 }} />
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>{req.studentBelt}{(req.studentStripes ?? 0) > 0 ? ` · ${req.studentStripes}º` : ''}</span>
                          </div>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#444', marginTop: '0.25rem' }}>{req.createdAtStr}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.625rem' }}>
                        <button onClick={() => handleRejectRequest(req)} disabled={isProc} style={{ flex: 1, background: '#1A0000', border: '1px solid #3A0000', color: '#CC3333', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem', cursor: isProc ? 'not-allowed' : 'pointer', opacity: isProc ? 0.5 : 1 }}>❌ RECUSAR</button>
                        <button onClick={() => handleApproveRequest(req)} disabled={isProc} style={{ flex: 2, background: isProc ? '#333' : accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.625rem', cursor: isProc ? 'not-allowed' : 'pointer', opacity: isProc ? 0.7 : 1 }}>{isProc ? 'PROCESSANDO...' : '✅ APROVAR'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sub-aba: Ranking */}
            {membersSubTab === 'ranking' && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Cabeçalho com critério e botão atualizar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.05em' }}>RANKING DA ACADEMIA</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#555', marginTop: '0.15rem' }}>Critério: XP total · desempate por nº de treinos</p>
                  </div>
                  <button
                    onClick={() => { setMembers([]); loadMembers(); }}
                    disabled={membersLoading}
                    style={{ background: '#111', border: '1px solid #2A2A2A', color: membersLoading ? '#444' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.75rem', cursor: membersLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', letterSpacing: '0.05em' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                      <path d="M23 4v6h-6M1 20v-6h6"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    {membersLoading ? 'ATUALIZANDO...' : 'ATUALIZAR'}
                  </button>
                </div>

                {membersLoading && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>CARREGANDO...</p>}
                {!membersLoading && members.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏆</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM ALUNO AINDA</p>
                  </div>
                )}
                {!membersLoading && members.length > 0 && (
                  <>
                    {/* Pódio */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem 0 0.5rem' }}>
                      {members.length >= 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                          <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #C0C0C0', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {members[1].photo ? <img src={members[1].photo} alt={members[1].name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.25rem' }}>🥋</span>}
                          </div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: '#FFF', textAlign: 'center', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{members[1].name.split(' ')[0]}</p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', color: '#C0C0C0' }}>{(members[1].xp ?? 0).toLocaleString('pt-BR')} XP</p>
                          <div style={{ background: '#C0C0C022', border: '1px solid #C0C0C0', width: '100%', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#C0C0C0' }}>2</p>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <span style={{ fontSize: '1.5rem' }}>👑</span>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #FFD700', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {members[0].photo ? <img src={members[0].photo} alt={members[0].name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.5rem' }}>🥋</span>}
                        </div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#FFD700', textAlign: 'center', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{members[0].name.split(' ')[0]}</p>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#FFD700' }}>{(members[0].xp ?? 0).toLocaleString('pt-BR')} XP</p>
                        <div style={{ background: '#FFD70022', border: '1px solid #FFD700', width: '100%', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2rem', color: '#FFD700' }}>1</p>
                        </div>
                      </div>
                      {members.length >= 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #CD7F32', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {members[2].photo ? <img src={members[2].photo} alt={members[2].name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.1rem' }}>🥋</span>}
                          </div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', color: '#FFF', textAlign: 'center', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{members[2].name.split(' ')[0]}</p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#CD7F32' }}>{(members[2].xp ?? 0).toLocaleString('pt-BR')} XP</p>
                          <div style={{ background: '#CD7F3222', border: '1px solid #CD7F32', width: '100%', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#CD7F32' }}>3</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Lista completa */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {members.map((m, i) => {
                        const rc = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#444';
                        return (
                          <div key={m.uid} style={{ background: i < 3 ? '#111' : '#0D0D0D', border: `1px solid ${i < 3 ? '#1E1E1E' : '#111'}`, padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: rc, width: '24px', textAlign: 'center', flexShrink: 0 }}>#{i + 1}</p>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${BELT_COLORS[m.belt] || '#555'}`, flexShrink: 0, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {m.photo ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1rem' }}>🥋</span>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase' }}>{m.belt}{(m.stripes ?? 0) > 0 ? ` · ${m.stripes}º` : ''} · {m.totalTrainings ?? 0} treinos</p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9375rem', color: rc }}>{(m.xp ?? 0).toLocaleString('pt-BR')}</p>
                              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#444', textTransform: 'uppercase' }}>XP</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
            </motion.div>

          </div>
        )}
        {activeTab === 'promocao' && (
          <PromocaoTab
            user={user}
            profile={profile}
            members={members}
            accentColor={accentColor}
          />
        )}
      {/* ─── Aba FINANCEIRO ──────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'financial' && !isProfessorUnderAcademy && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Banner WhatsApp */}
          <div style={{ padding: '0.75rem 1.25rem', background: '#0A1A0A', borderBottom: '1px solid #1A4A1A', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1rem' }}>📱</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#25D366', textTransform: 'uppercase', letterSpacing: '0.06em' }}>NOTIFICAÇÕES VIA WHATSAPP ATIVADAS</span>
          </div>

          {/* Sub-abas */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1E1E1E' }}>
            {(['enrollments', 'payments', 'suspensions', 'integrations'] as FinancialSubTab[]).map(tab => {
              const labels: Record<FinancialSubTab, string> = { enrollments: 'MATRÍCULAS', payments: 'MENSALIDADES', suspensions: 'SUSPENSÕES', integrations: 'INTEGRAÇÕES' };
              const icons: Record<FinancialSubTab, string> = { enrollments: '📝', payments: '💳', suspensions: '🚫', integrations: '🔌' };
              const isActive = financialSubTab === tab;
              return (
                <button key={tab} onClick={() => setFinancialSubTab(tab)} style={{ flex: 1, padding: '0.75rem 0.25rem', minHeight: '56px', background: 'transparent', border: 'none', borderBottom: isActive ? '2px solid #CC0000' : '2px solid transparent', color: isActive ? '#FFFFFF' : '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                  <span>{icons[tab]}</span>
                  <span>{labels[tab]}</span>
                </button>
              );
            })}
          </div>
          <motion.div
            key={financialSubTab}
            variants={tabVariant}
            initial="initial"
            animate="animate"
            transition={tabTransition}
          >          {/* ─── Sub-aba: MATRÍCULAS ────────────────────────────────────────────────────────────────────── */}
          {financialSubTab === 'enrollments' && (() => {
            // Membros da academia sem matrícula ativa
            const enrolledUids = new Set(enrollments.filter(e => e.status !== 'cancelled').map(e => e.studentUid));
            const membersWithoutEnrollment = members.filter(m => !enrolledUids.has(m.uid));
            return (
            <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#AAA', textTransform: 'uppercase' }}>{enrollments.length} MATRÍCULA(S)</span>
                  {membersWithoutEnrollment.length > 0 && (
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#FF8C00', border: '1px solid #FF8C00', padding: '0.1rem 0.4rem', textTransform: 'uppercase' }}>{membersWithoutEnrollment.length} SEM MATRÍCULA</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleSyncAcademyId}
                    disabled={syncingAcademyId}
                    title="Sincroniza o campo academyId no perfil de todos os alunos matriculados que ainda não têm esse campo — necessário para habilitar o feed da academia"
                    style={{ background: '#0A1A2A', border: '1px solid #1A6ECC', color: '#1A6ECC', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', cursor: syncingAcademyId ? 'not-allowed' : 'pointer', opacity: syncingAcademyId ? 0.6 : 1 }}>
                    {syncingAcademyId ? '⏳ SINCRONIZANDO...' : '🔄 SINCRONIZAR ALUNOS'}
                  </button>
                  <button onClick={() => setShowEnrollModal(true)} style={{ background: '#CC0000', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.5rem 0.875rem', cursor: 'pointer' }}>+ CONVIDAR ALUNO</button>
                </div>
              </div>

              {enrollmentsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif' }}>CARREGANDO...</div>
              ) : enrollments.length === 0 ? (
                <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#555', textTransform: 'uppercase' }}>NENHUMA MATRÍCULA AINDA</p>
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444', marginTop: '0.375rem' }}>Envie um convite para o aluno aceitar a matrícula.</p>
                </div>
              ) : (
                enrollments.map(enr => {
                  const statusColor = enr.status === 'active' ? '#4CAF50' : enr.status === 'suspended' ? '#FF8C00' : enr.status === 'pending' ? '#1A6ECC' : '#555';
                  const statusLabel = enr.status === 'active' ? 'ATIVO' : enr.status === 'suspended' ? 'SUSPENSO' : enr.status === 'pending' ? 'AGUARDANDO ALUNO' : 'CANCELADO';
                  // Enriquecer com dados do membro (foto, faixa)
                  const memberData = members.find(m => m.uid === enr.studentUid);
                  const memberBelt = memberData?.belt || 'Branca';
                  const memberPhoto = memberData?.photo || null;
                  const beltColorEnr = BELT_COLORS[memberBelt] || '#555';
                  return (
                    <div key={enr.id} style={{ background: '#111', border: `1px solid #1E1E1E`, borderLeft: `3px solid ${statusColor}`, padding: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${beltColorEnr}`, background: beltColorEnr + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                            {memberPhoto ? <img src={memberPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', color: beltColorEnr }}>{(enr.studentName || 'A').charAt(0).toUpperCase()}</span>}
                          </div>
                          <div>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase' }}>{enr.studentName}</p>
                            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: beltColorEnr, marginTop: '0.1rem' }}>Faixa {memberBelt}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', color: statusColor, border: `1px solid ${statusColor}`, padding: '0.15rem 0.4rem', textTransform: 'uppercase' }}>{statusLabel}</span>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#CC0000' }}>R$ {enr.monthlyFee.toFixed(2)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.625rem' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase' }}>VENCE DIA {enr.dueDay}</span>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          {enr.status === 'active' ? (
                            <button onClick={() => { setShowSuspendModal(enr); setSuspendConfirmStep(1); setSuspendReason(''); }} style={{ background: 'transparent', border: '1px solid #FF8C00', color: '#FF8C00', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', minHeight: '40px', cursor: 'pointer' }}>SUSPENDER</button>
                          ) : enr.status === 'suspended' ? (
                            <button onClick={() => handleReactivate(enr)} style={{ background: 'transparent', border: '1px solid #4CAF50', color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', minHeight: '40px', cursor: 'pointer' }}>REATIVAR</button>
                          ) : null}
                          <button onClick={() => handleDeleteEnrollment(enr)} style={{ background: 'transparent', border: '1px solid #CC0000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', minHeight: '40px', cursor: 'pointer' }}>EXCLUIR</button>
                        </div>
                      </div>
                      {enr.status === 'suspended' && enr.suspendReason && (
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#FF8C00', marginTop: '0.375rem', fontStyle: 'italic' }}>Motivo: {enr.suspendReason}</p>
                      )}
                    </div>
                  );
                })
              )}
              {/* Membros sem matrícula */}
              {membersWithoutEnrollment.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', color: '#FF8C00', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>⚠ MEMBROS SEM MATRÍCULA</p>
                  {membersWithoutEnrollment.map(m => {
                    const bc = BELT_COLORS[m.belt] || '#555';
                    return (
                      <div key={m.uid} style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderLeft: '3px solid #FF8C00', padding: '0.625rem 0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: `1px solid ${bc}`, background: bc + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                            {m.photo ? <img src={m.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.6rem', color: bc }}>{(m.name || 'A').charAt(0)}</span>}
                          </div>
                          <div>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', color: '#CCC', textTransform: 'uppercase' }}>{m.name}</p>
                            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: bc }}>Faixa {m.belt}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => { setEnrollSelectedStudent(m); setEnrollStep(2); setShowEnrollModal(true); }}
                          style={{ background: 'transparent', border: '1px solid #CC0000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.2rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          + CONVIDAR
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })()}

          {/* ─── Sub-aba: MENSALIDADES ────────────────────────────────────────────────────────────────────── */}
          {financialSubTab === 'payments' && (
            <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Filtros */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="month" value={paymentMonthFilter} onChange={e => setPaymentMonthFilter(e.target.value)} style={{ background: '#111', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', padding: '0.5rem', flex: 1, outline: 'none' }} />
                <button onClick={handleOpenBillingReview} style={{ background: '#CC000022', border: '1px solid #CC0000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem 0.75rem', minHeight: '44px', cursor: 'pointer', whiteSpace: 'nowrap' }}>📋 REVISAR MÊS</button>
                <button onClick={exportFinancialPDF} disabled={payments.length === 0} style={{ background: '#111', border: '1px solid #4CAF50', color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem 0.75rem', minHeight: '44px', cursor: payments.length === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: payments.length === 0 ? 0.4 : 1 }} title="Exportar relatório em PDF">📄 PDF</button>
              </div>

              {/* Filtro de status */}
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {(['all', 'pending', 'paid', 'overdue'] as const).map(s => {
                  const labels = { all: 'TODOS', pending: 'PENDENTE', paid: 'PAGO', overdue: 'ATRASADO' };
                  const colors = { all: '#555', pending: '#FF8C00', paid: '#4CAF50', overdue: '#CC0000' };
                  const isActive = paymentStatusFilter === s;
                  return (
                    <button key={s} onClick={() => setPaymentStatusFilter(s)} style={{ flex: 1, background: isActive ? colors[s] + '22' : 'transparent', border: `1px solid ${isActive ? colors[s] : '#2A2A2A'}`, color: isActive ? colors[s] : '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.625rem 0.25rem', minHeight: '44px', cursor: 'pointer' }}>{labels[s]}</button>
                  );
                })}
              </div>

              {/* Resumo financeiro */}
              {(() => {
                const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
                const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
                const overdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
                return (
                  <div className="prof-panel-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {[{ label: 'RECEBIDO', value: paid, color: '#4CAF50' }, { label: 'PENDENTE', value: pending, color: '#FF8C00' }, { label: 'ATRASADO', value: overdue, color: '#CC0000' }].map(item => (
                      <div key={item.label} style={{ background: '#111', border: `1px solid ${item.color}33`, padding: '0.625rem', textAlign: 'center' }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: item.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: item.color, marginTop: '0.25rem' }}>R$ {item.value.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Lista de cobranças */}
              {paymentsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif' }}>CARREGANDO...</div>
              ) : payments.filter(p => paymentStatusFilter === 'all' || p.status === paymentStatusFilter).length === 0 ? (
                <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#555', textTransform: 'uppercase' }}>NENHUMA COBRANÇA</p>
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444', marginTop: '0.375rem' }}>Use + GERAR MÊS para criar as cobranças</p>
                </div>
              ) : (
                payments.filter(p => paymentStatusFilter === 'all' || p.status === paymentStatusFilter).map(payment => {
                  const statusColor = payment.status === 'paid' ? '#4CAF50' : payment.status === 'overdue' ? '#CC0000' : '#FF8C00';
                  const statusLabel = payment.status === 'paid' ? 'PAGO' : payment.status === 'overdue' ? 'ATRASADO' : 'PENDENTE';
                  const paymentAccess = payment.paymentLink || payment.pixLink || payment.pixKey;
                  const paymentAccessIsUrl = Boolean(paymentAccess && /^https?:\/\//.test(paymentAccess));
                  return (
                    <div key={payment.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: `3px solid ${statusColor}`, padding: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFF', textTransform: 'uppercase' }}>{payment.studentName}</p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', marginTop: '0.2rem' }}>VENCE: {new Date(payment.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', color: statusColor, border: `1px solid ${statusColor}`, padding: '0.15rem 0.4rem' }}>{statusLabel}</span>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFF' }}>R$ {payment.amount.toFixed(2)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.625rem' }}>
                        {payment.status !== 'paid' ? (
                          <button onClick={() => setShowPaymentModal(payment)} style={{ flex: 1, background: '#4CAF5022', border: '1px solid #4CAF50', color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem 0.5rem', minHeight: '44px', cursor: 'pointer' }}>CONFIRMAR PAGAMENTO</button>
                        ) : (
                          <button onClick={() => handleRevertPaid(payment)} style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem 0.5rem', minHeight: '44px', cursor: 'pointer' }}>ESTORNAR</button>
                        )}
                        {paymentAccess && (
                          <button
                            onClick={() => {
                              if (paymentAccessIsUrl) window.open(paymentAccess, '_blank', 'noopener,noreferrer');
                              else navigator.clipboard.writeText(paymentAccess).then(() => toast.success('PIX copiado!'));
                            }}
                            style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem 0.625rem', minHeight: '44px', cursor: 'pointer' }}
                          >
                            {paymentAccessIsUrl ? 'LINK' : 'PIX'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {financialSubTab === 'integrations' && (
            <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: '3px solid #4CAF50', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.95rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ASAAS PARTICULAR</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#777', marginTop: '0.25rem', lineHeight: 1.45 }}>O dinheiro cai direto na conta Asaas conectada aqui. Pagamentos manuais continuam disponiveis.</p>
                  </div>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', color: paymentIntegration?.asaasEnabled && paymentIntegration?.hasAsaasApiKey ? '#4CAF50' : '#FF8C00', border: `1px solid ${paymentIntegration?.asaasEnabled && paymentIntegration?.hasAsaasApiKey ? '#4CAF50' : '#FF8C00'}`, padding: '0.2rem 0.5rem', textTransform: 'uppercase' }}>
                    {paymentIntegration?.asaasEnabled && paymentIntegration?.hasAsaasApiKey ? 'CONECTADO' : 'MANUAL'}
                  </span>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={paymentIntegrationForm.asaasEnabled} onChange={e => setPaymentIntegrationForm(prev => ({ ...prev, asaasEnabled: e.target.checked }))} />
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.78rem', color: '#EEE', textTransform: 'uppercase' }}>Usar Asaas automatico para novas cobrancas</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={paymentIntegrationForm.manualPaymentsEnabled} onChange={e => setPaymentIntegrationForm(prev => ({ ...prev, manualPaymentsEnabled: e.target.checked }))} />
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.78rem', color: '#EEE', textTransform: 'uppercase' }}>Manter confirmacao manual como alternativa</span>
                </label>

                {paymentIntegrationForm.manualPaymentsEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.5rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.2rem' }}>CHAVE PIX DA ACADEMIA</p>
                      <input value={paymentIntegrationForm.pixKey} onChange={e => setPaymentIntegrationForm(prev => ({ ...prev, pixKey: e.target.value }))}
                        placeholder="CPF, CNPJ, celular, e-mail ou chave aleatória"
                        style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.82rem', padding: '0.5rem', outline: 'none' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.2rem' }}>QR CODE DO PIX</p>
                      {paymentIntegrationForm.pixQrCodeUrl ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <img src={paymentIntegrationForm.pixQrCodeUrl} alt="QR Code PIX" style={{ maxWidth: '140px', border: '1px solid #333' }} />
                          <button onClick={() => setPaymentIntegrationForm(prev => ({ ...prev, pixQrCodeUrl: '' }))}
                            style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.8)', border: 'none', color: '#CC0000', cursor: 'pointer', fontSize: '0.7rem', padding: '0.1rem 0.3rem' }}>✕</button>
                        </div>
                      ) : (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#0A0A0A', border: '1px dashed #333', padding: '0.5rem 0.7rem', cursor: 'pointer' }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#666', textTransform: 'uppercase' }}>📎 ANEXAR QR CODE</span>
                          <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={async e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const url = await api.upload.file(file, 'perfil');
                                setPaymentIntegrationForm(prev => ({ ...prev, pixQrCodeUrl: url }));
                                toast.success('QR Code enviado');
                              } catch { toast.error('Erro ao enviar imagem'); }
                            }} />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.625rem' }}>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>AMBIENTE</p>
                    <select value={paymentIntegrationForm.asaasSandbox ? 'sandbox' : 'production'} onChange={e => setPaymentIntegrationForm(prev => ({ ...prev, asaasSandbox: e.target.value === 'sandbox' }))} style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.82rem', padding: '0.625rem', outline: 'none' }}>
                      <option value="sandbox">Sandbox / testes</option>
                      <option value="production">Producao</option>
                    </select>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>COBRANCA</p>
                    <select value={paymentIntegrationForm.asaasBillingType} onChange={e => setPaymentIntegrationForm(prev => ({ ...prev, asaasBillingType: e.target.value as 'PIX' | 'CREDIT_CARD' }))} style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.82rem', padding: '0.625rem', outline: 'none' }}>
                      <option value="PIX">PIX</option>
                      <option value="CREDIT_CARD">Cartão</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>API KEY ASAAS</p>
                  <input type="password" value={paymentIntegrationForm.asaasApiKey} onChange={e => setPaymentIntegrationForm(prev => ({ ...prev, asaasApiKey: e.target.value }))} placeholder={paymentIntegration?.hasAsaasApiKey ? `Chave salva terminando em ${paymentIntegration.asaasApiKeyLast4}` : 'Cole a chave da API Asaas'} style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.82rem', padding: '0.625rem', outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={testPaymentIntegration} disabled={testingPaymentIntegration || (!paymentIntegrationForm.asaasApiKey.trim() && !paymentIntegration?.hasAsaasApiKey)} style={{ flex: '1 1 130px', background: 'transparent', border: '1px solid #4CAF50', color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', padding: '0.625rem', cursor: testingPaymentIntegration ? 'not-allowed' : 'pointer', opacity: testingPaymentIntegration ? 0.65 : 1 }}>{testingPaymentIntegration ? 'TESTANDO...' : 'TESTAR CONEXAO'}</button>
                  <button onClick={savePaymentIntegration} disabled={savingPaymentIntegration} style={{ flex: '1 1 130px', background: '#CC0000', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', padding: '0.625rem', cursor: savingPaymentIntegration ? 'not-allowed' : 'pointer', opacity: savingPaymentIntegration ? 0.65 : 1 }}>{savingPaymentIntegration ? 'SALVANDO...' : 'SALVAR INTEGRACAO'}</button>
                </div>
              </div>

              {paymentIntegration && (
                <div style={{ background: '#0A0A0A', border: '1px solid #222', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.82rem', color: '#FFF', textTransform: 'uppercase' }}>WEBHOOK ASAAS</p>
                  <button onClick={() => { navigator.clipboard.writeText(paymentIntegration.webhookUrl); toast.success('URL do webhook copiada'); }} style={{ background: '#111', border: '1px solid #2A2A2A', color: '#AAA', fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', padding: '0.625rem', cursor: 'pointer', textAlign: 'left', wordBreak: 'break-all' }}>URL: {paymentIntegration.webhookUrl}</button>
                  <button onClick={() => { navigator.clipboard.writeText(paymentIntegration.webhookToken); toast.success('Token do webhook copiado'); }} style={{ background: '#111', border: '1px solid #2A2A2A', color: '#AAA', fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', padding: '0.625rem', cursor: 'pointer', textAlign: 'left', wordBreak: 'break-all' }}>TOKEN: {paymentIntegration.webhookToken}</button>
                </div>
              )}
            </div>
          )}

          {/* ─── Sub-aba: SUSPENSÕES ────────────────────────────────────────────────────────────────────── */}
          {financialSubTab === 'suspensions' && (
            <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ background: '#1A0A00', border: '1px solid #3A1A00', padding: '0.75rem', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#25D366', lineHeight: 1.5 }}>A suspensao envia notificacao no app e WhatsApp automatico quando o professor estiver conectado.</p>
              </div>

              <div style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: '3px solid #CC0000', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SUSPENSAO AUTOMATICA</p>
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#666', marginTop: '0.25rem', lineHeight: 1.45 }}>
                    Defina quantos dias de atraso sao permitidos antes do sistema suspender a matricula automaticamente. Use 0 para desativar.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={autoSuspendInput}
                    onChange={e => setAutoSuspendInput(e.target.value)}
                    style={{ flex: '1 1 120px', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', padding: '0.625rem 0.75rem', outline: 'none' }}
                  />
                  <button
                    onClick={saveFinancialSettings}
                    disabled={savingFinancialSettings}
                    style={{ flex: '1 1 140px', background: '#CC0000', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.625rem 0.75rem', cursor: savingFinancialSettings ? 'not-allowed' : 'pointer', opacity: savingFinancialSettings ? 0.65 : 1 }}
                  >
                    {savingFinancialSettings ? 'SALVANDO...' : 'SALVAR DIAS'}
                  </button>
                </div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: autoSuspendAfterDays > 0 ? '#FF8C00' : '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {autoSuspendAfterDays > 0 ? `ATUAL: SUSPENDER COM ${autoSuspendAfterDays} DIA(S) DE ATRASO` : 'ATUAL: SUSPENSAO AUTOMATICA DESATIVADA'}
                </p>
              </div>

              {enrollmentsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif' }}>CARREGANDO...</div>
              ) : enrollments.filter(e => e.status === 'active' || e.status === 'suspended').length === 0 ? (
                <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#555', textTransform: 'uppercase' }}>NENHUMA MATRÍCULA</p>
                </div>
              ) : (
                enrollments.filter(e => e.status === 'active' || e.status === 'suspended').map(enr => {
                  const isActive = enr.status === 'active';
                  const isSuspended = enr.status === 'suspended';
                  return (
                    <div key={enr.id} style={{ background: '#111', border: `1px solid ${isSuspended ? '#FF8C0033' : '#1E1E1E'}`, borderLeft: `3px solid ${isSuspended ? '#FF8C00' : '#1E1E1E'}`, padding: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase' }}>{enr.studentName}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#666', marginTop: '0.2rem' }}>{enr.studentEmail}</p>
                          {isSuspended && enr.suspendReason && (
                            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#FF8C00', marginTop: '0.375rem', fontStyle: 'italic' }}>Motivo: {enr.suspendReason}</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', alignItems: 'flex-end' }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', color: isSuspended ? '#FF8C00' : '#4CAF50', border: `1px solid ${isSuspended ? '#FF8C00' : '#4CAF50'}`, padding: '0.15rem 0.4rem' }}>{isSuspended ? 'SUSPENSO' : 'ATIVO'}</span>
                          {isActive && (
                            <button onClick={() => { setShowSuspendModal(enr); setSuspendConfirmStep(1); setSuspendReason(''); }} style={{ background: 'transparent', border: '1px solid #FF8C00', color: '#FF8C00', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', minHeight: '40px', cursor: 'pointer' }}>SUSPENDER</button>
                          )}
                          {isSuspended && (
                            <button onClick={() => handleReactivate(enr)} style={{ background: 'transparent', border: '1px solid #4CAF50', color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', minHeight: '40px', cursor: 'pointer' }}>REATIVAR</button>
                          )}
                          <button onClick={() => handleDeleteEnrollment(enr)} style={{ background: 'transparent', border: '1px solid #CC0000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', minHeight: '40px', cursor: 'pointer' }}>EXCLUIR</button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Modal de matrícula — 3 passos */}
          <AnimatePresence>
            {showEnrollModal && (
              <motion.div
                key="enroll-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                onClick={() => { setShowEnrollModal(false); setEnrollStep(1); setEnrollSelectedStudent(null); setEnrollBillingMode(null); }}
              >
                <motion.div
                  key="enroll-modal-panel"
                  initial={{ opacity: 0, scale: 0.94, y: 24 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 14 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.8 }}
                  style={{ background: 'linear-gradient(180deg, #121212 0%, #080808 100%)', border: '1px solid #CC000066', borderTop: '3px solid #CC0000', borderRadius: '8px', boxShadow: '0 28px 90px rgba(0,0,0,0.78), 0 0 0 1px rgba(255,255,255,0.04) inset', width: '100%', maxWidth: '500px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto' }}
                  onClick={e => e.stopPropagation()}
                >

                {/* Cabeçalho com indicador de passo */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', background: 'linear-gradient(135deg, rgba(204,0,0,0.16), rgba(26,110,204,0.08))', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '0.875rem' }}>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#FFF', textTransform: 'uppercase' }}>📝 CONVITE DE MATRÍCULA</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', marginTop: '0.2rem' }}>PASSO {enrollStep} DE 3</p>
                  </div>
                  <button onClick={() => { setShowEnrollModal(false); setEnrollStep(1); setEnrollSelectedStudent(null); setEnrollBillingMode(null); }} style={{ width: '34px', height: '34px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#888', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                </div>

                {/* Indicador visual de passos */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[1,2,3].map(s => (
                    <div key={s} style={{ flex: 1, height: '5px', borderRadius: '999px', background: enrollStep >= s ? 'linear-gradient(90deg, #CC0000, #FF3B3B)' : '#1E1E1E', transition: 'background 0.2s' }} />
                  ))}
                </div>

                {/* PASSO 1: Buscar aluno */}
                {enrollStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>BUSCAR ALUNO CADASTRADO NO APP</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        value={enrollSearchTerm}
                        onChange={e => { setEnrollSearchTerm(e.target.value); handleSearchStudents(e.target.value); }}
                        placeholder="Nome do aluno..."
                        style={{ flex: 1, background: '#111', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem', outline: 'none' }}
                      />
                      {enrollSearching && <span style={{ color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', alignSelf: 'center' }}>...</span>}
                    </div>
                    {enrollSearchResults.map(student => (
                      <button key={student.uid} onClick={() => { setEnrollSelectedStudent(student); setEnrollSearchResults([]); setEnrollStep(2); }} style={{ background: '#111', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1A0000', border: '1px solid #CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {(student as any).photo ? <img src={(student as any).photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#CC0000' }}>{(student.name || 'A').charAt(0)}</span>}
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem' }}>{student.name}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#666' }}>Faixa {student.belt}</p>
                        </div>
                      </button>
                    ))}
                    {enrollSearchTerm.trim() && !enrollSearching && enrollSearchResults.length === 0 && (
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', lineHeight: 1.45 }}>
                        Nenhum aluno encontrado. Confirme se ele ja criou uma conta de aluno ou se ele ja esta matriculado aqui.
                      </p>
                    )}
                  </div>
                )}

                {/* PASSO 2: Dados financeiros */}
                {enrollStep === 2 && enrollSelectedStudent && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ background: '#111', border: '1px solid #CC0000', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#FFF' }}>{enrollSelectedStudent.name}</p>
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888' }}>Faixa {enrollSelectedStudent.belt}</p>
                      </div>
                      <button onClick={() => { setEnrollSelectedStudent(null); setEnrollStep(1); }} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.875rem' }}>TROCAR</button>
                    </div>
                    {[{ label: 'MENSALIDADE (R$) *', key: 'monthlyFee', type: 'number', placeholder: '150.00' }, { label: 'WHATSAPP DO ALUNO 📱', key: 'studentPhone', type: 'tel', placeholder: '11999999999' }, { label: 'CHAVE PIX', key: 'pixKey', type: 'text', placeholder: 'CPF, e-mail ou chave aleatória' }, { label: 'OBSERVAÇÕES', key: 'notes', type: 'text', placeholder: 'Opcional...' }].map(field => (
                      <div key={field.key}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.375rem' }}>{field.label}</p>
                        <input
                          type={field.type}
                          value={(enrollForm as any)[field.key]}
                          onChange={e => setEnrollForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          style={{ width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => setEnrollStep(3)}
                      disabled={!enrollForm.monthlyFee}
                      style={{ background: enrollForm.monthlyFee ? '#CC0000' : '#333', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', padding: '1rem', cursor: enrollForm.monthlyFee ? 'pointer' : 'not-allowed', opacity: enrollForm.monthlyFee ? 1 : 0.5 }}
                    >
                      PRÓXIMO → MODALIDADE DE COBRANÇA
                    </button>
                  </div>
                )}

                {/* PASSO 3: Modalidade de cobrança */}
                {enrollStep === 3 && enrollSelectedStudent && enrollForm.monthlyFee && (() => {
                  const fee = parseFloat(enrollForm.monthlyFee) || 0;
                  const today = new Date();
                  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                  const daysRemaining = daysInMonth - today.getDate() + 1;
                  const prorataAmount = Math.round((fee / daysInMonth) * daysRemaining * 100) / 100;
                  const nextMonthDue = new Date(today.getFullYear(), today.getMonth() + 1, 5);
                  const corridoDue = new Date(today); corridoDue.setDate(corridoDue.getDate() + 30);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div style={{ background: '#111', border: '1px solid #CC0000', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#FFF' }}>{enrollSelectedStudent.name}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888' }}>Mensalidade: R$ {fee.toFixed(2)}</p>
                        </div>
                        <button onClick={() => setEnrollStep(2)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.875rem' }}>VOLTAR</button>
                      </div>

                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', color: '#888', letterSpacing: '0.05em' }}>COMO SERÁ A PRIMEIRA COBRANÇA?</p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', lineHeight: 1.5, marginTop: '-0.5rem' }}>A matrícula é sempre paga adiantada — o aluno paga para usar.</p>

                      {/* Opção 1: Pró-rata */}
                      <button
                        onClick={() => setEnrollBillingMode('prorata')}
                        style={{ background: enrollBillingMode === 'prorata' ? '#1A0000' : '#111', border: `2px solid ${enrollBillingMode === 'prorata' ? '#CC0000' : '#2A2A2A'}`, padding: '1rem', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase' }}>PRÓ-RATA ATÉ DIA 30</p>
                          {enrollBillingMode === 'prorata' && <span style={{ color: '#CC0000', fontSize: '1rem' }}>✓</span>}
                        </div>
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', lineHeight: 1.4 }}>
                          Cobra proporcional aos dias restantes do mês. Vencimento fixo dia 5 de cada mês.
                        </p>
                        <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', padding: '0.5rem 0.75rem', marginTop: '0.25rem' }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#CC0000' }}>
                            1ª COBRANÇA: R$ {prorataAmount.toFixed(2)}
                          </p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', marginTop: '0.2rem' }}>
                            {daysRemaining} dias restantes de {daysInMonth} — vence {nextMonthDue.toLocaleDateString('pt-BR')}
                          </p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', marginTop: '0.1rem' }}>
                            A partir do mês seguinte: R$ {fee.toFixed(2)} todo dia 5
                          </p>
                        </div>
                      </button>

                      {/* Opção 2: 30 dias corridos */}
                      <button
                        onClick={() => setEnrollBillingMode('corrido')}
                        style={{ background: enrollBillingMode === 'corrido' ? '#1A0000' : '#111', border: `2px solid ${enrollBillingMode === 'corrido' ? '#CC0000' : '#2A2A2A'}`, padding: '1rem', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase' }}>30 DIAS CORRIDOS</p>
                          {enrollBillingMode === 'corrido' && <span style={{ color: '#CC0000', fontSize: '1rem' }}>✓</span>}
                        </div>
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', lineHeight: 1.4 }}>
                          Cobra mensalidade cheia. Próximo vencimento sempre 30 dias após o pagamento anterior.
                        </p>
                        <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', padding: '0.5rem 0.75rem', marginTop: '0.25rem' }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#CC0000' }}>
                            1ª COBRANÇA: R$ {fee.toFixed(2)}
                          </p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', marginTop: '0.2rem' }}>
                            Vence em 30 dias — {corridoDue.toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={handleCreateEnrollment}
                        disabled={savingEnroll || !enrollBillingMode}
                        style={{ background: enrollBillingMode && !savingEnroll ? '#CC0000' : '#333', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', padding: '1rem', cursor: enrollBillingMode && !savingEnroll ? 'pointer' : 'not-allowed', opacity: enrollBillingMode && !savingEnroll ? 1 : 0.5 }}
                      >
                        {savingEnroll ? 'ENVIANDO CONVITE...' : '✓ ENVIAR CONVITE AO ALUNO'}
                      </button>
                    </div>
                  );
                })()}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal de confirmação de pagamento com upload de comprovante */}
          {showPaymentModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} onClick={() => { setShowPaymentModal(null); setReceiptFile(null); setReceiptPreview(null); }}>
              <div style={{ background: '#0A0A0A', border: '1px solid #4CAF50', width: '100%', maxWidth: '420px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} onClick={e => e.stopPropagation()}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#FFF', textTransform: 'uppercase' }}>💳 CONFIRMAR PAGAMENTO</p>
                <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' }}>ALUNO</span>
                    <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#FFF' }}>{showPaymentModal.studentName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' }}>VALOR</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#4CAF50' }}>R$ {showPaymentModal.amount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' }}>VENCIMENTO</span>
                    <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#FFF' }}>{new Date(showPaymentModal.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                  {showPaymentModal.pixKey && (
                    <div style={{ marginTop: '0.5rem', background: '#0A0A0A', border: '1px dashed #2A2A2A', padding: '0.625rem' }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', marginBottom: '0.25rem' }}>CHAVE PIX</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#AAA', wordBreak: 'break-all' }}>{showPaymentModal.pixKey}</span>
                        <button onClick={() => { navigator.clipboard.writeText(showPaymentModal.pixKey!); toast.success('PIX copiado!'); }} style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.25rem 0.5rem', cursor: 'pointer', flexShrink: 0 }}>COPIAR</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload de comprovante */}
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>COMPROVANTE (opcional)</p>
                  {receiptPreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={receiptPreview} alt="Comprovante" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', border: '1px solid #4CAF5044' }} />
                      <button
                        onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                        style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: '#CC0000', border: 'none', color: '#FFF', width: '22px', height: '22px', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >×</button>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#111', border: '1px dashed #2A2A2A', padding: '0.875rem', cursor: 'pointer', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      ANEXAR COMPROVANTE
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setReceiptFile(f); setReceiptPreview(URL.createObjectURL(f)); }
                      }} />
                    </label>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setShowPaymentModal(null); setReceiptFile(null); setReceiptPreview(null); }} style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.75rem', cursor: 'pointer' }}>CANCELAR</button>
                  <button
                    onClick={handleConfirmPaymentWithReceipt}
                    disabled={uploadingReceipt}
                    style={{ flex: 2, background: uploadingReceipt ? '#2A5A2A' : '#4CAF50', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.75rem', cursor: uploadingReceipt ? 'not-allowed' : 'pointer' }}
                  >
                    {uploadingReceipt ? 'ENVIANDO...' : '✓ CONFIRMAR RECEBIMENTO'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de suspensão com aprovação dupla */}
          {showSuspendModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} onClick={() => { setShowSuspendModal(null); setSuspendConfirmStep(1); setSuspendReason(''); }}>
              <div style={{ background: '#0A0A0A', border: `2px solid ${suspendConfirmStep === 2 ? '#CC0000' : '#FF8C00'}`, width: '100%', maxWidth: '400px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} onClick={e => e.stopPropagation()}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: suspendConfirmStep === 2 ? '#CC0000' : '#FF8C00', textTransform: 'uppercase' }}>
                  {suspendConfirmStep === 1 ? '🚫 SUSPENDER ALUNO' : '⚠️ CONFIRMAR SUSPENSÃO'}
                </p>

                <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.75rem' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFF' }}>{showSuspendModal.studentName}</p>
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#666' }}>{showSuspendModal.studentEmail}</p>
                </div>

                {suspendConfirmStep === 1 ? (
                  <>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>MOTIVO DA SUSPENSÃO *</p>
                      <textarea
                        value={suspendReason}
                        onChange={e => setSuspendReason(e.target.value)}
                        placeholder="Descreva o motivo da suspensão..."
                        rows={3}
                        style={{ width: '100%', background: '#111', border: `1px solid ${suspendReason.trim() ? '#FF8C00' : '#2A2A2A'}`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                      />
                      {!suspendReason.trim() && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#CC0000', marginTop: '0.25rem' }}>O motivo é obrigatório</p>}
                    </div>
                    <div style={{ background: '#1A0A00', border: '1px solid #3A1A00', padding: '0.625rem' }}>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#25D366', lineHeight: 1.5 }}>A suspensão cria uma notificação no app e tenta enviar WhatsApp automático ao aluno.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setShowSuspendModal(null); setSuspendReason(''); }} style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.75rem', cursor: 'pointer' }}>CANCELAR</button>
                      <button onClick={() => { if (suspendReason.trim()) setSuspendConfirmStep(2); }} disabled={!suspendReason.trim()} style={{ flex: 2, background: suspendReason.trim() ? '#FF8C00' : '#333', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.75rem', cursor: suspendReason.trim() ? 'pointer' : 'not-allowed', opacity: suspendReason.trim() ? 1 : 0.5 }}>PRÓXIMO</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ background: '#1A0000', border: '1px solid #CC0000', padding: '0.75rem' }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#CC0000', textTransform: 'uppercase', marginBottom: '0.375rem' }}>MOTIVO REGISTRADO:</p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#FFF', fontStyle: 'italic' }}>"{suspendReason}"</p>
                    </div>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#AAA', lineHeight: 1.6 }}>Tem certeza? Esta ação suspenderá a matrícula de <strong style={{ color: '#FFF' }}>{showSuspendModal.studentName}</strong> e enviará a notificação automática.</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setSuspendConfirmStep(1)} style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.75rem', cursor: 'pointer' }}>VOLTAR</button>
                      <button onClick={() => handleSuspend(showSuspendModal, suspendReason)} disabled={suspending} style={{ flex: 2, background: '#CC0000', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.75rem', cursor: suspending ? 'not-allowed' : 'pointer', opacity: suspending ? 0.6 : 1 }}>
                        {suspending ? 'SUSPENDENDO...' : 'SIM, SUSPENDER'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          </motion.div>

        </div>
      )}

      {/* ─── FREQUÊNCIA TAB ─────────────────────────────────────────────── */}
      {activeTab === 'frequencia' && (
        <FrequenciaTab professorUid={user?.uid || ''} accentColor={accentColor} />
      )}

      {/* ─── HORÁRIOS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'horarios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <HorariosTab professorUid={user?.uid || ''} accentColor={accentColor} readOnly={isProfessorUnderAcademy} />
          <AgendaTab professorUid={user?.uid || ''} accentColor={accentColor} />
        </div>
      )}

      {/* ─── RELATÓRIOS TAB ───────────────────────────────────────────── */}
      {activeTab === 'relatorios' && !isProfessorUnderAcademy && (
        <RelatoriosTab
          professorUid={user?.uid || ''}
          accentColor={accentColor}

          profile={profile}
          enrollments={enrollments}
          autoSuspendAfterDays={autoSuspendAfterDays}
          onSuspend={(enrollmentId) => {
            const enr = enrollments.find(e => e.id === enrollmentId);
            if (enr) setShowSuspendModal(enr);
          }}
        />
      )}
      {/* ── ABA LEADS ──────────────────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'leads' && (
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF', margin: 0 }}>🎯 LEADS — AULAS EXPERIMENTAIS</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>Interessados que solicitaram aula experimental gratuita</p>
            </div>
            <button
              disabled={!trialRequestsEnabled || trialSettingSaving}
              onClick={() => {
                if (!trialRequestsEnabled) return;
                const trialPath = profile?.role === 'academy' || profile?.role === 'admin' || profile?.isAcademyAdmin ? 'academia' : 'professor';
                const url = `${window.location.origin}/trial/${trialPath}/${user?.uid}`;
                navigator.clipboard.writeText(url);
                toast.success('🔗 Link copiado! Compartilhe com interessados.');
              }}
              style={{ background: trialRequestsEnabled ? '#0D9E6E22' : '#151515', border: `1px solid ${trialRequestsEnabled ? '#0D9E6E' : '#333'}`, color: trialRequestsEnabled ? '#0D9E6E' : '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', cursor: trialRequestsEnabled && !trialSettingSaving ? 'pointer' : 'not-allowed', letterSpacing: '0.05em', flexShrink: 0 }}
            >
              🔗 COPIAR LINK
            </button>
          </div>

          {/* Estatísticas */}
          <div style={{ background: '#111', border: `1px solid ${trialRequestsEnabled ? '#0D9E6E55' : '#333'}`, borderLeft: `3px solid ${trialRequestsEnabled ? '#0D9E6E' : '#555'}`, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.95rem', textTransform: 'uppercase', color: '#FFF', margin: 0 }}>AULA GRATIS</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                {trialRequestsEnabled ? 'Recebendo solicitacoes de alunos.' : 'Solicitacoes pausadas para alunos e link publico.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleTrialRequests}
              disabled={trialSettingSaving}
              style={{
                minWidth: '118px',
                background: trialRequestsEnabled ? '#0D9E6E' : '#1A1A1A',
                border: `1px solid ${trialRequestsEnabled ? '#0D9E6E' : '#555'}`,
                color: trialRequestsEnabled ? '#03140D' : '#AAA',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 900,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '0.65rem 0.85rem',
                cursor: trialSettingSaving ? 'not-allowed' : 'pointer',
                opacity: trialSettingSaving ? 0.65 : 1,
              }}
            >
              {trialSettingSaving ? 'SALVANDO...' : trialRequestsEnabled ? 'LIGADO' : 'DESLIGADO'}
            </button>
          </div>

          <div className="prof-panel-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {(['pending', 'contacted', 'converted', 'cancelled'] as const).map(s => {
              const count = leads.filter(l => l.status === s).length;
              const colors: Record<string, string> = { pending: '#FFD700', contacted: '#1A6ECC', converted: '#0D9E6E', cancelled: '#555' };
              const labels: Record<string, string> = { pending: 'NOVOS', contacted: 'CONTATADOS', converted: 'CONVERTIDOS', cancelled: 'CANCELADOS' };
              return (
                <div key={s} style={{ background: '#111', border: `1px solid ${colors[s]}33`, padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: colors[s], margin: 0 }}>{count}</p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', textTransform: 'uppercase', color: '#555', margin: 0 }}>{labels[s]}</p>
                </div>
              );
            })}
          </div>

          {/* Lista de leads */}
          {leadsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
          ) : leads.length === 0 ? (
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM LEAD AINDA</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#444', marginTop: '0.5rem' }}>Copie o link e compartilhe para receber solicitações de aula experimental.</p>
            </div>
          ) : (
            leads.map(lead => {
              const statusColors: Record<string, string> = { pending: '#FFD700', contacted: '#1A6ECC', converted: '#0D9E6E', cancelled: '#555' };
              const statusLabels: Record<string, string> = { pending: 'NOVO', contacted: 'CONTATADO', converted: 'CONVERTIDO', cancelled: 'CANCELADO' };
              const color = statusColors[lead.status] || '#555';
              return (
                <div key={lead.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: `3px solid ${color}`, padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', margin: 0 }}>{lead.name}</p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                        📱 {lead.phone}{lead.email ? ` · ${lead.email}` : ''}
                      </p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555', marginTop: '0.1rem' }}>
                        Faixa: {lead.belt}{lead.age ? ` · ${lead.age} anos` : ''}{lead.preferredDay ? ` · Prefere: ${lead.preferredDay}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.2rem 0.5rem', border: `1px solid ${color}`, color, background: color + '20' }}>
                        {statusLabels[lead.status]}
                      </span>
                      <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.6rem', color: '#444' }}>{lead.createdAtStr}</span>
                    </div>
                  </div>

                  {lead.message && (
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#666', fontStyle: 'italic', marginBottom: '0.625rem', borderLeft: '2px solid #1E1E1E', paddingLeft: '0.5rem' }}>
                      "{lead.message}"
                    </p>
                  )}

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <a
                      href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`}
                      target="_blank" rel="noreferrer"
                      style={{ background: '#1A3A1A', border: '1px solid #25D366', color: '#25D366', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.75rem', textDecoration: 'none', letterSpacing: '0.05em' }}
                    >
                      💬 WHATSAPP
                    </a>
                    {lead.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateLeadStatus(lead.id, 'contacted')}
                        style={{ background: '#0A1A3A', border: '1px solid #1A6ECC', color: '#1A6ECC', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.75rem', cursor: 'pointer', letterSpacing: '0.05em' }}
                      >
                        ✅ MARCAR CONTATADO
                      </button>
                    )}
                    {lead.status === 'contacted' && (
                      <button
                        onClick={() => handleUpdateLeadStatus(lead.id, 'converted')}
                        style={{ background: '#0A2A1A', border: '1px solid #0D9E6E', color: '#0D9E6E', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.75rem', cursor: 'pointer', letterSpacing: '0.05em' }}
                      >
                        🎉 CONVERTIDO (MATRICULADO)
                      </button>
                    )}
                    {lead.status !== 'cancelled' && lead.status !== 'converted' && (
                      <button
                        onClick={() => handleUpdateLeadStatus(lead.id, 'cancelled')}
                        style={{ background: 'transparent', border: '1px solid #333', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.75rem', cursor: 'pointer', letterSpacing: '0.05em' }}
                      >
                        ❌ CANCELAR
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}


      {/* ── ABA WHATSAPP ──────────────────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'whatsapp' && !isProfessorUnderAcademy && <WhatsAppTab />}


      {/* ─── Modal: Revisão de Cobranças ─────────────────────────────────────────── */}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modal de detalhe do membro */}
      <AnimatePresence>
        {selectedMember && (
          <MemberDetailModal
            key={selectedMember.uid}
            member={selectedMember}
            accentColor={accentColor}
            professorUid={user?.uid}
            hideFinancial={isProfessorUnderAcademy}
            onClose={() => setSelectedMember(null)}
            onPromoted={(uid, belt, stripes) => {
              setMembers(prev => prev.map(m => m.uid === uid ? { ...m, belt, stripes } : m));
              setSelectedMember(null);
            }}
          />
        )}
      </AnimatePresence>

      {showBillingReview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1rem' }}>
          <div style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', maxWidth: '480px', width: '100%', margin: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>📋 REVISÃO DE COBRANÇAS</p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#666', margin: '0.25rem 0 0' }}>
                  {new Date(paymentMonthFilter + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                </p>
              </div>
              <button onClick={() => setShowBillingReview(false)} style={{ background: 'transparent', border: '1px solid #333', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.375rem 0.625rem', cursor: 'pointer' }}>FECHAR</button>
            </div>

            {billingReviewLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid #333', borderTopColor: '#CC0000', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>CALCULANDO COBRANÇAS...</p>
              </div>
            ) : (
              <>
                {/* Aviso de itens já gerados */}
                {billingReviewItems.some(i => i.excluded) && (
                  <div style={{ background: '#0A1A0A', border: '1px solid #1A4A1A', padding: '0.625rem 0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>ℹ️</span>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#4CAF50', margin: 0, lineHeight: 1.4 }}>
                      {billingReviewItems.filter(i => i.excluded).length} aluno(s) já têm cobrança gerada para este mês e foram desmarcados automaticamente.
                    </p>
                  </div>
                )}

                {/* Instrução */}
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#666', margin: 0, lineHeight: 1.5 }}>
                  Revise os valores e datas. Desmarque alunos que não devem ser cobrados neste mês. Você pode editar o valor individualmente antes de aprovar.
                </p>

                {/* Lista de alunos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
                  {billingReviewItems.map((item, idx) => (
                    <div key={item.enrollmentId} style={{ background: item.excluded ? '#111' : '#0D1A0D', border: `1px solid ${item.excluded ? '#222' : '#1A4A1A'}`, padding: '0.75rem', opacity: item.excluded ? 0.5 : 1, transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Checkbox */}
                        <button
                          onClick={() => setBillingReviewItems(prev => prev.map((p, i) => i === idx ? { ...p, excluded: !p.excluded } : p))}
                          style={{ width: '20px', height: '20px', flexShrink: 0, background: item.excluded ? 'transparent' : '#CC0000', border: `2px solid ${item.excluded ? '#444' : '#CC0000'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        >
                          {!item.excluded && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </button>
                        {/* Nome e info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFFFFF', margin: 0, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.studentName}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#666', margin: '0.1rem 0 0' }}>
                            Vence: {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')} · {item.billingMode === 'corrido' ? '30 dias corridos' : 'Pró-rata dia 5'}
                          </p>
                        </div>
                        {/* Valor editável */}
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#888' }}>R$</span>
                          <input
                            type="number"
                            value={item.amount}
                            min={0}
                            step={0.01}
                            disabled={item.excluded}
                            onChange={e => setBillingReviewItems(prev => prev.map((p, i) => i === idx ? { ...p, amount: parseFloat(e.target.value) || 0 } : p))}
                            style={{ width: '70px', background: '#0A0A0A', border: '1px solid #333', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', padding: '0.25rem 0.375rem', textAlign: 'right', outline: 'none' }}
                          />
                        </div>
                      </div>
                      {/* Data de vencimento editável */}
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.62rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>VENCIMENTO:</span>
                        <input
                          type="date"
                          value={item.dueDate}
                          disabled={item.excluded}
                          onChange={e => setBillingReviewItems(prev => prev.map((p, i) => i === idx ? { ...p, dueDate: e.target.value } : p))}
                          style={{ background: '#0A0A0A', border: '1px solid #333', color: '#FFFFFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', padding: '0.2rem 0.375rem', outline: 'none', flex: 1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumo total + botão aprovar */}
                {(() => {
                  const toGenerate = billingReviewItems.filter(i => !i.excluded);
                  const totalAmount = toGenerate.reduce((s, i) => s + i.amount, 0);
                  const alreadyDone = billingReviewItems.filter(i => i.excluded).length;
                  return (
                    <div style={{ background: '#111', border: '1px solid #2A2A2A', padding: '0.875rem' }}>
                      <div className="prof-panel-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.875rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#666', marginBottom: '0.2rem' }}>A GERAR</p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#CC0000', margin: 0 }}>{toGenerate.length}</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#666', marginBottom: '0.2rem' }}>TOTAL</p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#FFFFFF', margin: 0 }}>R$ {totalAmount.toFixed(2)}</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#666', marginBottom: '0.2rem' }}>JÁ GERADO</p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#4CAF50', margin: 0 }}>{alreadyDone}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleApproveBilling}
                        disabled={billingApproving || toGenerate.length === 0}
                        style={{ width: '100%', background: toGenerate.length === 0 ? '#1A1A1A' : '#CC0000', border: 'none', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.875rem', cursor: toGenerate.length === 0 || billingApproving ? 'not-allowed' : 'pointer', opacity: toGenerate.length === 0 ? 0.4 : 1 }}
                      >
                        {billingApproving ? '⏳ GERANDO...' : `✅ APROVAR E GERAR ${toGenerate.length} COBRANÇA${toGenerate.length !== 1 ? 'S' : ''}`}
                      </button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ── EventCard ────────────────────────────────────────────────────────────────

function AvisosTab({ user, profile, accentColor }: { user: any; profile: any; accentColor: string }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', audience: 'all', urgent: false });

  const isAcademy = profile?.role === 'academy' || profile?.role === 'admin' || profile?.isAcademyAdmin;
  const audienceOptions = isAcademy
    ? [
      { value: 'all', label: 'ALUNOS E PROFESSORES' },
      { value: 'students', label: 'ALUNOS' },
      { value: 'professors', label: 'PROFESSORES' },
    ]
    : [
      { value: 'students', label: 'MEUS ALUNOS' },
    ];

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.announcements.mine();
      setAnnouncements(rows);
    } catch {
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const saveAnnouncement = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const created = await api.announcements.create({
        title: form.title.trim(),
        content: form.content.trim(),
        audience: isAcademy ? form.audience : 'students',
        urgent: form.urgent,
      });
      setForm({ title: '', content: '', audience: 'all', urgent: false });
      await loadAnnouncements();
      toast.success(getWhatsAppAutomationToast(created.whatsapp));
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar notificação');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (announcement: any) => {
    try {
      await api.announcements.update(announcement.id, { isActive: !announcement.isActive });
      await loadAnnouncements();
    } catch {
      toast.error('Erro ao alterar notificação');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Excluir esta notificação?')) return;
    try {
      await api.announcements.delete(id);
      setAnnouncements(prev => prev.filter(item => item.id !== id));
    } catch {
      toast.error('Erro ao excluir notificação');
    }
  };

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ background: '#111', border: `1px solid ${accentColor}`, borderLeft: `3px solid ${accentColor}`, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.95rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            NOVA NOTIFICAÇÃO
          </p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.68rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.2rem' }}>
            {isAcademy ? (profile?.academyName || 'ACADEMIA') : (profile?.name || user?.name || 'PROFESSOR')}
          </p>
        </div>

        <input
          value={form.title}
          onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Título da notificação"
          style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', boxSizing: 'border-box' }}
        />

        <textarea
          value={form.content}
          onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
          placeholder="Mensagem para enviar no sininho dos alunos..."
          rows={4}
          style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {audienceOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, audience: option.value }))}
              style={{
                background: form.audience === option.value ? accentColor : '#1A1A1A',
                border: `1px solid ${form.audience === option.value ? accentColor : '#333'}`,
                color: form.audience === option.value ? '#FFF' : '#666',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 900,
                fontSize: '0.68rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0.45rem 0.65rem',
                cursor: 'pointer',
              }}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, urgent: !prev.urgent }))}
            style={{
              background: form.urgent ? '#1A0000' : '#1A1A1A',
              border: `1px solid ${form.urgent ? '#CC0000' : '#333'}`,
              color: form.urgent ? '#FF4D4D' : '#666',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 900,
              fontSize: '0.68rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '0.45rem 0.65rem',
              cursor: 'pointer',
            }}
          >
            URGENTE
          </button>
        </div>

        <button
          onClick={saveAnnouncement}
          disabled={saving || !form.title.trim() || !form.content.trim()}
          style={{ background: saving || !form.title.trim() || !form.content.trim() ? '#333' : accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer', width: '100%' }}
        >
          {saving ? 'ENVIANDO...' : 'ENVIAR NOTIFICAÇÃO'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          NOTIFICAÇÕES ENVIADAS
        </p>
        <button
          type="button"
          onClick={loadAnnouncements}
          disabled={loading}
          style={{ background: '#111', border: '1px solid #2A2A2A', color: loading ? '#444' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.75rem', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.05em' }}
        >
          {loading ? '...' : 'ATUALIZAR'}
        </button>
      </div>

      {loading && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>CARREGANDO...</p>}
      {!loading && announcements.length === 0 && (
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem 1rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#555', textTransform: 'uppercase' }}>NENHUMA NOTIFICAÇÃO ENVIADA</p>
        </div>
      )}

      {!loading && announcements.map(announcement => (
        <div key={announcement.id} style={{ background: announcement.urgent ? '#190A0A' : '#111', border: `1px solid ${announcement.urgent ? '#CC000044' : '#1E1E1E'}`, borderLeft: `3px solid ${announcement.urgent ? '#CC0000' : accentColor}`, padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.1 }}>{announcement.title}</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.78rem', color: '#888', lineHeight: 1.45, marginTop: '0.35rem' }}>{announcement.content}</p>
            </div>
            <span style={{ flexShrink: 0, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.62rem', color: announcement.isActive === false ? '#555' : '#0D9E6E', textTransform: 'uppercase', border: `1px solid ${announcement.isActive === false ? '#333' : '#0D9E6E55'}`, padding: '0.15rem 0.45rem' }}>
              {announcement.isActive === false ? 'INATIVO' : 'ATIVO'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.62rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid #252525', padding: '0.2rem 0.45rem' }}>
              {(announcement.audience || 'all').toUpperCase()}
            </span>
            {announcement.urgent && (
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.62rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid #CC000044', padding: '0.2rem 0.45rem' }}>
                URGENTE
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => toggleActive(announcement)}
              style={{ flex: 1, background: '#151515', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.68rem', textTransform: 'uppercase', padding: '0.5rem', cursor: 'pointer' }}
            >
              {announcement.isActive === false ? 'REATIVAR' : 'DESATIVAR'}
            </button>
            <button
              onClick={() => deleteAnnouncement(announcement.id)}
              style={{ background: '#1A0000', border: '1px solid #3A0000', color: '#CC3333', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.68rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', cursor: 'pointer' }}
            >
              EXCLUIR
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EventCard({ ev, accentColor, professorProfile, onDelete }: {
  ev: AcademyEvent;
  accentColor: string;
  professorProfile: any;
  onDelete: () => void;
}) {
  const [closing, setClosing] = useState(false);

  const handleCloseRegistrations = async () => {
    if (closing) return;
    setClosing(true);
    try {
      // Marcar evento como inscricoes_encerradas
      await api.events.update(ev.id, { registrationsClosed: true });

      // Enviar notificacao in-app para cada inscrito
      const registrations = ev.registrations || [];
      const academyName = professorProfile?.academyName || professorProfile?.academy || 'Academia';
      const locationLabel = getEventLocationLabel(ev);
      const notifPromises = registrations.map((uid: string) =>
        api.notifications.create({
          toUid: uid,
          type: 'event_confirmed',
          message: `Inscrições encerradas para "${ev.title}"${ev.date ? ` em ${ev.date}` : ''}${ev.time ? ` às ${ev.time}` : ''}${locationLabel ? ` — ${locationLabel}` : ''}. Você está confirmado!`,
          data: { eventId: ev.id, eventTitle: ev.title, eventDate: ev.date, eventTime: ev.time || '', eventLocation: locationLabel, academyName },
          read: false,
        })
      );
      await Promise.all(notifPromises);
      toast.success(`Inscrições encerradas. ${registrations.length} aluno${registrations.length !== 1 ? 's' : ''} notificado${registrations.length !== 1 ? 's' : ''}!`);
    } catch {
      toast.error('Erro ao encerrar inscrições');
    } finally {
      setClosing(false);
    }
  };

  const isClosed = (ev as any).registrationsClosed === true;
  const locationLabel = getEventLocationLabel(ev);
  const hasMap = Boolean(locationLabel);

  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1 }}>{ev.title}</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: accentColor, textTransform: 'uppercase', marginTop: '0.25rem' }}>{ev.date}{ev.time ? ` · ${ev.time}` : ''}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <span style={{ background: accentColor + '22', border: `1px solid ${accentColor}`, color: accentColor, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', flexShrink: 0 }}>{(ev.type || 'outro').replace('_', ' ').toUpperCase()}</span>
          {isClosed && (
            <span style={{ background: '#0D9E6E22', border: '1px solid #0D9E6E', color: '#0D9E6E', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.55rem', textTransform: 'uppercase', padding: '0.1rem 0.375rem' }}>ENCERRADO</span>
          )}
        </div>
      </div>
      {locationLabel && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888' }}>📍 {locationLabel}</p>
          <div style={{ border: '1px solid #1E1E1E', background: '#080808', overflow: 'hidden' }}>
            <iframe
              title={`Mapa de ${ev.title}`}
              src={getEventMapEmbedUrl(ev)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ width: '100%', height: '150px', border: 'none', display: 'block', background: '#0A0A0A' }}
            />
          </div>
        </div>
      )}
      {ev.description && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#666', lineHeight: 1.4 }}>{ev.description}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555' }}>{(ev.registrations ?? []).length} INSCRITO{(ev.registrations ?? []).length !== 1 ? 'S' : ''}{ev.slots ? ` / ${ev.slots} VAGAS` : ''}</span>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {!isClosed && (ev.registrations ?? []).length > 0 && (
            <button
              onClick={handleCloseRegistrations}
              disabled={closing}
              style={{ background: '#0A2A1A', border: '1px solid #0D9E6E', color: '#0D9E6E', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.4rem 0.5rem', cursor: closing ? 'not-allowed' : 'pointer', opacity: closing ? 0.6 : 1 }}
            >
              {closing ? '...' : '✓ ENCERRAR'}
            </button>
          )}
          {hasMap && (
            <a href={getEventGoogleMapsUrl(ev)} target="_blank" rel="noreferrer"
              style={{ background: '#101821', border: `1px solid ${accentColor}55`, color: accentColor, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Navigation size={13} /> MAPS
            </a>
          )}
          <button onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/evento/${ev.id}`).catch(() => {}); toast.success('Link copiado!'); }}
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer' }}>
            🔗 LINK
          </button>
          <button onClick={onDelete}
            style={{ background: '#1A0000', border: '1px solid #3A0000', color: '#CC3333', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer' }}>
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de detalhe do membro ────────────────────────────────────────────────
const BELTS_ORDER = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];

function MemberDetailModal({ member, accentColor, professorUid, hideFinancial = false, onClose, onPromoted }: { member: Member; accentColor: string; professorUid?: string; hideFinancial?: boolean; onClose: () => void; onPromoted: (uid: string, belt: string, stripes: number) => void }) {
  const beltColor = BELT_COLORS[member.belt] || '#555';
  const hours = member.totalMinutes ? Math.round(member.totalMinutes / 60) : 0;
  const [promoting, setPromoting] = useState(false);
  const [showPromotion, setShowPromotion] = useState(false);
  const [newBelt, setNewBelt] = useState(member.belt);
  const [newStripes, setNewStripes] = useState(member.stripes ?? 0);
  const [detailTab, setDetailTab] = useState<'frequencia' | 'financeiro' | 'perfil'>('frequencia');
  const detailTabs = (hideFinancial ? ['perfil', 'frequencia'] : ['perfil', 'frequencia', 'financeiro']) as Array<'perfil' | 'frequencia' | 'financeiro'>;

  // Frequência
  const [attendance, setAttendance] = useState<Array<{ id: string; trainingDate: string; sessionType?: string; modality?: string; duration?: number }>>([]);
  const [fullTrainings, setFullTrainings] = useState<Training[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Financeiro
  const [memberPayments, setMemberPayments] = useState<Payment[]>([]);
  const [memberPaymentsLoading, setMemberPaymentsLoading] = useState(false);
  const [memberPaymentMonth, setMemberPaymentMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  // Comprovante no MemberDetailModal
  const [memberReceiptModal, setMemberReceiptModal] = useState<Payment | null>(null);
  const [memberReceiptFile, setMemberReceiptFile] = useState<File | null>(null);
  const [memberReceiptPreview, setMemberReceiptPreview] = useState<string | null>(null);
  const [uploadingMemberReceipt, setUploadingMemberReceipt] = useState(false);
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);
  const memberReceiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hideFinancial && detailTab === 'financeiro') {
      setDetailTab('frequencia');
      return;
    }
    if (hideFinancial || detailTab !== 'financeiro') return;
    let cancelled = false;
    const load = async () => {
      setMemberPaymentsLoading(true);
      try {
        const all = await api.payments.list({ studentUid: member.uid });
        const today = new Date().toISOString().slice(0, 10);
        const docs = (all as Payment[]).map(data => {
          if (data.status === 'pending' && data.dueDate < today) data.status = 'overdue';
          return data;
        }).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
        if (!cancelled) setMemberPayments(docs);
      } catch { if (!cancelled) setMemberPayments([]); }
      finally { if (!cancelled) setMemberPaymentsLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [member.uid, detailTab, hideFinancial]);

  const handleMemberMarkPaid = async (payment: Payment, receiptUrl?: string) => {
    setMarkingPaid(payment.id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const updatedPayment = await api.payments.update(payment.id, {
        status: 'paid', paidAt: today,
        ...(receiptUrl ? { receiptUrl } : {}),
      }) as Payment;
      setMemberPayments(prev => prev.map(p => p.id === payment.id
        ? { ...p, status: 'paid', paidAt: today, ...(receiptUrl ? { receiptUrl } : {}) }
        : p
      ));
      toast.success((updatedPayment.reactivatedEnrollments || []).length > 0 ? 'Pagamento confirmado e matrícula reativada!' : 'Pagamento confirmado!');
    } catch { toast.error('Erro ao confirmar'); }
    finally { setMarkingPaid(null); }
  };

  const handleMemberConfirmWithReceipt = async () => {
    if (!memberReceiptModal) return;
    setUploadingMemberReceipt(true);
    try {
      let receiptUrl: string | undefined;
      if (memberReceiptFile) {
        receiptUrl = await api.upload.file(memberReceiptFile, 'mensalidades');
      }
      await handleMemberMarkPaid(memberReceiptModal, receiptUrl);
      setMemberReceiptModal(null);
      setMemberReceiptFile(null);
      setMemberReceiptPreview(null);
    } catch { toast.error('Erro ao confirmar pagamento'); }
    finally { setUploadingMemberReceipt(false); }
  };

  const filteredMemberPayments = memberPayments.filter(p => p.month === memberPaymentMonth || !memberPaymentMonth);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setAttendanceLoading(true);
      try {
        // Buscar treinos do aluno via API
        const trainings = await api.trainings.list(member.uid);
        if (!cancelled) setFullTrainings(trainings as Training[]);
        const trainDocs = (trainings as any[])
          .map(t => ({
            id: 'train_' + t.id,
            studentUid: member.uid,
            trainingDate: t.trainingDate || '',
            sessionType: t.sessionType || t.type || '',
            modality: t.modality || '',
            duration: t.duration ? parseInt(String(t.duration)) : 0,
          }))
          .filter(t => t.trainingDate);

        // Check-ins da academia
        const checkIns = await api.classes.getCheckIns({ professorUid: undefined });
        const attDocs = (checkIns as any[])
          .filter((c: any) => c.studentUid === member.uid)
          .map((c: any) => ({
            id: c.id,
            studentUid: member.uid,
            trainingDate: c.dateKey || '',
            sessionType: c.sessionType || 'aula',
            modality: '',
            duration: 0,
          }));

        const attKeys = new Set(attDocs.map((a: any) => `${a.trainingDate}_${a.sessionType}`));
        const merged = [
          ...attDocs,
          ...trainDocs.filter(t => !attKeys.has(`${t.trainingDate}_${t.sessionType}`)),
        ];
        if (!cancelled) setAttendance(merged);
      } catch { if (!cancelled) setAttendance([]); }
      finally { if (!cancelled) setAttendanceLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [member.uid]);

  const filteredAttendance = attendance.filter(a => {
    if (!a.trainingDate) return false;
    // Suporta formato DD/MM/YYYY e YYYY-MM-DD
    const parts = a.trainingDate.includes('/') ? a.trainingDate.split('/').reverse().join('-') : a.trainingDate;
    return parts.startsWith(attendanceMonth);
  });
  const SESSION_LABELS: Record<string, string> = {
    treino_livre: 'Treino Livre', aula: 'Aula', aula_particular: 'Particular',
    competicao: 'Competição', seminario: 'Seminário', sparring: 'Sparring', open_mat: 'Open Mat',
  };

  const handlePromote = async () => {
    setPromoting(true);
    try {
      await api.promotions.create({
        studentUid: member.uid,
        studentName: member.name,
        previousBelt: member.belt,
        previousStripes: member.stripes ?? 0,
        newBelt,
        newStripes,
        promotedAtStr: new Date().toLocaleDateString('pt-BR'),
        professorUid: professorUid || '',
        promotedBy: professorUid || 'professor',
      });
      // Notificação ao aluno
      try {
        await api.notifications.create({
        toUid: member.uid,
        type: 'promotion',
        message: `🏅 VOCÊ FOI PROMOVIDO! Parabéns! Você foi promovido para Faixa ${newBelt}${newStripes > 0 ? ` · ${newStripes}º grau` : ''}!`,
        data: { belt: newBelt, stripes: newStripes },
        read: false,
        });
      } catch (notificationError) {
        console.warn('Promocao salva, mas a notificacao falhou', notificationError);
      }
      onPromoted(member.uid, newBelt, newStripes);
      toast.success(`${member.name} promovido para Faixa ${newBelt}${newStripes > 0 ? ` · ${newStripes}º grau` : ''}! 🏅`);
      setShowPromotion(false);
      onClose();
    } catch {
      toast.error('Erro ao promover aluno');
    } finally {
      setPromoting(false);
    }
  };

  return (
    <>
    {/* Modal de confirmação de pagamento com upload de comprovante */}
    {memberReceiptModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} onClick={() => { setMemberReceiptModal(null); setMemberReceiptFile(null); setMemberReceiptPreview(null); }}>
        <div style={{ background: '#0A0A0A', border: '1px solid #4CAF50', width: '100%', maxWidth: '380px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} onClick={e => e.stopPropagation()}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', color: '#4CAF50', letterSpacing: '0.05em' }}>✅ CONFIRMAR PAGAMENTO</p>
          <div style={{ background: '#111', border: '1px solid #2A2A2A', padding: '0.75rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#FFF' }}>R$ {memberReceiptModal.amount.toFixed(2)}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', marginTop: '0.2rem' }}>Vence: {new Date(memberReceiptModal.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
          </div>
          {/* Upload de comprovante */}
          <div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>COMPROVANTE (opcional)</p>
            {memberReceiptPreview ? (
              <div style={{ position: 'relative' }}>
                <img src={memberReceiptPreview} alt="Comprovante" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', border: '1px solid #4CAF5044' }} />
                <button onClick={() => { setMemberReceiptFile(null); setMemberReceiptPreview(null); }} style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: '#CC0000', border: 'none', color: '#FFF', width: '22px', height: '22px', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ) : memberReceiptFile ? (
              <div style={{ background: '#111', border: '1px solid #4CAF5044', padding: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📄</span>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memberReceiptFile.name}</p>
                <button onClick={() => setMemberReceiptFile(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.875rem' }}>×</button>
              </div>
            ) : (
              <button onClick={() => memberReceiptInputRef.current?.click()} style={{ width: '100%', background: '#0A0A0A', border: '1px dashed #333', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer', letterSpacing: '0.05em' }}>
                📷 ANEXAR COMPROVANTE
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { setMemberReceiptModal(null); setMemberReceiptFile(null); setMemberReceiptPreview(null); }} style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer' }}>CANCELAR</button>
            <button onClick={handleMemberConfirmWithReceipt} disabled={uploadingMemberReceipt} style={{ flex: 2, background: uploadingMemberReceipt ? '#333' : '#4CAF50', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.625rem', cursor: uploadingMemberReceipt ? 'not-allowed' : 'pointer', letterSpacing: '0.05em' }}>
              {uploadingMemberReceipt ? 'SALVANDO...' : '✅ CONFIRMAR PAGO'}
            </button>
          </div>
        </div>
      </div>
    )}
    {/* Modal de visualização de comprovante em tela cheia */}
    {viewReceiptUrl && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)', zIndex: 2200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setViewReceiptUrl(null)}>
        <button onClick={() => setViewReceiptUrl(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#CC0000', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', padding: '0.5rem 0.875rem', cursor: 'pointer', textTransform: 'uppercase' }}>FECHAR ×</button>
        {viewReceiptUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) ? (
          <img src={viewReceiptUrl} alt="Comprovante" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', border: '1px solid #333' }} onClick={e => e.stopPropagation()} />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFF', marginBottom: '1rem' }}>COMPROVANTE (PDF)</p>
            <a href={viewReceiptUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#4CAF50', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.75rem 1.5rem', textDecoration: 'none', display: 'inline-block' }}>ABRIR PDF</a>
          </div>
        )}
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#444', marginTop: '0.75rem', textTransform: 'uppercase' }}>Toque fora para fechar</p>
      </div>
    )}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{ background: '#111', width: '100%', maxWidth: '480px', borderTop: `2px solid ${accentColor}`, padding: '1.5rem', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header do modal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${beltColor}`, flexShrink: 0, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {member.photo ? (
              <img src={member.photo} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.75rem' }}>🥋</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1 }}>{member.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: beltColor, border: member.belt === 'Branca' ? '1px solid #444' : 'none' }} />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', color: '#AAA', textTransform: 'uppercase' }}>
                FAIXA {(member.belt || '').toUpperCase()}
                {(member.stripes ?? 0) > 0 && ` · ${member.stripes} GRAU${(member.stripes ?? 0) > 1 ? 'S' : ''}`}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '0.25rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="prof-panel-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
          {[
            { label: 'XP TOTAL', value: (member.xp ?? 0).toLocaleString('pt-BR'), icon: '⚡' },
            { label: 'TREINOS', value: member.totalTrainings ?? 0, icon: '🥋' },
            { label: 'HORAS', value: `${hours}h`, icon: '⏱️' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', padding: '0.875rem 0.625rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{stat.icon}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: accentColor, lineHeight: 1 }}>{stat.value}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Promoção de faixa */}
        {!showPromotion ? (
          <button
            onClick={() => setShowPromotion(true)}
            style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}`, color: accentColor, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.75rem', cursor: 'pointer', width: '100%' }}
          >
            🏅 PROMOVER FAIXA / GRAU
          </button>
        ) : (
          <div style={{ background: '#0D0D0D', border: `1px solid ${accentColor}`, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: accentColor, letterSpacing: '0.05em' }}>SELECIONAR NOVA FAIXA / GRAU</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {BELTS_ORDER.map(b => (
                <button
                  key={b}
                  onClick={() => { setNewBelt(b); setNewStripes(0); }}
                  style={{ padding: '0.375rem 0.75rem', background: newBelt === b ? BELT_COLORS[b] : '#1A1A1A', border: `1px solid ${newBelt === b ? BELT_COLORS[b] : '#333'}`, color: newBelt === b && b === 'Branca' ? '#000' : newBelt === b ? '#FFF' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  {b}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', flexShrink: 0 }}>GRAUS:</span>
              {[0, 1, 2, 3, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setNewStripes(s)}
                  style={{ width: '32px', height: '32px', background: newStripes === s ? accentColor : '#1A1A1A', border: `1px solid ${newStripes === s ? accentColor : '#333'}`, color: newStripes === s ? '#FFF' : '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button onClick={() => setShowPromotion(false)} style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8125rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer' }}>CANCELAR</button>
              <button
                onClick={handlePromote}
                disabled={promoting || (newBelt === member.belt && newStripes === (member.stripes ?? 0))}
                style={{ flex: 2, background: promoting ? '#333' : accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8125rem', textTransform: 'uppercase', padding: '0.625rem', cursor: promoting ? 'not-allowed' : 'pointer', opacity: (newBelt === member.belt && newStripes === (member.stripes ?? 0)) ? 0.4 : 1 }}
              >
                {promoting ? 'SALVANDO...' : '✅ CONFIRMAR PROMOÇÃO'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs FREQUÊNCIA / FINANCEIRO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #1E1E1E' }}>
            {detailTabs.map(t => (
              <button
                key={t}
                onClick={() => setDetailTab(t)}
                style={{ flex: 1, background: 'none', border: 'none', borderBottom: detailTab === t ? `2px solid ${accentColor}` : '2px solid transparent', color: detailTab === t ? accentColor : '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.5rem', cursor: 'pointer', marginBottom: '-1px' }}
              >
                {t === 'perfil' ? '👤 PERFIL' : t === 'frequencia' ? '📅 FREQ.' : '💳 FINANCEIRO'}
              </button>
            ))}
          </div>

          {/* Aba PERFIL DO ALUNO */}
          {detailTab === 'perfil' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* XP / NÍVEL */}
              {(() => {
                const { currentLevel, xpProgress, xpToNext } = getLevelInfo(member.xp || 0);
                const levelColor = LEVEL_COLORS[currentLevel.name] || accentColor;
                return (
                  <div style={{ background: '#0D0D0D', border: `1px solid ${levelColor}44`, padding: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>⚡ NÍVEL</span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: levelColor }}>{currentLevel.name}</span>
                    </div>
                    <div style={{ background: '#1A1A1A', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${xpProgress}%`, background: levelColor, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555' }}>{(member.xp || 0).toLocaleString('pt-BR')} XP</span>
                      {xpToNext > 0 && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#444' }}>{xpToNext.toLocaleString('pt-BR')} XP p/ próximo nível</span>}
                    </div>
                  </div>
                );
              })()}

              {/* PROGRESSÃO DE FAIXA */}
              <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '0.875rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>🥋 PROGRESSÃO DE FAIXA</p>
                <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                  {BELTS_ORDER.map(b => {
                    const bIdx = BELTS_ORDER.indexOf(b);
                    const curIdx = BELTS_ORDER.indexOf(member.belt || 'Branca');
                    const active = bIdx <= curIdx;
                    const isCurrent = b === member.belt;
                    return (
                      <div key={b} style={{ flex: 1, height: isCurrent ? '10px' : '6px', borderRadius: '2px', background: active ? (BELT_COLORS[b] || '#555') : '#1A1A1A', border: isCurrent ? `1px solid ${BELT_COLORS[b] || accentColor}` : 'none', transition: 'height 0.3s ease' }} />
                    );
                  })}
                </div>
                {(member.stripes ?? 0) > 0 && (
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                    {Array.from({ length: member.stripes ?? 0 }, (_, i) => (
                      <div key={i} style={{ width: '14px', height: '5px', background: '#EEE', opacity: 0.8 }} />
                    ))}
                  </div>
                )}
              </div>

              {/* CONQUISTAS */}
              {attendanceLoading ? (
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', textAlign: 'center', padding: '0.5rem' }}>CARREGANDO...</p>
              ) : (() => {
                const unlocked = ACHIEVEMENTS.filter(a => a.check(fullTrainings));
                const streak = calcStreak(fullTrainings);
                return (
                  <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>🏅 CONQUISTAS</p>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: accentColor }}>{unlocked.length}/{ACHIEVEMENTS.length}</span>
                    </div>
                    {unlocked.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
                        {unlocked.slice(0, 8).map(ach => (
                          <div key={ach.id} style={{ background: '#1A1A1A', border: `1px solid ${accentColor}33`, padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontSize: '0.8rem' }}>{ach.icon}</span>
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.58rem', color: '#CCC', textTransform: 'uppercase' }}>{ach.title}</span>
                          </div>
                        ))}
                        {unlocked.length > 8 && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', alignSelf: 'center' }}>+{unlocked.length - 8} mais</span>}
                      </div>
                    )}
                    {streak > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase' }}>🔥 Streak atual:</span>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: accentColor }}>{streak} dia{streak !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TOP TÉCNICAS */}
              {!attendanceLoading && (() => {
                const tecnicas = topTecnicas(fullTrainings);
                if (!tecnicas.length) return null;
                return (
                  <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '0.875rem' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>🎯 TOP TÉCNICAS</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {tecnicas.map(tec => (
                        <div key={tec.nome} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '0.375rem 0.625rem' }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#CCC' }}>{tec.nome}</span>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: accentColor }}>{tec.qtd}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Aba FREQUÊNCIA */}
          {detailTab === 'frequencia' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>MÊS</p>
                <input
                  type="month"
                  value={attendanceMonth}
                  onChange={e => setAttendanceMonth(e.target.value)}
                  style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', color: '#CCC', fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', padding: '0.25rem 0.5rem', outline: 'none', colorScheme: 'dark' }}
                />
              </div>
              {attendanceLoading ? (
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', textAlign: 'center', padding: '0.75rem' }}>CARREGANDO...</p>
              ) : filteredAttendance.length === 0 ? (
                <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '1rem', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#444', textTransform: 'uppercase' }}>NENHUM TREINO REGISTRADO NESTE MÊS</p>
                </div>
              ) : (
                <>
                  <div style={{ background: '#0D0D0D', border: `1px solid ${accentColor}33`, padding: '0.625rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: accentColor }}>{filteredAttendance.length}</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase' }}>TREINO{filteredAttendance.length !== 1 ? 'S' : ''} NO MÊS</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#888' }}>{filteredAttendance.reduce((s, a) => s + (a.duration || 0), 0)} min</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {filteredAttendance
                      .slice()
                      .sort((a, b) => (b.trainingDate > a.trainingDate ? 1 : -1))
                      .map(a => (
                        <div key={a.id} style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#CCC' }}>{a.trainingDate}</p>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase' }}>{SESSION_LABELS[a.sessionType || ''] || a.sessionType || 'Treino'}{a.modality ? ` · ${a.modality}` : ''}</p>
                          </div>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: accentColor }}>{a.duration || 0}min</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Aba FINANCEIRO */}
          {!hideFinancial && detailTab === 'financeiro' && (
            <>
              {/* Input oculto para comprovante */}
              <input
                ref={memberReceiptInputRef}
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setMemberReceiptFile(f);
                  if (f.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = ev => setMemberReceiptPreview(ev.target?.result as string);
                    reader.readAsDataURL(f);
                  } else {
                    setMemberReceiptPreview(null);
                  }
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>MÊS</p>
                <input
                  type="month"
                  value={memberPaymentMonth}
                  onChange={e => setMemberPaymentMonth(e.target.value)}
                  style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', color: '#CCC', fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', padding: '0.25rem 0.5rem', outline: 'none', colorScheme: 'dark' }}
                />
              </div>
              {memberPaymentsLoading ? (
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', textAlign: 'center', padding: '0.75rem' }}>CARREGANDO...</p>
              ) : filteredMemberPayments.length === 0 ? (
                <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '1rem', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#444', textTransform: 'uppercase' }}>NENHUMA COBRANÇA NESTE MÊS</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '260px', overflowY: 'auto' }}>
                  {filteredMemberPayments.map(p => {
                    const statusColor = p.status === 'paid' ? '#4CAF50' : p.status === 'overdue' ? '#CC0000' : '#FF8C00';
                    const statusLabel = p.status === 'paid' ? 'PAGO' : p.status === 'overdue' ? 'VENCIDO' : 'PENDENTE';
                    return (
                      <div key={p.id} style={{ background: '#0D0D0D', border: `1px solid ${statusColor}33`, borderLeft: `3px solid ${statusColor}`, padding: '0.625rem 0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#FFF' }}>R$ {p.amount.toFixed(2)}</span>
                              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', color: statusColor, border: `1px solid ${statusColor}`, padding: '0.1rem 0.3rem' }}>{statusLabel}</span>
                            </div>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', marginTop: '0.2rem' }}>
                              Vence: {new Date(p.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                              {p.paidAt && ` · Pago: ${new Date(p.paidAt + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0, alignItems: 'center' }}>
                            {/* Ver comprovante */}
                            {p.receiptUrl && (
                              <button
                                onClick={() => setViewReceiptUrl(p.receiptUrl!)}
                                title="Ver comprovante"
                                style={{ background: '#1A2A1A', border: '1px solid #4CAF5044', color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.3rem 0.5rem', cursor: 'pointer' }}
                              >
                                📤 COMP.
                              </button>
                            )}
                            {/* Marcar como pago */}
                            {p.status !== 'paid' && (
                              <button
                                onClick={() => { setMemberReceiptModal(p); setMemberReceiptFile(null); setMemberReceiptPreview(null); }}
                                disabled={markingPaid === p.id}
                                style={{ background: '#4CAF5022', border: '1px solid #4CAF50', color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.3rem 0.5rem', cursor: 'pointer', opacity: markingPaid === p.id ? 0.5 : 1 }}
                              >
                                {markingPaid === p.id ? '...' : 'PAGO'}
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Miniatura do comprovante se pago e tem URL */}
                        {p.status === 'paid' && p.receiptUrl && p.receiptUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) && (
                          <div style={{ marginTop: '0.5rem', borderTop: '1px solid #1A1A1A', paddingTop: '0.5rem' }}>
                            <img
                              src={p.receiptUrl}
                              alt="Comprovante"
                              onClick={() => setViewReceiptUrl(p.receiptUrl!)}
                              style={{ width: '100%', maxHeight: '80px', objectFit: 'cover', cursor: 'pointer', border: '1px solid #4CAF5033', opacity: 0.85 }}
                            />
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: '#4CAF50', textTransform: 'uppercase', marginTop: '0.2rem' }}>COMPROVANTE ANEXADO — clique para ampliar</p>
                          </div>
                        )}
                        {p.status === 'paid' && p.receiptUrl && !p.receiptUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) && (
                          <div style={{ marginTop: '0.5rem', borderTop: '1px solid #1A1A1A', paddingTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span style={{ fontSize: '0.8rem' }}>📄</span>
                            <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#4CAF50', textTransform: 'uppercase', textDecoration: 'none' }}>VER COMPROVANTE (PDF)</a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Detalhes adicionais */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {member.bjjSince && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' }}>BJJ DESDE</span>
              <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#CCC' }}>{member.bjjSince}</span>
            </div>
          )}
          {member.lastTrainingDate && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' }}>ÚLTIMO TREINO</span>
              <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#CCC' }}>{member.lastTrainingDate}</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
    </>
  );
}

function ComingSoon({ icon, title, description, accentColor }: { icon: string; title: string; description: string; accentColor: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: '#111', border: `1px solid ${accentColor}33`, padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
        <span style={{ fontSize: '3rem' }}>{icon}</span>
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1 }}>{title}</p>
          <div style={{ display: 'inline-block', background: `${accentColor}22`, border: `1px solid ${accentColor}`, padding: '0.2rem 0.625rem', marginTop: '0.5rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: accentColor, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>EM BREVE</p>
          </div>
        </div>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#666', lineHeight: 1.6, maxWidth: '280px' }}>{description}</p>
      </div>
    </div>
  );
}

// ── FrequenciaTab ─────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  studentUid: string;
  studentName: string;
  studentBelt: string;
  trainingDate: string;
  sessionType?: string;
  duration?: number;
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function FrequenciaTab({ professorUid, accentColor }: { professorUid: string; accentColor: string }) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!professorUid) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Get all trainings of academy students
        const trainData = await api.trainings.list();
        const converted = (trainData as any[]).map(t => ({
          id: t.id || '',
          studentUid: t.uid,
          studentName: t.name || 'Atleta',
          studentBelt: t.belt || 'Branca',
          trainingDate: t.date,
          sessionType: t.sessionType,
          duration: t.duration,
        } as AttendanceRecord));
        if (!cancelled) setRecords(converted);
      } catch { if (!cancelled) setRecords([]); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [professorUid]);

  // Filtrar registros do mês selecionado
  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthRecords = records.filter(r => {
    if (!r.trainingDate) return false;
    const norm = r.trainingDate.includes('/') ? r.trainingDate.split('/').reverse().join('-') : r.trainingDate;
    return norm.startsWith(monthStr);
  });

  // Contar treinos por dia
  const countByDay: Record<string, number> = {};
  monthRecords.forEach(r => {
    const norm = r.trainingDate.includes('/') ? r.trainingDate.split('/').reverse().join('-') : r.trainingDate;
    countByDay[norm] = (countByDay[norm] || 0) + 1;
  });

  const maxCount = Math.max(1, ...Object.values(countByDay));

  // Gerar dias do mês
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay();

  // Alunos únicos no mês
  const uniqueStudents = Array.from(new Set(monthRecords.map(r => r.studentUid)));

  // Registros do dia selecionado
  const dayRecords = selectedDay
    ? monthRecords.filter(r => {
        const norm = r.trainingDate.includes('/') ? r.trainingDate.split('/').reverse().join('-') : r.trainingDate;
        return norm === selectedDay;
      })
    : [];

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
    setSelectedDay(null);
  };

  const BELT_COLORS_LOCAL = BELT_COLORS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 1.25rem', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ background: '#111', border: `1px solid ${accentColor}33`, borderLeft: `3px solid ${accentColor}`, padding: '0.875rem 1rem' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.05em' }}>FREQUÊNCIA</p>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', marginTop: '0.2rem' }}>Heatmap de treinos registrados pelos alunos</p>
      </div>

      {/* Navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111', border: '1px solid #1E1E1E', padding: '0.625rem 1rem' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', padding: '0.25rem 0.5rem' }}>‹</button>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.05em' }}>
          {MONTH_NAMES[selectedMonth]} {selectedYear}
        </p>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', padding: '0.25rem 0.5rem' }}>›</button>
      </div>

      {/* Resumo do mês */}
      <div className="prof-panel-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        {[
          { label: 'TREINOS', value: monthRecords.length },
          { label: 'ALUNOS ATIVOS', value: uniqueStudents.length },
          { label: 'MÉDIA/DIA', value: daysInMonth > 0 ? (monthRecords.length / daysInMonth).toFixed(1) : '0' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.375rem', color: accentColor, lineHeight: 1 }}>{stat.value}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', marginTop: '0.2rem', letterSpacing: '0.05em' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
      ) : (
        <>
          {/* Heatmap */}
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
            {/* Cabeçalho dias da semana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '3px' }}>
              {DAY_LABELS.map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', padding: '0.2rem 0' }}>{d}</div>
              ))}
            </div>

            {/* Grid de dias */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
              {/* Células vazias antes do primeiro dia */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} style={{ aspectRatio: '1', background: 'transparent' }} />
              ))}
              {/* Dias do mês */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const count = countByDay[dayKey] || 0;
                const intensity = count === 0 ? 0 : Math.max(0.15, count / maxCount);
                const isSelected = selectedDay === dayKey;
                const isToday = dayKey === today.toISOString().slice(0, 10);
                const bg = count === 0 ? '#0D0D0D' : `rgba(${accentColor === '#CC0000' ? '204,0,0' : '13,158,110'}, ${intensity})`;

                return (
                  <button
                    key={dayKey}
                    onClick={() => setSelectedDay(isSelected ? null : dayKey)}
                    style={{
                      aspectRatio: '1',
                      background: bg,
                      border: isSelected ? `2px solid ${accentColor}` : isToday ? `1px solid ${accentColor}88` : '1px solid #1A1A1A',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '1px',
                      borderRadius: '2px',
                      transition: 'all 0.1s',
                    }}
                  >
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', color: count > 0 ? '#FFF' : '#333', lineHeight: 1 }}>{dayNum}</span>
                    {count > 0 && (
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.55rem', color: accentColor, lineHeight: 1 }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legenda */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#444' }}>MENOS</span>
              {[0, 0.2, 0.4, 0.7, 1].map((op, i) => (
                <div key={i} style={{ width: '12px', height: '12px', background: op === 0 ? '#0D0D0D' : `rgba(${accentColor === '#CC0000' ? '204,0,0' : '13,158,110'}, ${op})`, border: '1px solid #1A1A1A', borderRadius: '2px' }} />
              ))}
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#444' }}>MAIS</span>
            </div>
          </div>

          {/* Detalhe do dia selecionado */}
          {selectedDay && (
            <div style={{ background: '#111', border: `1px solid ${accentColor}44`, borderLeft: `3px solid ${accentColor}`, padding: '0.875rem 1rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#FFF', marginBottom: '0.625rem' }}>
                {selectedDay.split('-').reverse().join('/')} — {dayRecords.length} treino{dayRecords.length !== 1 ? 's' : ''}
              </p>
              {dayRecords.length === 0 ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444' }}>Nenhum treino registrado neste dia.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {dayRecords.map(r => {
                    const beltColor = BELT_COLORS_LOCAL[r.studentBelt] || '#555';
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: beltColor, border: r.studentBelt === 'Branca' ? '1px solid #444' : 'none', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#CCC', flex: 1 }}>{r.studentName}</span>
                        {r.sessionType && (
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase' }}>{r.sessionType.replace('_', ' ')}</span>
                        )}
                        {r.duration && (
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: accentColor }}>{r.duration}min</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Top alunos do mês */}
          {uniqueStudents.length > 0 && (
            <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.875rem 1rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>TOP ALUNOS DO MÊS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {uniqueStudents
                  .map(uid => {
                    const studentRecs = monthRecords.filter(r => r.studentUid === uid);
                    const first = studentRecs[0];
                    const totalMin = studentRecs.reduce((s, r) => s + (r.duration || 0), 0);
                    return { uid, name: first?.studentName || 'Atleta', belt: first?.studentBelt || 'Branca', count: studentRecs.length, totalMin };
                  })
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10)
                  .map((s, idx) => {
                    const beltColor = BELT_COLORS_LOCAL[s.belt] || '#555';
                    return (
                      <div key={s.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.375rem 0.5rem', background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: idx < 3 ? accentColor : '#444', width: '18px', textAlign: 'center', flexShrink: 0 }}>{idx + 1}º</span>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: beltColor, border: s.belt === 'Branca' ? '1px solid #444' : 'none', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#CCC', flex: 1 }}>{s.name}</span>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: accentColor }}>{s.count}x</span>
                        {s.totalMin > 0 && (
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555' }}>{s.totalMin}min</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── HorariosTab ──────────────────────────────────────────────────────────────

interface ClassSchedule {
  id: string;
  days: string[];          // ['seg','ter','qua','qui','sex','sab','dom']
  time: string;            // '06:30'
  type: string;            // 'Iniciante' | 'Graduado' | 'Geral' | 'Open Match'
  mode: string;            // 'Gi' | 'No-Gi'
  publico: string;         // 'Misto' | 'Feminino' | 'Infantil (até 16 anos)'
  durationMin: number;     // 60
  notes?: string;
  professorUid: string;
  createdAt: any;
}

const HORARIOS_DAY_LABELS: Record<string, string> = {
  seg: 'SEGUNDA-FEIRA', ter: 'TERÇA-FEIRA', qua: 'QUARTA-FEIRA', qui: 'QUINTA-FEIRA', sex: 'SEXTA-FEIRA', sab: 'SÁBADO', dom: 'DOMINGO',
};
const HORARIOS_ALL_DAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const CLASS_TYPES = ['Iniciante', 'Graduado', 'Geral', 'Competição', 'Open Match'];
const CLASS_MODES = ['Gi', 'No-Gi'];
const PUBLICO_TYPES = ['Misto', 'Masculino', 'Feminino', 'Infantil (até 16 anos)'];

function HorariosTab({ professorUid, accentColor, readOnly = false }: { professorUid: string; accentColor: string; readOnly?: boolean }) {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = { days: [] as string[], time: '', type: 'Geral', mode: 'Gi', publico: 'Misto', durationMin: 60, notes: '' };
  const [form, setForm] = useState(emptyForm);

  const S = {
    label: { fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#888', marginBottom: '0.25rem', display: 'block' },
    input: { width: '100%', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.85rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' as const },
    btn: (color: string, active?: boolean) => ({ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' as const, padding: '0.25rem 0.625rem', background: active ? `${color}33` : 'transparent', border: `1px solid ${active ? color : '#333'}`, color: active ? color : '#555', cursor: 'pointer', letterSpacing: '0.04em' }),
  };

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.classes.listSchedules({ professorUid }) as ClassSchedule[];
      const ownSchedules = list.filter(s => s.professorUid === professorUid);
      ownSchedules.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
      setSchedules(ownSchedules);
    } catch {
      setSchedules([]);
    }
    setLoading(false);
  }, [professorUid]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const toggleDay = (day: string) => {
    setForm(f => ({ ...f, days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day] }));
  };

  const handleSave = async () => {
    if (!form.time || form.days.length === 0) return;
    if (readOnly) {
      setSaveError('Horarios gerenciados pela academia.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const data = { ...form, professorUid };
      if (editingId) {
        await api.classes.updateSchedule(editingId, data);
      } else {
        await api.classes.createSchedule(data);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadSchedules();
    } catch (e: any) {
      console.error(e);
      setSaveError(e?.message || 'Erro ao salvar horário');
    }
    setSaving(false);
  };

  const handleEdit = (s: ClassSchedule) => {
    if (readOnly) return;
    setForm({ days: s.days, time: s.time, type: s.type, mode: s.mode || 'Gi', publico: s.publico || 'Misto', durationMin: s.durationMin, notes: s.notes || '' });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (readOnly) return;
    if (!confirm('Excluir este horário?')) return;
    await api.classes.deleteSchedule(id);
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  // Group by day for display
  const byDay: Record<string, ClassSchedule[]> = {};
  HORARIOS_ALL_DAYS.forEach(d => { byDay[d] = []; });
  schedules.forEach(s => (s.days ?? []).forEach(d => { if (byDay[d]) byDay[d].push(s); }));

  const typeColor: Record<string, string> = {
    'Iniciante': '#25D366', 'Graduado': '#4A90D9', 'Geral': '#CC0000', 'Competição': '#FFD700', 'Open Match': '#FF6B00',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {readOnly && (
        <div style={{ background: '#141414', border: '1px solid #2A2A2A', padding: '0.875rem 1rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', color: accentColor, letterSpacing: '0.06em' }}>GRADE GERENCIADA PELA ACADEMIA</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#AAA', marginTop: '0.25rem' }}>Voce pode consultar seus horarios, mas alteracoes ficam no painel da academia.</p>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: '0.75rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF' }}>🕐 GRADE DE HORÁRIOS</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', marginTop: '0.125rem' }}>Aulas fixas da academia — visíveis para todos os alunos</p>
        </div>
      </div>

      {/* Grade visual por dia — aparece ACIMA do botão + NOVO HORÁRIO */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
      ) : schedules.length === 0 ? (
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🕐</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM HORÁRIO CADASTRADO</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444', marginTop: '0.5rem' }}>
            {readOnly ? 'Nenhum horario atribuido pela academia.' : 'Clique em "+ NOVO HORARIO" para adicionar as aulas fixas da academia.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {HORARIOS_ALL_DAYS.filter(d => byDay[d].length > 0).map(day => (
            <div key={day} style={{ background: '#111', border: '1px solid #1E1E1E' }}>
              <div style={{ background: '#1A1A1A', borderBottom: '1px solid #2A2A2A', padding: '0.5rem 0.875rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', color: accentColor, letterSpacing: '0.08em' }}>
                  {HORARIOS_DAY_LABELS[day]}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {byDay[day].sort((a, b) => a.time.localeCompare(b.time)).map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.625rem 0.875rem', borderTop: i > 0 ? '1px solid #1A1A1A' : 'none' }}>
                    {/* Horário */}
                    <div style={{ flexShrink: 0, minWidth: '3.5rem' }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#FFF', lineHeight: 1 }}>{s.time}</p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#555' }}>{s.durationMin}min</p>
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', background: `${typeColor[s.type] || '#888'}22`, border: `1px solid ${typeColor[s.type] || '#888'}`, color: typeColor[s.type] || '#888' }}>
                          {s.type}
                        </span>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: `1px solid ${s.mode === 'No-Gi' ? '#9B59B6' : '#4A90D9'}`, color: s.mode === 'No-Gi' ? '#9B59B6' : '#4A90D9' }}>{s.mode || 'Gi'}</span>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: '1px solid #2A2A2A', color: '#666' }}>{s.publico || 'Misto'}</span>
                      </div>
                      {s.notes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>{s.notes}</p>}
                    </div>
                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                      {!readOnly && <button onClick={() => handleEdit(s)} style={{ background: 'none', border: '1px solid #333', color: '#888', cursor: 'pointer', padding: '0.25rem 0.5rem', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase' }}>EDITAR</button>}
                      {!readOnly && <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: '1px solid #CC000044', color: '#CC0000', cursor: 'pointer', padding: '0.25rem 0.5rem', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase' }}>EXCLUIR</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão + NOVO HORÁRIO — aparece ABAIXO da lista */}
      {!readOnly && <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}
        style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.625rem 1rem', background: showForm ? '#333' : accentColor, border: 'none', color: '#FFF', cursor: 'pointer', letterSpacing: '0.06em', alignSelf: 'flex-start' }}>
        {showForm ? '✕ CANCELAR' : '+ NOVO HORÁRIO'}
      </button>}

      {/* Formulário */}
      {showForm && !readOnly && (
        <div style={{ background: '#111', border: `1px solid ${accentColor}`, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', color: '#FFF', marginBottom: '0.25rem' }}>
            {editingId ? '✏️ EDITAR HORÁRIO' : '+ NOVO HORÁRIO'}
          </p>

          {/* Dias da semana */}
          <div>
            <span style={S.label}>DIAS DA SEMANA *</span>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {HORARIOS_ALL_DAYS.map(d => (
                <button key={d} onClick={() => toggleDay(d)}
                  style={{ ...S.btn(accentColor, form.days.includes(d)), padding: '0.375rem 0.625rem', fontSize: '0.7rem' }}>
                  {HORARIOS_DAY_LABELS[d]}
                </button>
              ))}
            </div>
            {/* Atalhos */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button onClick={() => setForm(f => ({ ...f, days: ['seg','ter','qua','qui','sex'] }))} style={S.btn('#888')}>SEG–SEX</button>
              <button onClick={() => setForm(f => ({ ...f, days: ['seg','ter','qua','qui','sex','sab'] }))} style={S.btn('#888')}>SEG–SÁB</button>
              <button onClick={() => setForm(f => ({ ...f, days: HORARIOS_ALL_DAYS }))} style={S.btn('#888')}>TODOS</button>
              <button onClick={() => setForm(f => ({ ...f, days: [] }))} style={S.btn('#888')}>LIMPAR</button>
            </div>
          </div>

          {/* Horário e duração */}
          <div className="prof-panel-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <span style={S.label}>HORÁRIO *</span>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={S.input} />
            </div>
            <div>
              <span style={S.label}>DURAÇÃO (MIN)</span>
              <input type="number" value={form.durationMin} min={30} max={180} step={15} onChange={e => setForm(f => ({ ...f, durationMin: Number(e.target.value) }))} style={S.input} />
            </div>
          </div>

          {/* Tipo de treino */}
          <div>
            <span style={S.label}>TIPO DE TREINO</span>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {CLASS_TYPES.map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                  style={{ ...S.btn(typeColor[t] || '#888', form.type === t), fontSize: '0.65rem' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Modo e Público */}
          <div className="prof-panel-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <span style={S.label}>MODO</span>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {CLASS_MODES.map(m => (
                  <button key={m} onClick={() => setForm(f => ({ ...f, mode: m }))}
                    style={S.btn(m === 'Gi' ? '#4A90D9' : '#9B59B6', form.mode === m)}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span style={S.label}>PÚBLICO</span>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {PUBLICO_TYPES.map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, publico: p }))}
                    style={S.btn(accentColor, form.publico === p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <span style={S.label}>OBSERVAÇÕES (opcional)</span>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ex: Trazer kimono branco..." style={S.input} />
          </div>

          <button onClick={handleSave} disabled={saving || !form.time || form.days.length === 0}
            style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', padding: '0.75rem', background: (saving || !form.time || form.days.length === 0) ? '#333' : accentColor, border: 'none', color: '#FFF', cursor: 'pointer', letterSpacing: '0.08em' }}>
            {saving ? 'SALVANDO...' : editingId ? '✓ SALVAR ALTERAÇÕES' : '✓ ADICIONAR HORÁRIO'}
          </button>
          {saveError && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#CC0000', marginTop: '0.25rem' }}>⚠ {saveError}</p>}
        </div>
      )}

    </div>
  );
}

// ── Funções de export da aba Receita ─────────────────────────────────────────
function buildReceitaData(year: number, allPayments: any[], now: Date) {
  const today = now.toISOString().slice(0, 10);
  const currentMonth = now.toISOString().slice(0, 7);
  const y = String(year);
  return Array.from({ length: 12 }, (_, i) => {
    const m = `${y}-${String(i + 1).padStart(2, '0')}`;
    if (m > currentMonth) return { month: m, label: RELATORIO_MONTH_NAMES[i], cobrado: 0, recebido: 0, inadimplente: 0, hidden: true };
    const mPayments = allPayments.filter((p: any) => (p.month || p.dueDate?.slice(0, 7)) === m);
    // Deduplicar por aluno: 1 pagamento por aluno por mês (o mais recente)
    const byStudent = new Map<string, any>();
    mPayments.forEach((p: any) => {
      const existing = byStudent.get(p.studentUid);
      if (!existing || shouldReplaceFinancialPayment(existing, p)) {
        byStudent.set(p.studentUid, p);
      }
    });
    const dedupedPayments = Array.from(byStudent.values());
    const cobrado = dedupedPayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const recebido = dedupedPayments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const inadimplente = dedupedPayments
      .filter((p: any) => p.status === 'overdue' || (p.status === 'pending' && p.dueDate && p.dueDate < today))
      .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    return { month: m, label: RELATORIO_MONTH_NAMES[i], cobrado, recebido, inadimplente };
  });
}

function exportReceitaXLSX(year: number, allPayments: any[], alunos: RelatorioAluno[], now: Date) {
  const data = buildReceitaData(year, allPayments, now).filter(d => !d.hidden);
  const totalRecebido = data.reduce((s, d) => s + d.recebido, 0);
  const totalCobrado = data.reduce((s, d) => s + d.cobrado, 0);
  const totalInadimplente = data.reduce((s, d) => s + d.inadimplente, 0);

  const rows = [
    ['Mês', 'Cobrado (R$)', 'Recebido (R$)', 'Inadimplência (R$)'],
    ...data.map(d => [d.label, d.cobrado, d.recebido, d.inadimplente]),
    [],
    ['TOTAL', totalCobrado, totalRecebido, totalInadimplente],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Receita ${year}`);
  XLSX.writeFile(wb, `receita-${year}.xlsx`);
}

function exportReceitaPDF(year: number, allPayments: any[], alunos: RelatorioAluno[], now: Date, profile: any) {
  const data = buildReceitaData(year, allPayments, now).filter(d => !d.hidden);
  const totalRecebido = data.reduce((s, d) => s + d.recebido, 0);
  const totalCobrado = data.reduce((s, d) => s + d.cobrado, 0);
  const totalInadimplente = data.reduce((s, d) => s + d.inadimplente, 0);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.setFillColor(10, 10, 10); pdf.rect(0, 0, 210, 297, 'F');
  // Header
  pdf.setFillColor(204, 0, 0); pdf.rect(0, 0, 210, 18, 'F');
  pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
  pdf.text('BJJRATS — RELATÓRIO DE RECEITA', 14, 11);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
  pdf.text(`${profile?.academyName || profile?.displayName || 'Academia'} · ${year}`, 14, 16);

  let cy = 28;
  // Cards de totais
  const cards = [
    { label: 'TOTAL COBRADO', value: `R$ ${totalCobrado.toFixed(2)}`, color: [100, 100, 100] as [number,number,number] },
    { label: 'RECEBIDO', value: `R$ ${totalRecebido.toFixed(2)}`, color: [76, 175, 80] as [number,number,number] },
    { label: 'INADIMPLÊNCIA', value: `R$ ${totalInadimplente.toFixed(2)}`, color: [204, 0, 0] as [number,number,number] },
  ];
  const cardW = 56; const cardH = 16; const cardGap = 5; const cardX = 14;
  cards.forEach((c, i) => {
    const x = cardX + i * (cardW + cardGap);
    pdf.setFillColor(20, 20, 20); pdf.rect(x, cy, cardW, cardH, 'F');
    pdf.setDrawColor(...c.color); pdf.setLineWidth(0.5); pdf.rect(x, cy, cardW, cardH, 'S');
    pdf.setTextColor(...c.color); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
    pdf.text(c.value, x + cardW / 2, cy + 8, { align: 'center' });
    pdf.setTextColor(150, 150, 150); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6);
    pdf.text(c.label, x + cardW / 2, cy + 13, { align: 'center' });
  });
  cy += cardH + 10;

  // Tabela
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
  pdf.setFillColor(25, 25, 25); pdf.rect(14, cy, 182, 7, 'F');
  pdf.setTextColor(200, 200, 200);
  pdf.text('MÊS', 18, cy + 4.5);
  pdf.text('COBRADO', 80, cy + 4.5, { align: 'right' });
  pdf.text('RECEBIDO', 126, cy + 4.5, { align: 'right' });
  pdf.text('INADIMPLÊNCIA', 182, cy + 4.5, { align: 'right' });
  cy += 7;

  data.forEach((d, i) => {
    pdf.setFillColor(i % 2 === 0 ? 15 : 20, i % 2 === 0 ? 15 : 20, i % 2 === 0 ? 15 : 20);
    pdf.rect(14, cy, 182, 7, 'F');
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
    pdf.setTextColor(210, 210, 210); pdf.text(d.label, 18, cy + 4.5);
    pdf.setTextColor(180, 180, 180); pdf.text(`R$ ${d.cobrado.toFixed(2)}`, 80, cy + 4.5, { align: 'right' });
    pdf.setTextColor(76, 175, 80); pdf.text(`R$ ${d.recebido.toFixed(2)}`, 126, cy + 4.5, { align: 'right' });
    if (d.inadimplente > 0) {
      pdf.setTextColor(204, 0, 0); pdf.text(`R$ ${d.inadimplente.toFixed(2)}`, 182, cy + 4.5, { align: 'right' });
    } else {
      pdf.setTextColor(80, 80, 80); pdf.text('—', 182, cy + 4.5, { align: 'right' });
    }
    cy += 7;
  });

  // Linha de total
  cy += 2;
  pdf.setFillColor(30, 30, 30); pdf.rect(14, cy, 182, 8, 'F');
  pdf.setDrawColor(80, 80, 80); pdf.setLineWidth(0.3); pdf.line(14, cy, 196, cy);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255); pdf.text('TOTAL', 18, cy + 5);
  pdf.setTextColor(180, 180, 180); pdf.text(`R$ ${totalCobrado.toFixed(2)}`, 80, cy + 5, { align: 'right' });
  pdf.setTextColor(76, 175, 80); pdf.text(`R$ ${totalRecebido.toFixed(2)}`, 126, cy + 5, { align: 'right' });
  pdf.setTextColor(204, 0, 0); pdf.text(`R$ ${totalInadimplente.toFixed(2)}`, 182, cy + 5, { align: 'right' });

  // Rodapé
  pdf.setTextColor(80, 80, 80); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
  pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} via BJJRATS`, 105, 290, { align: 'center' });

  pdf.save(`receita-${year}.pdf`);
}

// ── RelatoriosTab ─────────────────────────────────────────────────────────────
// Relatórios mensais: alunos em atraso financeiro e baixa frequência
// Avisos automaticos por atraso configuravel e incentivo de frequencia
// Alertas ao professor respeitando o limite de suspensao automatica

interface RelatorioAluno {
  enrollmentId: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  belt: string;
  // financeiro
  daysOverdue: number;
  amountDue: number;
  dueDate: string;
  paymentStatus: 'pending' | 'overdue' | 'paid';
  enrollmentStatus: 'active' | 'suspended' | 'cancelled';
  // frequência
  trainingsThisMonth: number;
  lastTrainingDate: string | null;
}

const RELATORIO_MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function RelatoriosTab({
  professorUid,
  accentColor,
  profile,
  enrollments,
  autoSuspendAfterDays,
  onSuspend,
}: {
  professorUid: string;
  accentColor: string;
  profile: any;
  enrollments: any[];
  autoSuspendAfterDays: number;
  onSuspend: (enrollmentId: string) => void;
}) {
  const now = new Date();
  const [alunos, setAlunos] = useState<RelatorioAluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [subTab, setSubTab] = useState<'atraso' | 'frequencia' | 'ranking' | 'promocoes' | 'turmas' | 'receita' | 'sumidos' | 'avulsas' | 'ficha'>('atraso');
  const [lowFreqThreshold, setLowFreqThreshold] = useState(4);
  // Dados extras
  const [promotions, setPromotions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [dailyVisits, setDailyVisits] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [sumidosDays, setSumidosDays] = useState(14);
  const [receitaYear, setReceitaYear] = useState(now.getFullYear());

  const monthName = RELATORIO_MONTH_NAMES[now.getMonth()];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const loadRelatorio = useCallback(async () => {
    if (!professorUid) return;
    setLoading(true);
    try {
      // Buscar matrículas ativas
      const enrollmentData = await api.enrollments.list({ professorUid });
      const enrollmentsData = (enrollmentData as any[]).filter((e: any) => ['active', 'suspended'].includes(e.status));

      // Buscar pagamentos pendentes/vencidos
      const paymentsData = await api.payments.list({ professorUid });
      const effectivePayments = Array.from(currentEffectivePaymentsByStudent(paymentsData as any[], now).values());
      const payments = effectivePayments.filter((p: any) => ['pending', 'overdue'].includes(p.status));

      // Buscar treinos do mês atual via check-ins
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const checkInData = await api.classes.getCheckIns({});
      const normalizeDate = (d: string): string => {
        if (!d) return '';
        if (d.includes('/')) {
          const [dd, mm, yyyy] = d.split('/');
          return `${yyyy}-${mm}-${dd}`;
        }
        return d;
      };
      const trainings = (checkInData as any[])
        .filter((c: any) => c.professorUid === professorUid)
        .map((c: any) => ({ ...c, _isoDate: normalizeDate(c.dateKey || c.trainingDate || '') }))
        .filter((t: any) => t._isoDate >= monthStartStr);

      const result: RelatorioAluno[] = [];

      for (const enr of enrollmentsData) {
        const alunoPayments = payments.filter((p: any) => p.studentUid === enr.studentUid);
        const oldestOverdue = alunoPayments.sort((a: any, b: any) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )[0];

        let daysOverdue = 0;
        let amountDue = 0;
        let dueDate = '';
        let paymentStatus: 'pending' | 'overdue' | 'paid' = 'paid';

        if (oldestOverdue) {
          const due = new Date(oldestOverdue.dueDate);
          daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
          amountDue = oldestOverdue.amount || enr.monthlyFee || 0;
          dueDate = oldestOverdue.dueDate;
          paymentStatus = daysOverdue > 0 ? 'overdue' : 'pending';
        }

        const alunoTrainings = trainings.filter((t: any) => t.studentUid === enr.studentUid);
        const trainingsCount = alunoTrainings.length;
        const lastTraining = alunoTrainings.sort((a: any, b: any) =>
          (b._isoDate || '').localeCompare(a._isoDate || '')
        )[0]?._isoDate || null;

        result.push({
          enrollmentId: enr.id,
          studentUid: enr.studentUid,
          studentName: enr.studentName,
          studentEmail: enr.studentEmail,
          belt: enr.studentBelt || 'Branca',
          daysOverdue,
          amountDue,
          dueDate,
          paymentStatus,
          enrollmentStatus: enr.status,
          trainingsThisMonth: trainingsCount,
          lastTrainingDate: lastTraining,
        });
      }

      setAlunos(result);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  }, [professorUid]);

  useEffect(() => { loadRelatorio(); }, [loadRelatorio]);

  const loadExtra = useCallback(async () => {
    if (!professorUid) return;
    setLoadingExtra(true);
    try {
      const [promoData, payData, schedData] = await Promise.all([
        api.promotions.list({ professorUid }),
        api.payments.list({ professorUid }),
        api.classes.listSchedules({ professorUid }),
      ]);
      const promos = (promoData as any[]).sort((a: any, b: any) => {
        const ta = a.promotedAt ? new Date(a.promotedAt).getTime() : 0;
        const tb = b.promotedAt ? new Date(b.promotedAt).getTime() : 0;
        return tb - ta;
      });
      setPromotions(promos);
      setAllPayments(payData as any[]);
      setSchedules(schedData as any[]);
      setDailyVisits([]);
      setAllAttendance([]);
    } catch (e) { console.error(e); }
    finally { setLoadingExtra(false); }
  }, [professorUid]);

  useEffect(() => {
    if (['ranking','promocoes','turmas','receita','sumidos','avulsas','ficha'].includes(subTab)) {
      loadExtra();
    }
  }, [subTab, loadExtra]);

  const handleSendOverdueWhatsApp = async (aluno: RelatorioAluno) => {
    try {
      const dueDate = new Date(aluno.dueDate + 'T00:00:00').toLocaleDateString('pt-BR');
      const suspensionNotice = autoSuspendAfterDays > 0
        ? aluno.daysOverdue >= autoSuspendAfterDays
          ? `O limite configurado e de ${autoSuspendAfterDays} dia(s) de atraso. Regularize sua situacao para evitar ou reverter a suspensao automatica.`
          : `Regularize antes de completar ${autoSuspendAfterDays} dia(s) de atraso para evitar a suspensao automatica.`
        : 'A suspensao automatica esta desativada, mas regularize para manter sua matricula em dia.';
      const notification = await api.notifications.create({
        toUid: aluno.studentUid,
        type: 'payment_overdue',
        message: `Mensalidade em atraso ha ${aluno.daysOverdue} dia(s). Valor em aberto: R$ ${aluno.amountDue.toFixed(2)}. Vencimento: ${dueDate}. ${suspensionNotice}`,
        data: { amount: aluno.amountDue, dueDate: aluno.dueDate, daysOverdue: aluno.daysOverdue, autoSuspendAfterDays, pixKey: profile?.pixKey || '' },
        read: false,
      });
      toast.success(getWhatsAppAutomationToast(notification.whatsapp, `Aviso enviado para ${aluno.studentName}`));
    } catch {
      toast.error('Erro ao enviar aviso de inadimplencia');
    }
  };

  const handleSendLowFreqWhatsApp = async (aluno: RelatorioAluno) => {
    try {
      const notification = await api.notifications.create({
        toUid: aluno.studentUid,
        type: 'low_frequency',
        message: `Sentimos sua falta no tatame. Voce treinou ${aluno.trainingsThisMonth} vez${aluno.trainingsThisMonth !== 1 ? 'es' : ''} em ${monthName}. Que tal marcar presenca esta semana?`,
        data: { trainingsCount: aluno.trainingsThisMonth, monthName },
        read: false,
      });
      toast.success(getWhatsAppAutomationToast(notification.whatsapp, `Aviso enviado para ${aluno.studentName}`));
    } catch {
      toast.error('Erro ao enviar aviso de baixa frequencia');
    }
  };

  const handleSendAllOverdue = async () => {
    const targets = alunosAtraso.filter(a => a.daysOverdue >= 2 && a.enrollmentStatus === 'active');
    if (!targets.length) { toast.info('Nenhum aluno elegível para notificação'); return; }
    try {
      const results = await Promise.all(targets.map(a => {
        const dueDate = new Date(a.dueDate + 'T00:00:00').toLocaleDateString('pt-BR');
        const suspensionNotice = autoSuspendAfterDays > 0
          ? a.daysOverdue >= autoSuspendAfterDays
            ? `O limite configurado e de ${autoSuspendAfterDays} dia(s) de atraso. Regularize sua situacao para evitar ou reverter a suspensao automatica.`
            : `Regularize antes de completar ${autoSuspendAfterDays} dia(s) de atraso para evitar a suspensao automatica.`
          : 'A suspensao automatica esta desativada, mas regularize para manter sua matricula em dia.';
        return api.notifications.create({
          toUid: a.studentUid,
          type: 'payment_overdue',
          message: `Mensalidade em atraso ha ${a.daysOverdue} dia(s). Valor em aberto: R$ ${a.amountDue.toFixed(2)}. Vencimento: ${dueDate}. ${suspensionNotice}`,
          data: { amount: a.amountDue, dueDate: a.dueDate, daysOverdue: a.daysOverdue, autoSuspendAfterDays, pixKey: profile?.pixKey || '' },
          read: false,
        });
      }));
      const summary = results.reduce((acc, item) => ({
        enabled: acc.enabled && !!item.whatsapp?.enabled,
        recipients: acc.recipients + (item.whatsapp?.recipients || 0),
        sent: acc.sent + (item.whatsapp?.sent || 0),
        failed: acc.failed + (item.whatsapp?.failed || 0),
      }), { enabled: true, recipients: 0, sent: 0, failed: 0 });
      toast.success(getWhatsAppAutomationToast(summary, `${targets.length} aviso(s) de inadimplencia enviados`));
    } catch {
      toast.error('Erro ao enviar avisos de inadimplencia');
    }
  };

  // ── PDF da ficha do aluno ──────────────────────────────────────────────────
  const exportMemberPDF = (member: any, memberPayments: any[], memberAttendance: any[], memberPromos: any[]) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const beltColorMap: Record<string, [number,number,number]> = {
      'Branca': [255,255,255], 'Azul': [74,144,217], 'Roxa': [156,89,182],
      'Marrom': [139,69,19], 'Preta': [100,100,100],
    };
    const bc = beltColorMap[member.belt] || [150,150,150];
    // Fundo
    pdf.setFillColor(10,10,10); pdf.rect(0,0,210,297,'F');
    // Header
    pdf.setFillColor(204,0,0); pdf.rect(0,0,210,20,'F');
    pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(13);
    pdf.text('BJJRATS — FICHA DO ALUNO', 14, 13);
    // Faixa badge
    pdf.setFillColor(...bc); pdf.rect(170,4,30,12,'F');
    pdf.setTextColor(member.belt === 'Branca' ? 0 : 255, member.belt === 'Branca' ? 0 : 255, member.belt === 'Branca' ? 0 : 255);
    pdf.setFontSize(8); pdf.text((member.belt || '').toUpperCase(), 185, 11, { align: 'center' });
    // Dados do aluno
    let cy = 30;
    pdf.setTextColor(200,200,200); pdf.setFont('helvetica','bold'); pdf.setFontSize(14);
    pdf.text(member.name || member.studentName, 14, cy); cy += 7;
    pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(120,120,120);
    if (member.email || member.studentEmail) { pdf.text(member.email || member.studentEmail, 14, cy); cy += 5; }
    pdf.text(`Faixa: ${member.belt}${member.stripes > 0 ? ` · ${member.stripes}º grau` : ''}`, 14, cy); cy += 5;
    if (member.bjjSince) { pdf.text(`BJJ desde: ${member.bjjSince}`, 14, cy); cy += 5; }
    // Estatísticas
    cy += 3;
    pdf.setFillColor(20,20,20); pdf.rect(14,cy,182,18,'F');
    pdf.setDrawColor(204,0,0); pdf.rect(14,cy,182,18,'S');
    const stats = [
      { label: 'TREINOS', value: String(memberAttendance.length) },
      { label: 'PROMOÇÕES', value: String(memberPromos.length) },
      { label: 'PGTOS PAGOS', value: String(memberPayments.filter((p:any)=>p.status==='paid').length) },
    ];
    stats.forEach((s,i) => {
      const x = 14 + i * 61;
      pdf.setTextColor(204,0,0); pdf.setFont('helvetica','bold'); pdf.setFontSize(16);
      pdf.text(s.value, x+30, cy+11, { align:'center' });
      pdf.setTextColor(100,100,100); pdf.setFont('helvetica','normal'); pdf.setFontSize(7);
      pdf.text(s.label, x+30, cy+16, { align:'center' });
    }); cy += 26;
    // Histórico de promoções
    if (memberPromos.length > 0) {
      pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.setTextColor(150,150,150);
      pdf.text('HISTÓRICO DE PROMOÇÕES', 14, cy); cy += 5;
      memberPromos.slice(0,6).forEach((p:any) => {
        if (cy > 270) { pdf.addPage(); cy = 20; }
        pdf.setFillColor(18,18,18); pdf.rect(14,cy-1,182,7,'F');
        pdf.setTextColor(200,200,200); pdf.setFont('helvetica','normal'); pdf.setFontSize(7);
        pdf.text(`${p.previousBelt} → ${p.newBelt}${p.newStripes>0?` (${p.newStripes}º grau)`:''}`, 16, cy+3.5);
        pdf.setTextColor(100,100,100);
        pdf.text(p.promotedAtStr || '', 180, cy+3.5, { align:'right' });
        cy += 7;
      }); cy += 4;
    }
    // Últimos treinos
    const recentAtt = memberAttendance.slice().sort((a:any,b:any)=>b.date?.localeCompare(a.date)).slice(0,10);
    if (recentAtt.length > 0) {
      pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.setTextColor(150,150,150);
      pdf.text('ÚLTIMOS TREINOS', 14, cy); cy += 5;
      recentAtt.forEach((a:any) => {
        if (cy > 270) { pdf.addPage(); cy = 20; }
        pdf.setFillColor(18,18,18); pdf.rect(14,cy-1,182,7,'F');
        pdf.setTextColor(200,200,200); pdf.setFont('helvetica','normal'); pdf.setFontSize(7);
        pdf.text(a.date || a.trainingDate || '', 16, cy+3.5);
        pdf.setTextColor(100,100,100);
        pdf.text(`${a.sessionType || 'Treino'} · ${a.duration||0}min`, 180, cy+3.5, { align:'right' });
        cy += 7;
      }); cy += 4;
    }
    // Financeiro
    const paidPayments = memberPayments.filter((p:any)=>p.status==='paid').slice(0,10);
    if (paidPayments.length > 0) {
      pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.setTextColor(150,150,150);
      pdf.text('PAGAMENTOS RECENTES', 14, cy); cy += 5;
      paidPayments.forEach((p:any) => {
        if (cy > 270) { pdf.addPage(); cy = 20; }
        pdf.setFillColor(18,18,18); pdf.rect(14,cy-1,182,7,'F');
        pdf.setTextColor(200,200,200); pdf.setFont('helvetica','normal'); pdf.setFontSize(7);
        pdf.text(`R$ ${Number(p.amount).toFixed(2)} — ${p.month || p.dueDate}`, 16, cy+3.5);
        pdf.setTextColor(76,175,80); pdf.setFont('helvetica','bold');
        pdf.text('PAGO', 180, cy+3.5, { align:'right' });
        cy += 7;
      });
    }
    // Footer
    pdf.setTextColor(60,60,60); pdf.setFont('helvetica','normal'); pdf.setFontSize(7);
    pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} — BJJRats App`, 14, 290);
    pdf.save(`bjjrats-ficha-${(member.name||member.studentName||'aluno').replace(/\s+/g,'-').toLowerCase()}.pdf`);
    toast.success('Ficha exportada em PDF!');
  };

  const handleSendAllLowFreq = async () => {
    const targets = alunosBaixaFreq;
    if (!targets.length) { toast.info('Nenhum aluno com baixa frequência'); return; }
    try {
      const results = await Promise.all(targets.map(a =>
        api.notifications.create({
          toUid: a.studentUid,
          type: 'low_frequency',
          message: `Sentimos sua falta no tatame. Voce treinou ${a.trainingsThisMonth} vez${a.trainingsThisMonth !== 1 ? 'es' : ''} em ${monthName}. Que tal marcar presenca esta semana?`,
          data: { trainingsCount: a.trainingsThisMonth, monthName },
          read: false,
        })
      ));
      const summary = results.reduce((acc, item) => ({
        enabled: acc.enabled && !!item.whatsapp?.enabled,
        recipients: acc.recipients + (item.whatsapp?.recipients || 0),
        sent: acc.sent + (item.whatsapp?.sent || 0),
        failed: acc.failed + (item.whatsapp?.failed || 0),
      }), { enabled: true, recipients: 0, sent: 0, failed: 0 });
      toast.success(getWhatsAppAutomationToast(summary, `${targets.length} aviso(s) de baixa frequencia enviados`));
    } catch {
      toast.error('Erro ao enviar avisos de baixa frequencia');
    }
  };

  const S = {
    label: { fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#888' },
    card: { background: '#111', border: '1px solid #1E1E1E', padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
    btn: (color: string, disabled?: boolean) => ({
      fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem',
      textTransform: 'uppercase' as const, padding: '0.3rem 0.75rem',
      background: disabled ? 'transparent' : `${color}22`,
      border: `1px solid ${disabled ? '#333' : color}`,
      color: disabled ? '#444' : color,
      cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: '0.04em',
      opacity: disabled ? 0.5 : 1,
    }),
  };

  const alunosAtraso = alunos
    .filter(a => a.paymentStatus === 'overdue' && a.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const alunosBaixaFreq = alunos
    .filter(a => a.trainingsThisMonth < lowFreqThreshold && a.enrollmentStatus === 'active')
    .sort((a, b) => a.trainingsThisMonth - b.trainingsThisMonth);

  const suspensionAlertThreshold = autoSuspendAfterDays > 0 ? autoSuspendAfterDays : 999999;
  const attentionAlertThreshold = autoSuspendAfterDays > 1 ? Math.max(1, Math.floor(autoSuspendAfterDays / 2)) : 1;
  const alertas10 = autoSuspendAfterDays > 0
    ? alunosAtraso.filter(a => a.daysOverdue >= attentionAlertThreshold && a.daysOverdue < suspensionAlertThreshold)
    : [];
  const alertas20 = autoSuspendAfterDays > 0
    ? alunosAtraso.filter(a => a.daysOverdue >= suspensionAlertThreshold)
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: '0.75rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF' }}>📊 RELATÓRIOS MENSAIS</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', marginTop: '0.125rem' }}>{monthName} {now.getFullYear()} — Inadimplência e Frequência</p>
        </div>
        <button onClick={loadRelatorio} style={S.btn('#888')}>↻ ATUALIZAR</button>
      </div>

      {/* Alertas críticos */}
      {(alertas10.length > 0 || alertas20.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {alertas20.length > 0 && (
            <div style={{ background: '#2A0000', border: '1px solid #CC0000', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#CC0000', textTransform: 'uppercase' }}>
                  ⚠️ {alertas20.length} ALUNO(S) COM {suspensionAlertThreshold}+ DIAS DE ATRASO
                </p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
                  {alertas20.map(a => a.studentName).join(', ')}
                </p>
              </div>
              <button onClick={() => setSubTab('atraso')} style={S.btn('#CC0000')}>VER</button>
            </div>
          )}
          {alertas10.length > 0 && (
            <div style={{ background: '#1A1000', border: '1px solid #FF8C00', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#FF8C00', textTransform: 'uppercase' }}>
                  🔔 {alertas10.length} ALUNO(S) COM {attentionAlertThreshold}-{suspensionAlertThreshold - 1} DIAS DE ATRASO
                </p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
                  {alertas10.map(a => a.studentName).join(', ')}
                </p>
              </div>
              <button onClick={() => setSubTab('atraso')} style={S.btn('#FF8C00')}>VER</button>
            </div>
          )}
        </div>
      )}

      {/* Sub-tabs — scroll horizontal */}
      <div style={{ display: 'flex', gap: '0.375rem', borderBottom: '1px solid #1E1E1E', paddingBottom: '0.5rem', overflowX: 'auto', flexWrap: 'nowrap' }}>
        {([
          { id: 'atraso', label: `💳 ATRASO (${alunosAtraso.length})` },
          { id: 'frequencia', label: `📅 B. FREQ. (${alunosBaixaFreq.length})` },
          { id: 'ranking', label: '🏆 RANKING' },
          { id: 'promocoes', label: '🏅 PROMOÇÕES' },
          { id: 'turmas', label: '🕐 TURMAS' },
          { id: 'receita', label: '💰 RECEITA ANUAL' },
          { id: 'sumidos', label: '👤 SUMIDOS' },
          { id: 'avulsas', label: '💪 AVULSAS' },
          { id: 'ficha', label: '📄 FICHA PDF' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.35rem 0.75rem', background: subTab === t.id ? `${accentColor}22` : 'transparent', border: `1px solid ${subTab === t.id ? accentColor : '#2A2A2A'}`, color: subTab === t.id ? accentColor : '#555', cursor: 'pointer', letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Carregando relatório...</p>
      ) : (
        <>
          {/* ── ATRASO FINANCEIRO ── */}
          {subTab === 'atraso' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ ...S.label, color: '#666' }}>{alunosAtraso.length} aluno(s) em atraso</p>
                <button onClick={handleSendAllOverdue} style={S.btn('#25D366')}>
                  📱 AVISAR TODOS NO WHATSAPP
                </button>
              </div>

              {alunosAtraso.length === 0 ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>✅ Nenhum aluno em atraso este mês</p>
              ) : alunosAtraso.map(aluno => {
                const overdueColor = aluno.daysOverdue >= suspensionAlertThreshold ? '#CC0000' : aluno.daysOverdue >= attentionAlertThreshold ? '#FF8C00' : '#FFD700';
                const isSuspended = aluno.enrollmentStatus === 'suspended';
                return (
                  <div key={aluno.enrollmentId} style={{ ...S.card, borderLeft: `3px solid ${overdueColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BELT_COLORS[aluno.belt] || '#888', border: '1px solid #333', flexShrink: 0 }} />
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase' }}>{aluno.studentName}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#555' }}>{aluno.studentEmail}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: overdueColor }}>{aluno.daysOverdue} DIAS</p>
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#888' }}>R$ {aluno.amountDue.toFixed(2)}</p>
                      </div>
                    </div>

                    {isSuspended && (
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#FF8C00', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🚫 SUSPENSO</p>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleSendOverdueWhatsApp(aluno)}
                        disabled={isSuspended}
                        style={S.btn('#25D366', isSuspended)}>
                        📱 AVISAR NO WHATSAPP
                      </button>
                      {autoSuspendAfterDays > 0 && aluno.daysOverdue >= autoSuspendAfterDays && !isSuspended && (
                        <button
                          onClick={() => onSuspend(aluno.enrollmentId)}
                          style={S.btn('#CC0000')}>
                          🚫 SUSPENDER
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── BAIXA FREQUÊNCIA ── */}
          {subTab === 'frequencia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={S.label}>MÍNIMO DE TREINOS/MÊS:</span>
                  <input
                    type="number" min={1} max={20} value={lowFreqThreshold}
                    onChange={e => setLowFreqThreshold(Number(e.target.value))}
                    style={{ width: '3rem', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.85rem', padding: '0.25rem 0.5rem', textAlign: 'center' }}
                  />
                </div>
                <button onClick={handleSendAllLowFreq} style={S.btn('#25D366')}>
                  📱 INCENTIVAR TODOS NO WHATSAPP
                </button>
              </div>

              {alunosBaixaFreq.length === 0 ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>✅ Todos os alunos estão com boa frequência este mês</p>
              ) : alunosBaixaFreq.map(aluno => {
                const freqColor = aluno.trainingsThisMonth === 0 ? '#CC0000' : aluno.trainingsThisMonth <= 2 ? '#FF8C00' : '#FFD700';
                return (
                  <div key={aluno.enrollmentId} style={{ ...S.card, borderLeft: `3px solid ${freqColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BELT_COLORS[aluno.belt] || '#888', border: '1px solid #333', flexShrink: 0 }} />
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase' }}>{aluno.studentName}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#555' }}>
                            {aluno.lastTrainingDate ? `Último treino: ${aluno.lastTrainingDate}` : 'Sem treinos registrados'}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: freqColor }}>
                          {aluno.trainingsThisMonth} TREINO{aluno.trainingsThisMonth !== 1 ? 'S' : ''}
                        </p>
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#888' }}>{monthName}</p>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div style={{ background: '#1A1A1A', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (aluno.trainingsThisMonth / lowFreqThreshold) * 100)}%`, height: '100%', background: freqColor, transition: 'width 0.3s' }} />
                    </div>

                    <button
                      onClick={() => handleSendLowFreqWhatsApp(aluno)}
                      style={S.btn('#25D366')}>
                      📱 ENVIAR INCENTIVO NO WHATSAPP
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── RANKING DE FREQUÊNCIA ── */}
          {subTab === 'ranking' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ ...S.label, color: '#666' }}>TOP ALUNOS POR TREINOS — {monthName} {now.getFullYear()}</p>
              {loadingExtra ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Carregando...</p>
              ) : (() => {
                const monthStr = now.toISOString().slice(0,7);
                const countByUid: Record<string, { name: string; belt: string; count: number }> = {};
                allAttendance.filter((a:any) => (a.date || a.trainingDate || '').slice(0,7) === monthStr).forEach((a:any) => {
                  const uid = a.studentUid;
                  if (!uid) return;
                  if (!countByUid[uid]) countByUid[uid] = { name: a.studentName || uid, belt: a.belt || 'Branca', count: 0 };
                  countByUid[uid].count++;
                });
                const ranked = Object.values(countByUid).sort((a,b) => b.count - a.count);
                if (ranked.length === 0) return <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Nenhum treino registrado este mês</p>;
                const maxCount = ranked[0].count || 1;
                return ranked.map((r, i) => (
                  <div key={i} style={{ ...S.card, borderLeft: `3px solid ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#333'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#555', minWidth: '1.5rem' }}>#{i+1}</span>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BELT_COLORS[r.belt] || '#888', border: '1px solid #333', flexShrink: 0 }} />
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase' }}>{r.name}</p>
                      </div>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: accentColor }}>{r.count} treino{r.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ background: '#1A1A1A', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(r.count / maxCount) * 100}%`, height: '100%', background: i === 0 ? '#FFD700' : accentColor }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* ── HISTÓRICO DE PROMOÇÕES ── */}
          {subTab === 'promocoes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ ...S.label, color: '#666' }}>TODAS AS PROMOÇÕES REALIZADAS</p>
              {loadingExtra ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Carregando...</p>
              ) : promotions.length === 0 ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Nenhuma promoção registrada</p>
              ) : promotions.map((p:any) => (
                <div key={p.id} style={{ ...S.card, borderLeft: `3px solid ${BELT_COLORS[p.newBelt] || '#555'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase' }}>{p.studentName}</p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#888', marginTop: '0.2rem' }}>
                        {p.previousBelt} → <span style={{ color: BELT_COLORS[p.newBelt] || '#FFF', fontWeight: 700 }}>{p.newBelt}</span>{p.newStripes > 0 ? ` · ${p.newStripes}º grau` : ''}
                      </p>
                    </div>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555' }}>{p.promotedAtStr || ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── RELATÓRIO DE TURMAS ── */}
          {subTab === 'turmas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ ...S.label, color: '#666' }}>OCUPAÇÃO POR HORÁRIO — {monthName}</p>
              {loadingExtra ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Carregando...</p>
              ) : schedules.length === 0 ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Nenhum horário cadastrado</p>
              ) : (() => {
                const monthStr = now.toISOString().slice(0,7);
                const attThisMonth = allAttendance.filter((a:any) => (a.date || a.trainingDate || '').slice(0,7) === monthStr);
                return schedules.map((s:any) => {
                  const dayLabels = (s.days || []).map((d:string) => ({ seg:'Seg',ter:'Ter',qua:'Qua',qui:'Qui',sex:'Sex',sab:'Sáb',dom:'Dom' }[d] || d)).join(', ');
                  const count = attThisMonth.filter((a:any) => a.sessionType === s.type || a.scheduleId === s.id).length;
                  const typeColors: Record<string,string> = { 'Iniciante':'#25D366','Graduado':'#4A90D9','Geral':'#CC0000','Competição':'#FFD700','Open Match':'#FF6B00' };
                  const tc = typeColors[s.type] || '#888';
                  return (
                    <div key={s.id} style={{ ...S.card, borderLeft: `3px solid ${tc}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase' }}>{s.time} — {s.type}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#888', marginTop: '0.2rem' }}>{dayLabels} · {s.mode} · {s.durationMin}min</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: tc }}>{count}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#555' }}>check-ins</p>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* ── RECEITA ACUMULADA ANUAL ── */}
          {subTab === 'receita' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Cabeçalho com seletor de ano e botões de export */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <p style={{ ...S.label, color: '#666', margin: 0 }}>RECEITA MENSAL</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button onClick={() => setReceitaYear(y => y - 1)} style={{ background: 'none', border: '1px solid #333', color: '#888', padding: '0.1rem 0.4rem', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem' }}>‹</button>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#FFF', minWidth: '2.8rem', textAlign: 'center' }}>{receitaYear}</span>
                    <button onClick={() => setReceitaYear(y => Math.min(y + 1, now.getFullYear()))} disabled={receitaYear >= now.getFullYear()} style={{ background: 'none', border: '1px solid #333', color: receitaYear >= now.getFullYear() ? '#333' : '#888', padding: '0.1rem 0.4rem', cursor: receitaYear >= now.getFullYear() ? 'not-allowed' : 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem' }}>›</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button onClick={() => exportReceitaXLSX(receitaYear, allPayments, alunos, now)} style={{ background: '#111', border: '1px solid #4A90D9', color: '#4A90D9', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.4rem 0.6rem', cursor: 'pointer' }}>📊 EXCEL</button>
                  <button onClick={() => exportReceitaPDF(receitaYear, allPayments, alunos, now, profile)} style={{ background: '#111', border: '1px solid #4CAF50', color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.4rem 0.6rem', cursor: 'pointer' }}>📄 PDF</button>
                </div>
              </div>
              {loadingExtra ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Carregando...</p>
              ) : (() => {
                const year = String(receitaYear);
                const today = now.toISOString().slice(0,10);
                const currentMonth = now.toISOString().slice(0,7);
                const allMonths = Array.from({ length: 12 }, (_,i) => `${year}-${String(i+1).padStart(2,'0')}`);
                const months = allMonths.filter(m => m <= currentMonth);
                const data = months.map(m => {
                  const mPayments = allPayments.filter((p:any) => (p.month || p.dueDate?.slice(0,7)) === m);
                  // Deduplicar por aluno: 1 pagamento por aluno por mês (o mais recente)
                  const byStudent = new Map<string,any>();
                  mPayments.forEach((p:any) => {
                    const existing = byStudent.get(p.studentUid);
                    if (!existing || shouldReplaceFinancialPayment(existing, p)) byStudent.set(p.studentUid, p);
                  });
                  const deduped = Array.from(byStudent.values());
                  const cobrado = deduped.reduce((s:number,p:any) => s + (Number(p.amount)||0), 0);
                  const recebido = deduped.filter((p:any)=>p.status==='paid').reduce((s:number,p:any) => s + (Number(p.amount)||0), 0);
                  const inadimplente = deduped.filter((p:any)=>p.status==='overdue' || (p.status==='pending' && p.dueDate && p.dueDate < today)).reduce((s:number,p:any) => s + (Number(p.amount)||0), 0);
                  return { month: m, label: RELATORIO_MONTH_NAMES[parseInt(m.slice(5))-1].slice(0,3).toUpperCase(), cobrado, recebido, inadimplente };
                });
                const maxVal = Math.max(...data.map(d => d.cobrado), 1);
                const totalRecebido = data.reduce((s,d) => s + d.recebido, 0);
                const totalInadimplente = data.reduce((s,d) => s + d.inadimplente, 0);
                return (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ flex: 1, background: '#111', border: '1px solid #4CAF5033', padding: '0.75rem', textAlign: 'center' }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#4CAF50' }}>R$ {totalRecebido.toFixed(2)}</p>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', textTransform: 'uppercase' }}>RECEBIDO NO ANO</p>
                      </div>
                      <div style={{ flex: 1, background: '#111', border: '1px solid #CC000033', padding: '0.75rem', textAlign: 'center' }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#CC0000' }}>R$ {totalInadimplente.toFixed(2)}</p>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', textTransform: 'uppercase' }}>INADIMPLÊNCIA</p>
                      </div>
                    </div>
                    {data.map(d => (
                      <div key={d.month} style={{ ...S.card }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#FFF' }}>{d.label}</span>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#4CAF50' }}>R$ {d.recebido.toFixed(2)}</span>
                            {d.inadimplente > 0 && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#CC0000' }}>-R$ {d.inadimplente.toFixed(2)}</span>}
                          </div>
                        </div>
                        <div style={{ background: '#1A1A1A', height: '6px', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                          <div style={{ width: `${(d.cobrado/maxVal)*100}%`, height: '100%', background: '#333', position: 'absolute', top: 0, left: 0 }} />
                          <div style={{ width: `${(d.recebido/maxVal)*100}%`, height: '100%', background: '#4CAF50', position: 'absolute', top: 0, left: 0 }} />
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── ALUNOS SUMIDOS ── */}
          {subTab === 'sumidos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={S.label}>SEM CHECK-IN HÁ MAIS DE</span>
                <input type="number" min={7} max={90} value={sumidosDays} onChange={e => setSumidosDays(Number(e.target.value))}
                  style={{ width: '3.5rem', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.85rem', padding: '0.25rem 0.5rem', textAlign: 'center' }} />
                <span style={S.label}>DIAS</span>
              </div>
              {loadingExtra ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Carregando...</p>
              ) : (() => {
                const cutoff = new Date(now.getTime() - sumidosDays * 86400000).toISOString().slice(0,10);
                const lastByUid: Record<string, string> = {};
                allAttendance.forEach((a:any) => {
                  const uid = a.studentUid; const date = a.date || a.trainingDate || '';
                  if (!uid) return;
                  if (!lastByUid[uid] || date > lastByUid[uid]) lastByUid[uid] = date;
                });
                const sumidos = alunos.filter(a => a.enrollmentStatus === 'active').filter(a => {
                  const last = lastByUid[a.studentUid];
                  return !last || last < cutoff;
                }).sort((a,b) => {
                  const la = lastByUid[a.studentUid] || '0000-00-00';
                  const lb = lastByUid[b.studentUid] || '0000-00-00';
                  return la.localeCompare(lb);
                });
                if (sumidos.length === 0) return <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>✅ Nenhum aluno sumido</p>;
                return sumidos.map(a => {
                  const last = lastByUid[a.studentUid];
                  const daysAgo = last ? Math.floor((now.getTime() - new Date(last+'T00:00:00').getTime()) / 86400000) : null;
                  return (
                    <div key={a.enrollmentId} style={{ ...S.card, borderLeft: '3px solid #CC0000' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BELT_COLORS[a.belt] || '#888', border: '1px solid #333', flexShrink: 0 }} />
                          <div>
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase' }}>{a.studentName}</p>
                            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#555' }}>{a.studentEmail}</p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#CC0000' }}>{daysAgo !== null ? `${daysAgo} dias` : 'Nunca treinou'}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#555' }}>{last ? `Últ: ${last}` : 'sem registro'}</p>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* ── AULAS AVULSAS ── */}
          {subTab === 'avulsas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ ...S.label, color: '#666' }}>HISTÓRICO DE AULAS AVULSAS</p>
              {loadingExtra ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Carregando...</p>
              ) : (() => {
                if (dailyVisits.length === 0) return <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Nenhuma aula avulsa registrada</p>;
                const totalAvulsas = dailyVisits.length;
                const totalReceita = dailyVisits.reduce((s:number,v:any) => s + (Number(v.amount)||0), 0);
                const uniqueVisitors = new Set(dailyVisits.map((v:any) => v.requesterCpf || v.requesterName)).size;
                const recorrentes = dailyVisits.reduce((acc:Record<string,number>,v:any) => {
                  const key = v.requesterCpf || v.requesterName || 'desconhecido';
                  acc[key] = (acc[key]||0)+1; return acc;
                }, {});
                const recorrentesCount = Object.values(recorrentes).filter((c:any) => c > 1).length;
                return (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[
                        { label: 'TOTAL AULAS', value: String(totalAvulsas), color: accentColor },
                        { label: 'VISITANTES', value: String(uniqueVisitors), color: '#4A90D9' },
                        { label: 'RECORRENTES', value: String(recorrentesCount), color: '#FFD700' },
                        { label: 'RECEITA', value: `R$ ${totalReceita.toFixed(2)}`, color: '#4CAF50' },
                      ].map(stat => (
                        <div key={stat.label} style={{ flex: '1 1 calc(50% - 0.25rem)', background: '#111', border: `1px solid ${stat.color}33`, padding: '0.625rem', textAlign: 'center' }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: stat.color }}>{stat.value}</p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555', textTransform: 'uppercase' }}>{stat.label}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '300px', overflowY: 'auto' }}>
                      {dailyVisits.slice().sort((a:any,b:any) => (b.createdAtStr||'').localeCompare(a.createdAtStr||'')).map((v:any) => (
                        <div key={v.id} style={{ ...S.card }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#FFF', textTransform: 'uppercase' }}>{v.requesterName || 'Visitante'}</p>
                              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>{v.requesterBelt || ''}{v.requesterCpf ? ` · CPF: ${v.requesterCpf}` : ''}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              {v.amount > 0 && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#4CAF50' }}>R$ {Number(v.amount).toFixed(2)}</p>}
                              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#555' }}>{v.createdAtStr || ''}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ── FICHA PDF DO ALUNO ── */}
          {subTab === 'ficha' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ ...S.label, color: '#666' }}>EXPORTAR FICHA INDIVIDUAL DO ALUNO</p>
              {loadingExtra ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Carregando...</p>
              ) : enrollments.filter((e:any) => e.status === 'active').length === 0 ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '2rem' }}>Nenhum aluno ativo</p>
              ) : enrollments.filter((e:any) => e.status === 'active').map((enr: any) => {
                const memberPayments = allPayments.filter((p:any) => p.studentUid === enr.studentUid);
                const memberAttendance = allAttendance.filter((a:any) => a.studentUid === enr.studentUid);
                const memberPromos = promotions.filter((p:any) => p.studentUid === enr.studentUid);
                return (
                  <div key={enr.id} style={{ ...S.card }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BELT_COLORS[enr.studentBelt || 'Branca'] || '#888', border: '1px solid #333', flexShrink: 0 }} />
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase' }}>{enr.studentName}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>
                            {memberAttendance.length} treino{memberAttendance.length !== 1 ? 's' : ''} · {memberPromos.length} promoção{memberPromos.length !== 1 ? 'ões' : ''} · {memberPayments.filter((p:any)=>p.status==='paid').length} pgtos pagos
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => exportMemberPDF(
                          { ...enr, name: enr.studentName, email: enr.studentEmail, belt: enr.studentBelt || 'Branca', stripes: enr.studentStripes || 0 },
                          memberPayments, memberAttendance, memberPromos
                        )}
                        style={S.btn('#4A90D9')}>
                        📄 PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </>
      )}
    </div>
  );
}

// ── PromocaoTab ───────────────────────────────────────────────────────────────
// Critérios de promoção configuráveis por faixa + alerta de prontidão

const PROMO_BELTS_ORDER = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];

interface PromotionCriteria {
  belt: string;
  minTrainings: number;
  minMonths: number;
  minAge?: number;
  notes: string;
}

interface PromocaoTabProps {
  user: any;
  profile: any;
  members: Member[];
  accentColor: string;
}

function PromocaoTab({ user, profile, members, accentColor }: PromocaoTabProps) {
  const [criteria, setCriteria] = useState<PromotionCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [readyAlerts, setReadyAlerts] = useState<{ member: Member; nextBelt: string; trainings: number; monthsInBelt: number; criteria: PromotionCriteria }[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [editingBelt, setEditingBelt] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PromotionCriteria>>({});

  // Carregar critérios salvos
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        // Criteria stored locally via user profile
        const userData = await api.users.get(user.uid);
        const saved = (userData as any).promotionCriteria;
        if (saved) {
          setCriteria(saved);
        } else {
          // Defaults baseados no padrão IBJJF
          setCriteria([
            { belt: 'Branca', minTrainings: 50,  minMonths: 6,  notes: '' },
            { belt: 'Azul',   minTrainings: 100, minMonths: 12, notes: '' },
            { belt: 'Roxa',   minTrainings: 200, minMonths: 18, notes: '' },
            { belt: 'Marrom', minTrainings: 300, minMonths: 24, notes: '' },
            { belt: 'Preta',  minTrainings: 500, minMonths: 36, notes: '' },
          ]);
        }
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  // Calcular alertas de prontidão
  useEffect(() => {
    if (!user || !members.length || !criteria.length) return;
    const calcAlerts = async () => {
      setLoadingAlerts(true);
      try {
        const alerts: typeof readyAlerts = [];
        for (const m of members) {
          if (!m.uid) continue;
          const currentBeltIdx = PROMO_BELTS_ORDER.indexOf(m.belt || 'Branca');
          if (currentBeltIdx < 0 || currentBeltIdx >= PROMO_BELTS_ORDER.length - 1) continue;
          const nextBelt = PROMO_BELTS_ORDER[currentBeltIdx + 1];
          const crit = criteria.find(c => c.belt === (m.belt || 'Branca'));
          if (!crit) continue;

          // Buscar treinos do aluno
          const trnData = await api.trainings.list(m.uid);
          const totalTrainings = (trnData as any[]).length;

          // Calcular meses na faixa atual via promotions API
          const promoData = await api.promotions.list({ studentUid: m.uid });
          let monthsInBelt = 999;
          if ((promoData as any[]).length > 0) {
            const sortedPromos = (promoData as any[]).sort((a: any, b: any) =>
              new Date(b.promotedAt || b.createdAt || 0).getTime() - new Date(a.promotedAt || a.createdAt || 0).getTime()
            );
            const lastDate = new Date(sortedPromos[0].promotedAt || sortedPromos[0].createdAt);
            monthsInBelt = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
          }

          if (totalTrainings >= crit.minTrainings && monthsInBelt >= crit.minMonths) {
            alerts.push({ member: m, nextBelt, trainings: totalTrainings, monthsInBelt, criteria: crit });
          }
        }
        setReadyAlerts(alerts);
      } catch { /* silencioso */ }
      finally { setLoadingAlerts(false); }
    };
    calcAlerts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, members, criteria]);

  const handleSaveCriteria = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await api.users.update(user.uid, { promotionCriteria: criteria } as any);
      toast.success('Critérios salvos!');
      setEditingBelt(null);
    } catch {
      toast.error('Erro ao salvar critérios');
    } finally {
      setSaving(false);
    }
  };

  const handleEditBelt = (c: PromotionCriteria) => {
    setEditingBelt(c.belt);
    setEditForm({ ...c });
  };

  const handleSaveEdit = () => {
    setCriteria(prev => prev.map(c => c.belt === editingBelt ? { ...c, ...editForm } as PromotionCriteria : c));
    setEditingBelt(null);
  };

  const handleAddBelt = () => {
    const existing = criteria.map(c => c.belt);
    const next = PROMO_BELTS_ORDER.find(b => !existing.includes(b));
    if (!next) return;
    setCriteria(prev => [...prev, { belt: next, minTrainings: 100, minMonths: 12, notes: '' }]);
  };

  const S2 = {
    label: { fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.25rem' },
    input: { width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' as const },
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase' }}>CARREGANDO...</div>;

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF', margin: 0 }}>🥋 CRITÉRIOS DE PROMOÇÃO</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', margin: '0.25rem 0 0' }}>Configure os requisitos mínimos por faixa</p>
        </div>
        <button onClick={handleSaveCriteria} disabled={saving}
          style={{ background: saving ? '#333' : accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.625rem 1rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'SALVANDO...' : '💾 SALVAR'}
        </button>
      </div>

      {/* Alertas de prontidão */}
      {loadingAlerts ? (
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', color: '#555', textTransform: 'uppercase' }}>Calculando prontidão dos alunos...</p>
        </div>
      ) : readyAlerts.length > 0 ? (
        <div style={{ background: '#0A1A0A', border: `1px solid ${accentColor}`, padding: '1rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: accentColor, marginBottom: '0.75rem' }}>
            🔔 {readyAlerts.length} ALUNO{readyAlerts.length > 1 ? 'S' : ''} PRONTO{readyAlerts.length > 1 ? 'S' : ''} PARA PROMOVER
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {readyAlerts.map(({ member, nextBelt, trainings, monthsInBelt, criteria: crit }) => (
              <div key={member.uid} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: BELT_COLORS[member.belt || 'Branca'] || '#888', border: '1px solid #333', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>{member.name}</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#666', margin: '0.15rem 0 0' }}>
                      {trainings} treinos (mín. {crit.minTrainings}) · {monthsInBelt} meses na faixa (mín. {crit.minMonths})
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BELT_COLORS[member.belt || 'Branca'] || '#888', border: '1px solid #333' }} />
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555' }}>→</span>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BELT_COLORS[nextBelt] || '#888', border: '1px solid #333' }} />
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', color: '#CCC', textTransform: 'uppercase' }}>{nextBelt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', color: '#555', textTransform: 'uppercase' }}>✓ Nenhum aluno atingiu os critérios ainda</p>
        </div>
      )}

      {/* Lista de critérios por faixa */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {criteria.map(c => (
          <div key={c.belt} style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
            {editingBelt === c.belt ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: BELT_COLORS[c.belt] || '#888', border: '1px solid #333' }} />
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>FAIXA {(c.belt || '').toUpperCase()}</p>
                </div>
              <div className="prof-panel-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <p style={S2.label}>TREINOS MÍNIMOS</p>
                    <input type="number" value={editForm.minTrainings ?? ''} onChange={e => setEditForm(f => ({ ...f, minTrainings: Number(e.target.value) }))} style={S2.input} />
                  </div>
                  <div>
                    <p style={S2.label}>MESES MÍNIMOS NA FAIXA</p>
                    <input type="number" value={editForm.minMonths ?? ''} onChange={e => setEditForm(f => ({ ...f, minMonths: Number(e.target.value) }))} style={S2.input} />
                  </div>
                </div>
                <div>
                  <p style={S2.label}>OBSERVAÇÕES</p>
                  <input type="text" value={editForm.notes ?? ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ex: Dominar guarda fechada, raspagem..." style={S2.input} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setEditingBelt(null)} style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.5rem', cursor: 'pointer' }}>CANCELAR</button>
                  <button onClick={handleSaveEdit} style={{ flex: 2, background: accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.5rem', cursor: 'pointer' }}>✓ CONFIRMAR</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: BELT_COLORS[c.belt] || '#888', border: '1px solid #333', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>FAIXA {(c.belt || '').toUpperCase()}</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555', margin: '0.15rem 0 0' }}>
                      {c.minTrainings} treinos mínimos · {c.minMonths} meses na faixa
                      {c.notes ? ` · ${c.notes}` : ''}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button onClick={() => handleEditBelt(c)} style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.375rem 0.625rem', cursor: 'pointer' }}>✏️ EDITAR</button>
                  <button onClick={() => setCriteria(prev => prev.filter(x => x.belt !== c.belt))} style={{ background: '#1A0000', border: '1px solid #3A0000', color: '#CC3333', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.375rem 0.5rem', cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Botão adicionar faixa */}
      {criteria.length < PROMO_BELTS_ORDER.length && (
        <button onClick={handleAddBelt} style={{ background: 'none', border: `1px dashed ${accentColor}40`, color: accentColor, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.75rem', cursor: 'pointer', width: '100%' }}>
          + ADICIONAR FAIXA
        </button>
      )}

    </div>
  );
}

// ─── AgendaTab ───────────────────────────────────────────────────────────────
function AgendaTab({ professorUid, accentColor }: { professorUid: string; accentColor: string }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.bookedSlots.list({ professorUid }) as any[];
      setBookings(list);
    } catch { setBookings([]); }
    setLoading(false);
  }, [professorUid]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
      await api.bookedSlots.update(id, { status: 'cancelled' });
      toast.success('Agendamento cancelado');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao cancelar');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0 1rem 2rem' }}>
      <div style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: '0.75rem' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF' }}>📅 AGENDA DE AULAS</p>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', marginTop: '0.125rem' }}>Aulas agendadas pelos alunos nos seus horários disponíveis</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
      ) : bookings.length === 0 ? (
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUMA AULA AGENDADA</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444', marginTop: '0.5rem' }}>Quando um aluno agendar uma aula, ela aparecerá aqui.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {bookings.map(b => (
            <div key={b.id} style={{ background: '#111', border: `1px solid ${b.status === 'cancelled' ? '#3A0000' : '#1E1E1E'}`, borderLeft: `3px solid ${b.status === 'cancelled' ? '#CC0000' : accentColor}`, padding: '0.875rem', opacity: b.status === 'cancelled' ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', color: '#FFF' }}>
                    {b.className || 'Aula'} — {b.studentName || 'Aluno'}
                  </p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: accentColor, marginTop: '0.15rem' }}>
                    📅 {new Date(b.date + 'T00:00:00').toLocaleDateString('pt-BR')} ⏰ {b.time}
                  </p>
                  {b.notes && (
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>📝 {b.notes}</p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.15rem 0.4rem', background: b.status === 'confirmed' ? '#0A1A0A' : '#1A0000', color: b.status === 'confirmed' ? '#4CAF50' : '#CC0000', border: `1px solid ${b.status === 'confirmed' ? '#4CAF50' : '#CC0000'}` }}>
                    {b.status === 'confirmed' ? 'CONFIRMADO' : 'CANCELADO'}
                  </span>
                  {b.status === 'confirmed' && (
                    <button
                      onClick={() => handleCancel(b.id)}
                      style={{ background: 'transparent', border: '1px solid #CC0000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                    >
                      CANCELAR
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
