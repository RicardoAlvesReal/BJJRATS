// Design: "Cage Fighter" — Brutalismo Tático
// Card de compartilhamento de estatísticas — gera imagem via Canvas HTML5
import { useEffect, useRef, useState } from 'react';
import { Training, calcXP, getLevelInfo, calcStreak, BELT_COLORS } from '@/lib/bjjrats-constants';
import { toast } from 'sonner';

interface Props {
  trainings: Training[];
  name?: string;
  belt?: string;
  academy?: string;
  photoURL?: string;
  onClose: () => void;
}

export default function StatsShareCard({ trainings, name, belt, academy, photoURL, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);

  const xp = calcXP(trainings);
  const { currentLevel } = getLevelInfo(xp);
  const streak = calcStreak(trainings);
  const totalMins = trainings.reduce((s, t) => s + (t.duration || 0), 0);
  const totalHrs = Math.round(totalMins / 60 * 10) / 10;
  const beltColor = BELT_COLORS[belt || 'Branca'] || '#FFFFFF';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 800;
    const H = 450;
    canvas.width = W;
    canvas.height = H;

    const draw = () => {
      // Background
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, W, H);

      // Borda vermelha esquerda
      ctx.fillStyle = '#CC0000';
      ctx.fillRect(0, 0, 6, H);

      // Faixa diagonal decorativa
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = '#CC0000';
      ctx.beginPath();
      ctx.moveTo(W * 0.55, 0);
      ctx.lineTo(W, 0);
      ctx.lineTo(W * 0.7, H);
      ctx.lineTo(W * 0.25, H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Grid de linhas sutis
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();

      // Logo / marca
      ctx.fillStyle = '#CC0000';
      ctx.font = 'bold 13px Barlow Condensed, sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('BJJRATS', 30, 38);

      ctx.fillStyle = '#333';
      ctx.font = '11px Barlow, sans-serif';
      ctx.fillText('thebjjrats.com', 30, 56);

      // Faixa colorida
      const beltW = 120;
      const beltH = 10;
      const beltX = 30;
      const beltY = 68;
      ctx.fillStyle = belt === 'Branca' ? '#1A1A1A' : beltColor;
      ctx.fillRect(beltX, beltY, beltW, beltH);
      ctx.strokeStyle = beltColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(beltX, beltY, beltW, beltH);
      ctx.fillStyle = beltColor;
      ctx.font = 'bold 9px Barlow Condensed, sans-serif';
      ctx.fillText((belt || 'BRANCA').toUpperCase(), beltX + beltW + 10, beltY + 8);

      // Nome
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px Barlow Condensed, sans-serif';
      ctx.fillText((name || 'ATLETA').toUpperCase(), 30, 130);

      // Academia
      if (academy) {
        ctx.fillStyle = '#555';
        ctx.font = '14px Barlow, sans-serif';
        ctx.fillText(academy.toUpperCase(), 30, 155);
      }

      // Linha separadora
      ctx.strokeStyle = '#1E1E1E';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, 175);
      ctx.lineTo(W - 30, 175);
      ctx.stroke();

      // Stats — 4 cards
      const stats = [
        { label: 'TREINOS', value: String(trainings.length), color: '#CC0000' },
        { label: 'HORAS', value: `${totalHrs}h`, color: '#CC0000' },
        { label: 'XP TOTAL', value: String(xp), color: '#FFD700' },
        { label: 'NÍVEL', value: String(currentLevel), color: '#0D9E6E' },
        { label: 'STREAK', value: `${streak}d`, color: '#1A6ECC' },
      ];

      const cardW = (W - 60 - 16) / stats.length;
      stats.forEach((s, i) => {
        const x = 30 + i * (cardW + 4);
        const y = 190;

        ctx.fillStyle = '#111111';
        ctx.fillRect(x, y, cardW, 90);
        ctx.strokeStyle = '#1E1E1E';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cardW, 90);

        // Valor
        ctx.fillStyle = s.color;
        ctx.font = `bold ${s.value.length > 5 ? 22 : 28}px Barlow Condensed, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(s.value, x + cardW / 2, y + 48);

        // Label
        ctx.fillStyle = '#555';
        ctx.font = '10px Barlow Condensed, sans-serif';
        ctx.fillText(s.label, x + cardW / 2, y + 68);

        ctx.textAlign = 'left';
      });

      // Rodapé
      ctx.fillStyle = '#222';
      ctx.fillRect(0, H - 44, W, 44);

      ctx.fillStyle = '#444';
      ctx.font = '11px Barlow, sans-serif';
      ctx.fillText('Registrado com BJJRats · Treine. Evolua. Domine.', 30, H - 16);

      // Data
      const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      ctx.fillStyle = '#333';
      ctx.textAlign = 'right';
      ctx.fillText(today, W - 30, H - 16);
      ctx.textAlign = 'left';

      setImgUrl(canvas.toDataURL('image/png'));
      setGenerating(false);
    };

    // Pequeno delay para garantir que o canvas está pronto
    setTimeout(draw, 100);
  }, [trainings, name, belt, academy, xp, currentLevel, streak, totalHrs, beltColor]);

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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.05em' }}>CARD DE STATS</p>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.3rem 0.625rem', cursor: 'pointer' }}>FECHAR</button>
        </div>

        {/* Canvas oculto para geração */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Preview */}
        <div style={{ background: '#111', border: '1px solid #1E1E1E', overflow: 'hidden', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {generating ? (
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>GERANDO...</p>
          ) : imgUrl ? (
            <img src={imgUrl} alt="Stats card" style={{ width: '100%', display: 'block' }} />
          ) : null}
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleShare}
            disabled={generating}
            style={{ flex: 1, background: generating ? '#1A0000' : '#CC0000', border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.875rem', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.5 : 1 }}
          >
            {'share' in navigator ? '↑ COMPARTILHAR' : '↓ BAIXAR'}
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            style={{ background: '#111', border: '1px solid #2A2A2A', color: generating ? '#333' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.875rem 1rem', cursor: generating ? 'not-allowed' : 'pointer' }}
          >
            ↓ SALVAR
          </button>
        </div>

        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#333', textAlign: 'center' }}>
          Toque fora do card para fechar
        </p>
      </div>
    </div>
  );
}
