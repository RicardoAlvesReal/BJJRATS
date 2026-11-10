// BJJRats PWA — Training Share Modal
// O desenho dos cards fica em '@/lib/trainingShareCards'.
// O compartilhamento (nativo via Capacitor ou Web Share API) fica em '@/lib/native'.

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SESSION_TYPES, MODALITIES } from '@/lib/bjjrats-constants';
import api from '@/lib/api';
import { shareImage } from '@/lib/native';
import { quickToast } from '@/lib/quickToast';
import {
  drawInstagramShareCard,
  SHARE_FORMATS,
  type ShareFormat,
  type InstagramShareTemplate,
} from '@/lib/trainingShareCards';

export interface TrainingData {
  trainingDate?: string;
  sessionType?: string;
  modality?: string;
  duration: number;
  intensity?: number;
  satisfaction?: number;
  techniques?: Record<string, string[]>;
  notes?: string;
  academy?: string;
  professor?: string;
  trainingPhoto?: string;
  trainingPhotoUrl?: string;
  xp?: number;
  extraData?: { activity: string; distance: number; calories: number; pace: string | null };
  compData?: { tournament: string; league: string; city: string; belt: string; gender: string; weightCategory: string; ageCategory: string; fights: number; placement: string };
}

export interface ShareUserData {
  name?: string;
  belt?: string;
  academy?: string;
  photoURL?: string;
}

interface Props {
  training: TrainingData;
  user: ShareUserData | null;
  onClose: () => void;
  zIndex?: number;
  // Para postar nos feeds internos
  currentUserUid?: string;
  currentUserAcademyId?: string;
  currentUserAcademyName?: string;
  currentUserBelt?: string;
}

type Template = InstagramShareTemplate;

const EXTRA_ACTIVITY_LABELS: Record<string, string> = {
  corrida: '🏃 Corrida',
  ciclismo: '🚴 Ciclismo',
  musculacao: '🏋️ Musculação',
  crossfit: '💪 CrossFit',
  outras_lutas: '🥊 Outras lutas',
  outros_esportes: '⚽ Outros esportes',
};

