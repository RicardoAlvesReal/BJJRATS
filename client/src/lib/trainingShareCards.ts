import { MODALITIES, SESSION_TYPES } from '@/lib/bjjrats-constants';
import type { ShareUserData, TrainingData } from '@/pages/app/TrainingShareModal';

export type InstagramShareTemplate = 'card_foto_treino' | 'card_foto_perfil' | 'card_metricas';

export const SHARE_CANVAS_WIDTH = 1080;
export const SHARE_CANVAS_HEIGHT = 1600;

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

function strokeRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, stroke: string, lw: number) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
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
  ctx.stroke();
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

function getSessionLabel(training: TrainingData) {
  const session = SESSION_TYPES.find(item => item.id === training.sessionType);
  return session?.label || 'Treino';
}

function countTechniques(training: TrainingData) {
  return Object.values(training.techniques || {}).reduce((sum, items) => sum + items.length, 0);
}

function countSubmissions(training: TrainingData) {
  return Object.entries(training.techniques || {}).reduce((sum, [key, items]) => {
    const normalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalized.includes('final') || normalized.includes('submission') ? sum + items.length : sum;
  }, 0);
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

function drawTrainingPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, mode: 'black' | 'outline', modality: string) {
  const bg = mode === 'black' ? '#0B0B0B' : 'rgba(16,31,56,0.72)';
  fillRoundRect(ctx, x, y, w, h, h / 2, bg);
  if (mode === 'outline') strokeRoundRect(ctx, x, y, w, h, h / 2, '#1F7AE0', 4);
  text(ctx, '🥋', x + 50, y + h / 2 + 16, '44px Arial', '#FFF', 'center');
  text(ctx, 'Treino', x + 100, y + h / 2 + 14, 'bold 48px "Barlow Condensed", Arial Narrow, Arial', mode === 'outline' ? '#2F80ED' : '#FFF');
  if (mode === 'black') text(ctx, modality, x + w - 58, y + h / 2 + 14, '40px "Barlow Condensed", Arial Narrow, Arial', '#FFF', 'center');
}

function drawMetricTile(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, icon: string, value: string, label: string, color: string) {
  fillRoundRect(ctx, x, y, w, h, 34, '#1E293B');
  text(ctx, icon, x + w / 2, y + 86, '58px Arial', '#FFF', 'center');
  const valueLines = value.split('\n');
  if (valueLines.length > 1) {
    text(ctx, valueLines[0], x + w / 2, y + 160, 'bold 76px "Barlow Condensed", Arial Narrow, Arial', color, 'center');
    text(ctx, valueLines[1], x + w / 2, y + 224, 'bold 64px "Barlow Condensed", Arial Narrow, Arial', color, 'center');
  } else {
    text(ctx, value, x + w / 2, y + 178, 'bold 76px "Barlow Condensed", Arial Narrow, Arial', color, 'center');
  }
  text(ctx, label.toUpperCase(), x + w / 2, valueLines.length > 1 ? y + 286 : y + 240, 'bold 34px "Barlow Condensed", Arial Narrow, Arial', '#8B98AC', 'center');
}

