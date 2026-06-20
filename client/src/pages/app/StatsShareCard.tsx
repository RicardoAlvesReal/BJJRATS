// BJJRats — Card de compartilhamento de estatísticas
// Gera imagem via Canvas HTML5 com design moderno

import { useEffect, useRef, useState } from 'react';
import { Training, calcXP, getLevelInfo, calcStreak, BELT_COLORS, parseTrainingDate, topTecnicas } from '@/lib/bjjrats-constants';
import { toast } from 'sonner';

interface Props {
  trainings: Training[];
  name?: string;
  belt?: string;
  academy?: string;
  photoURL?: string;
  trainingPhoto?: string;
  onClose: () => void;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default function StatsShareCard({ trainings, name, belt, academy, photoURL, trainingPhoto, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);

  const xp = calcXP(trainings);
  const { currentLevel, xpProgress } = getLevelInfo(xp);
  const streak = calcStreak(trainings);
  const totalMins = trainings.reduce((s, t) => s + (t.duration || 0), 0);
  const totalHrs = Math.round(totalMins / 60 * 10) / 10;
  const beltColor = BELT_COLORS[belt || 'Branca'] || '#FFFFFF';
  const tecnicas = topTecnicas(trainings);
  const competicoes = trainings.filter(t => t.sessionType === 'competicao').length;
  // Média de intensidade
  const avgIntensity = trainings.length
    ? (trainings.reduce((s, t) => s + (t.intensity || 0), 0) / trainings.filter(t => t.intensity).length || 0)
    : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 800;
    const H = 520;
    canvas.width = W;
    canvas.height = H;

    const draw = async () => {
      // Fundo principal
      ctx.fillStyle = '#0D0D0D';
      roundedRect(ctx, 0, 0, W, H, 0);
      ctx.fill();

      // ── Barra superior ──
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(0, 0, W, 72);

      // Logo
      ctx.fillStyle = '#CC0000';
      ctx.font = 'bold 18px Barlow Condensed, sans-serif';
      ctx.fillText('BJJ', 28, 38);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('RATS', 73, 38);

      ctx.fillStyle = '#444';
      ctx.font = '10px Barlow, sans-serif';
      ctx.fillText('thebjjrats.com', 28, 56);

      // Data à direita
      const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      ctx.fillStyle = '#555';
      ctx.font = '10px Barlow, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(today, W - 28, 38);
      ctx.textAlign = 'left';

      ctx.textAlign = 'left';

      // ── Avatar + Nome + Faixa ──
      const avatarX = 28;
      const avatarY = 96;
      const avatarR = 28;

      // Foto ou placeholder
      if (photoURL) {
        try {
          const img = await loadImage(photoURL);
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarX + avatarR, avatarY + avatarR, avatarR, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, avatarX, avatarY, avatarR * 2, avatarR * 2);
          ctx.restore();
        } catch {
          drawAvatarPlaceholder(ctx, avatarX, avatarY, avatarR);
        }
      } else {
        drawAvatarPlaceholder(ctx, avatarX, avatarY, avatarR);
      }

      // Borda do avatar
      ctx.strokeStyle = beltColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(avatarX + avatarR, avatarY + avatarR, avatarR, 0, Math.PI * 2);
      ctx.stroke();

      // Nome
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Barlow Condensed, sans-serif';
      ctx.fillText((name || 'ATLETA').toUpperCase(), avatarX + 70, avatarY + 26);

      // Faixa
      ctx.fillStyle = beltColor;
      ctx.font = 'bold 15px Barlow Condensed, sans-serif';
      ctx.fillText(`FAIXA ${(belt || 'BRANCA').toUpperCase()}`, avatarX + 70, avatarY + 50);

      // Academia
      if (academy) {
        ctx.fillStyle = '#666';
        ctx.font = '13px Barlow, sans-serif';
        ctx.fillText(academy, avatarX + 70, avatarY + 68);
      }

      // ── Linha separadora ──
      ctx.strokeStyle = '#1E1E1E';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(28, 180);
      ctx.lineTo(W - 28, 180);
      ctx.stroke();

      // ── Cards de estatísticas (4 colunas) ──
      const statCards = [
        { label: 'TREINOS', value: String(trainings.length), color: '#CC0000' },
        { label: 'HORAS', value: `${totalHrs}h`, color: '#CC0000' },
        { label: 'XP', value: String(xp), color: '#FFD700' },
        { label: 'STREAK', value: `${streak}d`, color: '#1A6ECC' },
      ];

      const cardW = (W - 56 - 18) / 4; // 28px padding each side + 3 gaps of 6px
      statCards.forEach((s, i) => {
        const x = 28 + i * (cardW + 6);
        const y = 196;

        ctx.fillStyle = '#111';
        roundedRect(ctx, x, y, cardW, 78, 8);
        ctx.fill();
        ctx.strokeStyle = '#1E1E1E';
        ctx.lineWidth = 1;
        roundedRect(ctx, x, y, cardW, 78, 8);
        ctx.stroke();

        ctx.fillStyle = s.color;
        ctx.font = 'bold 22px Barlow Condensed, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.value, x + cardW / 2, y + 38);

        ctx.fillStyle = '#555';
        ctx.font = 'bold 10px Barlow Condensed, sans-serif';
        ctx.fillText(s.label, x + cardW / 2, y + 58);
        ctx.textAlign = 'left';
      });

      // ── Segunda linha: Nível + Progresso + Técnicas ──
      // Nível com barra de progresso
      const progressY = 296;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px Barlow Condensed, sans-serif';
      ctx.fillText(`NÍVEL ${currentLevel}`, 28, progressY + 18);

      const barX = 28;
      const barY = progressY + 28;
      const barW = 200;
      const barH = 8;
      ctx.fillStyle = '#1E1E1E';
      roundedRect(ctx, barX, barY, barW, barH, 4);
      ctx.fill();
      ctx.fillStyle = '#CC0000';
      roundedRect(ctx, barX, barY, barW * (xpProgress / 100), barH, 4);
      ctx.fill();

      ctx.fillStyle = '#555';
      ctx.font = '11px Barlow, sans-serif';
      ctx.fillText(`${xpProgress}% para o próximo nível`, barX, barY + 24);

      // ── Foto do treino (canto inferior direito) ──
      if (trainingPhoto) {
        try {
          const tpImg = await loadImage(trainingPhoto);
          const tpW = 130;
          const tpH = 90;
          const tpX = W - tpW - 28;
          const tpY = progressY - 5;
          ctx.save();
          roundedRect(ctx, tpX, tpY, tpW, tpH, 6);
          ctx.clip();
          ctx.drawImage(tpImg, tpX, tpY, tpW, tpH);
          ctx.restore();
          ctx.strokeStyle = '#2A2A2A';
          ctx.lineWidth = 1;
          roundedRect(ctx, tpX, tpY, tpW, tpH, 6);
          ctx.stroke();
        } catch { /* ignora */ }
      }

      // Técnicas favoritas (lado direito)
      if (tecnicas.length > 0) {
        const techX = 460;
        const techY = progressY;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Barlow Condensed, sans-serif';
        ctx.fillText('TÉCNICAS FAVORITAS', techX, techY + 18);

        tecnicas.slice(0, 3).forEach((t, i) => {
          const ty = techY + 36 + i * 24;
          ctx.fillStyle = '#CCC';
          ctx.font = 'bold 12px Barlow Condensed, sans-serif';
          ctx.fillText(t.nome, techX, ty);
          ctx.fillStyle = '#CC0000';
          ctx.font = 'bold 11px Barlow Condensed, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`${t.qtd}x`, techX + 300, ty);
          ctx.textAlign = 'left';
        });
      }

      // ── Rodapé ──
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(0, H - 50, W, 50);

      ctx.fillStyle = '#444';
      ctx.font = '11px Barlow, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Treine. Evolua. Domine. — thebjjrats.com', W / 2, H - 18);
      ctx.textAlign = 'left';

