// BJJRats PWA — Academy Screen
// Design: Dark Modern — Glassmorphism + BJJ
// Feed da academia, eventos, desafios, membros, painel admin
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { tabVariant, tabTransition } from '@/lib/animations';
import { BELT_COLORS } from '@/lib/bjjrats-constants';
import api from '@/lib/api';
import { toast } from 'sonner';
import AcademySearch from './AcademySearch';
import RankingList from '@/components/RankingList';
import { getEventLocationLabel } from '@/lib/eventLocation';
import { AlertTriangle, Loader2, LogOut, X } from 'lucide-react';

type AcademyTab = 'feed' | 'events' | 'challenges' | 'members' | 'ranking' | 'horarios' | 'financeiro';

interface AcademyPost {
  id: string;
  uid: string;
  authorName: string;
  authorPhotoURL?: string | null;
  authorBelt?: string;
  content?: string;   // campo legado
  text?: string;      // campo salvo pelo ProfessorPanel
  type: string;
  photoURL?: string;
  pinned?: boolean;
  likes?: string[];
  commentCount?: number;
  createdAt?: any;
  eventDate?: string;
  eventTime?: string;
  eventType?: string;
  feedTarget?: string;
  academyId?: string;
  academyName?: string;
  isAcademyPost?: boolean;
}

interface PostComment {
  id: string;
  uid: string;
  authorName: string;
  authorBelt: string;
  authorPhotoURL?: string;
  text: string;
  createdAt?: any;
}

interface AcademyEvent {
  id: string;
  uid: string;
  title: string;
  type: string;
  date: string;
  time?: string;
  duration?: string;
  description?: string;
  createdAt?: any;
  registrations?: string[]; // array de UIDs inscritos
  registrationNames?: Record<string, string>; // uid -> nome
  registrationBelts?: Record<string, string>; // uid -> faixa
  slots?: number;
  location?: string;
  locationCep?: string;
  locationAddress?: string;
  locationNumber?: string;
  locationNeighborhood?: string;
  locationCity?: string;
  locationState?: string;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  price?: string;
}

interface AcademyChallenge {
  id: string;
  creatorUid?: string;
  academyId?: string;
  title: string;
  description?: string;
  target?: number;
  unit?: string;
  startDate?: string;
  endDate?: string;
  mediaUrl?: string;
  participants?: any[];  // [{uid, progress}]
  createdAt?: any;
}

interface Member {
  uid: string;
  name: string;
  role?: string;
  belt: string;
  stripes?: number;
  xp?: number;
  totalTrainings?: number;
  photo?: string | null;
  athleteType?: string;
  isAcademyAdmin?: boolean;
}

const EVENT_TYPES = [
  { id: 'seminario', label: 'Seminário', color: '#0D9E6E' },
  { id: 'openmat', label: 'Open Mat', color: '#1A6ECC' },
  { id: 'competicao', label: 'Competição', color: '#CC8800' },
  { id: 'social', label: 'Social', color: '#CC0000' },
];

const POST_TYPE_COLORS: Record<string, string> = {
  aviso: '#CC8800', evento: '#1A6ECC', desafio: '#CC0000',
  faixa: '#FFD700', post: '#444',
};
const POST_TYPE_LABELS: Record<string, string> = {
  aviso: '📢 AVISO', evento: '📅 EVENTO', desafio: '⚔️ DESAFIO',
  faixa: '🥋 PROMOÇÃO', post: '💬 POST',
};


// ─── Interfaces Financeiro ───────────────────────────────────────────────────
interface FinPayment {
  id: string;
  professorUid: string;
  studentUid: string;
  studentName: string;
  amount: number;
  dueDate: { seconds: number };
  paidAt: { seconds: number } | null;
  status: 'pending' | 'paid' | 'overdue' | 'suspended';
  pixLink?: string;
  createdAt: { seconds: number };
}
interface FinEnrollment {
  id: string;
  professorUid: string;
  professorName: string;
  academyName: string;
  monthlyFee: number;
  dueDay: number;
  status: 'active' | 'suspended' | 'cancelled' | 'rejected';
  pixKey?: string;
}
function isOpenEnrollmentStatus(status: FinEnrollment['status'] | string | null | undefined): boolean {
  const normalized = String(status || '').toLowerCase();
  return normalized !== 'cancelled' && normalized !== 'rejected';
}
const FIN_STATUS_CONFIG = {
  pending:          { label: 'PENDENTE',   color: '#FF8C00', bg: '#1A0F00' },
  overdue:          { label: 'ATRASADO',   color: '#CC0000', bg: '#1A0000' },
  paid:             { label: 'PAGO',       color: '#4CAF50', bg: '#0A1A0A' },
  pending_approval: { label: 'AGUARDANDO', color: '#1A6ECC', bg: '#0A1020' },
  suspended:        { label: 'SUSPENSO',   color: '#888',    bg: '#111' },
} as const;
function finFormatDate(ts: { seconds: number } | string | null): string {
  if (!ts) return '—';
  const date = typeof ts === 'string' ? new Date(ts + 'T00:00:00') : new Date(ts.seconds * 1000);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}
function finFormatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Academy() {
  const { user, profile, refreshProfile, updateProfileData } = useAuth();
  const [activeTab, setActiveTab] = useState<AcademyTab>('feed');
  const [showSearch, setShowSearch] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [unlinkingAcademy, setUnlinkingAcademy] = useState(false);
  // isAdmin = dono de academia/professor com permissao de gestao
  const isAdmin = profile?.role === 'academy' || profile?.isAcademyAdmin === true || profile?.role === 'professor';
  // Professor usa seu próprio UID como academyId; aluno usa o academyId do perfil
  const academyId = isAdmin ? (user?.uid || null) : (profile?.academyId || null);
  const canUnlinkAcademy = !isAdmin && !!user?.uid && !!profile?.academyId;

  // Feed
  const [posts, setPosts] = useState<AcademyPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Events
  const [events, setEvents] = useState<AcademyEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Challenges
  const [challenges, setChallenges] = useState<AcademyChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);

  // Members
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Financeiro (aluno)
  const [finPayments, setFinPayments] = useState<FinPayment[]>([]);
  const [finEnrollments, setFinEnrollments] = useState<FinEnrollment[]>([]);
  const [finLoading, setFinLoading] = useState(false);
  const [finFilter, setFinFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  // Badge de alerta financeiro
  const finOverdue = finPayments.filter(p => p.status === 'overdue').length;
  const finPending = finPayments.filter(p => p.status === 'pending').length;
  const finAlert = finOverdue > 0 ? 'overdue' : finPending > 0 ? 'pending' : null;

  // Asaas status
  const [hasAsaas, setHasAsaas] = useState<boolean | null>(null);
  const [finReceiptLoading, setFinReceiptLoading] = useState<string | null>(null);

  // Professor requests (aluno solicita vínculo a professor particular)
  const [profRequests, setProfRequests] = useState<Set<string>>(new Set());
  const [profReqLoading, setProfReqLoading] = useState<Record<string, boolean>>({});

  // Comments
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, PostComment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [postingComment, setPostingComment] = useState<string | null>(null);

  // Student post modal
  const [showStudentPostModal, setShowStudentPostModal] = useState(false);

  // Admin modals
  const [showAvisoModal, setShowAvisoModal] = useState(false);
  const [showEventoModal, setShowEventoModal] = useState(false);
  const [showDesafioModal, setShowDesafioModal] = useState(false);
  const [showFaixaModal, setShowFaixaModal] = useState(false);
  const [membersSubTab, setMembersSubTab] = useState<'alunos' | 'professores'>('alunos');

  // ─── Load Feed (onSnapshot para tempo real) ─────────────────────────────────────────────────
  const sortPosts = (docs: AcademyPost[]) => {
    return [...docs].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const ta = (a as any).createdAt?.seconds || (a as any).createdAt?.toMillis?.() / 1000 || 0;
      const tb = (b as any).createdAt?.seconds || (b as any).createdAt?.toMillis?.() / 1000 || 0;
      return tb - ta;
    });
  };
  // Mescla posts de ambas as coleções normalizando campos
  const mergeAndNormalize = (professorDocs: AcademyPost[], studentDocs: AcademyPost[]): AcademyPost[] => {
    const normalize = (d: AcademyPost): AcademyPost => ({
      ...d,
      // Normalizar authorPhoto → authorPhotoURL
      authorPhotoURL: (d as any).authorPhotoURL || (d as any).authorPhoto || null,
      // Normalizar content → text
      text: (d as any).text || (d as any).content || '',
      content: (d as any).text || (d as any).content || '',
    });
    const all = [...professorDocs.map(normalize), ...studentDocs.map(normalize)];
    // Deduplicar por id
    const seen = new Set<string>();
    return all.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
  };

  const loadPosts = useCallback(() => {
    if (!academyId) { setPostsLoading(false); return () => {}; }
    setPostsLoading(true);
    api.posts.list({ academyId })
      .then((docs: any[]) => {
        const normalize = (d: any): AcademyPost => ({
          ...d,
          authorPhotoURL: d.authorPhotoURL || d.authorPhoto || null,
          text: d.text || d.content || '',
          content: d.text || d.content || '',
        });
        const sorted = docs.map(normalize).sort((a: any, b: any) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const ta = (a as any).createdAt?.seconds || 0;
          const tb = (b as any).createdAt?.seconds || 0;
          return tb - ta;
        });
        setPosts(sorted);
      })
      .catch(() => setPosts([]))
      .finally(() => setPostsLoading(false));
    return () => {};
  }, [academyId]);
  // ─── Load Events ─────────────────────────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    if (!academyId) { setEventsLoading(false); return; }
    setEventsLoading(true);
    try {
      const docs = await api.events.list({ academyId }) as any[];
      docs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setEvents(docs);
    } catch { setEvents([]); }
    finally { setEventsLoading(false); }
  }, [academyId]);

  // ─── Load Challenges ─────────────────────────────────────────────────────────
  const loadChallenges = useCallback(async () => {
    if (!academyId) { setChallengesLoading(false); return; }
    setChallengesLoading(true);
    try {
      const docs = await api.challenges.list({ academyId }) as any[];
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setChallenges(docs);
    } catch { setChallenges([]); }
    finally { setChallengesLoading(false); }
  }, [academyId]);

  // ─── Load Members ────────────────────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    if (!academyId) { setMembersLoading(false); return; }
    setMembersLoading(true);
    try {
      const docs = await api.users.list({ academyId }) as any[];
      const members = docs.map((d: any) => ({ uid: d.id, ...d } as Member));
      members.sort((a: Member, b: Member) => (b.xp || 0) - (a.xp || 0));
      setMembers(members);
    } catch { setMembers([]); }
    finally { setMembersLoading(false); }
  }, [academyId]);

  // ─── Professor Requests ──────────────────────────────────────────────────────
  const loadProfRequests = useCallback(async () => {
    if (!user || !profile?.academyId) return;
    try {
      const rows = await api.professorRequests.list({ studentUid: user.uid }) as any[];
      setProfRequests(new Set(rows.filter((r: any) => r.status === 'pending').map((r: any) => r.professorUid)));
    } catch { /* ignore */ }
  }, [user, profile?.academyId]);

  const handleRequestProfessor = async (professorUid: string) => {
    if (!user) return;
    setProfReqLoading(prev => ({ ...prev, [professorUid]: true }));
    try {
      await api.professorRequests.create({ professorUid });
      setProfRequests(prev => new Set(prev).add(professorUid));
      toast.success('Solicitação enviada!');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar solicitação');
    } finally {
      setProfReqLoading(prev => ({ ...prev, [professorUid]: false }));
    }
  };

  const parseDueDate = (d: any): Date | null => {
    if (!d) return null;
    const raw = typeof d === 'string' ? d : (d.seconds ? new Date(d.seconds * 1000).toISOString().split('T')[0] : null);
    if (!raw) return null;
    return new Date(raw + 'T00:00:00');
  };

  const loadFinanceiro = useCallback(async () => {
    if (!user) return;
    setFinLoading(true);
    try {
      const enrollList = await api.enrollments.list({ studentUid: user.uid }) as any[];
      // Filtra só matrículas da academia atual
      setFinEnrollments(enrollList.filter((e: any) => e.professorUid === profile?.academyId));
      const payList = await api.payments.list({ studentUid: user.uid }) as any[];
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const processed: FinPayment[] = payList
        .filter((p: any) => {
          // Só mensalidades da academia (professor da academia), ignora professor particular
          if (p.professorUid !== profile?.academyId) return false;
          const due = parseDueDate(p.dueDate);
          if (p.status !== 'paid' && due && due < ninetyDaysAgo) return false;
          return true;
        })
        .sort((a: any, b: any) => {
          const aDate = parseDueDate(a.dueDate);
          const bDate = parseDueDate(b.dueDate);
          return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
        })
        // Dedup: mantém apenas 1 pagamento por professor+data
        .filter((p: any, _i: number, arr: any[]) => {
          const key = `${p.professorUid}__${typeof p.dueDate === 'string' ? p.dueDate : (p.dueDate?.seconds || '')}`;
          const first = arr.findIndex((x: any) => {
            const xk = `${x.professorUid}__${typeof x.dueDate === 'string' ? x.dueDate : (x.dueDate?.seconds || '')}`;
            return xk === key;
          });
          return _i === first;
        })
        .map((data: any) => {
          if (data.status === 'pending' && data.dueDate) {
            const due = parseDueDate(data.dueDate);
            if (due && due < now) data.status = 'overdue';
          }
          return data;
        });
      setFinPayments(processed);
      // Verifica Asaas
      if (profile?.academyId) {
        try {
          const status = await api.payments.asaasStatus(profile.academyId);
          setHasAsaas(status.configured);
        } catch { setHasAsaas(false); }
      }
    } catch (err) {
      console.error('[Academy] Erro ao carregar financeiro:', err);
    } finally {
      setFinLoading(false);
    }
  }, [user]);

  const handleUnlinkAcademy = async () => {
    if (!user || !profile?.academyId) return;
    setUnlinkingAcademy(true);
    try {
      const enrollments = await api.enrollments.list({ studentUid: user.uid }) as any[];
      const openEnrollments = enrollments.filter((enrollment) => {
        const status = String(enrollment.status || '').toLowerCase();
        return enrollment.professorUid === profile.academyId && isOpenEnrollmentStatus(status);
      });
      await Promise.all(openEnrollments.map((enrollment) => (
        api.enrollments.update(enrollment.id, { status: 'cancelled' })
      )));
      await updateProfileData({ academyId: '', academy: '', professor: '' });
      await refreshProfile();
      setFinEnrollments(prev => prev.map(enrollment => (
        enrollment.professorUid === profile.academyId ? { ...enrollment, status: 'cancelled' } : enrollment
      )));
      setShowUnlinkConfirm(false);
      toast.success('Você saiu da academia. Mensalidades em aberto continuam no financeiro.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao desvincular da academia');
    } finally {
      setUnlinkingAcademy(false);
    }
  };

  useEffect(() => {
    const unsub = loadPosts();
    return () => { if (unsub) unsub(); };
  }, [loadPosts]);

  // Pull to refresh (onSnapshot já atualiza automaticamente, mas permite feedback visual)
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    // Re-trigger listener
    loadPosts();
    setTimeout(() => {
      setRefreshing(false);
      setPullDistance(0);
      toast.success('Feed atualizado!');
    }, 800);
  }, [refreshing, loadPosts]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const container = feedContainerRef.current;
    if (!container || container.scrollTop > 0) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && diff < 150) setPullDistance(diff);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60) handleRefresh();
    else setPullDistance(0);
  }, [pullDistance, handleRefresh]);
  useEffect(() => {
    if (activeTab === 'events') loadEvents();
    if (activeTab === 'challenges') loadChallenges();
    if (activeTab === 'members') { loadMembers(); loadProfRequests(); }
    if (activeTab === 'financeiro') loadFinanceiro();
  }, [activeTab, loadEvents, loadChallenges, loadMembers, loadFinanceiro]);

  // ─── Join/Leave Challenge ────────────────────────────────────────────────────
  const handleJoinChallenge = async (challenge: AcademyChallenge) => {
    if (!user) return;
    const participants: any[] = challenge.participants || [];
    const joined = participants.some((p: any) => (typeof p === 'string' ? p : p.uid) === user.uid);

    let updated: any[];
    if (joined) {
      // Sai do desafio
      updated = participants.filter((p: any) => (typeof p === 'string' ? p : p.uid) !== user.uid);
    } else {
      // Entra no desafio
      updated = [...participants, { uid: user.uid, progress: 0 }];
    }

    try {
      await api.challenges.update(challenge.id, { participants: updated });
      setChallenges(prev => prev.map(c => c.id === challenge.id ? { ...c, participants: updated } : c));
      toast.success(joined ? 'Você saiu do desafio' : 'Você entrou no desafio!');
    } catch { toast.error('Erro ao atualizar desafio'); }
  };
  // ─── View Counter ────────────────────────────────────────────────────────────────
  const viewedPostsRef = useRef<Set<string>>(new Set());
    // view counting removed (no Firestore)

  // ─── Delete Post ─────────────────────────────────────────────────────────────────
  // Resolve a coleção correta de um post: tenta 'posts' primeiro, fallback 'academyPosts'
  const resolvePostCol = async (_postId: string): Promise<string> => 'posts';

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Excluir este post?')) return;
    try {
      await api.posts.delete(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post excluído');
    } catch { toast.error('Erro ao excluir'); }
  };

  const handlePin = async (post: AcademyPost) => {
    try {
      const newPinned = !post.pinned;
      await api.posts.update(post.id, { pinned: newPinned });
      setPosts(prev => {
        const updated = prev.map(p => p.id === post.id ? { ...p, pinned: newPinned } : p);
        return updated.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      });
      toast.success(newPinned ? 'Post fixado no topo' : 'Post desafixado');
    } catch { toast.error('Erro ao fixar post'); }
  };

  const handleLikePost = async (post: AcademyPost) => {
    if (!user) return;
    const likes = post.likes || [];
    const hasLiked = likes.includes(user.uid);
    const newLikes = hasLiked ? likes.filter(l => l !== user.uid) : [...likes, user.uid];
    try {
      await api.posts.update(post.id, { likes: newLikes });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: newLikes } : p));
    } catch { toast.error('Erro ao curtir post'); }
  };

  // ─── Comments ─────────────────────────────────────────────────────────────────
  const handleToggleComments = async (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) { next.delete(postId); }
      else {
        next.add(postId);
        if (!comments[postId]) handleLoadComments(postId);
      }
      return next;
    });
  };

  const handleLoadComments = async (postId: string) => {
    setLoadingComments(prev => new Set(prev).add(postId));
    try {
      const list = await api.posts.getComments(postId) as PostComment[];
      list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setComments(prev => ({ ...prev, [postId]: list }));
      // Sincronizar commentCount com o número real
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: list.length } : p));
    } catch { /* silencioso */ }
    finally { setLoadingComments(prev => { const n = new Set(prev); n.delete(postId); return n; }); }
  };

  const handlePostComment = async (post: AcademyPost) => {
    const text = (commentText[post.id] || '').trim();
    if (!text || !user || !profile) return;
    setPostingComment(post.id);
    try {
      const commentData = {
        uid: user.uid,
        authorName: profile.name || 'Atleta',
        authorBelt: profile.belt || 'Branca',
        authorPhotoURL: profile.photo || undefined,
        text,
        createdAt: { seconds: Date.now() / 1000 },
      };
      const newComment = await api.posts.addComment(post.id, { content: text }) as any;
      const newCount = (post.commentCount || 0) + 1;
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, commentCount: newCount } : p));
      setComments(prev => ({
        ...prev,
        [post.id]: [...(prev[post.id] || []), { id: newComment.id || Date.now().toString(), ...commentData }],
      }));
      setCommentText(prev => ({ ...prev, [post.id]: '' }));
      // Notificar autor do post
      const postAuthorUid = post.uid;
      if (postAuthorUid && postAuthorUid !== user.uid) {
        try {
          await api.notifications.create({
            toUid: postAuthorUid,
            type: 'comment',
            title: 'Novo comentário',
            message: `${profile.name || 'Alguém'} comentou no seu post: "${text.substring(0, 40)}"`,
            read: false,
          });
        } catch { /* silencioso */ }
      }
    } catch { toast.error('Erro ao comentar'); }
    finally { setPostingComment(null); }
  };

  const { loading: authLoading } = useAuth();
  const openFinEnrollments = finEnrollments.filter(enroll =>
    isOpenEnrollmentStatus(enroll.status) && enroll.professorUid === profile?.academyId
  );

  if (showSearch) {
    return (
      <AcademySearch
        onBack={() => setShowSearch(false)}
        onLinked={async () => { await refreshProfile(); setShowSearch(false); }}
      />
    );
  }

  // Aguardar o profile carregar antes de mostrar tela "SEM ACADEMIA"
  if (!academyId) {
    if (authLoading || !profile) {
      return (
        <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#444', letterSpacing: '0.1em' }}>CARREGANDO...</p>
        </div>
      );
    }
    return (
      <AcademySearch
        onLinked={async () => { await refreshProfile(); }}
      />
    );
  }

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* Header */}
      <div className="bjj-header" style={{ background: '#0A0A0A', borderBottom: '1px solid #1E1E1E', padding: '1rem 1.25rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', minWidth: 0, flex: 1 }}>
            {/* Logo da academia */}
            {(() => {
              const logoUrl = (profile as any)?.academyLogoUrl || (profile as any)?.academyLogo || '';
              return logoUrl ? (
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #CC0000', flexShrink: 0, background: '#1A0000' }}>
                  <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid #CC0000', background: '#1A0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#CC0000' }}>
                    {(profile?.academy || 'A').substring(0, 2).toUpperCase()}
                  </span>
                </div>
              );
            })()}
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 className="bjj-header-title" style={{ lineHeight: 1 }}>
                {profile?.academy || 'ACADEMIA'}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.1em', margin: 0 }}>
                  {members.length > 0 ? `${members.length} membros` : 'Sua academia'}
                </p>
                {canUnlinkAcademy && (
                  <button
                    onClick={() => setShowUnlinkConfirm(true)}
                    disabled={unlinkingAcademy}
                    title="Desvincular desta academia"
                    style={{
                      height: '28px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      background: unlinkingAcademy ? '#121212' : '#160A0A',
                      border: `1px solid ${unlinkingAcademy ? '#2A2A2A' : '#3A1515'}`,
                      color: unlinkingAcademy ? '#666' : '#E45A5A',
                      borderRadius: '6px',
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontWeight: 900,
                      fontSize: '0.68rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      padding: '0 0.65rem',
                      cursor: unlinkingAcademy ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: unlinkingAcademy ? 'none' : 'inset 0 0 0 1px rgba(255,255,255,0.03)',
                      transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease',
                    }}
                  >
                    {unlinkingAcademy ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <LogOut size={13} strokeWidth={2.5} />}
                    {unlinkingAcademy ? 'Saindo' : 'Sair'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any, scrollbarWidth: 'none' as any }}>
          {(['feed', 'horarios', 'events', 'challenges', 'members', 'ranking', 'financeiro'] as AcademyTab[]).map(tab => {
            const labels: Record<AcademyTab, string> = { feed: 'FEED', horarios: '\uD83D\uDD50 HOR\u00c1RIOS', events: 'EVENTOS', challenges: 'DESAFIOS', members: 'MEMBROS', ranking: '\uD83C\uDFC6 RANKING', financeiro: '\uD83D\uDCB3 FINANCEIRO' };
            const isFinTab = tab === 'financeiro';
            const badgeColor = finAlert === 'overdue' ? '#CC0000' : '#FF8C00';
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: '0 0 auto', whiteSpace: 'nowrap', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.625rem 0.875rem', border: 'none', background: 'transparent', color: activeTab === tab ? '#CC0000' : '#555', borderBottom: activeTab === tab ? '2px solid #CC0000' : '2px solid transparent', cursor: 'pointer', transition: 'color 0.15s', position: 'relative' }}>
                {labels[tab]}
                {isFinTab && finAlert && (
                  <span style={{ position: 'absolute', top: '4px', right: '4px', width: '7px', height: '7px', borderRadius: '50%', background: badgeColor, display: 'block' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          variants={tabVariant}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={tabTransition}
        >      {/* ─── Feed Tab ───────────────────────────────────────────────────────────── */}
      {activeTab === 'feed' && (
        <div
          ref={feedContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="bjj-content"
        >
          {/* Pull to refresh indicator */}
          {pullDistance > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: `${Math.min(pullDistance, 80)}px`, overflow: 'hidden',
              transition: pullDistance === 0 ? 'height 0.2s ease' : 'none',
              color: pullDistance > 60 ? '#CC0000' : '#555',
              fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
              fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {pullDistance > 60 ? '↑ SOLTE PARA ATUALIZAR' : '↓ PUXE PARA ATUALIZAR'}
            </div>
          )}
          {refreshing && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0.75rem', gap: '0.5rem',
              color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>↻</span>
              ATUALIZANDO...
            </div>
          )}
          {/* Caixa de postagem para TODOS os membros */}
          <button
            onClick={() => setShowStudentPostModal(true)}
            className="bjj-card !border-[#2A2A2A] !text-[#555] !text-[0.875rem] !font-['Barlow'] !p-[0.875rem_1rem] !rounded-[2px] flex items-center gap-3 cursor-pointer text-left"
          >
            <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1A1A1A', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.875rem' }}>💬</span>
            <span>Compartilhe algo com a academia...</span>
          </button>

          {postsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
          ) : posts.length === 0 ? (
            <div className="bjj-card !text-center" style={{ padding: '2.5rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM POST AINDA</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444', marginTop: '0.5rem' }}>Seja o primeiro a postar algo para a academia!</p>
            </div>
          ) : (
            posts.map(post => {
              const postAny = post as any;
              const typeColor = POST_TYPE_COLORS[post.type] || '#444';
              const typeLabel = POST_TYPE_LABELS[post.type] || post.type;
              const date = post.createdAt?.seconds
                ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('pt-BR')
                : '';
              const beltColor = BELT_COLORS[post.authorBelt || postAny.authorBelt] || '#FFFFFF';
              const isTrainingPost = !!postAny.trainingData;
              // Normalizar campos: ProfessorPanel salva 'text' e 'authorPhotoURL'
              const postText = post.text || post.content || '';
              const authorPhoto = post.authorPhotoURL || postAny.authorPhoto || null;
              return (
                <div key={post.id} className="bjj-card" style={{ borderLeft: `3px solid ${isTrainingPost ? '#CC0000' : typeColor}` }}>
                  {/* Header: avatar + nome + badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${beltColor}`, background: beltColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {authorPhoto ? (
                          <img src={authorPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.6rem', color: beltColor }}>{(post.authorName || 'A').substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFFFFF', lineHeight: 1 }}>{post.authorName}</p>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: beltColor, textTransform: 'uppercase' }}>Faixa {postAny.authorBelt || 'Branca'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.55rem', textTransform: 'uppercase', padding: '0.1rem 0.35rem', border: `1px solid ${isTrainingPost ? '#CC0000' : typeColor}`, background: (isTrainingPost ? '#CC0000' : typeColor) + '20', color: isTrainingPost ? '#CC0000' : typeColor }}>
                        {isTrainingPost ? '🥋 TREINO' : typeLabel}
                      </span>
                      {post.pinned && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.6rem', color: '#CC8800' }}>📌</span>}
                      {isAdmin && (
                        <button onClick={() => handlePin(post)} title={post.pinned ? 'Desafixar' : 'Fixar'} style={{ background: 'transparent', border: 'none', color: post.pinned ? '#CC8800' : '#333', cursor: 'pointer', fontSize: '0.75rem', padding: '0.2rem' }}>📌</button>
                      )}
                      {(isAdmin || post.uid === user?.uid) && (
                        <button onClick={() => handleDeletePost(post.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '0.25rem' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#CC0000'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#333'; }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Foto do treino */}
                  {postAny.photoURL && (
                    <img src={postAny.photoURL} alt="foto" style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', marginBottom: '0.75rem', borderRadius: '2px' }} />
                  )}
                  {/* Conteúdo/texto */}
                  {postText && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#CCCCCC', lineHeight: 1.6, marginBottom: '0.5rem', whiteSpace: 'pre-line' }}>{postText}</p>}
                  {/* Dados do treino */}
                  {isTrainingPost && (
                    <div style={{ background: '#0A0A0A', border: '1px solid #CC000033', borderLeft: '3px solid #CC0000', padding: '0.625rem 0.75rem', marginBottom: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {[
                        { label: 'TIPO', value: postAny.trainingData.sessionType || '—' },
                        { label: 'DURAÇÃO', value: postAny.trainingData.duration ? `${postAny.trainingData.duration}min` : '—' },
                        { label: 'XP', value: postAny.trainingData.xp ? `+${postAny.trainingData.xp}` : '—' },
                        { label: 'DATA', value: postAny.trainingData.date || '—' },
                      ].map(stat => (
                        <div key={stat.label} style={{ minWidth: '60px' }}>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: stat.label === 'XP' ? '#CC0000' : '#FFF' }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* ── Ações: Like + Comentários (estilo redes sociais) ── */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.25rem' }}>
                    {(() => {
                      const hasLiked = user && (post.likes || []).includes(user.uid);
                      return (
                        <>
                          <button
                            onClick={() => handleLikePost(post)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.35rem',
                              padding: '0.25rem 0',
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill={hasLiked ? '#CC0000' : 'none'} stroke={hasLiked ? '#CC0000' : '#666'} strokeWidth="2">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: hasLiked ? '#CC0000' : '#666' }}>
                              {(post.likes || []).length > 0 ? (post.likes || []).length : 'Curtir'}
                            </span>
                          </button>

                          <button
                            onClick={() => handleToggleComments(post.id)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.35rem',
                              padding: '0.25rem 0',
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={expandedComments.has(post.id) ? '#0D9E6E' : '#666'} strokeWidth="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: expandedComments.has(post.id) ? '#0D9E6E' : '#666' }}>
                              {post.commentCount || 0}
                            </span>
                          </button>

                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#444' }}>
                              {(postAny.viewCount || (postAny.viewedBy || []).length || 0)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* ── Campo de comentário sempre visível ── */}
                  {user && (
                    <div style={{
                      display: 'flex', gap: '0.5rem', alignItems: 'center',
                      marginTop: '0.5rem', borderTop: '1px solid #1A1A1A', paddingTop: '0.5rem',
                    }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                        background: '#1A1A1A', border: '1px solid #333',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        {profile?.photo ? (
                          <img src={profile.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.6rem', color: '#666' }}>
                            {(profile?.name || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={commentText[post.id] || ''}
                        onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(post); } }}
                        placeholder="Escreva um comentário..."
                        style={{
                          flex: 1, background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '20px',
                          color: '#CCC', fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem',
                          padding: '0.45rem 0.75rem', outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => handlePostComment(post)}
                        disabled={postingComment === post.id || !(commentText[post.id] || '').trim()}
                        style={{
                          background: (commentText[post.id] || '').trim() ? '#CC0000' : '#1A1A1A',
                          border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                          cursor: (commentText[post.id] || '').trim() ? 'pointer' : 'default',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, opacity: (commentText[post.id] || '').trim() ? 1 : 0.4,
                        }}
                      >
                        {postingComment === post.id ? (
                          <div style={{ width: '14px', height: '14px', border: '2px solid #FFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3">
                            <line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  )}

                  {/* ── Lista de comentários (expansível) ── */}
                  {expandedComments.has(post.id) && (
                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid #1A1A1A', paddingTop: '0.5rem' }}>
                      {loadingComments.has(post.id) ? (
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#444', textAlign: 'center', padding: '0.5rem' }}>Carregando...</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {(comments[post.id] || []).map(c => {
                            const cBelt = BELT_COLORS[c.authorBelt] || '#FFFFFF';
                            return (
                              <div key={c.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <div style={{
                                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                                  border: `1.5px solid ${cBelt}`, background: cBelt + '15',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  overflow: 'hidden',
                                }}>
                                  {c.authorPhotoURL
                                    ? <img src={c.authorPhotoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.55rem', color: cBelt }}>{(c.authorName || 'A')[0].toUpperCase()}</span>
                                  }
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.15rem' }}>
                                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.72rem', color: '#DDD' }}>{c.authorName}</span>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cBelt }} />
                                  </div>
                                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#AAA', lineHeight: 1.4 }}>{c.text || c.content}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Events Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'events' && (
        <div className="bjj-content">
          {isAdmin && (
            <button onClick={() => setShowEventoModal(true)} className="bjj-btn-primary !bg-[#1A6ECC]">
              + CRIAR EVENTO
            </button>
          )}
          {eventsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
          ) : events.length === 0 ? (
            <div className="bjj-card !text-center" style={{ padding: '2.5rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM EVENTO</p>
            </div>
          ) : (
            events.map(event => {
              const evType = EVENT_TYPES.find(t => t.id === event.type) || EVENT_TYPES[0];
              const regs = event.registrations || [];
              const isRegistered = user ? regs.includes(user.uid) : false;
              const isFull = event.slots ? regs.length >= event.slots : false;
              const locationLabel = getEventLocationLabel(event);
              const handleToggleRegistration = async () => {
                if (!user || !profile) return;
                try {
                  if (isRegistered) {
                    const newRegs = (event.registrations || []).filter(id => id !== user.uid);
                    const updated = await api.events.update(event.id, { registrations: newRegs }) as any;
                    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, registrations: updated.registrations || newRegs, registrationNames: updated.registrationNames || e.registrationNames, registrationBelts: updated.registrationBelts || e.registrationBelts } : e));
                    toast.success('Inscrição cancelada');
                  } else {
                    if (isFull) { toast.error('Evento lotado!'); return; }
                    const newRegs = [...(event.registrations || []), user.uid];
                    const updated = await api.events.update(event.id, { registrations: newRegs }) as any;
                    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, registrations: updated.registrations || newRegs, registrationNames: updated.registrationNames || e.registrationNames, registrationBelts: updated.registrationBelts || e.registrationBelts } : e));
                    toast.success('Inscrição confirmada!');
                  }
                } catch (err: any) {
                  toast.error(err?.message || 'Erro ao atualizar inscrição');
                }
              };
              return (
                <div key={event.id} className="bjj-card" style={{ borderLeft: `3px solid ${evType.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.4rem', border: `1px solid ${evType.color}`, background: evType.color + '20', color: evType.color }}>
                      {evType.label}
                    </span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#888' }}>
                      {event.date} {event.time ? `· ${event.time}` : ''}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFFFFF', margin: 0 }}>{event.title}</h3>
                  {event.description && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', lineHeight: 1.5, margin: 0 }}>{event.description}</p>}
                  {locationLabel && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', color: '#555', margin: 0 }}>📍 {locationLabel}</p>}
                  {event.duration && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', color: '#555', margin: 0 }}>⏱ {event.duration}</p>}
                  {event.price && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', color: '#888', margin: 0 }}>💰 {event.price}</p>}

                  {/* Botão de inscrição */}
                  <button
                    onClick={handleToggleRegistration}
                    style={{
                      background: isRegistered ? '#0A2A1A' : isFull ? '#1A1A1A' : '#0A2A1A',
                      border: `1px solid ${isRegistered ? '#0D9E6E' : isFull ? '#333' : '#0D9E6E'}`,
                      color: isRegistered ? '#0D9E6E' : isFull ? '#444' : '#0D9E6E',
                      fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
                      fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                      padding: '0.5rem 0.875rem', cursor: isFull && !isRegistered ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                    }}
                  >
                    {isRegistered ? '✅ INSCRITO — CANCELAR INSCRIÇÃO' : isFull ? '🔒 VAGAS ESGOTADAS' : '📋 INSCREVER-SE'}
                    <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.65rem', color: '#555' }}>
                      {regs.length}{event.slots ? `/${event.slots}` : ''} inscrito{regs.length !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {/* Lista de inscritos */}
                  {regs.length > 0 && (
                    <div style={{ borderTop: '1px solid #1E1E1E', paddingTop: '0.625rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', textTransform: 'uppercase', color: '#444', letterSpacing: '0.05em', margin: 0 }}>INSCRITOS</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                        {regs.map(uid => {
                          const name = event.registrationNames?.[uid] || 'Atleta';
                          const belt = event.registrationBelts?.[uid] || 'Branca';
                          const beltColor = BELT_COLORS[belt] || '#FFFFFF';
                          return (
                            <div key={uid} style={{
                              display: 'flex', alignItems: 'center', gap: '0.25rem',
                              background: '#0A0A0A', border: `1px solid ${beltColor}33`,
                              padding: '0.2rem 0.5rem',
                            }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: beltColor, border: belt === 'Branca' ? '1px solid #444' : 'none', flexShrink: 0 }} />
                              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#CCC', fontWeight: 700 }}>{name.split(' ')[0]}</span>
                              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: beltColor, textTransform: 'uppercase' }}>{belt}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Challenges Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'challenges' && (
        <div className="bjj-content">

          {challengesLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
          ) : challenges.length === 0 ? (
            <div className="bjj-card !text-center" style={{ padding: '2.5rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM DESAFIO ATIVO</p>
            </div>
          ) : (
            challenges.map(challenge => {
              const participants: any[] = challenge.participants || [];
              const joined = user ? participants.some((p: any) => (typeof p === 'string' ? p : p.uid) === user.uid) : false;
              const count = participants.length;
              const target = challenge.target || 0;
              const unit = challenge.unit || 'treinos';
              const unitLabel = unit === 'treinos' ? 'treinos' : unit;
              const myProgress = joined ? (participants.find((p: any) => (typeof p === 'string' ? p : p.uid) === user.uid)?.progress ?? 0) : 0;
              const progressPct = target > 0 ? Math.min(100, Math.round((myProgress / target) * 100)) : 0;
              return (
                <div key={challenge.id} style={{ background: '#111', border: `1px solid ${joined ? '#CC0000' : '#1E1E1E'}`, padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFFFFF' }}>{challenge.title}</h3>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#CC0000' }}>{count} participantes</span>
                  </div>
                  {target > 0 && (
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.85rem', color: '#CCC', marginBottom: '0.25rem' }}>
                      ⚔️ Complete {target} {unitLabel}
                    </p>
                  )}
                  {challenge.description && (
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#666', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                      {challenge.description}
                    </p>
                  )}
                  {challenge.startDate && challenge.endDate && (
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', marginBottom: '0.5rem' }}>
                      📅 {challenge.startDate} → {challenge.endDate}
                    </p>
                  )}
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#FFD700', marginBottom: '0.5rem' }}>🏆 Recompensa: +30 XP</p>
                  {joined && target > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#888' }}>Seu progresso: {myProgress}/{target}</span>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: progressPct >= 100 ? '#4CAF50' : '#888' }}>{progressPct}%</span>
                      </div>
                      <div style={{ background: '#1E1E1E', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ background: progressPct >= 100 ? '#4CAF50' : '#CC0000', height: '100%', width: `${progressPct}%`, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}
                  {joined && progressPct >= 100 && (
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#4CAF50', textTransform: 'uppercase', marginBottom: '0.5rem' }}>✅ Desafio concluído! +30 XP</p>
                  )}
                  <button onClick={() => handleJoinChallenge(challenge)} style={{ background: joined ? '#1E1E1E' : '#CC0000', color: joined ? '#CC0000' : '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.5rem 1rem', border: `1px solid ${joined ? '#CC0000' : '#CC0000'}`, cursor: 'pointer', width: '100%' }}>
                    {joined ? 'SAIR DO DESAFIO' : 'PARTICIPAR'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Members Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {(() => {
              const alunoCount = members.filter(m => m.role !== 'professor' && !m.isAcademyAdmin).length;
              const profCount = members.filter(m => m.role === 'professor' || m.isAcademyAdmin).length;
              return (['alunos', 'professores'] as const).map(sub => (
                <button
                  key={sub}
                  onClick={() => setMembersSubTab(sub)}
                  style={{
                    flex: 1,
                    background: membersSubTab === sub ? '#CC0000' : '#111',
                    border: membersSubTab === sub ? 'none' : '1px solid #2A2A2A',
                    color: '#FFF',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>{sub === 'alunos' ? '🥋 ALUNOS' : '👨‍🏫 PROFESSORES'}</span>
                  <span style={{
                    background: membersSubTab === sub ? 'rgba(255,255,255,0.2)' : '#2A2A2A',
                    color: membersSubTab === sub ? '#FFF' : '#777',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '999px',
                    minWidth: '1.4rem',
                    textAlign: 'center',
                  }}>
                    {sub === 'alunos' ? alunoCount : profCount}
                  </span>
                </button>
              ));
            })()}
          </div>

          {membersLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
          ) : (() => {
            const filtered = membersSubTab === 'alunos'
              ? members.filter(m => m.role !== 'professor' && !m.isAcademyAdmin)
              : members.filter(m => m.role === 'professor' || m.isAcademyAdmin);
            if (filtered.length === 0) return (
              <div className="bjj-card !text-center" style={{ padding: '2.5rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>
                  NENHUM {membersSubTab === 'alunos' ? 'ALUNO' : 'PROFESSOR'}
                </p>
              </div>
            );
            return filtered.map((member, i) => {
              const beltColor = BELT_COLORS[member.belt] || '#FFFFFF';
              const isMe = user?.uid === member.uid;
              const isProfTab = membersSubTab === 'professores';
              const isPrivateProf = isProfTab && !member.isAcademyAdmin;
              const pendingReq = profRequests.has(member.uid);
              const reqLoading = profReqLoading[member.uid];
              const canRequest = isPrivateProf && !isMe && !pendingReq;
              return (
                <div key={member.uid} style={{ background: isMe ? '#140000' : '#111', border: `1px solid ${isMe ? '#CC0000' : '#1E1E1E'}`, padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#444', minWidth: '1.5rem', textAlign: 'center' }}>
                    {i + 1}
                  </span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1E1E1E', border: `2px solid ${beltColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {member.photo ? (
                      <img src={member.photo} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFFFFF' }}>
                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.name} {isMe ? '(você)' : ''} {member.isAcademyAdmin ? '👑' : ''}
                    </p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', color: '#555' }}>
                      Faixa {member.belt} · {member.totalTrainings || 0} treinos
                    </p>
                  </div>
                  {isProfTab ? (
                    <div style={{ flexShrink: 0 }}>
                      {canRequest ? (
                        <button
                          onClick={() => handleRequestProfessor(member.uid)}
                          disabled={reqLoading}
                          style={{
                            background: '#CC0000',
                            border: 'none',
                            color: '#FFF',
                            fontFamily: 'Barlow Condensed, sans-serif',
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            padding: '0.4rem 0.75rem',
                            cursor: reqLoading ? 'wait' : 'pointer',
                            opacity: reqLoading ? 0.6 : 1,
                          }}
                        >
                          {reqLoading ? '...' : 'DISCÍPULO'}
                        </button>
                      ) : pendingReq ? (
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', color: '#FF8C00', letterSpacing: '0.05em' }}>
                          AGUARDANDO
                        </span>
                      ) : member.isAcademyAdmin ? (
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', color: '#444', letterSpacing: '0.05em' }}>
                          ADMIN
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#CC0000', lineHeight: 1 }}>{member.xp || 0}</p>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', textTransform: 'uppercase', color: '#444' }}>XP</p>
                    </div>
                  )}
                </div>
              );
            })
          })()}
        </div>
      )}

      {/* ─── Ranking Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'ranking' && (
        <div style={{ padding: '1rem 1.25rem' }}>
          <RankingList
            academyId={academyId}
            title={`RANKING — ${profile?.academy || 'ACADEMIA'}`}
          />
        </div>
      )}

      {/* ─── HORÁRIOS Tab ───────────────────────────────────────────── */}
      {activeTab === 'horarios' && (
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <AcademyScheduleView professorUid={academyId} userId={user?.uid || ''} userProfile={profile} />
          {user?.uid && academyId && (
            <>
              <AcademyBookForm professorUid={academyId} userId={user.uid} />
              <AcademyBookedSlots studentUid={user.uid} professorUid={academyId} />
            </>
          )}
        </div>
      )}


      {/* ─── Financeiro Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'financeiro' && (
        <div style={{ padding: '1.25rem', paddingBottom: '5rem' }}>
          {/* Matrículas ativas */}
          {openFinEnrollments.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666', marginBottom: '0.75rem' }}>ACADEMIA VINCULADA</p>
              {openFinEnrollments.map(enroll => (
                <div key={enroll.id} style={{ background: '#111', border: `1px solid ${enroll.status === 'active' ? '#1A4A1A' : enroll.status === 'suspended' ? '#3A1A00' : '#333'}`, padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFFFFF', margin: 0, textTransform: 'uppercase' }}>{enroll.academyName || 'Academia'}</p>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', margin: '0.2rem 0 0' }}>Prof. {enroll.professorName || '—'}</p>
                    </div>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.2rem 0.5rem', background: enroll.status === 'active' ? '#0A1A0A' : enroll.status === 'suspended' ? '#1A0A00' : '#111', color: enroll.status === 'active' ? '#4CAF50' : enroll.status === 'suspended' ? '#FF8C00' : '#888', border: `1px solid ${enroll.status === 'active' ? '#4CAF50' : enroll.status === 'suspended' ? '#FF8C00' : '#333'}` }}>
                      {enroll.status === 'active' ? 'ATIVO' : enroll.status === 'suspended' ? 'SUSPENSO' : 'CANCELADO'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666' }}>MENSALIDADE</p>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#CC0000' }}>{finFormatCurrency(enroll.monthlyFee)}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666' }}>VENCIMENTO</p>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#FFFFFF' }}>DIA {enroll.dueDay}</p>
                    </div>
                    {enroll.pixKey && (
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666' }}>CHAVE PIX</p>
                        <button onClick={() => { navigator.clipboard.writeText(enroll.pixKey!).then(() => toast.success('Chave PIX copiada!')); }} style={{ background: 'transparent', border: '1px solid #333', color: '#AAA', fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', padding: '0.2rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          COPIAR PIX
                        </button>
                      </div>
                    )}
                  </div>
                  {enroll.status === 'suspended' && (
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#1A0800', border: '1px solid #FF8C00' }}>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#FF8C00', margin: 0 }}>⚠️ Sua matrícula está suspensa. Entre em contato com seu professor para regularizar.</p>
                    </div>
                  )}
                  {/* ATIVAR COBRANÇA RECORRENTE */}
                  {enroll.status === 'active' && (enroll.monthlyFee || 0) > 0 && (
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid #1E1E1E', paddingTop: '0.75rem' }}>
                      <button
                        onClick={async () => {
                          if (!hasAsaas) return;
                          try {
                            const result = await api.enrollments.asaasSubscribe(enroll.id);
                            if (result.invoiceUrl) window.open(result.invoiceUrl, '_blank', 'noopener,noreferrer');
                            toast.success('Assinatura criada! Após o primeiro pagamento, as cobranças serão automáticas.');
                          } catch (err: any) {
                            toast.error(err?.message || 'Erro ao configurar assinatura');
                          }
                        }}
                        disabled={hasAsaas === false}
                        style={{
                          width: '100%',
                          background: hasAsaas === false ? '#1A1A1A' : '#CC0000',
                          border: hasAsaas === false ? '1px solid #333' : 'none',
                          color: hasAsaas === false ? '#555' : '#FFF',
                          fontFamily: 'Barlow Condensed, sans-serif',
                          fontWeight: 900,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          padding: '0.5rem',
                          cursor: hasAsaas === false ? 'not-allowed' : 'pointer',
                          opacity: hasAsaas === false ? 0.5 : 1,
                        }}
                      >
                        {hasAsaas === false ? '🔒 COBRANÇA RECORRENTE INDISPONÍVEL' : '🔄 ATIVAR COBRANÇA RECORRENTE'}
                      </button>
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.6rem', color: '#555', textAlign: 'center', marginTop: '0.3rem' }}>
                        {hasAsaas === false ? 'A academia ainda não ativou a cobrança online.' : 'Cadastre seu cartão uma vez e esqueça.'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Cobranças da Academia ── */}
          {finPayments.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#CC0000', marginBottom: '0.75rem' }}>
                🏫 MENSALIDADES — {profile?.academy || 'ACADEMIA'}
              </p>
              {finPayments.map(pay => {
                const cfg = FIN_STATUS_CONFIG[pay.status] || FIN_STATUS_CONFIG.pending;
                const isPending = pay.status === 'pending';
                const isPendingApproval = pay.status === 'pending_approval';
                const isOverdue = pay.status === 'overdue';
                return (
                  <div key={pay.id} style={{ background: '#111', border: '1px solid #222', borderLeft: `3px solid ${cfg.color}`, padding: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#FFFFFF', margin: 0 }}>{finFormatCurrency(pay.amount)}</p>
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#666', margin: '0.15rem 0 0' }}>
                          Vencimento: {finFormatDate(pay.dueDate)}{pay.paidAt ? ` · Pago em: ${finFormatDate(pay.paidAt)}` : ''}
                        </p>
                      </div>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.2rem 0.5rem', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}` }}>
                        {cfg.label}
                      </span>
                    </div>
                    {/* Ações: PAGAR ONLINE + ANEXAR COMPROVANTE */}
                    {(isPending || isOverdue) && (
                      <div style={{ marginTop: '0.4rem', borderTop: '1px solid #1E1E1E', paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <button
                          onClick={async () => {
                            setFinReceiptLoading(pay.id);
                            try {
                              const result = await api.payments.asaasCheckout(pay.id);
                              if (result.invoiceUrl) window.open(result.invoiceUrl, '_blank', 'noopener,noreferrer');
                              else if (result.pixQrCode?.payload) { await navigator.clipboard.writeText(result.pixQrCode.payload); toast.success('PIX copiado!'); }
                              toast.success('Link de pagamento gerado!');
                            } catch { /* fallback para comprovante */ }
                            finally { setFinReceiptLoading(null); }
                          }}
                          disabled={finReceiptLoading === pay.id}
                          style={{ width: '100%', background: finReceiptLoading === pay.id ? '#1A1A1A' : '#0A1A2A', border: '1px solid #1A6ECC', color: '#1A6ECC', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.35rem', cursor: finReceiptLoading === pay.id ? 'wait' : 'pointer' }}
                        >
                          {finReceiptLoading === pay.id ? 'GERANDO...' : '💳 PAGAR ONLINE'}
                        </button>
                        <input type="file" accept="image/*,.pdf" id={`fin-receipt-${pay.id}`} style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setFinReceiptLoading(pay.id);
                            try {
                              const url = await api.upload.file(file, 'comprovantes');
                              await api.payments.update(pay.id, { receiptUrl: url } as any);
                              toast.success('Comprovante enviado!');
                              loadFinanceiro();
                            } catch (err: any) { toast.error(err?.message || 'Erro'); }
                            finally { setFinReceiptLoading(null); }
                          }}
                        />
                        <button onClick={() => document.getElementById(`fin-receipt-${pay.id}`)?.click()} disabled={finReceiptLoading === pay.id}
                          style={{ width: '100%', background: finReceiptLoading === pay.id ? '#1A1A1A' : '#0A1A0A', border: '1px solid #4CAF50', color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.35rem', cursor: finReceiptLoading === pay.id ? 'wait' : 'pointer' }}
                        >
                          {finReceiptLoading === pay.id ? 'ENVIANDO...' : '📎 ANEXAR COMPROVANTE'}
                        </button>
                      </div>
                    )}
                    {(pay as any).receiptUrl && (
                      <div style={{ marginTop: '0.35rem' }}>
                        <a href={(pay as any).receiptUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', color: '#1A6ECC', textTransform: 'uppercase', textDecoration: 'none' }}>
                          📋 VER COMPROVANTE
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Resumo financeiro */}
          {finPayments.length > 0 && (() => {
            const totalPending = finPayments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
            const totalOverdue = finPayments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
            const totalPaid    = finPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[{ label: 'PENDENTE', value: totalPending, color: '#FF8C00' }, { label: 'ATRASADO', value: totalOverdue, color: '#CC0000' }, { label: 'PAGO', value: totalPaid, color: '#4CAF50' }].map(item => (
                  <div key={item.label} style={{ background: '#111', border: '1px solid #222', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666', marginBottom: '0.25rem' }}>{item.label}</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.95rem', color: item.color, margin: 0 }}>{finFormatCurrency(item.value)}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Filtros */}
          {finPayments.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {(['all', 'pending', 'overdue', 'paid'] as const).map(f => (
                <button key={f} onClick={() => setFinFilter(f)} style={{ background: finFilter === f ? '#CC0000' : 'transparent', border: `1px solid ${finFilter === f ? '#CC0000' : '#333'}`, color: finFilter === f ? '#FFFFFF' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.3rem 0.75rem', cursor: 'pointer' }}>
                  {f === 'all' ? 'TODOS' : f === 'pending' ? 'PENDENTES' : f === 'overdue' ? 'ATRASADOS' : 'PAGOS'}
                </button>
              ))}
            </div>
          )}

          {/* Lista de cobranças (filtrada) */}
          {finLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #333', borderTopColor: '#CC0000', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>CARREGANDO...</p>
            </div>
          ) : (() => {
            const filtered = finFilter === 'all' ? finPayments : finPayments.filter(p => p.status === finFilter);
            return filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>💰</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {finPayments.length === 0 ? 'NENHUMA COBRANÇA AINDA' : 'NENHUM RESULTADO'}
                </p>
                {finPayments.length === 0 && (
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', marginTop: '0.5rem' }}>
                    Quando seu professor gerar uma cobrança, ela aparecerá aqui.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filtered.map(pay => {
                  const cfg = FIN_STATUS_CONFIG[pay.status] || FIN_STATUS_CONFIG.pending;
                  const isPending = pay.status === 'pending';
                  const isOverdue = pay.status === 'overdue';
                  return (
                    <div key={pay.id} style={{ background: '#111', border: '1px solid #222', borderLeft: `3px solid ${cfg.color}`, padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#FFFFFF', margin: 0 }}>{finFormatCurrency(pay.amount)}</p>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#666', margin: '0.15rem 0 0' }}>
                            Vencimento: {finFormatDate(pay.dueDate)}{pay.paidAt ? ` · Pago em: ${finFormatDate(pay.paidAt)}` : ''}
                          </p>
                        </div>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.2rem 0.5rem', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}` }}>
                          {cfg.label}
                        </span>
                      </div>
                      {(isPending || isOverdue) && (
                        <div style={{ marginTop: '0.4rem', borderTop: '1px solid #1E1E1E', paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <button onClick={async () => {
                            setFinReceiptLoading(pay.id);
                            try {
                              const result = await api.payments.asaasCheckout(pay.id);
                              if (result.invoiceUrl) window.open(result.invoiceUrl, '_blank', 'noopener,noreferrer');
                              else if (result.pixQrCode?.payload) { await navigator.clipboard.writeText(result.pixQrCode.payload); toast.success('PIX copiado!'); }
                            } catch { /* fallback */ }
                            finally { setFinReceiptLoading(null); }
                          }} disabled={finReceiptLoading === pay.id}
                          style={{ width: '100%', background: finReceiptLoading === pay.id ? '#1A1A1A' : '#0A1A2A', border: '1px solid #1A6ECC', color: '#1A6ECC', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.35rem', cursor: finReceiptLoading === pay.id ? 'wait' : 'pointer' }}>
                            {finReceiptLoading === pay.id ? 'GERANDO...' : '💳 PAGAR ONLINE'}
                          </button>
                          <input type="file" accept="image/*,.pdf" id={`fin-receipt2-${pay.id}`} style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                              setFinReceiptLoading(pay.id);
                              try {
                                const url = await api.upload.file(file, 'comprovantes');
                                await api.payments.update(pay.id, { receiptUrl: url } as any);
                                toast.success('Comprovante enviado!');
                                loadFinanceiro();
                              } catch (err: any) { toast.error(err?.message || 'Erro'); }
                              finally { setFinReceiptLoading(null); }
                            }}
                          />
                          <button onClick={() => document.getElementById(`fin-receipt2-${pay.id}`)?.click()} disabled={finReceiptLoading === pay.id}
                          style={{ width: '100%', background: finReceiptLoading === pay.id ? '#1A1A1A' : '#0A1A0A', border: '1px solid #4CAF50', color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.35rem', cursor: finReceiptLoading === pay.id ? 'wait' : 'pointer' }}>
                            {finReceiptLoading === pay.id ? 'ENVIANDO...' : '📎 ANEXAR COMPROVANTE'}
                          </button>
                        </div>
                      )}
                      {(pay as any).receiptUrl && (
                        <div style={{ marginTop: '0.35rem' }}>
                          <a href={(pay as any).receiptUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', color: '#1A6ECC', textTransform: 'uppercase', textDecoration: 'none' }}>
                            📋 VER COMPROVANTE
                          </a>
                        </div>
                      )}
                      {isOverdue && (
                        <div style={{ padding: '0.4rem 0.6rem', marginTop: '0.4rem', background: '#1A0000', border: '1px solid #CC0000' }}>
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#CC0000', margin: 0 }}>⚠️ Entre em contato com seu professor para regularizar.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Estado vazio — sem matrícula */}
          {!finLoading && openFinEnrollments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#111', border: '1px solid #222' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏫</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>NENHUMA ACADEMIA VINCULADA</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', marginTop: '0.5rem', lineHeight: 1.5 }}>
                {finPayments.length > 0
                  ? 'Você não está vinculado a uma academia no momento. Cobranças antigas continuam disponíveis para regularização.'
                  : 'Peça ao seu professor para te vincular à academia ou acesse o link de convite enviado por ele.'}
              </p>
            </div>
          )}
        </div>
      )}
      </motion.div>
      </AnimatePresence>

      {/* ─── Student Post Modal ──────────────────────────────────────── */}
      {showStudentPostModal && (
        <StudentPostModal
          academyId={academyId}
          user={user}
          profile={profile}
          onClose={() => setShowStudentPostModal(false)}
          onSaved={() => { setShowStudentPostModal(false); loadPosts(); }}
        />
      )}

      {/* ─── Admin Modals ─────────────────────────────────────────────────────── */}
      {showAvisoModal && <AvisoModal academyId={academyId} user={user} profile={profile} onClose={() => setShowAvisoModal(false)} onSaved={() => { setShowAvisoModal(false); loadPosts(); }} />}
      {showEventoModal && <EventoModal academyId={academyId} user={user} profile={profile} onClose={() => setShowEventoModal(false)} onSaved={() => { setShowEventoModal(false); loadEvents(); }} />}
      {showDesafioModal && <DesafioModal academyId={academyId} user={user} profile={profile} onClose={() => setShowDesafioModal(false)} onSaved={() => { setShowDesafioModal(false); loadChallenges(); }} />}
      {showFaixaModal && <FaixaModal academyId={academyId} user={user} profile={profile} members={members} onClose={() => setShowFaixaModal(false)} onSaved={() => { setShowFaixaModal(false); loadPosts(); }} />}
      <AnimatePresence>
        {showUnlinkConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => { if (!unlinkingAcademy) setShowUnlinkConfirm(false); }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 'min(100%, 430px)', background: '#0F0F0F', border: '1px solid #2A1212', borderRadius: '8px', boxShadow: '0 22px 70px rgba(0,0,0,0.55)', overflow: 'hidden' }}
            >
              <div style={{ padding: '1rem 1rem 0.85rem', borderBottom: '1px solid #1F1F1F', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#1A0808', border: '1px solid #3A1515', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF5A5A', flexShrink: 0 }}>
                    <AlertTriangle size={20} strokeWidth={2.4} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#FFFFFF', margin: 0 }}>
                      Sair da academia?
                    </p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.78rem', color: '#777', margin: '0.12rem 0 0' }}>
                      {profile?.academy || 'Academia atual'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUnlinkConfirm(false)}
                  disabled={unlinkingAcademy}
                  aria-label="Fechar"
                  style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #262626', background: '#141414', color: '#777', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: unlinkingAcademy ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '1rem' }}>
                <div style={{ background: '#140A0A', border: '1px solid #3A1515', borderRadius: '6px', padding: '0.85rem', marginBottom: '1rem' }}>
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.86rem', lineHeight: 1.5, color: '#D8D8D8', margin: 0 }}>
                    Ao confirmar, seu vínculo com esta academia será encerrado. Você deixará de acessar feed, horários, membros e ações internas dessa academia.
                  </p>
                </div>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.82rem', lineHeight: 1.55, color: '#A0A0A0', margin: '0 0 0.75rem' }}>
                  Mensalidades pendentes ou atrasadas não serão apagadas. Elas continuarão aparecendo no seu financeiro até serem regularizadas.
                </p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.78rem', lineHeight: 1.45, color: '#666', margin: 0 }}>
                  Depois disso, você poderá buscar outra academia e solicitar um novo vínculo normalmente.
                </p>
              </div>

              <div style={{ padding: '0 1rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowUnlinkConfirm(false)}
                  disabled={unlinkingAcademy}
                  style={{ height: '42px', borderRadius: '6px', border: '1px solid #2A2A2A', background: '#141414', color: '#B0B0B0', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: unlinkingAcademy ? 'not-allowed' : 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUnlinkAcademy}
                  disabled={unlinkingAcademy}
                  style={{ height: '42px', borderRadius: '6px', border: '1px solid #CC0000', background: unlinkingAcademy ? '#2A1111' : '#CC0000', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: unlinkingAcademy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                >
                  {unlinkingAcademy && <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />}
                  {unlinkingAcademy ? 'Saindo...' : 'Confirmar saída'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Modal: Post do Aluno ─────────────────────────────────────────────────────────────────────────────────
function StudentPostModal({ academyId, user, profile, onClose, onSaved }: any) {
  const [content, setContent] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Foto muito grande. Máximo 5MB.'); return; }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!content.trim() && !photo) return;
    setSaving(true);
    try {
      let photoURL = '';
      if (photo) {
        photoURL = await api.upload.file(photo, 'comunidade');
      }
      await api.posts.create({
        uid: user.uid,
        authorName: profile?.name || 'Atleta',
        authorPhoto: (profile as any)?.photo || '',
        authorBelt: profile?.belt || 'Branca',
        content: content.trim(),
        type: 'post',
        pinned: false,
        photoURL,
        academyId,
      });
      toast.success('Post publicado!');
      onSaved();
    } catch { toast.error('Erro ao publicar post'); setSaving(false); }
  };

  return <ModalWrapper title="💬 NOVO POST" onClose={onClose}>
    <textarea
      value={content}
      onChange={e => setContent(e.target.value)}
      placeholder="Compartilhe algo com a academia..."
      rows={4}
      style={{ width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
    />
    {photoPreview && (
      <div style={{ position: 'relative' }}>
        <img src={photoPreview} alt="preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
        <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#FFF', cursor: 'pointer', borderRadius: '50%', width: '28px', height: '28px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
    )}
    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
    <button onClick={() => fileInputRef.current?.click()} style={{ background: 'transparent', border: '1px dashed #333', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
      🖼️ {photo ? 'TROCAR FOTO' : 'ADICIONAR FOTO'}
    </button>
    <button onClick={handleSave} disabled={saving || (!content.trim() && !photo)} style={{ background: '#CC0000', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', padding: '1rem', border: 'none', width: '100%', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving || (!content.trim() && !photo) ? 0.5 : 1 }}>
      {saving ? 'PUBLICANDO...' : 'PUBLICAR'}
    </button>
  </ModalWrapper>;
}

// ─── Modal: Aviso ─────────────────────────────────────────────────────────────────────────────────
function AvisoModal({ academyId, user, profile, onClose, onSaved }: any) {
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await api.posts.create({
        uid: user.uid, authorName: profile?.name || 'Admin',
        content: content.trim(), type: 'aviso', pinned,
        academyId,
      });
      toast.success('Aviso publicado!');
      onSaved();
    } catch { toast.error('Erro ao publicar aviso'); setSaving(false); }
  };

  return <ModalWrapper title="📢 NOVO AVISO" onClose={onClose}>
    <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Escreva o aviso para a academia..." rows={4} style={{ width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#888' }}>
      <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
      FIXAR NO TOPO
    </label>
    <button onClick={handleSave} disabled={saving || !content.trim()} style={{ background: '#CC8800', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', padding: '1rem', border: 'none', width: '100%', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
      {saving ? 'PUBLICANDO...' : 'PUBLICAR AVISO'}
    </button>
  </ModalWrapper>;
}

// ─── Modal: Evento ────────────────────────────────────────────────────────────
function EventoModal({ academyId, user, profile, onClose, onSaved }: any) {
  const [form, setForm] = useState({ title: '', type: 'seminario', date: '', time: '', duration: '', description: '' });
  const [saving, setSaving] = useState(false);
  const upd = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      await api.events.create({
        ...form, uid: user.uid, authorName: profile?.name || 'Admin',
        academyId,
      });
      await api.posts.create({
        uid: user.uid, authorName: profile?.name || 'Admin',
        content: `📅 ${form.title} — ${form.date}${form.time ? ` às ${form.time}` : ''}${form.description ? `\n${form.description}` : ''}`,
        type: 'evento', pinned: false, academyId,
      });
      toast.success('Evento criado!');
      onSaved();
    } catch { toast.error('Erro ao criar evento'); setSaving(false); }
  };

  return <ModalWrapper title="📅 NOVO EVENTO" onClose={onClose}>
    <input type="text" value={form.title} onChange={e => upd('title', e.target.value)} placeholder="Nome do evento" style={inputStyle} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
      <select value={form.type} onChange={e => upd('type', e.target.value)} style={inputStyle}>
        {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <input type="date" value={form.date} onChange={e => upd('date', e.target.value)} style={inputStyle} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
      <input type="time" value={form.time} onChange={e => upd('time', e.target.value)} placeholder="Horário" style={inputStyle} />
      <input type="text" value={form.duration} onChange={e => upd('duration', e.target.value)} placeholder="Duração (ex: 2h)" style={inputStyle} />
    </div>
    <textarea value={form.description} onChange={e => upd('description', e.target.value)} placeholder="Descrição do evento..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
    <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.date} style={{ background: '#1A6ECC', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', padding: '1rem', border: 'none', width: '100%', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
      {saving ? 'CRIANDO...' : 'CRIAR EVENTO'}
    </button>
  </ModalWrapper>;
}

// ─── Modal: Desafio ───────────────────────────────────────────────────────────
function DesafioModal({ academyId, user, profile, onClose, onSaved }: any) {
  const [form, setForm] = useState({ title: '', metric: '', startDate: '', endDate: '', prize: '' });
  const [saving, setSaving] = useState(false);
  const upd = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.metric || !form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      await api.challenges.create({
        ...form, uid: user.uid, authorName: profile?.name || 'Admin',
        participants: [], academyId,
      });
      await api.posts.create({
        uid: user.uid, authorName: profile?.name || 'Admin',
        content: `⚔️ Novo desafio: ${form.title}\n📊 Métrica: ${form.metric}\n📅 ${form.startDate} → ${form.endDate}${form.prize ? `\n🏆 Prêmio: ${form.prize}` : ''}`,
        type: 'desafio', pinned: false, academyId,
      });
      toast.success('Desafio criado!');
      onSaved();
    } catch { toast.error('Erro ao criar desafio'); setSaving(false); }
  };

  return <ModalWrapper title="⚔️ NOVO DESAFIO" onClose={onClose}>
    <input type="text" value={form.title} onChange={e => upd('title', e.target.value)} placeholder="Nome do desafio" style={inputStyle} />
    <input type="text" value={form.metric} onChange={e => upd('metric', e.target.value)} placeholder="Métrica (ex: Mais treinos no mês)" style={inputStyle} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
      <input type="date" value={form.startDate} onChange={e => upd('startDate', e.target.value)} style={inputStyle} />
      <input type="date" value={form.endDate} onChange={e => upd('endDate', e.target.value)} style={inputStyle} />
    </div>
    <input type="text" value={form.prize} onChange={e => upd('prize', e.target.value)} placeholder="Prêmio (opcional)" style={inputStyle} />
    <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.metric || !form.startDate || !form.endDate} style={{ background: '#CC0000', color: '#FFFFFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', padding: '1rem', border: 'none', width: '100%', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
      {saving ? 'CRIANDO...' : 'CRIAR DESAFIO'}
    </button>
  </ModalWrapper>;
}

// ─── Modal: Promoção de Faixa ─────────────────────────────────────────────────
function FaixaModal({ academyId, user, profile, members, onClose, onSaved }: any) {
  const [selectedMember, setSelectedMember] = useState('');
  const [newBelt, setNewBelt] = useState('Azul');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const BELTS = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];

  const handleSave = async () => {
    if (!selectedMember || !newBelt) return;
    setSaving(true);
    const member = members.find((m: Member) => m.uid === selectedMember);
    try {
      await api.users.update(selectedMember, { belt: newBelt });
      await api.posts.create({
        uid: user.uid, authorName: profile?.name || 'Admin',
        content: `🥋 ${member?.name || 'Atleta'} foi promovido(a) para Faixa ${newBelt}!${message ? `\n"${message}"` : ''}`,
        type: 'faixa', pinned: false, academyId,
      });
      toast.success('Promoção registrada!');
      onSaved();
    } catch { toast.error('Erro ao registrar promoção'); setSaving(false); }
  };

  return <ModalWrapper title="🥋 PROMOÇÃO DE FAIXA" onClose={onClose}>
    <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} style={inputStyle}>
      <option value="">Selecionar atleta...</option>
      {members.map((m: Member) => <option key={m.uid} value={m.uid}>{m.name} — Faixa {m.belt}</option>)}
    </select>
    <select value={newBelt} onChange={e => setNewBelt(e.target.value)} style={inputStyle}>
      {BELTS.map(b => <option key={b} value={b}>Faixa {b}</option>)}
    </select>
    <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Mensagem de parabéns (opcional)" rows={3} style={{ ...inputStyle, resize: 'none' }} />
    <button onClick={handleSave} disabled={saving || !selectedMember} style={{ background: '#FFD700', color: '#000000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', padding: '1rem', border: 'none', width: '100%', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
      {saving ? 'SALVANDO...' : 'REGISTRAR PROMOÇÃO'}
    </button>
  </ModalWrapper>;
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderBottom: 'none', width: '100%', maxWidth: '480px', padding: '1.5rem', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px) + 70px)', display: 'flex', flexDirection: 'column', gap: '0.875rem', maxHeight: 'calc(90vh - 70px)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFFFFF' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFFFFF',
  fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem',
  outline: 'none', boxSizing: 'border-box',
};

// ── AcademyScheduleView ──────────────────────────────────────────────────────
// Exibe os horários fixos da academia com botão de CHECK-IN para alunos
// Check-in permitido até 12h antes do horário da aula

interface ClassSchedule {
  id: string;
  days: string[];
  time: string;
  type: string;
  mode: string;            // 'Gi' | 'No-Gi'
  publico: string;         // 'Misto' | 'Feminino' | 'Infantil'
  durationMin: number;
  notes?: string;
  professorUid: string;
}

interface CheckIn {
  id: string;
  scheduleId: string;
  dateKey: string;      // 'YYYY-MM-DD'
  userId: string;
  userName: string;
  userBelt: string;
  userStripes: number;
  checkedAt: any;
}

const DAY_MAP: Record<number, string> = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };
const DAY_LABEL_MAP: Record<string, string> = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' };
const TYPE_COLOR: Record<string, string> = {
  'Adultos': '#CC0000', 'Crianças': '#FFD700', 'Competição': '#FF6B00',
  'Open Mat': '#25D366', 'Gi': '#4A90D9', 'No-Gi': '#9B59B6', 'Outro': '#888',
};
const SCHEDULE_BELT_COLORS: Record<string, string> = {
  ...BELT_COLORS,
};

function AcademyScheduleView({ professorUid, userId, userProfile }: {
  professorUid: string;
  userId: string;
  userProfile: any;
}) {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(() => DAY_MAP[new Date().getDay()]);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await api.classes.listSchedules({ professorUid }) as any[];
        list.sort((a, b) => a.time.localeCompare(b.time));
        setSchedules(list);
        const ciList = await api.classes.getCheckIns({ professorUid, dateKey: todayStr }) as any[];
        setCheckIns(ciList);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [professorUid, todayStr]);

  const loadCheckInsForDay = async (dateKey: string) => {
    try {
      const ciList = await api.classes.getCheckIns({ professorUid, dateKey }) as any[];
      setCheckIns(ciList);
    } catch (e) {
      console.error(e);
    }
  };

  const getDateKeyForDay = (dayCode: string): string => {
    const today = new Date();
    const todayDow = today.getDay(); // 0=dom
    const targetDow = Object.entries(DAY_MAP).find(([, v]) => v === dayCode)?.[0];
    if (targetDow === undefined) return todayStr;
    let diff = parseInt(targetDow) - todayDow;
    if (diff < 0) diff += 7;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  };

  const handleSelectDay = async (day: string) => {
    setSelectedDay(day);
    const dateKey = getDateKeyForDay(day);
    await loadCheckInsForDay(dateKey);
  };

  const canCheckIn = (schedule: ClassSchedule): boolean => {
    // Pode fazer check-in até 12h antes do horário da aula
    const dateKey = getDateKeyForDay(selectedDay);
    const [h, m] = schedule.time.split(':').map(Number);
    const classTime = new Date(`${dateKey}T${schedule.time}:00`);
    const now = new Date();
    const diffMs = classTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours <= 12 && diffHours > -1; // até 12h antes e até 1h depois
  };

  const isCheckedIn = (scheduleId: string): boolean => {
    const dateKey = getDateKeyForDay(selectedDay);
    return checkIns.some(ci => ci.scheduleId === scheduleId && ci.userId === userId && ci.dateKey === dateKey);
  };

  const getCheckInsForClass = (scheduleId: string): CheckIn[] => {
    const dateKey = getDateKeyForDay(selectedDay);
    return checkIns.filter(ci => ci.scheduleId === scheduleId && ci.dateKey === dateKey);
  };

  const handleCheckIn = async (schedule: ClassSchedule) => {
    if (!userId || !userProfile) return;
    setCheckingIn(schedule.id);
    const dateKey = getDateKeyForDay(selectedDay);
    const alreadyIn = isCheckedIn(schedule.id);
    try {
      if (alreadyIn) {
        // Cancelar check-in
        const existing = checkIns.find(ci => ci.scheduleId === schedule.id && ci.userId === userId && ci.dateKey === dateKey);
        if (existing) {
          await api.classes.deleteCheckIn(existing.id);
          setCheckIns(prev => prev.filter(ci => ci.id !== existing.id));
          toast.success('Check-in cancelado');
        }
      } else {
        // Fazer check-in
        const data = {
          scheduleId: schedule.id,
          dateKey,
          userId,
          userName: userProfile.name || userProfile.displayName || 'Atleta',
          userBelt: userProfile.belt || 'Branca',
          userStripes: userProfile.stripes || 0,
          professorUid,
          checkedAt: new Date().toISOString(),
        };
        const newCheckIn = await api.classes.createCheckIn(data) as any;
        setCheckIns(prev => [...prev, { id: newCheckIn.id, ...data } as CheckIn]);
        toast.success('✅ Check-in confirmado!');
      }
    } catch (e) {
      toast.error('Erro ao registrar check-in');
    }
    setCheckingIn(null);
  };

  // Dias que têm aulas cadastradas
  const daysWithClasses = ['seg','ter','qua','qui','sex','sab','dom'].filter(d =>
    schedules.some(s => s.days.includes(d))
  );

  const todayDayCode = DAY_MAP[new Date().getDay()];
  const classesForDay = schedules.filter(s => s.days.includes(selectedDay)).sort((a, b) => a.time.localeCompare(b.time));

  const S = {
    dayBtn: (active: boolean, isToday: boolean) => ({
      fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem',
      textTransform: 'uppercase' as const, padding: '0.375rem 0.625rem',
      background: active ? '#CC0000' : isToday ? '#CC000022' : 'transparent',
      border: `1px solid ${active ? '#CC0000' : isToday ? '#CC000066' : '#2A2A2A'}`,
      color: active ? '#FFF' : isToday ? '#CC0000' : '#555',
      cursor: 'pointer', letterSpacing: '0.04em',
    }),
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
  );

  if (schedules.length === 0) return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem', textAlign: 'center' }}>
      <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🕐</p>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM HORÁRIO CADASTRADO</p>
      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444', marginTop: '0.5rem' }}>O professor ainda não cadastrou os horários das aulas.</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Cabeçalho */}
      <div style={{ borderLeft: '3px solid #CC0000', paddingLeft: '0.75rem' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF' }}>🕐 GRADE DE HORÁRIOS</p>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', marginTop: '0.125rem' }}>Faça check-in até 12h antes da aula para confirmar presença</p>
      </div>

      {/* Seletor de dia */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        {daysWithClasses.map(day => (
          <button key={day} onClick={() => handleSelectDay(day)} style={S.dayBtn(selectedDay === day, day === todayDayCode)}>
            {DAY_LABEL_MAP[day].substring(0, 3)}{day === todayDayCode ? ' •' : ''}
          </button>
        ))}
      </div>

      {/* Data do dia selecionado */}
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.06em' }}>
        {DAY_LABEL_MAP[selectedDay]}{selectedDay === todayDayCode ? ' — HOJE' : ''} · {new Date(getDateKeyForDay(selectedDay) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
      </p>

      {/* Lista de aulas do dia */}
      {classesForDay.length === 0 ? (
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', color: '#444' }}>SEM AULAS NESTE DIA</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {classesForDay.map(s => {
            const checkedIn = isCheckedIn(s.id);
            const canCI = canCheckIn(s);
            const classCheckIns = getCheckInsForClass(s.id);
            const expanded = expandedClass === s.id;
            const typeColor = TYPE_COLOR[s.type] || '#888';

            return (
              <div key={s.id} style={{ background: '#111', border: `1px solid ${checkedIn ? '#25D36644' : '#1E1E1E'}`, borderLeft: `3px solid ${typeColor}` }}>
                <div style={{ padding: '0.875rem 1rem', display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                  {/* Horário */}
                  <div style={{ flexShrink: 0, minWidth: '3.5rem' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#FFF', lineHeight: 1 }}>{s.time}</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#555' }}>{s.durationMin}min</p>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', background: `${typeColor}22`, border: `1px solid ${typeColor}`, color: typeColor }}>
                        {s.type}
                      </span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: `1px solid ${(s.mode || 'Gi') === 'No-Gi' ? '#9B59B6' : '#4A90D9'}`, color: (s.mode || 'Gi') === 'No-Gi' ? '#9B59B6' : '#4A90D9' }}>{s.mode || 'Gi'}</span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: '1px solid #2A2A2A', color: '#666' }}>{s.publico || 'Misto'}</span>
                    </div>
                    {s.notes && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555' }}>{s.notes}</p>}
                    {/* Contador de check-ins */}
                    <button onClick={() => setExpandedClass(expanded ? null : s.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', color: classCheckIns.length > 0 ? '#25D366' : '#444', letterSpacing: '0.04em' }}>
                        ✓ {classCheckIns.length} CONFIRMADO{classCheckIns.length !== 1 ? 'S' : ''} {expanded ? '▲' : '▼'}
                      </span>
                    </button>
                  </div>

                  {/* Botão CHECK-IN */}
                  {userId && (
                    <button
                      onClick={() => handleCheckIn(s)}
                      disabled={checkingIn === s.id || (!canCI && !checkedIn)}
                      style={{
                        flexShrink: 0,
                        fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.65rem',
                        textTransform: 'uppercase', padding: '0.5rem 0.75rem',
                        background: checkedIn ? '#25D36622' : canCI ? '#CC000022' : '#1A1A1A',
                        border: `1px solid ${checkedIn ? '#25D366' : canCI ? '#CC0000' : '#2A2A2A'}`,
                        color: checkedIn ? '#25D366' : canCI ? '#CC0000' : '#444',
                        cursor: (canCI || checkedIn) ? 'pointer' : 'default',
                        letterSpacing: '0.04em', lineHeight: 1.2, textAlign: 'center',
                      }}>
                      {checkingIn === s.id ? '...' : checkedIn ? '✓\nCONFIRM.' : canCI ? 'CHECK\nIN' : 'AGUARD.'}
                    </button>
                  )}
                </div>

                {/* Lista de inscritos (expandível) */}
                {expanded && (
                  <div style={{ borderTop: '1px solid #1E1E1E', padding: '0.75rem 1rem' }}>
                    {classCheckIns.length === 0 ? (
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#444' }}>Nenhum check-in ainda.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        {classCheckIns.map((ci, idx) => (
                          <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#555', minWidth: '1.25rem' }}>{idx + 1}.</span>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: SCHEDULE_BELT_COLORS[ci.userBelt] || '#888', border: '1px solid #333', flexShrink: 0 }} />
                            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: ci.userId === userId ? '#CC0000' : '#FFF' }}>
                              {ci.userName}{ci.userId === userId ? ' (você)' : ''}
                            </p>
                            <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#555' }}>{ci.userBelt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── AcademyBookForm ─────────────────────────────────────────────────────────
function AcademyBookForm({ professorUid, userId }: { professorUid: string; userId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{ time: string; scheduleId: string }[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [saving, setSaving] = useState(false);

  const DAY_MAP: Record<number, string> = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };

  const loadTimes = async (date: string) => {
    if (!date) { setAvailableSlots([]); return; }
    setLoadingTimes(true);
    try {
      const dayOfWeek = DAY_MAP[new Date(date + 'T00:00:00').getDay()];
      const [scheds, booked] = await Promise.all([
        api.classes.listSchedules({ professorUid }) as Promise<any[]>,
        api.bookedSlots.list({ professorUid }) as Promise<any[]>,
      ]);
      const bookedTimes = new Set(booked.filter((b: any) => (b.date || '').split('T')[0] === date && b.status === 'confirmed').map((b: any) => b.time));
      const slots = scheds
        .filter((s: any) => {
          if (!s.time || bookedTimes.has(s.time)) return false;
          const days = s.days || [];
          return days.length === 0 || days.includes(dayOfWeek);
        })
        .map((s: any) => ({ time: s.time, scheduleId: s.id }))
        .sort((a, b) => a.time.localeCompare(b.time));
      const seen = new Set<string>();
      setAvailableSlots(slots.filter(s => { if (seen.has(s.time)) return false; seen.add(s.time); return true; }));
    } catch { setAvailableSlots([]); }
    finally { setLoadingTimes(false); }
  };

  const handleBook = async () => {
    if (!bookDate || !bookTime) return;
    setSaving(true);
    try {
      const slot = availableSlots.find(s => s.time === bookTime);
      await api.bookedSlots.create({
        professorUid,
        date: bookDate,
        time: bookTime,
        scheduleId: slot?.scheduleId || undefined,
        notes: bookNotes || undefined,
      });
      toast.success(`Aula agendada para ${new Date(bookDate + 'T00:00:00').toLocaleDateString('pt-BR')} às ${bookTime}!`);
      setShowForm(false);
      setBookDate(''); setBookTime(''); setBookNotes('');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao agendar');
    } finally {
      setSaving(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        style={{
          width: '100%', background: '#CC0000', border: 'none', color: '#FFF',
          fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem',
          textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.6rem', cursor: 'pointer',
        }}
      >
        📅 AGENDAR AULA
      </button>
    );
  }

  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📅 AGENDAR AULA</p>
      <div>
        <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>DATA</label>
        <input type="date" value={bookDate} onChange={e => { setBookDate(e.target.value); setBookTime(''); loadTimes(e.target.value); }}
          min={new Date().toISOString().split('T')[0]}
          style={{ width: '100%', background: '#0A0A0A', border: '1px solid #333', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', padding: '0.4rem', boxSizing: 'border-box' }} />
      </div>
      <div>
        <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>HORÁRIO</label>
        {loadingTimes ? (
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>Carregando...</p>
        ) : !bookDate ? (
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#555' }}>Selecione uma data primeiro</p>
        ) : availableSlots.length === 0 ? (
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#CC0000' }}>Nenhum horário disponível nesta data</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
            {availableSlots.map(slot => (
              <button key={slot.scheduleId || slot.time} onClick={() => setBookTime(slot.time)}
                style={{ background: bookTime === slot.time ? '#CC0000' : '#1E1E1E', border: bookTime === slot.time ? 'none' : '1px solid #333', color: bookTime === slot.time ? '#FFF' : '#AAA', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.72rem', padding: '0.4rem', cursor: 'pointer' }}>
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <input type="text" value={bookNotes} onChange={e => setBookNotes(e.target.value)} placeholder="Observações (opcional)..."
          style={{ width: '100%', background: '#0A0A0A', border: '1px solid #333', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', padding: '0.4rem', boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => { setShowForm(false); setBookDate(''); setBookTime(''); setBookNotes(''); }}
          style={{ flex: 1, background: '#1E1E1E', border: 'none', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem', cursor: 'pointer' }}>
          CANCELAR
        </button>
        <button onClick={handleBook} disabled={!bookDate || !bookTime || saving}
          style={{ flex: 1, background: saving ? '#1A1A1A' : '#4CAF50', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem', cursor: saving ? 'wait' : 'pointer', opacity: !bookDate || !bookTime ? 0.5 : 1 }}>
          {saving ? 'AGENDANDO...' : 'CONFIRMAR'}
        </button>
      </div>
    </div>
  );
}

// ─── AcademyBookedSlots ──────────────────────────────────────────────────────
function AcademyBookedSlots({ studentUid, professorUid }: { studentUid: string; professorUid: string }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  if (loading) return null;

  const active = bookings.filter(b => b.status === 'confirmed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666' }}>
        📅 MINHAS AULAS AGENDADAS
        {active.length > 0 && <span style={{ color: '#4CAF50', marginLeft: '0.5rem' }}>{active.length}</span>}
      </p>
      {active.length === 0 ? (
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.72rem', color: '#555', textTransform: 'uppercase' }}>Nenhuma aula agendada</p>
        </div>
      ) : (
        active.map(b => (
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
        ))
      )}
    </div>
  );
}