function drawStats(ctx: CanvasRenderingContext2D, training: TrainingData, user: ShareUserData | null, logo: HTMLImageElement | null) {
  const W = SHARE_CANVAS_WIDTH;
  const H = SHARE_CANVAS_HEIGHT;
  const PAD = 52;
  const name = user?.name || 'Atleta';
  const date = formatShareDate(training.trainingDate);
  const modality = getModalityLabel(training);

  ctx.fillStyle = '#060B14';
  ctx.fillRect(0, 0, W, H);
  fillRoundRect(ctx, 0, 0, W, H, 54, '#111C2E');
  strokeRoundRect(ctx, 0, 0, W, H, 54, '#1D2A42', 3);

  drawBrandLogo(ctx, logo, PAD + 10, 120, 126, 0);
  text(ctx, 'THE', PAD + 180, 112, 'bold 72px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF');
  text(ctx, 'BJJRATS', PAD + 180, 194, 'bold 76px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF');
  drawTrainingPill(ctx, W - PAD - 360, 140, 330, 88, 'outline', modality);
  text(ctx, `${date} ·`, PAD + 180, 250, '44px "Barlow Condensed", Arial Narrow, Arial', '#6D7890');
  text(ctx, name, PAD + 180, 312, '44px "Barlow Condensed", Arial Narrow, Arial', '#7F8AA1');

  ctx.strokeStyle = '#243149';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 390);
  ctx.lineTo(W, 390);
  ctx.stroke();

  const tileW = 294;
  const tileH = 314;
  const gap = 42;
  const x1 = PAD;
  const x2 = x1 + tileW + gap;
  const x3 = x2 + tileW + gap;
  const y1 = 450;
  const y2 = y1 + tileH + 42;
  drawMetricTile(ctx, x1, y1, tileW, tileH, '⏱️', `${training.duration || 0}\nmin`, 'Duração', '#3B82F6');
  drawMetricTile(ctx, x2, y1, tileW, tileH, '🔥', `${training.intensity || 3}/5`, 'Intensidade', '#EF4444');
  drawMetricTile(ctx, x3, y1, tileW, tileH, '🥋', modality, 'Modalidade', '#8B5CF6');
  drawMetricTile(ctx, x1, y2, tileW, tileH, '😊', `${training.satisfaction || 4}/5`, 'Satisfação', '#10B981');
  drawMetricTile(ctx, x2, y2, tileW, tileH, '🎯', String(countTechniques(training)), 'Técnicas', '#F59E0B');
  drawMetricTile(ctx, x3, y2, tileW, tileH, '🏅', String(countSubmissions(training)), 'Finalizações', '#EC4899');

  ctx.strokeStyle = '#243149';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, H - 150);
  ctx.lineTo(W, H - 150);
  ctx.stroke();
  text(ctx, 'CRIADO COM THE BJJRATS ·', PAD, H - 78, '42px "Barlow Condensed", Arial Narrow, Arial', '#344157');
  text(ctx, '@thebjjrats', PAD, H - 30, '40px "Barlow Condensed", Arial Narrow, Arial', '#344157');
}

function drawMinimal(ctx: CanvasRenderingContext2D, training: TrainingData, user: ShareUserData | null, photo: HTMLImageElement | null, logo: HTMLImageElement | null) {
  const W = SHARE_CANVAS_WIDTH;
  const H = SHARE_CANVAS_HEIGHT;
  const PAD = 70;
  const photoH = 760;
  const name = user?.name || 'Atleta';
  const date = formatShareDate(training.trainingDate);
  const modality = getModalityLabel(training);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  clipRoundRect(ctx, 0, 0, W, H, 48, () => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, photoH);
    ctx.clip();
    if (photo) {
      drawImageCover(ctx, photo, 0, 0, W, photoH);
    } else {
      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(0, 0, W, photoH);
      text(ctx, 'TREINO BJJRATS', W / 2, photoH / 2, 'bold 76px "Barlow Condensed", Arial Narrow, Arial', '#9CA3AF', 'center');
    }
    ctx.restore();
  });

  ctx.fillStyle = '#F7F7F7';
  ctx.fillRect(0, photoH - 1, W, H - photoH + 1);
  drawBrandLogo(ctx, logo, PAD, photoH + 92, 92, 0);
  text(ctx, 'THE BJJRATS', PAD + 150, photoH + 134, 'bold 66px "Barlow Condensed", Arial Narrow, Arial', '#0A0A0A');
  text(ctx, 'Diário do Guerreiro', PAD + 150, photoH + 196, '48px "Barlow Condensed", Arial Narrow, Arial', '#6B7280');
  drawTrainingPill(ctx, W - PAD - 330, photoH + 98, 330, 86, 'black', modality);

  text(ctx, name, PAD, photoH + 330, 'bold 92px "Barlow Condensed", Arial Narrow, Arial', '#050505');
  text(ctx, `📅 ${date} · ⏱️ ${training.duration || 0} min · ${modality}`, PAD, photoH + 420, '50px "Barlow Condensed", Arial Narrow, Arial', '#6B7280');

  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(PAD, photoH + 500);
  ctx.lineTo(W - PAD, photoH + 500);
  ctx.stroke();

  const colW = (W - PAD * 2) / 3;
  const statsY = photoH + 620;
  [
    [`${training.duration || 0}`, 'minutos'],
    [`${training.intensity || 3}`, 'intensidade'],
    [String(countTechniques(training)), 'técnicas'],
  ].forEach(([value, label], i) => {
    const cx = PAD + colW * i + colW / 2;
    text(ctx, value, cx, statsY, 'bold 106px "Barlow Condensed", Arial Narrow, Arial', '#EF3340', 'center');
    text(ctx, label, cx, statsY + 82, '46px "Barlow Condensed", Arial Narrow, Arial', '#6B7280', 'center');
  });

  text(ctx, '@thebjjrats', W - PAD, H - 72, '48px "Barlow Condensed", Arial Narrow, Arial', '#9CA3AF', 'right');
}

