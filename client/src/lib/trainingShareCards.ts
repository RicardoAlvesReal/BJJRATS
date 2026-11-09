import { MODALITIES } from '@/lib/bjjrats-constants';
import type { ShareUserData, TrainingData } from '@/pages/app/TrainingShareModal';

export type InstagramShareTemplate = 'card_foto_treino' | 'card_foto_perfil' | 'card_metricas';

/** Stories/Reels/Status = 9:16 · Feed do Instagram (retrato máximo) = 4:5 */
export type ShareFormat = 'story' | 'feed';
type ShareSize = { w: number; h: number };
export const SHARE_FORMATS: Record<ShareFormat, ShareSize> = {
  story: { w: 1080, h: 1920 },
  feed: { w: 1080, h: 1350 },
};

type ShareAssets = {
  trainingPhoto: HTMLImageElement | null;
  brandLogo: HTMLImageElement | null;
};

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill;
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
  ctx.fill();
}


function clipRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fn: () => void) {
  ctx.save();
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
  ctx.clip();
  fn();
  ctx.restore();
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const sw = iw * scale;
  const sh = ih * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
  ctx.restore();
}

function drawImageContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.min(w / iw, h / ih);
  const sw = iw * scale;
  const sh = ih * scale;
  ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
}

function drawTrainingPhoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, mode: 'dark' | 'light') {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const imageAspect = iw / ih;
  const isVertical = imageAspect < 0.9;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const targetAspect = w / h;
  const aspectDiff = Math.abs(imageAspect - targetAspect);

  // Se a proporção for muito próxima do enquadramento (pouco corte), usa cover direto
  if (aspectDiff < 0.25) {
    drawImageCover(ctx, img, x, y, w, h);
    ctx.restore();
    return;
  }

  ctx.fillStyle = mode === 'dark' ? '#080808' : '#F3F4F6';
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.globalAlpha = mode === 'dark' ? 0.62 : 0.5;
  ctx.filter = 'blur(26px)';
  drawImageCover(ctx, img, x - 44, y - 44, w + 88, h + 88);
  ctx.restore();

  ctx.fillStyle = mode === 'dark' ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.20)';
  ctx.fillRect(x, y, w, h);

  const inset = mode === 'dark' ? 18 : 0;
  ctx.save();
  ctx.shadowColor = mode === 'dark' ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = mode === 'dark' ? 22 : 16;
  drawImageContain(ctx, img, x + inset, y + inset, w - inset * 2, h - inset * 2);
  ctx.restore();
  ctx.restore();
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function formatShareDate(value?: string) {
  if (!value) return new Date().toLocaleDateString('pt-BR');
  if (value.includes('/')) return value;
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

function getModalityLabel(training: TrainingData) {
  const mod = MODALITIES.find(item => item.id === training.modality);
  return mod?.label || training.modality || 'Gi';
}


function countTechniques(training: TrainingData) {
  return Object.values(training.techniques || {}).reduce((sum, items) => sum + items.length, 0);
}


function drawBrandLogo(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, x: number, y: number, size: number, rounded = 0) {
  fillRoundRect(ctx, x, y, size, size, rounded, '#FFFFFF');
  if (logo) {
    clipRoundRect(ctx, x + 10, y + 10, size - 20, size - 20, Math.max(0, rounded - 8), () => {
      drawImageCover(ctx, logo, x + 10, y + 10, size - 20, size - 20);
    });
  } else {
    text(ctx, 'BJJ', x + size / 2, y + size / 2 - 6, 'bold 30px "Barlow Condensed", Arial Narrow, Arial', '#111', 'center');
    text(ctx, 'RATS', x + size / 2, y + size / 2 + 26, 'bold 30px "Barlow Condensed", Arial Narrow, Arial', '#111', 'center');
  }
}

const FONT = '"Barlow Condensed", Arial Narrow, Arial';

type Stat = { value: string; label: string };

/** No máximo 3 números: duração sempre, intensidade e técnicas só quando existem. */
function getStats(training: TrainingData): Stat[] {
  const stats: Stat[] = [{ value: `${training.duration || 0}`, label: 'minutos' }];
  if (training.intensity) stats.push({ value: `${training.intensity}/5`, label: 'intensidade' });
  const techs = countTechniques(training);
  if (techs > 0) stats.push({ value: String(techs), label: techs === 1 ? 'técnica' : 'técnicas' });
  return stats;
}

/** Linha de contexto única: "Gi · 15/03/2026" */
function getSubtitle(training: TrainingData) {
  return `${getModalityLabel(training)} · ${formatShareDate(training.trainingDate)}`;
}

function fitText(ctx: CanvasRenderingContext2D, value: string, font: string, maxW: number) {
  ctx.font = font;
  if (ctx.measureText(value).width <= maxW) return value;
  let out = value;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxW) out = out.slice(0, -1);
  return `${out}…`;
}

function drawStatsRow(ctx: CanvasRenderingContext2D, stats: Stat[], x: number, y: number, w: number, valueColor: string, labelColor: string) {
  const colW = w / stats.length;
  stats.forEach((s, i) => {
    const cx = x + colW * i + colW / 2;
    text(ctx, s.value, cx, y, `bold 120px ${FONT}`, valueColor, 'center');
    text(ctx, s.label.toUpperCase(), cx, y + 64, `bold 40px ${FONT}`, labelColor, 'center');
  });
}

