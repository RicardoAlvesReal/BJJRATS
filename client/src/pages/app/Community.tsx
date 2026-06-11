// BJJRats PWA — Community Screen
// Design: Dark Modern — Glassmorphism + BJJ
// Tabs: Feed (comunidade), Ranking, Desafios, Eventos
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { tabVariant, tabTransition } from '@/lib/animations';
import api from '@/lib/api';
import { AcademyMap } from '@/components/AcademyMap';
import { toast } from 'sonner';
import { BELT_COLORS } from '@/lib/bjjrats-constants';
import RankingList from '@/components/RankingList';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface CommunityPost {
  id: string;
  uid: string;
  authorUid?: string;
  authorName: string;
  authorBelt: string;
  authorPhotoURL?: string;
  text?: string;
  likes: string[];
  commentCount?: number;
  createdAt?: any;
  // posts da academia (professor)
  isAcademyPost?: boolean;
  type?: string;       // geral | aviso | novidade | resultado
  photoURL?: string;
  academyId?: string;
  academyLogo?: string;
  academyName?: string;
  createdAtStr?: string;
  trainingData?: any;
  feedTarget?: string;
  viewedBy?: string[];
  viewCount?: number;
  pinned?: boolean;
  pinnedAt?: any;
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
  title: string;
  description?: string;
  type: string;
  date: string;
  time?: string;
  location?: string;
  slots?: number | string;
  price?: string;
  registrations: string[];
  registrationNames?: Record<string, string>;
  registrationBelts?: Record<string, string>;
  academyId: string;
  academyName?: string;
}

interface AcademyChallenge {
  id: string;
  title: string;
  description?: string;
  goal: number;
  goalType: 'trainings' | 'minutes' | 'xp';
  startDate: string;
  endDate: string;
  xpReward: number;
  academyId: string;
  // progresso calculado localmente
  myProgress?: number;
}