/** Legenda curta: o que foi feito + assinatura + poucas hashtags. */
export function buildShareCaption(training: TrainingData): string {
  const mod = MODALITIES.find(m => m.id === training.modality)?.label || 'Gi';
  const minutes = `${training.duration || 0} min`;
  let headline: string;
  if (training.sessionType === 'outros_treinos' && training.extraData) {
    const ed = training.extraData;
    const activity = EXTRA_ACTIVITY_LABELS[ed.activity] || '🏃 Treino extra';
    headline = [activity, minutes, ed.distance ? `${ed.distance} km` : ''].filter(Boolean).join(' · ');
  } else if (training.compData?.placement) {
    headline = `🏆 ${training.compData.placement}${training.compData.tournament ? ` — ${training.compData.tournament}` : ''}`;
  } else {
    headline = `🥋 Treino de ${mod} · ${minutes}`;
  }
  return [headline, 'Registrado no @thebjjrats', '', '#BJJ #JiuJitsu #BJJRats'].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function TrainingShareModal({ training, user, onClose, zIndex = 9999, currentUserUid, currentUserAcademyId, currentUserAcademyName, currentUserBelt }: Props) {
  const [template, setTemplate] = useState<Template>('card_foto_treino');
  const [format, setFormat] = useState<ShareFormat>('story');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trainingPhoto, setTrainingPhoto] = useState<HTMLImageElement | null>(null);
  const [brandLogo, setBrandLogo] = useState<HTMLImageElement | null>(null);
  const [photosReady, setPhotosReady] = useState(false);
  const [postingFeed, setPostingFeed] = useState<'academy' | 'community' | null>(null);
  const trainingPhotoSrc = training.trainingPhotoUrl || training.trainingPhoto || '';

  useEffect(() => {
    let cancelled = false;
    const loadImg = (url: string): Promise<HTMLImageElement | null> =>
      new Promise(resolve => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        // Rede lenta não pode travar o preview: após 6s segue sem a imagem
        const timer = setTimeout(() => resolve(null), 6000);
        img.onload = () => { clearTimeout(timer); resolve(img); };
        img.onerror = () => { clearTimeout(timer); resolve(null); };
        img.src = url;
      });
    const load = async () => {
      const [tp, logo] = await Promise.all([
        trainingPhotoSrc ? loadImg(trainingPhotoSrc) : Promise.resolve(null),
        loadImg('/favicon.png'),
      ]);
      if (!cancelled) { setTrainingPhoto(tp); setBrandLogo(logo); setPhotosReady(true); }
    };
    load();
    return () => { cancelled = true; };
  }, [trainingPhotoSrc]);

  const renderCard = useCallback((tmpl: Template, fmt: ShareFormat) => {
    const canvas = canvasRef.current;
    if (!canvas || !photosReady) return;
    setPreviewLoading(true);
    canvas.width = SHARE_FORMATS[fmt].w; canvas.height = SHARE_FORMATS[fmt].h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setPreviewLoading(false); return; }
    try {
      drawInstagramShareCard(ctx, tmpl, fmt, training, user, { trainingPhoto, brandLogo });
      setPreviewUrl(canvas.toDataURL('image/png'));
    } catch (e) { console.error('Canvas error:', e); setPreviewUrl(null); }
    setPreviewLoading(false);
  }, [photosReady, training, user, trainingPhoto, brandLogo]);

  useEffect(() => { if (photosReady) renderCard(template, format); }, [template, format, photosReady, renderCard]);


  const instagramCaption = buildShareCaption(training);

  const handleShare = async () => {
    if (!previewUrl) return;
    setGenerating(true);
    // Instagram e WhatsApp ignoram o texto da folha de compartilhamento,
    // então a legenda vai para a área de transferência (sem await: preserva o gesto do usuário).
    navigator.clipboard?.writeText(instagramCaption).catch(() => {});
    try {
      const result = await shareImage({
        dataUrl: previewUrl,
        fileName: `bjjrats-treino-${Date.now()}.png`,
        title: 'Meu treino no BJJRats',
        text: instagramCaption,
      });
      if (result === 'shared') quickToast('success', 'Legenda copiada — é só colar no post');
      else if (result === 'downloaded') quickToast('success', 'Imagem salva. A legenda foi copiada.');
    } catch {
      quickToast('error', 'Não foi possível compartilhar a imagem');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(instagramCaption);
      quickToast('success', 'Legenda copiada');
    } catch {
      quickToast('error', 'Não foi possível copiar a legenda');
    }
  };

  const SHARE_FORMAT_OPTIONS: { id: ShareFormat; label: string; ratio: string }[] = [
    { id: 'story', label: 'Stories', ratio: '9:16' },
    { id: 'feed', label: 'Feed', ratio: '4:5' },
  ];
  const SHARE_TEMPLATES: { id: Template; icon: string; label: string; desc: string }[] = [
    { id: 'card_foto_treino', icon: '🔥', label: 'Bold', desc: 'Arrojado' },
    { id: 'card_foto_perfil', icon: '⚪', label: 'Minimal', desc: 'Limpo' },
    { id: 'card_metricas', icon: '📊', label: 'Stats', desc: 'Dados' },
  ];
  const disabled = generating || previewLoading || !previewUrl;

  // Gera texto resumido do treino para o post
  const buildTrainingText = () => {
    const sess = SESSION_TYPES.find(s => s.id === training.sessionType) || SESSION_TYPES[0];
    const mod = MODALITIES.find(m => m.id === training.modality) || MODALITIES[0];
    const parts = [
      `🥋 Treino registrado — ${training.trainingDate || 'hoje'}`,
      `${sess.icon} ${sess.label} · ${mod.label} · ${training.duration}min`,
      training.xp ? `⚡ +${training.xp} XP` : '',
    ].filter(Boolean);
    return parts.join('\n');
  };

  const handlePostToFeed = async (target: 'academy' | 'community') => {
    if (!currentUserUid) { quickToast('error', 'Faça login para postar'); return; }
    if (target === 'academy' && !currentUserAcademyId) { quickToast('error', 'Você não está vinculado a uma academia'); return; }
    setPostingFeed(target);
    try {
      // UM ÚNICO documento por ação — sem duplicação
      // feedTarget='academy'  → aparece APENAS no feed da academia (filtrado por academyId)
      // feedTarget='community' → aparece APENAS no feed da comunidade (sem academyId)
      const postData: Record<string, any> = {
        uid: currentUserUid,
        authorUid: currentUserUid,
        authorName: user?.name || 'Atleta',
        authorBelt: currentUserBelt || user?.belt || 'Branca',
        authorPhotoURL: user?.photoURL || null,
        text: buildTrainingText(),
        // Incluir a foto do treino para exibir no feed da comunidade e da academia
        photoURL: trainingPhotoSrc || '',
        type: 'treino',
        likes: [],
        isAcademyPost: false,
        createdAt: new Date().toISOString(),
        createdAtStr: new Date().toLocaleDateString('pt-BR'),
        trainingData: {
          sessionType: training.sessionType,
          modality: training.modality,
          duration: training.duration,
          xp: training.xp || 0,
          date: training.trainingDate,
        },
      };

      if (target === 'academy') {
        // Post da academia: tem academyId + feedTarget='academy'
        postData.academyId = currentUserAcademyId;
        postData.academyName = currentUserAcademyName || '';
        postData.feedTarget = 'academy';
      } else {
        // Post da comunidade: SEM academyId, feedTarget='community'
        postData.feedTarget = 'community';
      }

      if (target === 'academy') {
        await api.posts.create({
          authorUid: postData.authorUid,
          authorName: postData.authorName,
          authorPhoto: postData.authorPhotoURL || '',
          authorBelt: postData.authorBelt || 'Branca',
          text: postData.text,
          type: 'post',
          pinned: false,
          photoURL: trainingPhotoSrc || '',
          academyId: currentUserAcademyId,
          trainingData: postData.trainingData,
        });
      } else {
        await api.posts.create(postData);
      }

      quickToast('success', target === 'academy' ? '\u2705 Postado no feed da academia!' : '\u2705 Postado no feed da comunidade!');
    } catch { quickToast('error', 'Erro ao publicar no feed'); }
    finally { setPostingFeed(null); }
  };

  const FONT_C = "'Barlow Condensed', sans-serif";
  const segWrap: React.CSSProperties = { boxSizing: 'border-box', width: '100%', display: 'flex', gap: '3px', padding: '3px', background: '#141414', border: '1px solid #222', borderRadius: '12px' };
  const segBtn = (selected: boolean): React.CSSProperties => ({
    flex: 1, minWidth: 0, boxSizing: 'border-box', minHeight: '36px', padding: '0 0.4rem', border: 'none', borderRadius: '9px', cursor: 'pointer',
    background: selected ? '#CC0000' : 'transparent', color: selected ? '#FFF' : '#888',
    fontFamily: FONT_C, fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', whiteSpace: 'nowrap',
    transition: 'background 0.2s, color 0.2s',
  });
  const feedBtn = (enabled: boolean, color: string): React.CSSProperties => ({
    flex: 1, minWidth: 0, boxSizing: 'border-box', minHeight: '40px', padding: '0 0.5rem', borderRadius: '12px',
    background: 'transparent', border: `1px solid ${enabled ? color : '#222'}`, color: enabled ? color : '#3A3A3A',
    fontFamily: FONT_C, fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em',
    cursor: enabled ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compartilhar treino"
      className="share-modal"
      style={{
        position: 'fixed', inset: 0, zIndex, background: '#050505', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        height: '100dvh', overflow: 'hidden',
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <style>{'.share-modal, .share-modal * { box-sizing: border-box; }'}</style>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ width: '100%', maxWidth: '460px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontFamily: FONT_C, fontWeight: 900, fontSize: '1.15rem', textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.05em', margin: 0 }}>
            Compartilhar treino
          </h2>
          <button onClick={onClose} aria-label="Fechar" style={{ background: '#161616', border: '1px solid #262626', color: '#999', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Formato */}
        <div role="radiogroup" aria-label="Formato" style={{ ...segWrap, flexShrink: 0 }}>
          {SHARE_FORMAT_OPTIONS.map(f => (
            <button key={f.id} type="button" role="radio" aria-checked={format === f.id} onClick={() => setFormat(f.id)} style={segBtn(format === f.id)}>
              {f.label}<span style={{ fontWeight: 600, opacity: 0.7, fontSize: '0.75rem' }}>{f.ratio}</span>
            </button>
          ))}
        </div>

        {/* Modelo */}
        <div role="radiogroup" aria-label="Modelo" style={{ ...segWrap, flexShrink: 0 }}>
          {SHARE_TEMPLATES.map(t => (
            <button key={t.id} type="button" role="radio" aria-checked={template === t.id} onClick={() => setTemplate(t.id)} style={segBtn(template === t.id)}>
              <span aria-hidden style={{ fontSize: '0.9rem' }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Preview: ocupa o espaço restante */}
        <div style={{ flex: 1, minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <AnimatePresence mode="wait">
            {previewUrl && !previewLoading ? (
              <motion.img
                key={`preview-${template}-${format}`}
                src={previewUrl}
                alt="Preview do card"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: '14px', border: '1px solid #222', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}
              />
            ) : (
              <motion.span key="preview-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ color: '#555', fontSize: '0.75rem', fontFamily: FONT_C, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {previewLoading ? 'Gerando card...' : 'Erro ao gerar'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Legenda */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '0.5rem 0.5rem 0.5rem 0.75rem' }}>
          <span style={{ flex: 1, minWidth: 0, color: '#888', fontFamily: "'Barlow', sans-serif", fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {instagramCaption.split('\n')[0]}
          </span>
          <button type="button" onClick={handleCopyCaption} style={{ flexShrink: 0, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#DDD', borderRadius: '8px', padding: '0.4rem 0.7rem', fontFamily: FONT_C, fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer' }}>
            Copiar legenda
          </button>
        </div>

        {/* Ação principal */}
        <motion.button
          whileTap={disabled ? undefined : { scale: 0.98 }}
          onClick={handleShare}
          disabled={disabled}
          style={{ flexShrink: 0, minHeight: '50px', background: disabled ? '#2A2A2A' : '#E63273', color: disabled ? '#666' : '#FFF', fontFamily: FONT_C, fontWeight: 900, fontSize: '1.15rem', letterSpacing: '0.02em', border: 'none', borderRadius: '14px', width: '100%', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', boxShadow: disabled ? 'none' : '0 10px 24px rgba(230, 50, 115, 0.25)' }}
        >
          <span aria-hidden style={{ fontSize: '1.25rem' }}>📸</span>
          <span>{previewLoading ? 'Gerando imagem...' : (generating ? 'Abrindo...' : 'Compartilhar imagem')}</span>
        </motion.button>

        {/* Feeds internos */}
        <div style={{ flexShrink: 0, display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => handlePostToFeed('academy')}
            disabled={!currentUserAcademyId || postingFeed !== null}
            title={!currentUserAcademyId ? 'Sem academia vinculada' : undefined}
            style={feedBtn(!!currentUserAcademyId && postingFeed === null, '#3B8BEB')}
          >
            {postingFeed === 'academy' ? 'Postando...' : '🏠 Feed da academia'}
          </button>
          <button
            onClick={() => handlePostToFeed('community')}
            disabled={postingFeed !== null}
            style={feedBtn(postingFeed === null, '#E03030')}
          >
            {postingFeed === 'community' ? 'Postando...' : '🌍 Comunidade'}
          </button>
        </div>
      </div>
    </div>
  );
}