function drawBrandHeader(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, x: number, y: number, color: string) {
  drawBrandLogo(ctx, logo, x, y, 96, 48);
  text(ctx, 'BJJRATS', x + 124, y + 70, `bold 72px ${FONT}`, color);
}

// STATS — fundo escuro, só números
function drawStats(ctx: CanvasRenderingContext2D, size: ShareSize, training: TrainingData, user: ShareUserData | null, logo: HTMLImageElement | null) {
  const { w: W, h: H } = size;
  const PAD = 80;
  const isFeed = H < 1600;

  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, W, H);

  drawBrandHeader(ctx, logo, PAD, isFeed ? 70 : 120, '#FFFFFF');

  const nameY = isFeed ? 330 : 520;
  const name = fitText(ctx, user?.name || 'Atleta', `bold 110px ${FONT}`, W - PAD * 2);
  text(ctx, name, PAD, nameY, `bold 110px ${FONT}`, '#FFFFFF');
  text(ctx, getSubtitle(training), PAD, nameY + 80, `48px ${FONT}`, '#777777');

  // Lista vertical: um número grande por linha
  const stats = getStats(training);
  const rowH = isFeed ? 240 : 330;
  const startY = nameY + (isFeed ? 140 : 220);
  stats.forEach((s, i) => {
    const y = startY + i * rowH;
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    text(ctx, s.value, PAD, y + 190, `bold 170px ${FONT}`, i === 0 ? '#E10600' : '#FFFFFF');
    text(ctx, s.label.toUpperCase(), W - PAD, y + 180, `bold 48px ${FONT}`, '#666666', 'right');
  });

  text(ctx, '@thebjjrats', W / 2, H - (isFeed ? 50 : 90), `44px ${FONT}`, '#444444', 'center');
}

// MINIMAL — foto grande, painel claro com nome e números
function drawMinimal(ctx: CanvasRenderingContext2D, size: ShareSize, training: TrainingData, user: ShareUserData | null, photo: HTMLImageElement | null, logo: HTMLImageElement | null) {
  const { w: W, h: H } = size;
  const PAD = 80;
  const photoH = H - 640;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  if (photo) {
    drawTrainingPhoto(ctx, photo, 0, 0, W, photoH, 'light');
  } else {
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(0, 0, W, photoH);
    text(ctx, '🥋', W / 2, photoH / 2 + 60, '180px Arial', '#9CA3AF', 'center');
  }

  const name = fitText(ctx, user?.name || 'Atleta', `bold 96px ${FONT}`, W - PAD * 2);
  text(ctx, name, PAD, photoH + 130, `bold 96px ${FONT}`, '#0A0A0A');
  text(ctx, getSubtitle(training), PAD, photoH + 200, `46px ${FONT}`, '#6B7280');

  drawStatsRow(ctx, getStats(training), PAD, H - 220, W - PAD * 2, '#E10600', '#9CA3AF');

  drawBrandLogo(ctx, logo, W - PAD - 64 - 230, H - 112, 64, 32);
  text(ctx, '@thebjjrats', W - PAD, H - 64, `40px ${FONT}`, '#9CA3AF', 'right');
}

// BOLD — faixa vermelha com marca, foto, nome e números
function drawBold(ctx: CanvasRenderingContext2D, size: ShareSize, training: TrainingData, user: ShareUserData | null, photo: HTMLImageElement | null, logo: HTMLImageElement | null) {
  const { w: W, h: H } = size;
  const PAD = 70;
  const RED = '#D50000';
  const isFeed = H < 1600;
  const headerH = isFeed ? 200 : 260;
  const infoH = isFeed ? 500 : 560;
  const photoH = H - headerH - infoH;

  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, W, headerH);
  drawBrandHeader(ctx, logo, PAD, (headerH - 96) / 2, '#FFFFFF');

  if (photo) drawTrainingPhoto(ctx, photo, 0, headerH, W, photoH, 'dark');
  else {
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, headerH, W, photoH);
    text(ctx, '🥋', W / 2, headerH + photoH / 2 + 60, '180px Arial', '#333', 'center');
  }

  const infoY = headerH + photoH;
  const name = fitText(ctx, (user?.name || 'Atleta').toUpperCase(), `bold 88px ${FONT}`, W - PAD * 2);
  text(ctx, name, PAD, infoY + 115, `bold 88px ${FONT}`, '#FFFFFF');
  text(ctx, getSubtitle(training), PAD, infoY + 180, `44px ${FONT}`, '#888888');

  drawStatsRow(ctx, getStats(training), PAD, H - (isFeed ? 120 : 160), W - PAD * 2, RED, '#777777');
}

export function drawInstagramShareCard(ctx: CanvasRenderingContext2D, template: InstagramShareTemplate, format: ShareFormat, training: TrainingData, user: ShareUserData | null, assets: ShareAssets) {
  const size = SHARE_FORMATS[format];
  if (template === 'card_foto_perfil') {
    drawMinimal(ctx, size, training, user, assets.trainingPhoto, assets.brandLogo);
    return;
  }
  if (template === 'card_metricas') {
    drawStats(ctx, size, training, user, assets.brandLogo);
    return;
  }
  drawBold(ctx, size, training, user, assets.trainingPhoto, assets.brandLogo);
}