interface RankedUser {
  uid: string;
  name: string;
  belt: string;
  xp: number;
  totalTrainings: number;
  photo?: string | null;
  academy?: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MEDAL_COLORS = ['#CC8800', '#888888', '#8B4513'];
const MEDAL_LABELS = ['🥇', '🥈', '🥉'];
const EVENT_TYPE_LABELS: Record<string, string> = {
  competicao: 'COMPETIÇÃO', seminario: 'SEMINÁRIO', aula_especial: 'AULA ESPECIAL',
  open_match: 'OPEN MATCH', outro: 'EVENTO',
};
const EVENT_TYPE_COLORS: Record<string, string> = {
  competicao: '#CC8800', seminario: '#0D9E6E', aula_especial: '#1A6ECC',
  open_match: '#CC0000', outro: '#555',
};
const POST_TYPE_COLORS: Record<string, string> = {
  geral: '#555', aviso: '#CC8800', novidade: '#0D9E6E', resultado: '#CC0000',
};

type Tab = 'conquistas' | 'feed' | 'ranking' | 'challenges' | 'events' | 'localize';

interface PublicAchievement {
  id: string;
  uid: string;
  userName: string;
  userBelt: string;
  userStripes?: number;
  userPhoto?: string | null;
  type: 'achievement' | 'promotion';
  // conquista
  achievementTitle?: string;
  achievementIcon?: string;
  achievementRarity?: string;
  // promoção
  newBelt?: string;
  newStripes?: number;
  previousBelt?: string;
  academyName?: string;
  createdAt?: any;
  createdAtStr?: string;
}

// ─── AcademySearchByCity ─────────────────────────────────────────────────────

function AcademySearchByCity() {
  const { user, profile, refreshProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Array<{
    professorUid: string; academyName: string; academyCity: string;
    academyState: string; academyLogoUrl?: string; professorName: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const term = search.trim().toLowerCase();
    if (!term) { toast.error('Digite a cidade ou nome da academia'); return; }
    setLoading(true); setSearched(true);
    try {
      const profs = await api.users.list({ role: 'admin' });
      const all = profs.map(data => ({
        professorUid: data.uid,
        academyName: (data as any).academyName || (data as any).academy || '',
        academyCity: (data as any).academyCity || '',
        academyState: (data as any).academyState || '',
        academyLogoUrl: (data as any).academyLogoUrl || '',
        professorName: data.name || '',
      })).filter(a => a.academyCity.toLowerCase().includes(term) || a.academyName.toLowerCase().includes(term) || a.professorName.toLowerCase().includes(term));
      setResults(all);
    } catch { toast.error('Erro ao buscar academias'); }
    finally { setLoading(false); }
  };

  const handleLink = async (academy: typeof results[0]) => {
    if (!user) return;
    setLinking(academy.professorUid);
    try {
      await api.academyRequests.create({
        studentName: profile?.name || 'Aluno',
        studentBelt: (profile as any)?.belt || 'Branca',
        studentStripes: (profile as any)?.stripes ?? 0,
        studentPhoto: profile?.photo || null,
        professorUid: academy.professorUid,
        academyName: academy.academyName,
        professorName: academy.professorName,
        status: 'pending',
        createdAtStr: new Date().toLocaleDateString('pt-BR'),
      } as any);
      await api.notifications.create({
        recipientUid: academy.professorUid,
        toUid: academy.professorUid,
        type: 'join_request',
        studentUid: user.uid,
        studentName: profile?.name || 'Aluno',
        studentBelt: (profile as any)?.belt || 'Branca',
        studentStripes: (profile as any)?.stripes ?? 0,
        studentPhoto: profile?.photo || null,
        academyName: academy.academyName,
        message: `${profile?.name || 'Aluno'} solicitou vínculo com ${academy.academyName}`,
        read: false,
        createdAtStr: new Date().toLocaleDateString('pt-BR'),
      } as any);
      await refreshProfile();
      toast.success(`Solicitação enviada para ${academy.academyName}! Aguarde a aprovação.`);
    } catch { toast.error('Erro ao solicitar vínculo'); }
    finally { setLinking(null); }
  };

  return (
    <div>
      <div className="bjj-card !border-[#CC000033]" style={{ borderLeft: '3px solid #CC0000', marginBottom: '1rem' }}>
        <p className="bjj-header-title !text-[1rem]" style={{ marginBottom: '0.25rem' }}>ENCONTRE SUA ACADEMIA</p>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#888', lineHeight: 1.5 }}>Busque por cidade, nome da academia ou professor para solicitar vínculo.</p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Ex: São Paulo, Templo BJJ..."
            className="bjj-input"
        />
        <button onClick={handleSearch} disabled={loading}
                      className="bjj-btn-primary !w-auto !text-[0.8rem] !px-4">
          {loading ? '...' : 'BUSCAR'}
        </button>
      </div>
      {searched && !loading && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }} className="bjj-card">
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', color: '#555' }}>NENHUMA ACADEMIA ENCONTRADA</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444', marginTop: '0.5rem' }}>Tente outra cidade ou nome</p>
        </div>
      )}
      {results.map(a => (
        <div key={a.professorUid} className="bjj-card flex gap-3 items-start">
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #CC0000', flexShrink: 0, background: '#1A0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {a.academyLogoUrl ? <img src={a.academyLogoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.25rem' }}>🏫</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', color: '#FFFFFF', marginBottom: '0.2rem' }}>{a.academyName || 'Academia'}</p>
            {(a.academyCity || a.academyState) && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem' }}>📍 {[a.academyCity, a.academyState].filter(Boolean).join(' · ')}</p>}
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#666', marginBottom: '0.75rem' }}>👤 Prof. {a.professorName}</p>
            <button onClick={() => handleLink(a)} disabled={linking === a.professorUid}
                              className="bjj-btn-primary !text-[0.75rem] !px-4 !py-[0.5rem] !w-auto">
              {linking === a.professorUid ? 'ENVIANDO...' : '🔗 SOLICITAR VÍNCULO'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface CommunityProps {
  onClearBadge?: () => void;
  onNewPosts?: () => void;
}

export default function Community({ onClearBadge, onNewPosts }: CommunityProps = {}) {
  const { user, profile } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const canModerate = isSuperAdmin || (profile as any)?.communityModerator === true;
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const feedTopRef = useRef<HTMLDivElement>(null);

  // Usar refs para evitar que callbacks instáveis causem loops de re-render
  const onClearBadgeRef = useRef(onClearBadge);
  useEffect(() => { onClearBadgeRef.current = onClearBadge; }, [onClearBadge]);

  // Conquistas públicas
  const [achievements, setAchievements] = useState<PublicAchievement[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);

  // Limpar badge ao abrir conquistas
  useEffect(() => {
    if (activeTab === 'conquistas') onClearBadgeRef.current?.();
  }, [activeTab]);

  // Feed: apenas posts da comunidade (feedTarget='community')
  const [communityRawPosts, setCommunityRawPosts] = useState<CommunityPost[] | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const [newPostText, setNewPostText] = useState('');
  const [postingPost, setPostingPost] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostPhoto, setNewPostPhoto] = useState<File | null>(null);
  const [newPostPhotoPreview, setNewPostPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);



  // Comentários
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, PostComment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());

  // Ranking
  const [ranking, setRanking] = useState<RankedUser[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankFilter, setRankFilter] = useState<'xp' | 'treinos'>('xp');

  // Desafios
  const [challenges, setChallenges] = useState<AcademyChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);

  // Eventos
  const [events, setEvents] = useState<AcademyEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // ─── Loaders ────────────────────────────────────────────────────────────────

  const loadRanking = useCallback(async () => {
    setRankingLoading(true);
    try {
      const users = await api.users.list();
      setRanking(users as RankedUser[]);
    } catch { setRanking([]); }
    finally { setRankingLoading(false); }
  }, []);

  const loadChallenges = useCallback(async () => {
    setChallengesLoading(true);
    try {
      const academyId = profile?.academyId;
      let challengeDocs: AcademyChallenge[] = [];

      const allChallenges = await api.challenges.list();
      if (academyId) {
        challengeDocs = allChallenges
          .filter(c => c.academyId === academyId)
          .map(c => c as unknown as AcademyChallenge);
      } else {
        challengeDocs = allChallenges.map(c => c as unknown as AcademyChallenge);
      }

      // Calcular progresso automático para cada desafio
      if (user && challengeDocs.length > 0) {
        const trainings = await api.trainings.list(user.uid);

        challengeDocs = challengeDocs.map(ch => {
          const start = new Date(ch.startDate).getTime();
          const end = new Date(ch.endDate).getTime() + 86400000; // inclusive
          const inPeriod = trainings.filter(t => {
            const ts = t.date ? new Date(t.date).getTime() : 0;
            return ts >= start && ts <= end;
          });

          let progress = 0;
          if (ch.goalType === 'trainings') {
            progress = inPeriod.length;
          } else if (ch.goalType === 'minutes') {
            progress = inPeriod.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
          } else if (ch.goalType === 'xp') {
            progress = inPeriod.reduce((sum, t) => sum + ((t as any).xp || (t as any).xpEarned || 0), 0);
          }

          return { ...ch, myProgress: progress };
        });
      }

      setChallenges(challengeDocs);
    } catch { setChallenges([]); }
    finally { setChallengesLoading(false); }
  }, [profile?.academyId, user]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const academyId = profile?.academyId;
      const allEvents = await api.events.list();
      let eventDocs: AcademyEvent[] = allEvents
        .filter(e => !academyId || e.academyId === academyId)
        .map(e => e as unknown as AcademyEvent);

      // Ordenar por data
      eventDocs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(eventDocs);
    } catch { setEvents([]); }
    finally { setEventsLoading(false); }
  }, [profile?.academyId]);

  // Carregar posts da comunidade
  useEffect(() => {
    if (!user) { setCommunityRawPosts([]); setPostsLoading(false); return; }
    const load = async () => {
      try {
        const posts = await api.posts.list();
        const filtered = posts
          .filter(p => (p as any).feedTarget === 'community')
          .map(p => ({ ...p, isAcademyPost: false } as CommunityPost));
        setCommunityRawPosts(filtered);
      } catch (err) {
        console.error('[Community] Erro ao carregar posts:', err);
        setCommunityRawPosts([]);
      } finally {
        setPostsLoading(false);
      }
    };
    load();
  }, [user]);



  // Pull to refresh: recarregar feed da comunidade
  const handleRefresh = useCallback(async () => {
    if (refreshing || !user) return;
    setRefreshing(true);
    try {
      const posts = await api.posts.list();
      setCommunityRawPosts(
        posts
          .filter(p => (p as any).feedTarget === 'community')
          .map(p => ({ ...p, isAcademyPost: false } as CommunityPost))
      );
      toast.success('Feed atualizado!');
    } catch (err) {
      console.error('[Community] Erro refresh:', err);
      toast.error('Erro ao atualizar feed');
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [refreshing, user]);

  // Touch handlers para pull to refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const container = feedContainerRef.current;
    if (!container || container.scrollTop > 0) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && diff < 150) {
      setPullDistance(diff);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, handleRefresh]);

  useEffect(() => { if (activeTab === 'ranking') loadRanking(); }, [activeTab, loadRanking]);
  useEffect(() => { if (activeTab === 'challenges') loadChallenges(); }, [activeTab, loadChallenges]);
  useEffect(() => { if (activeTab === 'events') loadEvents(); }, [activeTab, loadEvents]);

  // ─── Handlers ───────────────────────────────────────────────────────────────────

  // Registrar visualização única por usuário (fire-and-forget, não bloqueia UI)
  const viewedPostsRef = useRef<Set<string>>(new Set());
  const registerView = useCallback((postId: string) => {
    if (!user || viewedPostsRef.current.has(postId)) return;
    viewedPostsRef.current.add(postId);
    // view tracking handled server-side
  }, [user]);

  const handleLike = async (post: CommunityPost) => {
    if (!user || !post.id) return;
    const likes = post.likes || [];
    const hasLiked = likes.includes(user.uid);
    const newLikes = hasLiked ? likes.filter(l => l !== user.uid) : [...likes, user.uid];
    try {
      await api.posts.update(post.id, { likes: newLikes } as any);
      // Atualizar otimisticamente
      setCommunityRawPosts(prev => prev ? prev.map((p: CommunityPost) => p.id === post.id ? { ...p, likes: newLikes } : p) : prev);
      // Notificar o autor do post quando alguém curte (exceto o próprio autor)
      if (!hasLiked) {
        const postAuthorUid = post.authorUid || post.uid;
        if (postAuthorUid && postAuthorUid !== user.uid) {
          try {
            await api.notifications.create({
              toUid: postAuthorUid,
              fromUid: user.uid,
              fromName: profile?.name || 'Alguém',
              fromBelt: (profile as any)?.belt || 'Branca',
              type: 'like',
              postId: post.id,
              postText: (post.text || '').substring(0, 60),
              message: `${profile?.name || 'Alguém'} curtiu seu post`,
              read: false,
            } as any);
          } catch { /* silencioso */ }
        }
      }
    } catch { toast.error('Erro ao curtir'); }
  };

  const handleToggleComments = async (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) { next.delete(postId); }
      else {
        next.add(postId);
        // Carregar comentários se ainda não carregados
        if (!comments[postId]) handleLoadComments(postId);
      }
      return next;
    });
  };

  const handleLoadComments = async (postId: string) => {
    setLoadingComments(prev => new Set(prev).add(postId));
    try {
      const commentList = await api.posts.getComments(postId);
      const list: PostComment[] = commentList.map(c => ({
        id: c.id,
        uid: c.authorUid,
        authorName: (c as any).authorName || 'Atleta',
        authorBelt: (c as any).authorBelt || 'Branca',
        authorPhotoURL: (c as any).authorPhotoURL,
        text: (c as any).content || (c as any).text || '',
        createdAt: c.createdAt ? { seconds: new Date(c.createdAt).getTime() / 1000 } : { seconds: 0 },
      }));
      list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setComments(prev => ({ ...prev, [postId]: list }));
    } catch { /* silencioso */ }
    finally { setLoadingComments(prev => { const n = new Set(prev); n.delete(postId); return n; }); }
  };

  const handlePostComment = async (post: CommunityPost) => {
    const text = (commentText[post.id] || '').trim();
    if (!text || !user || !profile) return;
    setPostingComment(post.id);
    try {
      const newComment = await api.posts.addComment(post.id, { content: text });
      // Atualizar contador no post
      const newCount = (post.commentCount || 0) + 1;
      await api.posts.update(post.id, { commentCount: newCount } as any);
      setCommunityRawPosts(prev => prev ? prev.map((p: CommunityPost) => p.id === post.id ? { ...p, commentCount: newCount } : p) : prev);
      // Adicionar ao estado local
      setComments(prev => ({
        ...prev,
        [post.id]: [...(prev[post.id] || []), {
          id: newComment.id,
          uid: user.uid,
          authorName: profile.name || 'Atleta',
          authorBelt: (profile as any).belt || 'Branca',
          authorPhotoURL: profile.photo || undefined,
          text,
          createdAt: { seconds: Date.now() / 1000 },
        }],
      }));
      setCommentText(prev => ({ ...prev, [post.id]: '' }));
      // Notificar autor do post
      const postAuthorUid = post.authorUid || post.uid;
      if (postAuthorUid && postAuthorUid !== user.uid) {
        try {
          await api.notifications.create({
            toUid: postAuthorUid,
            fromUid: user.uid,
            fromName: profile.name || 'Alguém',
            fromBelt: (profile as any).belt || 'Branca',
            type: 'comment',
            postId: post.id,
            postText: (post.text || '').substring(0, 60),
            message: `${profile.name || 'Alguém'} comentou no seu post: "${text.substring(0, 40)}"`,
            read: false,
          } as any);
        } catch { /* silencioso */ }
      }
    } catch { toast.error('Erro ao comentar'); }
    finally { setPostingComment(null); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Excluir este post?')) return;
    try {
      await api.posts.delete(postId);
      setCommunityRawPosts(prev => prev ? prev.filter(p => p.id !== postId) : prev);
      toast.success('Post excluído');
    } catch { toast.error('Erro ao excluir'); }
  };

  const handleModDeletePost = async (postId: string) => {
    if (!confirm('Excluir este post (moderação)?' )) return;
    try {
      await api.admin.community.deletePost(postId);
      setCommunityRawPosts(prev => prev ? prev.filter(p => p.id !== postId) : prev);
      toast.success('Post removido pela moderação');
    } catch { toast.error('Erro ao excluir'); }
  };

  const handlePinPost = async (post: CommunityPost) => {
    try {
      const newPinned = !post.pinned;
      const postData: any = { pinned: newPinned };
      if (newPinned) postData.pinnedAt = new Date();
      await api.posts.update(post.id, postData as any);
      setCommunityRawPosts(prev => prev ? prev.map(p => p.id === post.id ? { ...p, pinned: newPinned, pinnedAt: newPinned ? new Date() : undefined } : p) : prev);
      toast.success(newPinned ? 'Post fixado no topo' : 'Post desafixado');
    } catch { toast.error('Erro ao fixar/desafixar'); }
  };

  const handleModDeleteEvent = async (eventId: string) => {
    if (!confirm('Excluir este evento (moderação)?')) return;
    try {
      await api.admin.community.deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success('Evento removido pela moderação');
    } catch { toast.error('Erro ao excluir evento'); }
  };

  const handleModDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Excluir este desafio (moderação)?')) return;
    try {
      await api.admin.community.deleteChallenge(challengeId);
      setChallenges(prev => prev.filter(c => c.id !== challengeId));
      toast.success('Desafio removido pela moderação');
    } catch { toast.error('Erro ao excluir desafio'); }
  };

  const handleNewPost = async () => {
    if (!user || (!newPostText.trim() && !newPostPhoto)) return;
    setPostingPost(true);
    try {
      let photoURL = '';
      if (newPostPhoto) {
        photoURL = await api.upload.file(newPostPhoto, 'comunidade');
      }
      const postData: any = {
        uid: user.uid,
        authorUid: user.uid,
        authorName: profile?.name || 'Atleta',
        authorBelt: (profile as any)?.belt || 'Branca',
        authorPhotoURL: profile?.photo || null,
        text: newPostText.trim(),
        photoURL,
        feedTarget: 'community',
        likes: [],
      };
      const created = await api.posts.create(postData);
      const optimisticPost: CommunityPost = {
        ...postData,
        id: created.id,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
        isAcademyPost: false,
        _localMillis: Date.now(),
      } as any;
      setCommunityRawPosts(prev => {
        if (!prev) return [optimisticPost];
        if (prev.some(p => p.id === created.id)) return prev;
        return [optimisticPost, ...prev];
      });
      setNewPostText('');
      setNewPostPhoto(null);
      setNewPostPhotoPreview(null);
      setShowNewPost(false);
      toast.success('Post publicado!');
      // Scroll para o topo para ver o novo post
      setTimeout(() => {
        feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500);
    } catch (err) {
      console.error('Erro ao publicar post:', err);
      toast.error('Erro ao publicar. Tente novamente.');
    }
    finally { setPostingPost(false); }
  };

  const handleRegisterEvent = async (ev: AcademyEvent) => {
    if (!user || !profile) return;
    const isIn = (ev.registrations || []).includes(user.uid);
    try {
      if (isIn) {
        const newRegistrations = (ev.registrations || []).filter(id => id !== user.uid);
        const newNames = { ...(ev.registrationNames || {}) };
        const newBelts = { ...(ev.registrationBelts || {}) };
        delete (newNames as any)[user.uid];
        delete (newBelts as any)[user.uid];
        await api.events.update(ev.id, { registrations: newRegistrations, registrationNames: newNames, registrationBelts: newBelts } as any);
        setEvents(prev => prev.map(e => e.id === ev.id ? {
          ...e,
          registrations: newRegistrations,
          registrationNames: newNames,
          registrationBelts: newBelts,
        } : e));
        toast.success('Inscrição cancelada');
      } else {
        const slotsNum = ev.slots ? parseInt(String(ev.slots)) : null;
        if (slotsNum !== null && (ev.registrations || []).length >= slotsNum) {
          toast.error('Evento lotado!'); return;
        }
        const newRegistrations = [...(ev.registrations || []), user.uid];
        const newNames = { ...(ev.registrationNames || {}), [user.uid]: profile.name || 'Atleta' };
        const newBelts = { ...(ev.registrationBelts || {}), [user.uid]: (profile as any).belt || 'Branca' };
        await api.events.update(ev.id, { registrations: newRegistrations, registrationNames: newNames, registrationBelts: newBelts } as any);
        setEvents(prev => prev.map(e => e.id === ev.id ? {
          ...e,
          registrations: newRegistrations,
          registrationNames: newNames,
          registrationBelts: newBelts,
        } : e));
        toast.success('✅ Inscrito no evento!');
      }
    } catch { toast.error('Erro ao atualizar inscrição'); }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatTimeAgo = (createdAt: any): string => {
    if (!createdAt) return '';
    const ts = createdAt.seconds ? createdAt.seconds * 1000 : new Date(createdAt).getTime();
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const sortedRanking = [...ranking].sort((a, b) =>
    rankFilter === 'xp' ? (b.xp || 0) - (a.xp || 0) : (b.totalTrainings || 0) - (a.totalTrainings || 0)
  );

  // Posts da comunidade (feedTarget='community') — independente da academia
  const communityPosts = (communityRawPosts ?? []).sort((a, b) => {
    // Pinned posts first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const getTime = (p: CommunityPost) => {
      const s = (p.createdAt as any)?.seconds;
      return s ? s * 1000 : ((p as any)._localMillis || 0);
    };
    return getTime(b) - getTime(a);
  });




  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'feed', label: 'COMUNIDADE', icon: '📰' },
    { id: 'events', label: 'EVENTOS', icon: '📅' },
    { id: 'ranking', label: 'RANKING', icon: '🏆' },
    { id: 'conquistas', label: 'CONQUISTAS', icon: '🏅' },
    { id: 'challenges', label: 'DESAFIOS', icon: '⚔️' },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div className="bjj-header" style={{ borderBottom: '2px solid #CC0000' }}>
        <h1 className="bjj-header-title !text-[1.5rem]">COMUNIDADE</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1E1E1E', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: '0 0 auto', padding: '0.75rem 0.875rem', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t.id ? '#CC0000' : 'transparent'}`, color: activeTab === t.id ? '#CC0000' : '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          className="bjj-content"
          variants={tabVariant}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={tabTransition}
        >
        {/* ─── CONQUISTAS TAB ────────────────────────────────────────────── */}
        {activeTab === 'conquistas' && (
          <ConquistasTab
            achievements={achievements}
            loading={achievementsLoading}
            onLoad={async () => {
              if (achievements.length > 0) return;
              setAchievementsLoading(true);
              try {
                // Carregar promoções públicas
                const promoList = await api.promotions.list();
                const promos: PublicAchievement[] = promoList.map(data => ({
                  id: data.id,
                  uid: data.studentUid || '',
                  userName: (data as any).studentName || 'Atleta',
                  userBelt: data.toBelt || 'Branca',
                  userStripes: data.toStripes ?? 0,
                  userPhoto: (data as any).studentPhoto || null,
                  type: 'promotion' as const,
                  newBelt: data.toBelt,
                  newStripes: data.toStripes ?? 0,
                  previousBelt: (data as any).previousBelt,
                  academyName: (data as any).academyName || '',
                  createdAt: (data as any).promotedAt,
                  createdAtStr: (data as any).promotedAtStr || '',
                }));
                // Carregar conquistas públicas (filtrar client-side por isPublic: true)
                const achList = await api.achievements.list();
                const achs: PublicAchievement[] = achList
                  .filter((a: any) => a.isPublic === true)
                  .map((data: any) => ({
                    id: data.id,
                    uid: data.uid || '',
                    userName: data.userName || 'Atleta',
                    userBelt: data.userBelt || 'Branca',
                    userStripes: data.userStripes ?? 0,
                    userPhoto: data.userPhoto || null,
                    type: 'achievement' as const,
                    achievementTitle: data.title || data.achievementTitle || '',
                    achievementIcon: data.icon || data.achievementIcon || '🏅',
                    achievementRarity: data.rarity || data.achievementRarity || 'comum',
                    createdAt: data.unlockedAt || data.createdAt,
                    createdAtStr: data.unlockedAtStr || data.createdAtStr || '',
                  }));
                const all = [...promos, ...achs].sort((a, b) => {
                  const ta = a.createdAt?.seconds || 0;
                  const tb = b.createdAt?.seconds || 0;
                  return tb - ta;
                });
                setAchievements(all);
              } catch { setAchievements([]); }
              finally { setAchievementsLoading(false); }
            }}
            beltColors={BELT_COLORS}
            formatTimeAgo={formatTimeAgo}
          />
        )}

        {/* ─── FEED (COMUNIDADE) TAB ─────────────────────────────────────────── */}
        {activeTab === 'feed' && (
          <div
            ref={feedContainerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ position: 'relative' }}
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

            {/* Âncora para scroll ao topo após publicar */}
            <div ref={feedTopRef} />

            {/* Caixa de novo post */}
            {!showNewPost ? (
              <button onClick={() => setShowNewPost(true)} className="bjj-card !border-[#2A2A2A] !text-[#555] !text-[0.875rem] !font-['Barlow'] !p-[0.875rem] cursor-pointer w-full text-left">
                💬 Compartilhe algo com a comunidade...
              </button>
            ) : (
              <div className="bjj-card">
                <textarea
                  value={newPostText}
                  onChange={e => setNewPostText(e.target.value)}
                  placeholder="Compartilhe algo com a comunidade..."
                  rows={3}
                    className="bjj-input !bg-[#0A0A0A] !resize-none"
                />

                {/* Preview da foto */}
                {newPostPhotoPreview && (
                  <div style={{ position: 'relative' }}>
                    <img src={newPostPhotoPreview} alt="preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                    <button
                      onClick={() => { setNewPostPhoto(null); setNewPostPhotoPreview(null); }}
                      style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#FFF', cursor: 'pointer', borderRadius: '50%', width: '28px', height: '28px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >✕</button>
                  </div>
                )}

                {/* Input de foto oculto */}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { toast.error('Foto muito grande. Máximo 5MB.'); return; }
                    setNewPostPhoto(file);
                    const reader = new FileReader();
                    reader.onload = ev => setNewPostPhotoPreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }}
                />

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {/* Botão de foto */}
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="bjj-btn-ghost !border !border-[#2A2A2A] !text-[0.75rem]"
                  >
                    🖼️ {newPostPhoto ? 'FOTO ✓' : 'FOTO'}
                  </button>
                  <button onClick={() => { setShowNewPost(false); setNewPostPhoto(null); setNewPostPhotoPreview(null); }}                     className="bjj-btn-ghost !border !border-[#2A2A2A] !text-[0.875rem]">CANCELAR</button>
                  <button onClick={handleNewPost} disabled={postingPost || (!newPostText.trim() && !newPostPhoto)}                     className="bjj-btn-primary !flex-[2]">
                    {postingPost ? 'PUBLICANDO...' : 'PUBLICAR'}
                  </button>
                </div>
              </div>
            )}

            {communityRawPosts === null ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
            ) : (
              <>
                {/* Posts da comunidade */}
                {communityPosts.length === 0 ? (
                  <div className="bjj-card !text-center" style={{ padding: '2rem' }}>
                    <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📰</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM POST AINDA</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#444', marginTop: '0.5rem' }}>Seja o primeiro a compartilhar algo!</p>
                  </div>
                ) : null}
                {communityPosts.map((post) => {
                const beltColor = BELT_COLORS[post.authorBelt] || '#FFFFFF';
                const hasLiked = user && (post.likes || []).includes(user.uid);
                const isOwn = user && (post.uid === user.uid || post.authorUid === user.uid);
                const postTypeColor = post.type ? POST_TYPE_COLORS[post.type] || '#555' : '#555';

                return (
                  <div key={post.id} ref={(el) => { if (el) registerView(post.id); }} className="bjj-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${beltColor}`, background: beltColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {post.authorPhotoURL ? (
                            <img src={post.authorPhotoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.6rem', color: beltColor }}>{(post.authorName || 'A').substring(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFFFFF' }}>
                            {post.authorName}
                            {post.pinned && (
                              <span style={{ color: '#CC8800', fontSize: '0.65rem', marginLeft: '0.375rem', fontWeight: 700 }}>📌 FIXADO</span>
                            )}
                          </p>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: beltColor }}>
                            {`Faixa ${post.authorBelt}`}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#444' }}>{formatTimeAgo(post.createdAt)}</p>
                        {isSuperAdmin && (
                          <button onClick={() => handlePinPost(post)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '0.25rem', fontSize: '0.85rem' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#CC8800'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#333'; }}
                            title={post.pinned ? 'Desafixar' : 'Fixar no topo'}>
                            📌
                          </button>
                        )}
                        {isOwn && (
                          <button onClick={() => handleDeletePost(post.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '0.25rem' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#CC0000'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#333'; }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        )}
                        {canModerate && !isOwn && (
                          <button onClick={() => handleModDeletePost(post.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '0.25rem', fontSize: '0.85rem' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#CC0000'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#333'; }}
                            title='Excluir (moderação)'>
                            🚫
                          </button>
                        )}
                      </div>
                    </div>

                    {post.text && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#CCC', lineHeight: 1.6, marginBottom: '0.75rem', whiteSpace: 'pre-line' }}>{post.text}</p>}
                    {post.photoURL && <img src={post.photoURL} alt="" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', marginBottom: '0.75rem' }} />}
                    {post.trainingData && (
                      <div className="bjj-card !bg-[#0A0A0A] !border-[#CC000033]" style={{ borderLeft: '3px solid #CC0000' }}>
                        <div style={{ display: 'flex', flex: 1, gap: '1rem', flexWrap: 'wrap' }}>
                          {[
                            { label: 'TIPO', value: post.trainingData.sessionType || '—' },
                            { label: 'DURAÇÃO', value: post.trainingData.duration ? `${post.trainingData.duration}min` : '—' },
                            { label: 'XP', value: post.trainingData.xp ? `+${post.trainingData.xp}` : '—' },
                            { label: 'DATA', value: post.trainingData.date || '—' },
                          ].map(stat => (
                            <div key={stat.label} style={{ minWidth: '60px' }}>
                              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: stat.label === 'XP' ? '#CC0000' : '#FFF' }}>{stat.value}</p>
                            </div>
                          ))}
                        </div>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: '#333', textTransform: 'uppercase', alignSelf: 'flex-end' }}>🥋 TREINO BJJRATS</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button onClick={() => handleLike(post)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: hasLiked ? '#CC0000' : '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OSS</span>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: hasLiked ? '#CC0000' : '#555' }}>{(post.likes || []).length}</span>
                      </button>
                      <button onClick={() => handleToggleComments(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0' }}>
                        <span style={{ fontSize: '1rem' }}>💬</span>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: expandedComments.has(post.id) ? '#0D9E6E' : '#555' }}>{post.commentCount || 0}</span>
                      </button>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#333' }}>👁</span>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', color: '#333' }}>{post.viewCount || (post.viewedBy || []).length || 0}</span>
                      </div>
                    </div>

                    {/* Seção de comentários expansível */}
                    {expandedComments.has(post.id) && (
                      <div style={{ marginTop: '0.75rem', borderTop: '1px solid #1E1E1E', paddingTop: '0.75rem' }}>
                        {loadingComments.has(post.id) ? (
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#444', textAlign: 'center', padding: '0.5rem' }}>CARREGANDO...</p>
                        ) : (comments[post.id] || []).length === 0 ? (
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#444', textAlign: 'center', padding: '0.5rem' }}>NENHUM COMENTÁRIO AINDA</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            {(comments[post.id] || []).map(c => {
                              const cBelt = BELT_COLORS[c.authorBelt] || '#FFFFFF';
                              return (
                                <div key={c.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: `1.5px solid ${cBelt}`, background: cBelt + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                    {c.authorPhotoURL
                                      ? <img src={c.authorPhotoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      : <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.55rem', color: cBelt }}>{(c.authorName || 'A')[0].toUpperCase()}</span>
                                    }
                                  </div>
                                  <div className="bjj-card !bg-[#0A0A0A] !p-[0.375rem_0.625rem]" style={{ border: '1px solid #1E1E1E' }}>
                                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: cBelt, marginBottom: '0.2rem' }}>{c.authorName}</p>
                                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#CCC', lineHeight: 1.4 }}>{c.text}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Campo de novo comentário */}
                        {user && (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={commentText[post.id] || ''}
                              onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') handlePostComment(post); }}
                              placeholder="Escreva um comentário..."
                              className="bjj-input !bg-[#0A0A0A] !text-[0.8rem] !p-[0.5rem_0.75rem]"
                            />
                            <button
                              onClick={() => handlePostComment(post)}
                              disabled={postingComment === post.id || !(commentText[post.id] || '').trim()}
                              className="bjj-btn-primary !text-[0.75rem] !px-3 !py-[0.5rem] !w-auto"
                            >
                              {postingComment === post.id ? '...' : 'OK'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </>
            )}
          </div>
        )}

        {/* ─── RANKING TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'ranking' && (
          <RankingList title="RANKING GERAL" />
        )}

        {/* ─── DESAFIOS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'challenges' && (
          <>
            {challengesLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
            ) : challenges.length === 0 ? (
              <div className="bjj-card !text-center" style={{ padding: '2rem' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚔️</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM DESAFIO ATIVO</p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#444', marginTop: '0.5rem' }}>Os desafios criados pelo seu professor aparecerão aqui.</p>
              </div>
            ) : (
              challenges.map(ch => {
                const progress = ch.myProgress || 0;
                const pct = Math.min(100, Math.round((progress / ch.goal) * 100));
                const goalLabel = ch.goalType === 'trainings' ? 'treinos' : ch.goalType === 'minutes' ? 'min' : 'XP';
                const isCompleted = pct >= 100;
                const now = new Date();
                const end = new Date(ch.endDate);
                const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));

                return (
                  <div key={ch.id} className="bjj-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                      <div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFFFFF' }}>{ch.title}</p>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', marginTop: '0.2rem' }}>{ch.startDate} → {ch.endDate} · {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Encerrado'}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0 }}>
                        {canModerate && (
                          <button onClick={() => handleModDeleteChallenge(ch.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '0.85rem', padding: '0.1rem' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#CC0000'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#333'; }}
                            title='Excluir desafio (moderação)'>
                            🚫
                          </button>
                        )}
                        <span style={{ background: '#FFD70022', border: '1px solid #FFD700', color: '#FFD700', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', flexShrink: 0 }}>+{ch.xpReward} XP</span>
                      </div>
                    </div>

                    {ch.description && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', lineHeight: 1.5, marginBottom: '0.75rem' }}>{ch.description}</p>}

                    {/* Barra de progresso */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase' }}>MEU PROGRESSO</p>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: isCompleted ? '#CC8800' : '#CC0000' }}>
                          {progress}/{ch.goal} {goalLabel} ({pct}%)
                        </p>
                      </div>
                      <div style={{ background: '#0D0D0D', height: '6px', borderRadius: '3px' }}>
                        <div style={{ background: isCompleted ? '#CC8800' : '#CC0000', height: '6px', borderRadius: '3px', width: `${pct}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>

                    {isCompleted && (
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#CC8800', textAlign: 'center', padding: '0.375rem', background: '#CC880011', border: '1px solid #CC8800' }}>
                        🏆 DESAFIO CONCLUÍDO!
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

          {/* ─── EVENTOS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'events' && (
          <>
            {/* Botão criar evento — apenas professores */}
            {profile?.role === 'professor' && (
              <button
                onClick={() => toast.info('Crie eventos pelo Painel do Professor → aba EVENTOS')}
                style={{ background: '#CC000022', border: '1px solid #CC0000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.75rem', cursor: 'pointer', width: '100%' }}
              >
                + CRIAR EVENTO (via Painel do Professor)
              </button>
            )}

            {eventsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>CARREGANDO...</div>
            ) : events.length === 0 ? (
              <div className="bjj-card !text-center" style={{ padding: '2rem' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM EVENTO</p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#444', marginTop: '0.5rem' }}>Eventos criados por professores aparecerão aqui.</p>
              </div>
            ) : (
              events.map(ev => {
                const color = EVENT_TYPE_COLORS[ev.type] || '#CC0000';
                const label = EVENT_TYPE_LABELS[ev.type] || 'EVENTO';
                const isIn = user && (ev.registrations || []).includes(user.uid);
                const slots = ev.slots ? parseInt(String(ev.slots)) : null;
                const registered = (ev.registrations || []).length;
                const isFull = slots !== null && registered >= slots;

                return (
                  <div key={ev.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: `3px solid ${color}`, padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFFFFF' }}>{ev.title}</p>
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>
                          📅 {ev.date}{ev.time ? ` às ${ev.time}` : ''}
                          {ev.location ? ` · 📍 ${ev.location}` : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0 }}>
                        {canModerate && (
                          <button onClick={() => handleModDeleteEvent(ev.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '0.85rem', padding: '0.1rem' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#CC0000'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#333'; }}
                            title='Excluir evento (moderação)'>
                            🚫
                          </button>
                        )}
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.2rem 0.5rem', border: `1px solid ${color}`, color, background: color + '20', flexShrink: 0 }}>
                          {label}
                        </span>
                      </div>
                    </div>

                    {ev.description && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', lineHeight: 1.5, marginBottom: '0.625rem' }}>{ev.description}</p>}

                    {/* Barra de vagas */}
                    {slots && (
                      <div style={{ marginTop: '0.375rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#555' }}>{registered}/{slots} vagas{ev.price ? ` · ${ev.price}` : ''}</span>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: isFull ? '#CC0000' : '#555' }}>{isFull ? 'LOTADO' : `${slots - registered} restante${slots - registered !== 1 ? 's' : ''}`}</span>
                        </div>
                        <div style={{ background: '#0D0D0D', height: '3px', width: '100%' }}>
                          <div style={{ background: color, height: '3px', width: `${Math.min(100, (registered / slots) * 100)}%`, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    )}
                    {!slots && registered > 0 && (
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', marginTop: '0.25rem' }}>
                        {registered} inscrito{registered !== 1 ? 's' : ''}{ev.price ? ` · ${ev.price}` : ''}
                      </p>
                    )}

                    {/* Botão inscrição */}
                    <button
                      onClick={() => handleRegisterEvent(ev)}
                      disabled={!isIn && isFull}
                      style={{
                        background: isIn ? '#0A2A1A' : isFull ? '#111' : '#0A2A1A',
                        border: `1px solid ${isIn ? '#0D9E6E' : isFull ? '#333' : '#0D9E6E'}`,
                        color: isIn ? '#0D9E6E' : isFull ? '#444' : '#0D9E6E',
                        fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem',
                        textTransform: 'uppercase', padding: '0.5rem 0.875rem', cursor: isIn || !isFull ? 'pointer' : 'default',
                        letterSpacing: '0.05em', width: '100%', marginTop: '0.5rem',
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                      }}
                    >
                      {isIn ? '✅ INSCRITO — CANCELAR' : isFull ? '🔒 VAGAS ESGOTADAS' : '📋 INSCREVER-SE'}
                    </button>

                    {/* Lista de inscritos */}
                    {(ev.registrations || []).length > 0 && (
                      <div style={{ borderTop: '1px solid #1E1E1E', paddingTop: '0.625rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', textTransform: 'uppercase', color: '#444', letterSpacing: '0.05em', margin: 0 }}>INSCRITOS</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {(ev.registrations || []).map(uid => {
                            const rName = ev.registrationNames?.[uid] || 'Atleta';
                            const rBelt = ev.registrationBelts?.[uid] || 'Branca';
                            const rColor = BELT_COLORS[rBelt] || '#FFFFFF';
                            return (
                              <div key={uid} style={{
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                background: '#0A0A0A', border: `1px solid ${rColor}33`,
                                padding: '0.2rem 0.5rem',
                              }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: rColor, border: rBelt === 'Branca' ? '1px solid #444' : 'none', flexShrink: 0 }} />
                                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#CCC', fontWeight: 700 }}>{rName.split(' ')[0]}</span>
                                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.55rem', color: rColor, textTransform: 'uppercase' }}>{rBelt}</span>
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
          </>
        )}

        {/* ─── LOCALIZE UMA ACADEMIA TAB ───────────────────────────────── */}
        {activeTab === 'localize' && <LocalizarAcademiaTab />}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── ConquistasTab ────────────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, string> = {
  comum: '#555',
  raro: '#1A6ECC',
  epico: '#8B2FC9',
  lendario: '#CC8800',
};

const RARITY_LABELS: Record<string, string> = {
  comum: 'COMUM',
  raro: 'RARO',
  epico: 'ÉPICO',
  lendario: 'LENDÁRIO',
};

function ConquistasTab({
  achievements,
  loading,
  onLoad,
  beltColors,
  formatTimeAgo,
}: {
  achievements: PublicAchievement[];
  loading: boolean;
  onLoad: () => void;
  beltColors: Record<string, string>;
  formatTimeAgo: (ts: any) => string;
}) {
  useEffect(() => { onLoad(); }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>
        CARREGANDO...
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏅</p>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUMA CONQUISTA AINDA</p>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#444', marginTop: '0.5rem', lineHeight: 1.5 }}>
          Quando atletas forem promovidos ou desbloquearem conquistas, aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.08em' }}>
          {achievements.length} CONQUISTA{achievements.length !== 1 ? 'S' : ''} RECENTES
        </p>
      </div>
      {achievements.map(item => {
        const beltColor = beltColors[item.userBelt] || '#555';
        const isPromo = item.type === 'promotion';
        const rarityColor = isPromo ? beltColor : (RARITY_COLORS[item.achievementRarity || 'comum'] || '#555');
        const rarityLabel = isPromo ? 'PROMOÇÃO' : (RARITY_LABELS[item.achievementRarity || 'comum'] || 'COMUM');

        return (
          <div
            key={item.id}
            style={{
              background: '#111',
              border: '1px solid #1E1E1E',
              borderLeft: `3px solid ${rarityColor}`,
              padding: '0.875rem 1rem',
              display: 'flex',
              gap: '0.875rem',
              alignItems: 'flex-start',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden',
              border: `2px solid ${beltColor}`, flexShrink: 0, background: '#1A1A1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {item.userPhoto
                ? <img src={item.userPhoto} alt={item.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '1.25rem' }}>🥋</span>
              }
            </div>

            {/* Conteúdo */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1 }}>
                    {item.userName}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: beltColor, border: item.userBelt === 'Branca' ? '1px solid #444' : 'none', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#888', textTransform: 'uppercase' }}>
                      {item.userBelt}{(item.userStripes ?? 0) > 0 ? ` · ${item.userStripes}º` : ''}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                  <span style={{
                    background: rarityColor + '22', border: `1px solid ${rarityColor}`,
                    color: rarityColor, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
                    fontSize: '0.55rem', textTransform: 'uppercase', padding: '0.1rem 0.375rem', letterSpacing: '0.05em',
                  }}>{rarityLabel}</span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#444' }}>
                    {formatTimeAgo(item.createdAt)}
                  </span>
                </div>
              </div>

              {/* Descrição da conquista ou promoção */}
              {isPromo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🏅</span>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFF', lineHeight: 1 }}>
                      PROMOVIDO PARA FAIXA {(item.newBelt || '').toUpperCase()}
                      {(item.newStripes ?? 0) > 0 ? ` · ${item.newStripes}º GRAU` : ''}
                    </p>
                    {item.previousBelt && (
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', marginTop: '0.15rem' }}>
                        Antes: Faixa {item.previousBelt}
                        {item.academyName ? ` · ${item.academyName}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{item.achievementIcon || '🏅'}</span>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#FFF', lineHeight: 1.2 }}>
                    {item.achievementTitle || 'CONQUISTA DESBLOQUEADA'}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── LocalizarAcademiaTab ─────────────────────────────────────────────────────

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
];

const CIDADES_POR_ESTADO: Record<string, string[]> = {
  AC: ['Acrelândia','Assis Brasil','Brasiléia','Bujari','Capixaba','Cruzeiro do Sul','Epitaciolândia','Feijó','Jordão','Mâncio Lima','Manoel Urbano','Marechal Thaumaturgo','Plácido de Castro','Porto Acre','Porto Walter','Rio Branco','Rodrigues Alves','Santa Rosa do Purus','Sena Madureira','Senador Guiomard','Tarauacá','Xapuri'],
  AL: ['Arapiraca','Batalha','Campo Alegre','Coruripe','Delmiro Gouveia','Maceió','Palmeira dos Índios','Penedo','Rio Largo','Santana do Ipanema','São Miguel dos Campos','União dos Palmares'],
  AP: ['Amapá','Calçoene','Cutias','Ferreira Gomes','Itaubal','Laranjal do Jari','Macapá','Mazagão','Oiapoque','Pedra Branca do Amapari','Porto Grande','Pracuúba','Santana','Serra do Navio','Tartarugalzinho','Vitória do Jari'],
  AM: ['Autazes','Barcelos','Benjamin Constant','Borba','Carauari','Coari','Eirunepé','Humaitá','Itacoatiara','Itamarati','Lábrea','Manacapuru','Manaus','Maués','Novo Airão','Parintins','Tabatinga','Tefé'],
  BA: ['Alagoinhas','Barreiras','Camaçari','Cruz das Almas','Eunápolis','Feira de Santana','Ibicaraí','Ilhéus','Itabuna','Itapetinga','Jequié','Juazeiro','Lauro de Freitas','Paulo Afonso','Porto Seguro','Salvador','Santo Antônio de Jesus','Senhor do Bonfim','Simões Filho','Teixeira de Freitas','Valença','Vitória da Conquista'],
  CE: ['Caucaia','Crato','Fortaleza','Iguatu','Itapipoca','Juazeiro do Norte','Maracanaú','Maranguape','Pacatuba','Quixadá','Russas','Sobral'],
  DF: ['Águas Claras','Brazlândia','Brasília','Ceilândia','Cruzeiro','Gama','Guará','Lago Norte','Lago Sul','Núcleo Bandeirante','Park Way','Planaltina','Riacho Fundo','Samambaia','Santa Maria','São Sebastião','Sobradinho','Taguatinga'],
  ES: ['Afonso Cláudio','Alegre','Anchieta','Aracruz','Barra de São Francisco','Cachoeiro de Itapemirim','Cariacica','Colatina','Domingos Martins','Ecoporanga','Guarapari','Itapemirim','João Neiva','Linhares','Marataízes','Mimoso do Sul','Montanha','Mucurici','Nova Venécia','Piúma','Santa Maria de Jetibá','São Gabriel da Palha','São Mateus','Serra','Viana','Vila Velha','Vitória'],
  GO: ['Águas Lindas de Goiás','Anápolis','Aparecida de Goiânia','Caldas Novas','Catalão','Formosa','Goiânia','Goiás','Itumbiara','Jataí','Luziânia','Mineiros','Morrinhos','Niquelândia','Planaltina','Rio Verde','Senador Canedo','Trindade','Valparaíso de Goiás'],
  MA: ['Açailândia','Bacabal','Barra do Corda','Caxias','Chapadinha','Codó','Coroatá','Grajaú','Imperatriz','Paço do Lumiar','Pinheiro','Santa Inês','São João dos Patos','São Luís','Timon','Viana','Zé Doca'],
  MT: ['Alta Floresta','Barra do Garças','Cáceres','Campo Novo do Parecis','Colider','Cuiabá','Juara','Juína','Lucas do Rio Verde','Matupá','Pontes e Lacerda','Primavera do Leste','Rondonópolis','Sinop','Sorriso','Tangará da Serra','Várzea Grande'],
  MS: ['Aquidauana','Campo Grande','Corumbá','Coxim','Dourados','Maracaju','Naviraí','Nova Andradina','Paranaíba','Ponta Porã','Sidrolândia','Três Lagoas'],
  MG: ['Araguari','Araxá','Barbacena','Belo Horizonte','Betim','Conselheiro Lafaiete','Contagem','Coronel Fabriciano','Divinópolis','Governador Valadares','Ipatinga','Itabira','Itajubá','Juiz de Fora','Lavras','Leopoldina','Mariana','Montes Claros','Muriaé','Nova Lima','Ouro Preto','Passos','Patos de Minas','Poços de Caldas','Pouso Alegre','Ribeirão das Neves','Sabará','Santa Luzia','Santos Dumont','São João del-Rei','São Sebastião do Paraíso','Sete Lagoas','Teófilo Otoni','Ubá','Uberaba','Uberlândia','Unaí','Varginha','Viçosa'],
  PA: ['Abaetetuba','Altamira','Ananindeua','Belém','Bragança','Cametá','Castanhal','Itaituba','Marabá','Marituba','Paragominas','Parauapebas','Redenção','Santarém','Tailândia','Tucuruí'],
  PB: ['Bayeux','Cajazeiras','Campina Grande','Guarabira','João Pessoa','Patos','Santa Rita','Sousa'],
  PR: ['Apucarana','Araucária','Campo Largo','Cascavel','Colombo','Curitiba','Foz do Iguaçu','Francisco Beltrão','Guarapuava','Londrina','Maringá','Paranaguá','Pinhais','Ponta Grossa','São José dos Pinhais','Toledo','Umuarama'],
  PE: ['Cabo de Santo Agostinho','Caruaru','Garanhuns','Jaboatão dos Guararapes','Olinda','Paulista','Petrolina','Recife','São Lourenço da Mata','Vitória de Santo Antão'],
  PI: ['Campo Maior','Floriano','Parnaíba','Picos','Piripiri','Teresina'],
  RJ: ['Angra dos Reis','Belford Roxo','Cabo Frio','Campos dos Goytacazes','Duque de Caxias','Itaboraí','Macaé','Mesquita','Nilópolis','Niterói','Nova Friburgo','Nova Iguaçu','Petrópolis','Queimados','Rio de Janeiro','São Gonçalo','São João de Meriti','Teresópolis','Volta Redonda'],
  RN: ['Caicó','Ceará-Mirim','Macaíba','Mossoró','Natal','Parnamirim','São Gonçalo do Amarante'],
  RS: ['Alvorada','Bagé','Bento Gonçalves','Cachoeirinha','Canoas','Caxias do Sul','Erechim','Gravataí','Guaíba','Lajeado','Montenegro','Novo Hamburgo','Pelotas','Porto Alegre','Rio Grande','Santa Cruz do Sul','Santa Maria','São Leopoldo','Sapucaia do Sul','Uruguaiana','Viamão'],
  RO: ['Ariquemes','Cacoal','Ji-Paraná','Jaru','Ouro Preto do Oeste','Porto Velho','Rolim de Moura','Vilhena'],
  RR: ['Alto Alegre','Boa Vista','Bonfim','Cantá','Caracaraí','Mucajaí','Rorainópolis'],
  SC: ['Balneário Camboriú','Biguaçu','Blumenau','Caçador','Chapecó','Criciúma','Florianópolis','Itajaí','Jaraguá do Sul','Joinville','Lages','Palhoça','Rio do Sul','São José','São Miguel do Oeste','Tubarão'],
  SP: ['Araçatuba','Araraquara','Barueri','Bauru','Carapicuíba','Cotia','Diadema','Embu das Artes','Franca','Guarujá','Guarulhos','Itaquaquecetuba','Jacareí','Jundiaí','Limeira','Marília','Mauá','Mogi das Cruzes','Mogi Guaçu','Osasco','Piracicaba','Praia Grande','Presidente Prudente','Ribeirão Preto','Santo André','Santos','São Bernardo do Campo','São Caetano do Sul','São José do Rio Preto','São José dos Campos','São Paulo','São Vicente','Sorocaba','Suzano','Taboão da Serra','Taubaté'],
  SE: ['Aracaju','Barra dos Coqueiros','Estância','Itabaiana','Lagarto','Nossa Senhora do Socorro','São Cristóvão'],
  TO: ['Araguaína','Araguatins','Arraias','Colinas do Tocantins','Dianópolis','Gurupi','Palmas','Paraíso do Tocantins','Porto Nacional','Tocantinópolis'],
};

interface AcademyListing {
  id: string;
  name: string;
  ownerName?: string;
  ownerUid?: string;
  city?: string;
  state?: string;
  logoUrl?: string;
  membersCount?: number;
  style?: string;
  address?: string;
  phone?: string;
  instagram?: string;
  monthlyFee?: number;
  dailyFee?: number;
  pixKey?: string;
  avgRating?: number;
  ratingCount?: number;
  lat?: number;
  lng?: number;
  franchise?: string;
  photoUrls?: string[];
}

interface AcademyReview {
  id: string;
  uid: string;
  authorName: string;
  authorBelt: string;
  rating: number;
  comment: string;
  createdAt?: any;
}

function LocalizarAcademiaTab() {
  const { user, profile, updateProfileData } = useAuth();
  const [academies, setAcademies] = useState<AcademyListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Modal expandido de academia
  const [expandedAcademy, setExpandedAcademy] = useState<AcademyListing | null>(null);
  const [expandedSchedules, setExpandedSchedules] = useState<any[]>([]);
  const [expandedSchedulesLoading, setExpandedSchedulesLoading] = useState(false);
  const [expandedPhotoIdx, setExpandedPhotoIdx] = useState(0);

  // Modal QUERO TREINAR AQUI
  const [trainModal, setTrainModal] = useState<AcademyListing | null>(null);
  const [trainType, setTrainType] = useState<'matricula' | 'diaria' | null>(null);
  const [trainBilling, setTrainBilling] = useState<'prorata' | 'corrido' | null>(null);
  const [sendingTrain, setSendingTrain] = useState(false);
  // Dados do solicitante
  const [trainName, setTrainName] = useState('');
  const [trainCpf, setTrainCpf] = useState('');
  const [trainBelt, setTrainBelt] = useState('');
  // Waiver
  const [academyWaiverText, setAcademyWaiverText] = useState('');
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [loadingWaiver, setLoadingWaiver] = useState(false);

  // Modal de Avaliações
  const [reviewModal, setReviewModal] = useState<AcademyListing | null>(null);
  const [reviews, setReviews] = useState<AcademyReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const profs = await api.users.list({ role: 'admin' });
        const list: AcademyListing[] = profs
          .filter(p => (p as any).academyName || (p as any).academy)
          .map(p => ({
            id: (p as any).uid,
            name: (p as any).academyName || (p as any).academy || '',
            ownerName: p.name,
            ownerUid: (p as any).uid,
            city: (p as any).academyCity || '',
            state: (p as any).academyState || '',
            logoUrl: (p as any).academyLogoUrl || '',
            address: (p as any).academyAddress || '',
            phone: (p as any).academyPhone || '',
            instagram: (p as any).academyInstagram || '',
            monthlyFee: (p as any).monthlyFee,
            dailyFee: (p as any).dailyFee,
            pixKey: (p as any).pixKey || '',
            membersCount: (p as any).membersCount,
            style: (p as any).style,
            franchise: (p as any).franchise,
          }));
        setAcademies(list);
      } catch { /* silencioso */ }
      finally { setLoading(false); setLoaded(true); }
    };
    load();
  }, []);

  // Carregar horários de uma academia para o modal expandido
  const loadExpandedSchedules = async (academyId: string) => {
    setExpandedSchedulesLoading(true);
    try {
      const list = await api.classes.listSchedules(academyId);
      // Ordenar por dia da semana e hora no cliente
      const dayOrder: Record<string, number> = { 'seg': 0, 'ter': 1, 'qua': 2, 'qui': 3, 'sex': 4, 'sab': 5, 'dom': 6 };
      (list as any[]).sort((a: any, b: any) => {
        const dA = Math.min(...(a.days || []).map((d: string) => dayOrder[d] ?? 9));
        const dB = Math.min(...(b.days || []).map((d: string) => dayOrder[d] ?? 9));
        if (dA !== dB) return dA - dB;
        return (a.time || '').localeCompare(b.time || '');
      });
      setExpandedSchedules(list as any[]);
    } catch { setExpandedSchedules([]); }
    finally { setExpandedSchedulesLoading(false); }
  };

  // Carregar avaliações de uma academia
  const loadReviews = async (_academyId: string) => {
    setReviewsLoading(true);
    try {
      // Sem endpoint REST equivalente — avaliações indisponíveis
      setReviews([]);
      setMyRating(0);
      setReviewComment('');
    } catch { /* silencioso */ }
    finally { setReviewsLoading(false); }
  };

  // Enviar solicitação QUERO TREINAR AQUI — matrícula/diária automática, professor só é notificado
  const handleSendTrainRequest = async () => {
    if (!user || !profile || !trainModal || !trainType) return;
    setSendingTrain(true);
    try {
      const senderName = trainName.trim() || profile.name;
      const senderBelt = trainBelt || (profile as any).belt || 'branca';
      const professorUid = trainModal.ownerUid || trainModal.id;
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      if (trainType === 'matricula') {
        // Calcular primeira cobrança
        const billingMode = trainBilling || 'prorata';
        let firstDueDate: string;
        let firstAmount: number;
        const fee = trainModal.monthlyFee || 0;
        if (billingMode === 'prorata') {
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          const daysRemaining = daysInMonth - today.getDate() + 1;
          firstAmount = Math.round((fee / daysInMonth) * daysRemaining * 100) / 100;
          const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 5);
          firstDueDate = nextMonth.toISOString().slice(0, 10);
        } else {
          firstAmount = fee;
          const due = new Date(today);
          due.setDate(due.getDate() + 30);
          firstDueDate = due.toISOString().slice(0, 10);
        }
        const firstMonth = firstDueDate.slice(0, 7);

        // Criar matrícula
        const enrollRef = await api.enrollments.create({
          studentUid: user.uid,
          studentName: senderName,
          studentEmail: (profile as any).email || '',
          studentBelt: senderBelt,
          studentCpf: trainCpf.trim() || null,
          professorUid,
          academyId: trainModal.id,
          academyName: trainModal.name,
          monthlyFee: fee,
          billingMode,
          dueDay: billingMode === 'prorata' ? 5 : today.getDate(),
          pixKey: trainModal.pixKey || '',
          status: 'active',
        } as any);

        // Gerar primeira cobrança
        if (fee > 0) {
          await api.payments.create({
            enrollmentId: enrollRef.id,
            studentUid: user.uid,
            studentName: senderName,
            studentEmail: (profile as any).email || '',
            professorUid,
            amount: firstAmount,
            dueDate: firstDueDate,
            paidAt: null,
            status: 'pending',
            pixKey: trainModal.pixKey || '',
            notifiedDue: false,
            notifiedOverdue: false,
            month: firstMonth,
            isFirstPayment: true,
            billingMode,
          } as any);

          // Notificação in-app para o próprio aluno
          await api.notifications.create({
            toUid: user.uid,
            type: 'payment_generated',
            title: '💰 1ª MENSALIDADE GERADA',
            message: `Matrícula em ${trainModal.name} confirmada! Valor: R$ ${firstAmount.toFixed(2)} — vence ${new Date(firstDueDate + 'T00:00:00').toLocaleDateString('pt-BR')}${trainModal.pixKey ? `. PIX: ${trainModal.pixKey}` : ''}`,
            amount: firstAmount,
            dueDate: firstDueDate,
            pixKey: trainModal.pixKey || '',
            read: false,
          } as any);
        }

        // Notificar professor (só informativo)
        await api.notifications.create({
          recipientUid: professorUid,
          toUid: professorUid,
          type: 'new_member',
          studentUid: user.uid,
          studentName: senderName,
          studentBelt: senderBelt,
          studentStripes: (profile as any).stripes ?? 0,
          studentPhoto: (profile as any).photo || null,
          academyName: trainModal.name,
          message: `${senderName} se matriculou em ${trainModal.name}`,
          read: false,
        } as any);

        // Salvar academyId no perfil do aluno para habilitar feed da academia
        try {
          await api.users.update(user.uid, { academyId: professorUid, academy: trainModal.name } as any);
          // Atualizar profile local para que o TrainingShareModal habilite o botão imediatamente
          updateProfileData({ academyId: professorUid, academy: trainModal.name });
        } catch { /* silencioso */ }

        toast.success(`🎓 Matrícula confirmada em ${trainModal.name}!`);

      } else {
        // Aula avulsa: apenas notificar professor (sem dailyVisits)
        await api.notifications.create({
          recipientUid: professorUid,
          toUid: professorUid,
          type: 'daily_visit',
          studentUid: user.uid,
          studentName: senderName,
          studentBelt: senderBelt,
          studentPhoto: (profile as any).photo || null,
          academyName: trainModal.name,
          message: `${senderName} quer fazer uma aula avulsa${trainModal.dailyFee ? ` (R$ ${trainModal.dailyFee})` : ''}`,
          dailyFee: trainModal.dailyFee || 0,
          pixKey: trainModal.pixKey || '',
          read: false,
        } as any);

        toast.success(`📅 Solicitação de aula avulsa enviada! O professor foi notificado.`);
      }

      setTrainModal(null);
      setTrainType(null);
      setTrainBilling(null);
      setTrainName(''); setTrainCpf(''); setTrainBelt('');
    } catch (err: any) { console.error(err); toast.error(err?.message || 'Erro ao processar solicitação.'); }
    finally { setSendingTrain(false); }
  };

  // Salvar avaliação
  const handleSaveReview = async () => {
    // Avaliações não estão disponíveis via REST API no momento
    toast.info('Avaliações temporariamente indisponíveis.');
  };

  const filtered = academies.filter(a => {
    const matchState = !filterState || (a.state || '').trim().toUpperCase() === filterState;
    const matchCity = !filterCity || (a.city || '').toLowerCase().includes(filterCity.toLowerCase());
    const matchSearch = !search || (a.name || '').toLowerCase().includes(search.toLowerCase()) || (a.ownerName || '').toLowerCase().includes(search.toLowerCase());
    return matchState && matchCity && matchSearch;
  });

  // Cidades disponíveis para o estado selecionado (lista estática)
  const cities = filterState ? (CIDADES_POR_ESTADO[filterState] ?? []) : [];

  const S = {
    label: { fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
    btn: (color: string) => ({ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' as const, padding: '0.25rem 0.625rem', background: `${color}22`, border: `1px solid ${color}`, color, cursor: 'pointer', letterSpacing: '0.04em' }),
    bigBtn: (color: string, active?: boolean) => ({ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' as const, padding: '0.625rem 1rem', background: active ? color : `${color}22`, border: `1px solid ${color}`, color: active ? '#000' : color, cursor: 'pointer', flex: 1, letterSpacing: '0.06em' }),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Cabeçalho + toggle lista/mapa */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ borderLeft: '3px solid #CC0000', paddingLeft: '0.75rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF' }}>
            📍 LOCALIZE UMA ACADEMIA
          </p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', marginTop: '0.25rem' }}>
            Encontre academias de Jiu-Jitsu cadastradas no BJJRats.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
          <button onClick={() => setViewMode('list')} style={{ ...S.btn(viewMode === 'list' ? '#CC0000' : '#444'), background: viewMode === 'list' ? '#CC000033' : 'transparent' }}>📋 LISTA</button>
          <button onClick={() => setViewMode('map')} style={{ ...S.btn(viewMode === 'map' ? '#CC0000' : '#444'), background: viewMode === 'map' ? '#CC000033' : 'transparent' }}>🗺️ MAPA</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Busca por nome */}
        <input
          type="text"
          placeholder="Buscar por nome da academia ou professor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFF',
            fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {/* Estado */}
          <select
            value={filterState}
            onChange={e => { setFilterState(e.target.value); setFilterCity(''); }}
            style={{
              background: '#111', border: '1px solid #2A2A2A', color: filterState ? '#FFF' : '#555',
              fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem',
              textTransform: 'uppercase', padding: '0.625rem 0.5rem', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="">TODOS OS ESTADOS</option>
            {ESTADOS_BR.map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          {/* Cidade */}
          <select
            value={filterCity}
            onChange={e => setFilterCity(e.target.value)}
            disabled={!filterState}
            style={{
              background: '#111', border: '1px solid #2A2A2A',
              color: filterCity ? '#FFF' : '#555',
              fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem',
              textTransform: 'uppercase', padding: '0.625rem 0.5rem',
              cursor: filterState ? 'pointer' : 'not-allowed', outline: 'none',
              opacity: filterState ? 1 : 0.4,
            }}
          >
            <option value="">{filterState ? 'TODAS AS CIDADES' : 'SELECIONE O ESTADO'}</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Contador */}
      {loaded && (
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {filtered.length} academia{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          {(filterState || filterCity || search) ? ` · ${filterState || 'TODOS'}${filterCity ? ` / ${filterCity.toUpperCase()}` : ''}` : ''}
        </p>
      )}

      {/* Mapa */}
      {viewMode === 'map' && (
        <div style={{ border: '1px solid #2A2A2A', overflow: 'hidden' }}>
          <AcademyMap academies={filtered} />
        </div>
      )}

      {/* Lista */}
      {viewMode === 'list' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>
            CARREGANDO...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🥋</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>
              {academies.length === 0 ? 'NENHUMA ACADEMIA CADASTRADA' : 'NENHUMA ACADEMIA ENCONTRADA'}
            </p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444', marginTop: '0.5rem' }}>
              {academies.length === 0 ? 'Academias cadastradas por professores aparecerão aqui.' : 'Tente outros filtros ou busque por nome.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map(academy => (
              <div key={academy.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: '3px solid #CC0000', padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                  {/* Logo */}
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #CC0000', flexShrink: 0, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {academy.logoUrl ? <img src={academy.logoUrl} alt={academy.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.5rem' }}>🥋</span>}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <p
                        onClick={() => { setExpandedAcademy(academy); setExpandedPhotoIdx(0); loadExpandedSchedules(academy.id); }}
                        style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#CC0000', marginBottom: '0.125rem', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#CC000055' }}
                      >{academy.name}</p>
                      {/* Estrelas média */}
                      {academy.avgRating && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                          <span style={{ color: '#FFD700', fontSize: '0.75rem' }}>{'★'.repeat(Math.round(academy.avgRating))}{'☆'.repeat(5 - Math.round(academy.avgRating))}</span>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#888' }}>{academy.avgRating.toFixed(1)} ({academy.ratingCount})</span>
                        </div>
                      )}
                    </div>
                    {academy.ownerName && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>Prof. {academy.ownerName}</p>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem' }}>
                      {(academy.state || academy.city) && <span style={{ ...S.label, padding: '0.15rem 0.5rem', border: '1px solid #CC0000', color: '#CC0000', background: '#CC000015' }}>📍 {[academy.city, academy.state].filter(Boolean).join(' — ')}</span>}
                      {!!academy.membersCount && <span style={{ ...S.label, padding: '0.15rem 0.5rem', border: '1px solid #333', color: '#888' }}>👥 {academy.membersCount} aluno{academy.membersCount !== 1 ? 's' : ''}</span>}
                      {academy.style && <span style={{ ...S.label, padding: '0.15rem 0.5rem', border: '1px solid #333', color: '#888' }}>🥋 {academy.style}</span>}
                      {academy.monthlyFee && <span style={{ ...S.label, padding: '0.15rem 0.5rem', border: '1px solid #FFD700', color: '#FFD700', background: '#FFD70015' }}>R$ {academy.monthlyFee}/mês</span>}
                      {academy.dailyFee && <span style={{ ...S.label, padding: '0.15rem 0.5rem', border: '1px solid #888', color: '#888' }}>Diária R$ {academy.dailyFee}</span>}
                    </div>
                    {academy.address && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.375rem' }}>{academy.address}</p>}
                    {/* Botões de contato */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {academy.phone && <a href={`https://wa.me/55${academy.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ ...S.btn('#25D366'), textDecoration: 'none' }}>📱 WHATSAPP</a>}
                      {academy.instagram && <a href={`https://instagram.com/${academy.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ ...S.btn('#E1306C'), textDecoration: 'none' }}>📸 INSTAGRAM</a>}
                      <button onClick={() => { setReviewModal(academy); loadReviews(academy.id); }} style={S.btn('#FFD700')}>★ AVALIAR</button>
                    </div>
                    {/* Botão QUERO TREINAR AQUI */}
                    {user && (
                      <button
                        onClick={() => { setTrainModal(academy); setTrainType(null); setTrainBilling(null); }}
                        style={{ marginTop: '0.75rem', width: '100%', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', padding: '0.625rem', background: '#CC0000', border: 'none', color: '#FFF', cursor: 'pointer', letterSpacing: '0.08em' }}
                      >
                        🥋 QUERO TREINAR AQUI
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ─── MODAL QUERO TREINAR AQUI ─────────────────────────────────────────── */}
      {trainModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setTrainModal(null)}>
          <div style={{ background: '#111', border: '1px solid #CC0000', borderBottom: 'none', width: '100%', maxWidth: '480px', padding: '1.5rem', paddingBottom: '2rem' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF', marginBottom: '0.25rem' }}>🥋 QUERO TREINAR AQUI</p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', marginBottom: '1.25rem' }}>{trainModal.name}</p>

            {/* Passo 1: tipo */}
            <p style={{ ...S.label, color: '#CC0000', marginBottom: '0.5rem' }}>1. COMO VOCÊ QUER TREINAR?</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button onClick={() => { setTrainType('matricula'); setTrainBilling(null); }} style={S.bigBtn('#CC0000', trainType === 'matricula')}>🎓 MATRÍCULA</button>
              <button onClick={() => { setTrainType('diaria'); setTrainBilling(null); }} style={S.bigBtn('#FFD700', trainType === 'diaria')}>📅 AULA AVULSA</button>
            </div>

            {/* Passo 2: modalidade (só matrícula) */}
            {trainType === 'matricula' && (
              <>
                <p style={{ ...S.label, color: '#CC0000', marginBottom: '0.5rem' }}>2. MODALIDADE DE PAGAMENTO</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button onClick={() => setTrainBilling('prorata')} style={S.bigBtn('#CC0000', trainBilling === 'prorata')}>📆 PRÓ-RATA<br/><span style={{ fontSize: '0.6rem', fontWeight: 400 }}>Venc. dia 5 do mês</span></button>
                  <button onClick={() => setTrainBilling('corrido')} style={S.bigBtn('#CC0000', trainBilling === 'corrido')}>30 DIAS<br/><span style={{ fontSize: '0.6rem', fontWeight: 400 }}>Dias corridos</span></button>
                </div>
              </>
            )}

            {/* Dados do solicitante */}
            {trainType && (
              <>
                <p style={{ ...S.label, color: '#CC0000', marginBottom: '0.5rem' }}>{trainType === 'matricula' && trainBilling ? '3.' : '2.'} SEUS DADOS</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input type="text" placeholder="Nome completo *" value={trainName} onChange={e => setTrainName(e.target.value)}
                    style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }} />
                  <input type="text" placeholder="CPF" value={trainCpf} onChange={e => setTrainCpf(e.target.value)}
                    style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', boxSizing: 'border-box' }} />
                  <select value={trainBelt} onChange={e => setTrainBelt(e.target.value)}
                    style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: trainBelt ? '#FFF' : '#555', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', padding: '0.5rem 0.625rem', outline: 'none', textTransform: 'uppercase' }}>
                    <option value="">FAIXA (opcional)</option>
                    {['Branca','Cinza','Amarela','Laranja','Verde','Azul','Roxa','Marrom','Preta'].map(b => <option key={b} value={b.toLowerCase()}>{b}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Resumo */}
            {trainType && (trainType === 'diaria' || trainBilling) && (
              <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '0.75rem', marginBottom: '1rem' }}>
                <p style={{ ...S.label, color: '#888', marginBottom: '0.375rem' }}>RESUMO</p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#FFF' }}>
                  {trainType === 'matricula'
                    ? `Matrícula — ${trainBilling === 'prorata' ? 'Pró-rata, vencimento dia 5' : '30 dias corridos'}${trainModal.monthlyFee ? ` — R$ ${trainModal.monthlyFee}/mês` : ''}`
                    : `Aula avulsa${trainModal.dailyFee ? ` — R$ ${trainModal.dailyFee}` : ''}`
                  }
                </p>
                {trainModal.pixKey && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>PIX: {trainModal.pixKey}</p>}
              </div>
            )}

            {/* Waiver */}
            {trainType && (
              loadingWaiver ? (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', textAlign: 'center' }}>Carregando termos...</p>
              ) : academyWaiverText ? (
                <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: '#888', margin: 0 }}>📄 TERMOS E CONDIÇÕES</p>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#666', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {academyWaiverText}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={waiverAccepted}
                      onChange={e => setWaiverAccepted(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#CC0000', cursor: 'pointer' }}
                    />
                    <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#AAA' }}>Li e aceito os termos e condições acima</span>
                  </label>
                </div>
              ) : null
            )}

            <button
              onClick={handleSendTrainRequest}
              disabled={sendingTrain || !trainType || (trainType === 'matricula' && !trainBilling) || (!!academyWaiverText && !waiverAccepted)}
              style={{ width: '100%', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', padding: '0.75rem', background: (sendingTrain || !trainType || (trainType === 'matricula' && !trainBilling) || (!!academyWaiverText && !waiverAccepted)) ? '#333' : '#CC0000', border: 'none', color: '#FFF', cursor: 'pointer', letterSpacing: '0.08em' }}
            >
              {sendingTrain ? 'PROCESSANDO...' : trainType === 'matricula' ? '🎓 CONFIRMAR MATRÍCULA' : '📅 CONFIRMAR AULA AVULSA'}
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL EXPANDIDO DE ACADEMIA ──────────────────────────────────────── */}
      {expandedAcademy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9998, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setExpandedAcademy(null)}>
          <div style={{ background: '#0D0D0D', border: '1px solid #CC0000', borderBottom: 'none', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            {/* Galeria de fotos */}
            {expandedAcademy.photoUrls && expandedAcademy.photoUrls.length > 0 ? (
              <div style={{ position: 'relative', height: '200px', background: '#111', overflow: 'hidden' }}>
                <img src={expandedAcademy.photoUrls[expandedPhotoIdx]} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {expandedAcademy.photoUrls.length > 1 && (
                  <>
                    <button onClick={() => setExpandedPhotoIdx(i => (i - 1 + expandedAcademy.photoUrls!.length) % expandedAcademy.photoUrls!.length)}
                      style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#FFF', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>‹</button>
                    <button onClick={() => setExpandedPhotoIdx(i => (i + 1) % expandedAcademy.photoUrls!.length)}
                      style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#FFF', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>›</button>
                    <div style={{ position: 'absolute', bottom: '0.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.25rem' }}>
                      {expandedAcademy.photoUrls.map((_, i) => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === expandedPhotoIdx ? '#CC0000' : 'rgba(255,255,255,0.4)' }} />)}
                    </div>
                  </>
                )}
                <button onClick={() => setExpandedAcademy(null)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#FFF', fontSize: '1rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '2px' }}>✕</button>
              </div>
            ) : (
              <div style={{ height: '80px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem' }}>
                <span style={{ fontSize: '2rem' }}>🥋</span>
                <button onClick={() => setExpandedAcademy(null)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
              </div>
            )}

            <div style={{ padding: '1.25rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                {expandedAcademy.logoUrl && (
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #CC0000', flexShrink: 0 }}>
                    <img src={expandedAcademy.logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase', color: '#FFF' }}>{expandedAcademy.name}</p>
                  {expandedAcademy.ownerName && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888' }}>Prof. {expandedAcademy.ownerName}</p>}
                  {expandedAcademy.franchise && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: '#FFD700', marginTop: '0.25rem' }}>🏅 {expandedAcademy.franchise}</p>}
                  {expandedAcademy.avgRating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                      <span style={{ color: '#FFD700', fontSize: '0.8rem' }}>{'★'.repeat(Math.round(expandedAcademy.avgRating))}{'☆'.repeat(5 - Math.round(expandedAcademy.avgRating))}</span>
                      <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#888' }}>{expandedAcademy.avgRating.toFixed(1)} ({expandedAcademy.ratingCount} avaliações)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.875rem' }}>
                {(expandedAcademy.city || expandedAcademy.state) && <span style={{ ...S.label, padding: '0.2rem 0.5rem', border: '1px solid #CC0000', color: '#CC0000', background: '#CC000015' }}>📍 {[expandedAcademy.city, expandedAcademy.state].filter(Boolean).join(' — ')}</span>}
                {expandedAcademy.style && <span style={{ ...S.label, padding: '0.2rem 0.5rem', border: '1px solid #333', color: '#888' }}>🥋 {expandedAcademy.style}</span>}
                {expandedAcademy.membersCount && <span style={{ ...S.label, padding: '0.2rem 0.5rem', border: '1px solid #333', color: '#888' }}>👥 {expandedAcademy.membersCount} alunos</span>}
                {expandedAcademy.monthlyFee && <span style={{ ...S.label, padding: '0.2rem 0.5rem', border: '1px solid #FFD700', color: '#FFD700', background: '#FFD70015' }}>💰 R$ {expandedAcademy.monthlyFee}/mês</span>}
                {expandedAcademy.dailyFee && <span style={{ ...S.label, padding: '0.2rem 0.5rem', border: '1px solid #888', color: '#888' }}>📅 Diária R$ {expandedAcademy.dailyFee}</span>}
              </div>

              {expandedAcademy.address && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', marginBottom: '0.875rem' }}>📍 {expandedAcademy.address}</p>}

              {/* Contato */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {expandedAcademy.phone && <a href={`https://wa.me/55${expandedAcademy.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ ...S.btn('#25D366'), textDecoration: 'none' }}>📱 WHATSAPP</a>}
                {expandedAcademy.instagram && <a href={`https://instagram.com/${expandedAcademy.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ ...S.btn('#E1306C'), textDecoration: 'none' }}>📸 INSTAGRAM</a>}
              </div>

              {/* Horários */}
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', color: '#CC0000', borderBottom: '1px solid #1E1E1E', paddingBottom: '0.375rem', marginBottom: '0.5rem' }}>🕐 HORÁRIOS DE TREINO</p>
                {expandedSchedulesLoading ? (
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444', textAlign: 'center', padding: '0.75rem' }}>Carregando...</p>
                ) : expandedSchedules.length === 0 ? (
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#444' }}>Nenhum horário cadastrado.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {expandedSchedules.map((s: any) => {
                      const dayLabels: Record<string, string> = { seg: 'SEG', ter: 'TER', qua: 'QUA', qui: 'QUI', sex: 'SEX', sab: 'SÁB', dom: 'DOM' };
                      const typeColors: Record<string, string> = { iniciante: '#4CAF50', graduado: '#2196F3', geral: '#FF9800', competicao: '#FFD700', openmatch: '#9C27B0' };
                      return (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#111', border: '1px solid #1E1E1E', padding: '0.5rem 0.625rem' }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#FFF', minWidth: '40px' }}>{s.time}</span>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#888', flex: 1 }}>{(s.days || []).map((d: string) => dayLabels[d] || d).join(' · ')}</span>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', color: typeColors[s.type] || '#888', border: `1px solid ${typeColors[s.type] || '#333'}`, padding: '0.1rem 0.35rem' }}>{s.type}</span>
                          {s.mode && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: s.mode === 'gi' ? '#2196F3' : '#9C27B0', border: `1px solid ${s.mode === 'gi' ? '#2196F3' : '#9C27B0'}`, padding: '0.1rem 0.3rem' }}>{s.mode.toUpperCase()}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botões de ação */}
              {user && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={async () => { 
  setExpandedAcademy(null); 
  setTrainModal(expandedAcademy); 
  setTrainType('matricula'); 
  setTrainBilling(null); 
  setTrainName(profile?.name || ''); 
  setTrainCpf(''); 
  setTrainBelt((profile as any)?.belt || 'Branca'); 
  setWaiverAccepted(false);
  setAcademyWaiverText('');
}}
                    style={{ width: '100%', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', padding: '0.75rem', background: '#CC0000', border: 'none', color: '#FFF', cursor: 'pointer', letterSpacing: '0.08em' }}
                  >🎓 FAZER MATRÍCULA</button>
                  <button
                    onClick={async () => { 
  setExpandedAcademy(null); 
  setTrainModal(expandedAcademy); 
  setTrainType('diaria'); 
  setTrainBilling(null); 
  setTrainName(profile?.name || ''); 
  setTrainCpf(''); 
  setTrainBelt((profile as any)?.belt || 'Branca'); 
  setWaiverAccepted(false);
  setAcademyWaiverText('');
}}
                    style={{ width: '100%', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', padding: '0.75rem', background: 'transparent', border: '1px solid #FFD700', color: '#FFD700', cursor: 'pointer', letterSpacing: '0.08em' }}
                  >📅 AULA AVULSA</button>
                  <button
                    onClick={() => {
                      const academyId = expandedAcademy?.ownerUid || expandedAcademy?.id;
                      if (academyId) window.open(`/trial/academia/${academyId}`, '_blank');
                    }}
                    style={{ width: '100%', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', padding: '0.75rem', background: 'transparent', border: '1px solid #0D9E6E', color: '#0D9E6E', cursor: 'pointer', letterSpacing: '0.08em' }}
                  >🎯 AGENDAR AULA EXPERIMENTAL (GRÁTIS)</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL AVALIAÇÕES ─────────────────────────────────────────────────── */}
      {reviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setReviewModal(null)}>
          <div style={{ background: '#111', border: '1px solid #333', borderBottom: 'none', width: '100%', maxWidth: '480px', padding: '1.5rem', paddingBottom: '2rem', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF', marginBottom: '0.25rem' }}>★ AVALIAÇÕES</p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', marginBottom: '1.25rem' }}>{reviewModal.name}</p>

            {/* Minha avaliação */}
            {user && (
              <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '0.875rem', marginBottom: '1rem' }}>
                <p style={{ ...S.label, color: '#FFD700', marginBottom: '0.5rem' }}>SUA AVALIAÇÃO</p>
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.625rem' }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)} onClick={() => setMyRating(n)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: n <= (hoverRating || myRating) ? '#FFD700' : '#333', padding: '0 0.125rem' }}>
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Comentário (opcional)..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={2}
                  style={{ width: '100%', background: '#111', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', padding: '0.5rem', resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: '0.5rem' }}
                />
                <button onClick={handleSaveReview} disabled={savingReview || myRating === 0}
                  style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.5rem 1rem', background: myRating === 0 ? '#333' : '#FFD700', border: 'none', color: '#000', cursor: myRating === 0 ? 'default' : 'pointer' }}>
                  {savingReview ? 'SALVANDO...' : 'SALVAR AVALIAÇÃO'}
                </button>
              </div>
            )}

            {/* Lista de avaliações */}
            {reviewsLoading ? (
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#444', textTransform: 'uppercase', textAlign: 'center', padding: '1rem' }}>CARREGANDO...</p>
            ) : reviews.length === 0 ? (
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#555', textAlign: 'center', padding: '1rem' }}>Nenhuma avaliação ainda. Seja o primeiro!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {reviews.map(r => (
                  <div key={r.id} style={{ borderTop: '1px solid #1E1E1E', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: '#FFF' }}>{r.authorName}</p>
                      <span style={{ color: '#FFD700', fontSize: '0.75rem' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    {r.comment && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888' }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
