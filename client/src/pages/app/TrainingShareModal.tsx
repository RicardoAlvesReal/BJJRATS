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
        img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = url;
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

  const previewAspect = `${SHARE_FORMATS[format].w} / ${SHARE_FORMATS[format].h}`;
  const previewHeight = `min(62vh, ${Math.round((390 * SHARE_FORMATS[format].h) / SHARE_FORMATS[format].w)}px)`;

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

  const noTrainingPhoto = (template === 'card_foto_treino' || template === 'card_foto_perfil') && !trainingPhoto;
  const SHARE_FORMAT_OPTIONS: { id: ShareFormat; label: string; desc: string }[] = [
    { id: 'story', label: 'Stories', desc: '9:16 · Stories, Reels, Status' },
    { id: 'feed', label: 'Feed', desc: '4:5 · post no Instagram' },
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '1rem' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ width: '100%', maxWidth: '460px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingTop: '0.5rem' }}>
        <div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.05em', margin: 0 }}>
            🎉 COMPARTILHAR TREINO
          </h2>
          <p style={{ color: '#555', fontSize: '0.7rem', margin: '2px 0 0', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Escolha o card e compartilhe
          </p>
        </div>
        <button onClick={onClose} style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#777', width: '38px', height: '38px', borderRadius: '4px', cursor: 'pointer', fontSize: '20px', flexShrink: 0 }}>×</button>
      </div>

      {/* Seletor de formato */}
      <div role="radiogroup" aria-label="Formato" style={{ width: '100%', maxWidth: '460px', display: 'flex', gap: '4px', padding: '4px', background: '#111', border: '1px solid #222', borderRadius: '14px', marginBottom: '1rem' }}>
        {SHARE_FORMAT_OPTIONS.map(f => {
          const selected = format === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setFormat(f.id)}
              style={{ flex: 1, padding: '0.6rem 0.5rem', border: 'none', borderRadius: '10px', cursor: 'pointer', background: selected ? '#CC0000' : 'transparent', color: selected ? '#FFF' : '#777', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', transition: 'background 0.2s, color 0.2s' }}
            >
              <span>{f.label}</span>
              <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: '0.62rem', textTransform: 'none', letterSpacing: 0, color: selected ? 'rgba(255,255,255,0.8)' : '#444' }}>{f.desc}</span>
            </button>
          );
        })}
      </div>

      <p style={{ width: '100%', maxWidth: '460px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#555', margin: '0 0 0.625rem' }}>
        ESCOLHA O TEMPLATE
      </p>

      {/* Seletor de template */}
      <div style={{ width: '100%', maxWidth: '460px', display: 'flex', gap: '0.625rem', marginBottom: '0.875rem' }}>
        {SHARE_TEMPLATES.map(t => {
          const selected = template === t.id;
          return (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              initial={false}
              animate={{
                scale: selected ? 1.035 : 1,
                y: selected ? -3 : 0,
                borderColor: selected ? '#CC0000' : '#242424',
                boxShadow: selected ? '0 14px 32px rgba(204, 0, 0, 0.22)' : '0 0 0 rgba(0, 0, 0, 0)',
              }}
              whileHover={{ y: selected ? -3 : -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              style={{
                flex: 1,
                minHeight: '104px',
                padding: '0.75rem 0.35rem 0.9rem',
                border: '2px solid #242424',
                background: selected ? '#160000' : '#111',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                borderRadius: '18px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <motion.span
                aria-hidden
                initial={false}
                animate={{ scaleX: selected ? 1 : 0, opacity: selected ? 1 : 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  transformOrigin: 'left center',
                  background: 'linear-gradient(135deg, rgba(204,0,0,0.34), rgba(230,50,115,0.14))',
                  zIndex: 0,
                }}
              />
              <motion.span
                aria-hidden
                initial={false}
                animate={{ scaleX: selected ? 1 : 0 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute',
                  left: '14px',
                  right: '14px',
                  bottom: '9px',
                  height: '3px',
                  borderRadius: '999px',
                  background: '#CC0000',
                  transformOrigin: 'left center',
                  zIndex: 1,
                }}
              />
              <motion.span
                animate={{ scale: selected ? 1.16 : 1, rotate: selected ? -4 : 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 22 }}
                style={{ fontSize: '1.35rem', position: 'relative', zIndex: 2 }}
              >
                {t.icon}
              </motion.span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: selected ? '#FF3D3D' : '#666', position: 'relative', zIndex: 2 }}>
                {t.label}
              </span>
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: '0.62rem', color: selected ? '#A8A8A8' : '#3A3A3A', textAlign: 'center', lineHeight: 1.2, position: 'relative', zIndex: 2 }}>
                {t.desc}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Aviso foto ausente */}
      {noTrainingPhoto && (
        <div style={{ width: '100%', maxWidth: '460px', marginBottom: '0.75rem', padding: '8px 14px', background: '#1A1200', border: '1px solid #554400', borderRadius: '4px' }}>
          <span style={{ color: '#AA8800', fontSize: '0.72rem', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚠️ Treino sem foto — fundo escuro será usado
          </span>
        </div>
      )}

      <p style={{ width: '100%', maxWidth: '460px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#555', margin: '0.5rem 0 0.625rem' }}>
        PREVIEW DO POST
      </p>

      {/* Preview */}
      <div style={{ width: '100%', maxWidth: '460px', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <AnimatePresence mode="wait">
          {previewLoading ? (
            <motion.div
              key="preview-loading"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              style={{ height: previewHeight, maxWidth: '100%', aspectRatio: previewAspect, background: '#111', border: '1px solid #222', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
            >
              <span style={{ color: '#444', fontSize: '0.75rem', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase' }}>Gerando card...</span>
            </motion.div>
          ) : previewUrl ? (
            <motion.img
              key={`preview-${template}`}
              src={previewUrl}
              alt="Preview"
              initial={{ opacity: 0, scale: 0.96, rotate: -0.35, y: 10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, rotate: 0.25, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'block', width: 'auto', height: 'auto', maxWidth: 'min(390px, 100%)', maxHeight: '62vh', border: '1px solid #222', borderRadius: '18px', boxShadow: '0 22px 50px rgba(0,0,0,0.42)' }}
            />
          ) : (
            <motion.div
              key="preview-error"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              style={{ height: previewHeight, maxWidth: '100%', aspectRatio: previewAspect, background: '#111', border: '1px solid #222', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span style={{ color: '#444', fontSize: '0.75rem', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase' }}>Erro ao gerar</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ações */}
      <div style={{ width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '0.625rem', paddingBottom: '2rem' }}>

        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '18px', padding: '1rem', color: '#888', fontFamily: "'Barlow', sans-serif", fontSize: '0.92rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
          {instagramCaption}
        </div>

        <motion.button whileHover={disabled ? undefined : { y: -2 }} whileTap={disabled ? undefined : { scale: 0.98 }} onClick={handleShare} disabled={disabled} style={{ background: disabled ? '#333' : '#E63273', color: disabled ? '#666' : '#FFF', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.35rem', letterSpacing: '0.01em', padding: '1.1rem 1.25rem', border: 'none', borderRadius: '18px', width: '100%', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', lineHeight: 1.1, boxShadow: disabled ? 'none' : '0 16px 30px rgba(230, 50, 115, 0.25)' }}>
          <span style={{ fontSize: '1.7rem' }}>📸</span>
          <span>{previewLoading ? 'Gerando imagem...' : (generating ? 'Abrindo...' : 'Compartilhar imagem')}</span>
        </motion.button>
        <motion.button whileHover={{ y: -2, borderColor: '#333' }} whileTap={{ scale: 0.98 }} onClick={handleCopyCaption} style={{ background: '#111', color: '#FFF', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.01em', padding: '1rem 1.25rem', border: '1px solid #222', borderRadius: '18px', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem' }}>
          <span style={{ fontSize: '1.55rem' }}>📋</span>
          <span>Copiar legenda</span>
        </motion.button>

        {/* Postar nos feeds internos */}
        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', margin: '0.5rem 0 0' }}>FEEDS INTERNOS</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => handlePostToFeed('academy')}
            disabled={!currentUserAcademyId || postingFeed !== null}
            style={{
              flex: 1,
              background: !currentUserAcademyId ? '#111' : postingFeed === 'academy' ? '#0A2A1A' : '#0A1A2A',
              border: `1px solid ${!currentUserAcademyId ? '#222' : '#1A6ECC'}`,
              color: !currentUserAcademyId ? '#333' : '#1A6ECC',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '0.8rem',
              textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.875rem 0.5rem',
              borderRadius: '4px', cursor: !currentUserAcademyId ? 'not-allowed' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🏠</span>
            <span>{postingFeed === 'academy' ? 'POSTANDO...' : 'FEED DA ACADEMIA'}</span>
            {!currentUserAcademyId && <span style={{ fontSize: '0.55rem', color: '#333', fontWeight: 400 }}>Sem academia vinculada</span>}
          </button>
          <button
            onClick={() => handlePostToFeed('community')}
            disabled={postingFeed !== null}
            style={{
              flex: 1,
              background: postingFeed === 'community' ? '#1A0A0A' : '#1A0A0A',
              border: '1px solid #CC0000',
              color: '#CC0000',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '0.8rem',
              textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.875rem 0.5rem',
              borderRadius: '4px', cursor: postingFeed !== null ? 'not-allowed' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
              opacity: postingFeed !== null ? 0.6 : 1,
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🌍</span>
            <span>{postingFeed === 'community' ? 'POSTANDO...' : 'FEED DA COMUNIDADE'}</span>
          </button>
        </div>

        <button onClick={onClose} style={{ background: 'transparent', color: '#333', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.625rem', border: '1px solid #161616', borderRadius: '4px', width: '100%', cursor: 'pointer', marginTop: '0.25rem' }}>
          Fechar
        </button>
      </div>
    </div>
  );
}