      setImgUrl(canvas.toDataURL('image/png'));
      setGenerating(false);
    };

    setTimeout(draw, 100);
  }, [trainings, name, belt, academy, photoURL, xp, currentLevel, xpProgress, streak, totalHrs, beltColor]);

  const handleDownload = () => {
    if (!imgUrl) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `bjjrats-stats-${(name || 'atleta').toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
    toast.success('Card salvo! Compartilhe nas redes sociais 🥋');
  };

  const handleShare = async () => {
    if (!imgUrl) return;
    try {
      const blob = await (await fetch(imgUrl)).blob();
      const file = new File([blob], 'bjjrats-stats.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Minhas stats no BJJRats',
          text: `${trainings.length} treinos · ${totalHrs}h · ${xp} XP — thebjjrats.com`,
          files: [file],
        });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.05em' }}>COMPARTILHAR STATS</p>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.3rem 0.625rem', cursor: 'pointer' }}>FECHAR</button>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: '8px', overflow: 'hidden', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {generating ? (
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>GERANDO...</p>
          ) : imgUrl ? (
            <img src={imgUrl} alt="Stats card" style={{ width: '100%', display: 'block' }} />
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleShare}
            disabled={generating}
            style={{ flex: 1, background: generating ? '#1A0000' : '#CC0000', border: 'none', borderRadius: '8px', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.875rem', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.5 : 1 }}
          >
            {'share' in navigator ? '↑ COMPARTILHAR' : '↓ BAIXAR'}
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            style={{ background: '#111', border: '1px solid #2A2A2A', borderRadius: '8px', color: generating ? '#333' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.875rem 1rem', cursor: generating ? 'not-allowed' : 'pointer' }}
          >
            ↓ SALVAR
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawAvatarPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#555';
  ctx.font = 'bold 22px Barlow Condensed, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🥋', x + r, y + r);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