function drawBold(ctx: CanvasRenderingContext2D, training: TrainingData, user: ShareUserData | null, photo: HTMLImageElement | null, logo: HTMLImageElement | null) {
  const W = SHARE_CANVAS_WIDTH;
  const H = SHARE_CANVAS_HEIGHT;
  const PAD = 54;
  const RED = '#D50000';
  const name = user?.name || 'Atleta';
  const date = formatShareDate(training.trainingDate);
  const modality = getModalityLabel(training);

  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);
  fillRoundRect(ctx, 0, 0, W, H, 46, RED);
  strokeRoundRect(ctx, 0, 0, W, H, 46, RED, 6);

  drawBrandLogo(ctx, logo, PAD + 18, 120, 130, 65);
  text(ctx, 'THE', PAD + 230, 112, 'bold 80px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF');
  text(ctx, 'BJJRATS', PAD + 230, 194, 'bold 80px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF');
  text(ctx, 'Diário do', PAD + 230, 264, '50px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF');
  text(ctx, 'Guerreiro', PAD + 230, 326, '50px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF');
  drawTrainingPill(ctx, W - PAD - 330, 150, 330, 104, 'black', modality);

  const photoY = 450;
  const photoH = 510;
  if (photo) drawImageCover(ctx, photo, 0, photoY, W, photoH);
  else {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, photoY, W, photoH);
    text(ctx, 'SEM FOTO DO TREINO', W / 2, photoY + photoH / 2, 'bold 60px "Barlow Condensed", Arial Narrow, Arial', '#333', 'center');
  }

  const gridY = photoY + photoH;
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, gridY, W, 340);
  ctx.strokeStyle = '#2B2B2B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 3, gridY);
  ctx.lineTo(W / 3, gridY + 340);
  ctx.moveTo(W * 2 / 3, gridY);
  ctx.lineTo(W * 2 / 3, gridY + 340);
  ctx.stroke();

  [
    [`${training.duration || 0}`, 'min', 'Duração'],
    [`${training.intensity || 3}/5`, '', 'Intensidade'],
    [String(countTechniques(training)), '', 'Técnicas'],
  ].forEach(([value, unit, label], i) => {
    const x = W * (i + 0.5) / 3;
    text(ctx, value, x, gridY + 112, 'bold 96px "Barlow Condensed", Arial Narrow, Arial', RED, 'center');
    if (unit) text(ctx, unit, x + 80, gridY + 112, 'bold 46px "Barlow Condensed", Arial Narrow, Arial', RED);
    text(ctx, label.toUpperCase(), x, gridY + 210, 'bold 42px "Barlow Condensed", Arial Narrow, Arial', '#777', 'center');
  });

  const infoY = gridY + 340;
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, infoY, W, H - infoY);
  ctx.strokeStyle = '#242424';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, infoY);
  ctx.lineTo(W, infoY);
  ctx.moveTo(0, infoY + 170);
  ctx.lineTo(W, infoY + 170);
  ctx.stroke();
  text(ctx, `📅 ${date}`, PAD, infoY + 82, '48px "Barlow Condensed", Arial Narrow, Arial', '#9CA3AF');
  text(ctx, `🏫 ${training.academy || user?.academy || name}`, PAD, infoY + 152, '48px "Barlow Condensed", Arial Narrow, Arial', '#9CA3AF');
  text(ctx, 'CRIADO COM THE BJJRATS  🥋', W / 2, H - 62, '40px "Barlow Condensed", Arial Narrow, Arial', '#333', 'center');
}

export function drawInstagramShareCard(ctx: CanvasRenderingContext2D, template: InstagramShareTemplate, training: TrainingData, user: ShareUserData | null, assets: ShareAssets) {
  if (template === 'card_foto_perfil') {
    drawMinimal(ctx, training, user, assets.trainingPhoto, assets.brandLogo);
    return;
  }
  if (template === 'card_metricas') {
    drawStats(ctx, training, user, assets.brandLogo);
    return;
  }
  drawBold(ctx, training, user, assets.trainingPhoto, assets.brandLogo);
}
