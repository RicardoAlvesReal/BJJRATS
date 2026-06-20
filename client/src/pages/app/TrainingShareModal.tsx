// BJJRats PWA — Training Share Modal v3
// Canvas 1080×1080px — coordenadas absolutas, sem escala relativa
// Card 1: FOTO TREINO   — foto no terço superior, dados no inferior
// Card 2: FOTO PERFIL   — esquerda: foto+nome, direita: métricas em lista
// Card 3: MÉTRICAS      — grid limpo, hierarquia tipográfica clara

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SESSION_TYPES, MODALITIES, INTENSITY_LABELS, SATISFACTION_LABELS } from '@/lib/bjjrats-constants';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  drawInstagramShareCard,
  SHARE_CANVAS_HEIGHT,
  SHARE_CANVAS_WIDTH,
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

const BELT_HEX: Record<string, string> = {
  Branca: '#FFFFFF', Azul: '#2563EB', Roxa: '#7C3AED', Marrom: '#92400E', Preta: '#1F2937',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function strokeRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, stroke: string, lw: number) {
  ctx.strokeStyle = stroke; ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.stroke();
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, alignTop = false) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih);
  const sw = iw * scale; const sh = ih * scale;
  // alignTop: posiciona pelo topo (ideal para fotos de perfil verticais)
  const offsetY = alignTop ? 0 : (h - sh) / 2;
  ctx.drawImage(img, x + (w - sw) / 2, y + offsetY, sw, sh);
}

function drawCircleImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  // alignTop=true: fotos de perfil são verticais, posicionar pelo topo mostra o rosto
  drawImageCover(ctx, img, cx - r, cy - r, r * 2, r * 2, true);
  ctx.restore();
}

function clipRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fn: () => void) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  fn();
  ctx.restore();
}

function clipRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fn: () => void) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.clip();
  fn();
  ctx.restore();
}

function text(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left') {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

function beltBadge(ctx: CanvasRenderingContext2D, belt: string, x: number, y: number, w: number, h: number) {
  const hex = BELT_HEX[belt] || '#FFFFFF';
  fillRoundRect(ctx, x, y, w, h, 4, hex);
  if (belt === 'Branca') strokeRoundRect(ctx, x, y, w, h, 4, '#555', 1);
  ctx.font = `bold 18px "Barlow Condensed", Arial Narrow, Arial`;
  ctx.fillStyle = belt === 'Branca' ? '#111' : '#FFF';
  ctx.textAlign = 'center';
  ctx.fillText(belt.toUpperCase(), x + w / 2, y + h - 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// Atividades extras — labels
// ─────────────────────────────────────────────────────────────────────────────
const EXTRA_ACTIVITY_LABELS: Record<string, { label: string; icon: string }> = {
  corrida: { label: 'Corrida', icon: '🏃' },
  ciclismo: { label: 'Ciclismo', icon: '🚴' },
  musculacao: { label: 'Musculação', icon: '🏋️' },
  crossfit: { label: 'CrossFit', icon: '💪' },
  outras_lutas: { label: 'Outras Lutas', icon: '🥊' },
  outros_esportes: { label: 'Outros Esportes', icon: '⚽' },
};

function isExtraTraining(training: TrainingData): boolean {
  return training.sessionType === 'outros_treinos' && !!training.extraData;
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD 1 — FOTO TREINO
// Layout: foto ocupa 420px do topo (com clip), fundo escuro nos 660px inferiores
// Dados: nome (40px), faixa+academia (24px), linha vermelha, 4 métricas em grid 2×2, notas
// ─────────────────────────────────────────────────────────────────────────────
function drawCard1(ctx: CanvasRenderingContext2D, training: TrainingData, user: ShareUserData | null, photo: HTMLImageElement | null) {
  const W = 1080; const H = 1080;
  const PHOTO_H = 420;
  const DATA_Y = PHOTO_H;
  const PAD = 48;
  const isExtra = isExtraTraining(training);
  const ACCENT = isExtra ? '#0EA5E9' : '#CC0000';

  const sess = SESSION_TYPES.find(s => s.id === training.sessionType) || SESSION_TYPES[0];
  const mod = MODALITIES.find(m => m.id === training.modality) || MODALITIES[0];
  const belt = user?.belt || 'Branca';
  const techCount = Object.values(training.techniques || {}).reduce((s, a) => s + a.length, 0);
  const allTechs = Object.values(training.techniques || {}).flat().slice(0, 6);

  // ── Fundo geral
  ctx.fillStyle = '#0A0A0A'; ctx.fillRect(0, 0, W, H);

  // ── Zona da foto (420px topo)
  clipRect(ctx, 0, 0, W, PHOTO_H, () => {
    if (photo) {
      drawImageCover(ctx, photo, 0, 0, W, PHOTO_H);
      const g = ctx.createLinearGradient(0, PHOTO_H - 120, 0, PHOTO_H);
      g.addColorStop(0, 'rgba(10,10,10,0)'); g.addColorStop(1, 'rgba(10,10,10,1)');
      ctx.fillStyle = g; ctx.fillRect(0, PHOTO_H - 120, W, 120);
    } else {
      ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, W, PHOTO_H);
      ctx.font = '120px serif'; ctx.fillStyle = '#222'; ctx.textAlign = 'center';
      ctx.fillText(isExtra ? '🏃' : '🥋', W / 2, PHOTO_H / 2 + 40);
    }
  });

  // Barra accent no topo
  ctx.fillStyle = ACCENT; ctx.fillRect(0, 0, W, 8);

  // Badge BJJRATS no topo esquerdo
  fillRoundRect(ctx, PAD, 24, 160, 44, 4, 'rgba(0,0,0,0.75)');
  text(ctx, 'BJJ', PAD + 16, 56, 'bold 28px "Barlow Condensed", Arial Narrow, Arial', ACCENT);
  text(ctx, 'RATS', PAD + 16 + 42, 56, 'bold 28px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF');

  // Badge tipo de sessão no topo direito
  if (isExtra) {
    const ed = training.extraData!;
    const act = EXTRA_ACTIVITY_LABELS[ed.activity] || { label: 'Atividade', icon: '🏃' };
    const actLabel = (act.icon + ' ' + act.label).toUpperCase();
    ctx.font = 'bold 22px "Barlow Condensed", Arial Narrow, Arial';
    const actW = ctx.measureText(actLabel).width + 32;
    fillRoundRect(ctx, W - PAD - actW, 24, actW, 44, 4, '#0EA5E9DD');
    text(ctx, actLabel, W - PAD - actW / 2, 52, 'bold 22px "Barlow Condensed", Arial Narrow, Arial', '#FFF', 'center');
  } else {
    const sessLabel = (sess.icon + ' ' + sess.label).toUpperCase();
    ctx.font = 'bold 22px "Barlow Condensed", Arial Narrow, Arial';
    const sessW = ctx.measureText(sessLabel).width + 32;
    fillRoundRect(ctx, W - PAD - sessW, 24, sessW, 44, 4, sess.color + 'DD');
    text(ctx, sessLabel, W - PAD - sessW / 2, 52, 'bold 22px "Barlow Condensed", Arial Narrow, Arial', '#FFF', 'center');
  }

  // ── Zona de dados (660px inferiores)
  const nameY = DATA_Y + 52;
  text(ctx, (user?.name || 'ATLETA').toUpperCase(), PAD, nameY, 'bold 52px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF');

  beltBadge(ctx, belt, PAD, nameY + 12, 100, 30);
  const acadText = (training.academy || user?.academy || '').toUpperCase();
  text(ctx, acadText, PAD + 112, nameY + 32, '24px "Barlow Condensed", Arial Narrow, Arial', '#888');
  text(ctx, training.trainingDate || '', W - PAD, nameY + 32, '24px "Barlow Condensed", Arial Narrow, Arial', '#666', 'right');

  // Linha divisória accent
  const lineY = nameY + 58;
  ctx.strokeStyle = ACCENT; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, lineY); ctx.lineTo(W - PAD, lineY); ctx.stroke();

  // ── Grid 2×2 de métricas
  const gridY = lineY + 32;
  const cellW = (W - PAD * 2 - 24) / 2;
  const cellH = 160;

  let metrics: { label: string; value: string; unit: string; highlight?: boolean }[];
  if (isExtra) {
    const ed = training.extraData!;
    metrics = [
      { label: 'DURAÇÃO', value: `${ed.distance ? training.duration : training.duration}`, unit: 'min' },
      { label: 'DISTÂNCIA', value: ed.distance ? `${ed.distance}` : '--', unit: ed.distance ? 'km' : '' },
      { label: 'CALORIAS', value: ed.calories ? `${ed.calories}` : '--', unit: ed.calories ? 'kcal' : '' },
      { label: 'XP EXTRA', value: `+${training.xp || 0}`, unit: 'pontos', highlight: true },
    ];
  } else {
    metrics = [
      { label: 'DURAÇÃO', value: `${training.duration}`, unit: 'min' },
      { label: 'MODALIDADE', value: mod.label.toUpperCase(), unit: '' },
      { label: 'TÉCNICAS', value: `${techCount}`, unit: 'movimentos' },
      { label: 'XP GANHO', value: `+${training.xp || 0}`, unit: 'pontos', highlight: true },
    ];
  }
  metrics.forEach((m, i) => {
    const col = i % 2; const row = Math.floor(i / 2);
    const mx = PAD + col * (cellW + 24); const my = gridY + row * (cellH + 16);
    fillRoundRect(ctx, mx, my, cellW, cellH, 8, '#141414');
    if (m.highlight) strokeRoundRect(ctx, mx, my, cellW, cellH, 8, ACCENT, 1.5);
    text(ctx, m.label, mx + 20, my + 34, '26px "Barlow Condensed", Arial Narrow, Arial', '#555');
    text(ctx, m.value, mx + 20, my + 110, `bold 72px "Barlow Condensed", Arial Narrow, Arial`, m.highlight ? ACCENT : '#FFFFFF');
    if (m.unit) text(ctx, m.unit, mx + 20, my + 140, '24px "Barlow Condensed", Arial Narrow, Arial', '#444');
  });

  // ── Seção inferior
  const techY = gridY + 2 * (cellH + 16) + 16;
  if (isExtra) {
    // Pace e atividade
    const ed = training.extraData!;
    const act = EXTRA_ACTIVITY_LABELS[ed.activity] || { label: 'Atividade', icon: '🏃' };
    fillRoundRect(ctx, PAD, techY, W - PAD * 2, 80, 8, '#141414');
    strokeRoundRect(ctx, PAD, techY, W - PAD * 2, 80, 8, '#0EA5E9', 1.5);
    text(ctx, `${act.icon} ${act.label.toUpperCase()} — OUTROS TREINOS`, PAD + 20, techY + 32, 'bold 32px "Barlow Condensed", Arial Narrow, Arial', '#0EA5E9');
    if (ed.pace) {
      text(ctx, `PACE: ${ed.pace}`, PAD + 20, techY + 64, '26px "Barlow Condensed", Arial Narrow, Arial', '#AAA');
    }
  } else if (training.compData) {
    const cd = training.compData;
    const placementEmoji = cd.placement === '1º lugar' ? '🥇' : cd.placement === '2º lugar' ? '🥈' : cd.placement === '3º lugar' ? '🥉' : '🏆';
    fillRoundRect(ctx, PAD, techY, W - PAD * 2, 120, 8, '#141414');
    strokeRoundRect(ctx, PAD, techY, W - PAD * 2, 120, 8, '#CC0000', 1.5);
    text(ctx, `${placementEmoji} ${cd.placement?.toUpperCase() || 'COMPETIÇÃO'}`, PAD + 20, techY + 36, 'bold 36px "Barlow Condensed", Arial Narrow, Arial', '#FFD700');
    text(ctx, (cd.tournament || '').toUpperCase(), PAD + 20, techY + 68, '26px "Barlow Condensed", Arial Narrow, Arial', '#CCC');
    const catLine = [cd.weightCategory, cd.ageCategory].filter(Boolean).join(' · ');
    text(ctx, catLine.toUpperCase(), PAD + 20, techY + 98, '22px "Barlow Condensed", Arial Narrow, Arial', '#888');
  } else if (allTechs.length > 0) {
    let tx = PAD;
    ctx.font = 'bold 24px "Barlow Condensed", Arial Narrow, Arial';
    for (const tech of allTechs) {
      const tw = ctx.measureText(tech.toUpperCase()).width + 24;
      if (tx + tw > W - PAD) break;
      fillRoundRect(ctx, tx, techY, tw, 36, 4, '#1E1E1E');
      text(ctx, tech.toUpperCase(), tx + 12, techY + 25, 'bold 24px "Barlow Condensed", Arial Narrow, Arial', '#AAA');
      tx += tw + 10;
    }
  }

  // Rodapé
  text(ctx, 'www.thebjjrats.com', W / 2, H - 18, '24px "Barlow Condensed", Arial Narrow, Arial', '#333', 'center');
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD 2 — FOTO PERFIL
// Layout: coluna esquerda 380px (fundo vermelho, foto circular, nome, faixa)
//         coluna direita 700px (fundo escuro, métricas em lista vertical)
// ─────────────────────────────────────────────────────────────────────────────
function drawCard2(ctx: CanvasRenderingContext2D, training: TrainingData, user: ShareUserData | null, profilePhoto: HTMLImageElement | null) {
  const W = 1080; const H = 1080;
  const LEFT_W = 380; const PAD = 40;
  const isExtra = isExtraTraining(training);
  const ACCENT = isExtra ? '#0EA5E9' : '#CC0000';

  const sess = SESSION_TYPES.find(s => s.id === training.sessionType) || SESSION_TYPES[0];
  const mod = MODALITIES.find(m => m.id === training.modality) || MODALITIES[0];
  const belt = user?.belt || 'Branca';
  const techCount = Object.values(training.techniques || {}).reduce((s, a) => s + a.length, 0);
  const allTechs = Object.values(training.techniques || {}).flat().slice(0, 8);

  // ── Fundo geral escuro
  ctx.fillStyle = '#0A0A0A'; ctx.fillRect(0, 0, W, H);

  // ── Coluna esquerda (accent)
  ctx.fillStyle = ACCENT; ctx.fillRect(0, 0, LEFT_W, H);

  // Padrão diagonal sutil na coluna vermelha
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, LEFT_W, H); ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
  for (let i = -H; i < LEFT_W + H; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
  }
  ctx.restore();

  // Logo na coluna vermelha (topo)
  text(ctx, 'BJJRATS', LEFT_W / 2, 72, 'bold 48px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF', 'center');
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, 90); ctx.lineTo(LEFT_W - PAD, 90); ctx.stroke();

  // Foto circular do atleta
  const photoR = 120;
  const photoCX = LEFT_W / 2;
  const photoCY = 300;
  if (profilePhoto) {
    // Sombra
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(photoCX, photoCY, photoR + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF'; ctx.fill();
    ctx.restore();
    drawCircleImage(ctx, profilePhoto, photoCX, photoCY, photoR);
    // Borda branca
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2); ctx.stroke();
  } else {
    // Avatar placeholder
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2); ctx.stroke();
    text(ctx, (user?.name || 'A').charAt(0).toUpperCase(), photoCX, photoCY + 40,
      `bold 120px "Barlow Condensed", Arial Narrow, Arial`, '#FFF', 'center');
  }

  // Nome do atleta
  const nameY = photoCY + photoR + 52;
  // Truncar nome se muito longo
  ctx.font = 'bold 38px "Barlow Condensed", Arial Narrow, Arial';
  let nameStr = (user?.name || 'ATLETA').toUpperCase();
  while (ctx.measureText(nameStr).width > LEFT_W - PAD * 2 && nameStr.length > 3) {
    nameStr = nameStr.slice(0, -1);
  }
  if (nameStr !== (user?.name || 'ATLETA').toUpperCase()) nameStr += '…';
  text(ctx, nameStr, LEFT_W / 2, nameY, 'bold 38px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF', 'center');

  // Faixa badge centralizado
  const beltW = 140; const beltH = 32;
  beltBadge(ctx, belt, (LEFT_W - beltW) / 2, nameY + 14, beltW, beltH);

  // Academia
  const acadText = (training.academy || user?.academy || '').toUpperCase();
  if (acadText) {
    ctx.font = '22px "Barlow Condensed", Arial Narrow, Arial';
    let ac = acadText;
    while (ctx.measureText(ac).width > LEFT_W - PAD * 2 && ac.length > 3) ac = ac.slice(0, -1);
    if (ac !== acadText) ac += '…';
    text(ctx, ac, LEFT_W / 2, nameY + 68, '22px "Barlow Condensed", Arial Narrow, Arial', 'rgba(255,255,255,0.7)', 'center');
  }

  // Data na parte inferior da coluna vermelha
  text(ctx, training.trainingDate || '', LEFT_W / 2, H - 30,
    '22px "Barlow Condensed", Arial Narrow, Arial', 'rgba(255,255,255,0.6)', 'center');

  // ── Coluna direita (dados)
  const RX = LEFT_W + PAD; const RW = W - LEFT_W - PAD * 2;

  // Tipo de sessão (topo direito)
  const sessLabel = (sess.icon + ' ' + sess.label).toUpperCase();
  fillRoundRect(ctx, RX, 32, RW, 52, 6, sess.color + 'CC');
  text(ctx, sessLabel, RX + RW / 2, 66, 'bold 28px "Barlow Condensed", Arial Narrow, Arial', '#FFF', 'center');

  // Título
  if (isExtra) {
    const ed = training.extraData!;
    const act = EXTRA_ACTIVITY_LABELS[ed.activity] || { label: 'Atividade', icon: '🏃' };
    text(ctx, act.label.toUpperCase(), RX, 168, 'bold 64px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF');
    text(ctx, 'REGISTRADA', RX, 232, 'bold 64px "Barlow Condensed", Arial Narrow, Arial', ACCENT);
  } else {
    text(ctx, 'TREINO', RX, 168, 'bold 64px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF');
    text(ctx, 'REGISTRADO', RX, 232, 'bold 64px "Barlow Condensed", Arial Narrow, Arial', ACCENT);
  }

  // Linha divisória
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(RX, 254); ctx.lineTo(W - PAD, 254); ctx.stroke();

  // Métricas em lista vertical
  let metricsList: { icon: string; label: string; value: string; highlight?: boolean }[];
  if (isExtra) {
    const ed = training.extraData!;
    metricsList = [
      { icon: '⏱', label: 'Duração', value: `${training.duration} min` },
      { icon: '📏', label: 'Distância', value: ed.distance ? `${ed.distance} km` : '--' },
      { icon: '🔥', label: 'Calorias', value: ed.calories ? `${ed.calories} kcal` : '--' },
      { icon: '⏱', label: 'Pace', value: ed.pace || '--' },
      { icon: '⚡', label: 'XP Extra', value: `+${training.xp || 0} pontos`, highlight: true },
    ];
  } else {
    metricsList = [
      { icon: '⏱', label: 'Duração', value: `${training.duration} min` },
      { icon: '🥋', label: 'Modalidade', value: mod.label },
      { icon: '📋', label: 'Tipo', value: sess.label },
      { icon: '🎯', label: 'Técnicas', value: `${techCount} movimentos` },
      { icon: '⚡', label: 'Intensidade', value: INTENSITY_LABELS[training.intensity || 3] || 'Médio' },
      { icon: '😊', label: 'Satisfação', value: SATISFACTION_LABELS[training.satisfaction || 4] || '😊' },
      { icon: '🏆', label: 'XP Ganho', value: `+${training.xp || 0} pontos`, highlight: true },
    ];
  }

  let listY = 278;
  const ROW_H = 68;
  metricsList.forEach((m) => {
    // Linha separadora
    ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(RX, listY + ROW_H); ctx.lineTo(W - PAD, listY + ROW_H); ctx.stroke();

    text(ctx, m.icon + ' ' + m.label.toUpperCase(), RX, listY + 28,
      '28px "Barlow Condensed", Arial Narrow, Arial', '#555');
    text(ctx, m.value, W - PAD, listY + 28,
      `bold 34px "Barlow Condensed", Arial Narrow, Arial`, m.highlight ? ACCENT : '#FFFFFF', 'right');
    listY += ROW_H;
  });

  // Técnicas em tags OU dados de competição OU extras
  if (isExtra) {
    // Extras já mostram tudo na lista de métricas, nada mais a exibir aqui
  } else if (training.compData) {
    const cd = training.compData;
    const compStartY = listY + 20;
    const placementEmoji = cd.placement === '1º lugar' ? '🥇' : cd.placement === '2º lugar' ? '🥈' : cd.placement === '3º lugar' ? '🥉' : '🏆';
    fillRoundRect(ctx, RX, compStartY, RW, 110, 8, '#141414');
    strokeRoundRect(ctx, RX, compStartY, RW, 110, 8, '#CC0000', 1.5);
    text(ctx, `${placementEmoji} ${cd.placement?.toUpperCase() || 'COMPETIÇÃO'}`, RX + 16, compStartY + 32, 'bold 32px "Barlow Condensed", Arial Narrow, Arial', '#FFD700');
    text(ctx, (cd.tournament || '').toUpperCase(), RX + 16, compStartY + 62, '24px "Barlow Condensed", Arial Narrow, Arial', '#CCC');
    const catLine = [cd.weightCategory, cd.ageCategory].filter(Boolean).join(' · ');
    text(ctx, catLine.toUpperCase(), RX + 16, compStartY + 90, '20px "Barlow Condensed", Arial Narrow, Arial', '#888');
  } else if (allTechs.length > 0) {
    const techStartY = listY + 20;
    text(ctx, 'TÉCNICAS TREINADAS', RX, techStartY,
      '24px "Barlow Condensed", Arial Narrow, Arial', '#444');
    let tx = RX; let ty = techStartY + 14;
    ctx.font = 'bold 22px "Barlow Condensed", Arial Narrow, Arial';
    for (const tech of allTechs) {
      const tw = ctx.measureText(tech.toUpperCase()).width + 20;
      if (tx + tw > W - PAD) { tx = RX; ty += 40; }
      if (ty > H - 50) break;
      fillRoundRect(ctx, tx, ty, tw, 34, 4, '#1A1A1A');
      text(ctx, tech.toUpperCase(), tx + 10, ty + 24, 'bold 22px "Barlow Condensed", Arial Narrow, Arial', '#888');
      tx += tw + 8;
    }
  }

  // Rodapé
  text(ctx, 'www.thebjjrats.com', W - PAD, H - 18,
    '24px "Barlow Condensed", Arial Narrow, Arial', '#333', 'right');
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD 3 — MÉTRICAS
// Layout: header 100px, nome+faixa 120px, 4 blocos 2×2 (200px cada), seção técnicas, rodapé
// ─────────────────────────────────────────────────────────────────────────────
function drawCard3(ctx: CanvasRenderingContext2D, training: TrainingData, user: ShareUserData | null) {
  const W = 1080; const H = 1080;
  const PAD = 48;
  const isExtra = isExtraTraining(training);
  const ACCENT = isExtra ? '#0EA5E9' : '#CC0000';

  const sess = SESSION_TYPES.find(s => s.id === training.sessionType) || SESSION_TYPES[0];
  const mod = MODALITIES.find(m => m.id === training.modality) || MODALITIES[0];
  const belt = user?.belt || 'Branca';
  const techCount = Object.values(training.techniques || {}).reduce((s, a) => s + a.length, 0);
  const allTechs = Object.values(training.techniques || {}).flat();
  const intLabel = INTENSITY_LABELS[training.intensity || 3] || 'Médio';
  const satLabel = SATISFACTION_LABELS[training.satisfaction || 4] || '😊';

  // ── Fundo
  ctx.fillStyle = '#0A0A0A'; ctx.fillRect(0, 0, W, H);

  // ── Header accent (100px)
  ctx.fillStyle = ACCENT; ctx.fillRect(0, 0, W, 100);

  // Logo no header
  text(ctx, 'BJJ', PAD, 68, 'bold 56px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF');
  ctx.font = 'bold 56px "Barlow Condensed", Arial Narrow, Arial';
  const bjjW = ctx.measureText('BJJ').width;
  text(ctx, 'RATS', PAD + bjjW + 6, 68, 'bold 56px "Barlow Condensed", Arial Narrow, Arial', '#0A0A0A');

  // Tipo de sessão/atividade no header (direita)
  if (isExtra) {
    const ed = training.extraData!;
    const act = EXTRA_ACTIVITY_LABELS[ed.activity] || { label: 'Atividade', icon: '🏃' };
    const actLabel = (act.icon + ' ' + act.label).toUpperCase();
    ctx.font = 'bold 26px "Barlow Condensed", Arial Narrow, Arial';
    const actW = ctx.measureText(actLabel).width + 32;
    fillRoundRect(ctx, W - PAD - actW, 24, actW, 52, 6, 'rgba(0,0,0,0.35)');
    text(ctx, actLabel, W - PAD - actW / 2, 56, 'bold 26px "Barlow Condensed", Arial Narrow, Arial', '#FFF', 'center');
  } else {
    const sessLabel = (sess.icon + ' ' + sess.label).toUpperCase();
    ctx.font = 'bold 26px "Barlow Condensed", Arial Narrow, Arial';
    const sessW = ctx.measureText(sessLabel).width + 32;
    fillRoundRect(ctx, W - PAD - sessW, 24, sessW, 52, 6, 'rgba(0,0,0,0.35)');
    text(ctx, sessLabel, W - PAD - sessW / 2, 56, 'bold 26px "Barlow Condensed", Arial Narrow, Arial', '#FFF', 'center');
  }

  // ── Seção nome + faixa (100–220px)
  const nameY = 160;
  text(ctx, (user?.name || 'ATLETA').toUpperCase(), PAD, nameY,
    'bold 56px "Barlow Condensed", Arial Narrow, Arial', '#FFFFFF');
  beltBadge(ctx, belt, PAD, nameY + 12, 110, 32);
  const acadText = (training.academy || user?.academy || '').toUpperCase();
  if (acadText) text(ctx, acadText, PAD + 122, nameY + 36, '24px "Barlow Condensed", Arial Narrow, Arial', '#666');
  text(ctx, training.trainingDate || '', W - PAD, nameY + 36,
    '24px "Barlow Condensed", Arial Narrow, Arial', '#555', 'right');

  // Linha divisória
  ctx.strokeStyle = ACCENT; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, 220); ctx.lineTo(W - PAD, 220); ctx.stroke();

  // ── Grid 2×2 de métricas principais (220–640px)
  const GRID_Y = 236; const CELL_W = (W - PAD * 2 - 16) / 2; const CELL_H = 188;
  let mainMetrics: { label: string; value: string; unit: string; highlight?: boolean }[];
  if (isExtra) {
    const ed = training.extraData!;
    mainMetrics = [
      { label: 'DURAÇÃO', value: `${training.duration}`, unit: 'minutos' },
      { label: 'DISTÂNCIA', value: ed.distance ? `${ed.distance}` : '--', unit: ed.distance ? 'km' : '' },
      { label: 'CALORIAS', value: ed.calories ? `${ed.calories}` : '--', unit: ed.calories ? 'kcal' : '' },
      { label: 'XP EXTRA', value: `+${training.xp || 0}`, unit: 'pontos', highlight: true },
    ];
  } else {
    mainMetrics = [
      { label: 'DURAÇÃO', value: `${training.duration}`, unit: 'minutos' },
      { label: 'MODALIDADE', value: mod.label.toUpperCase(), unit: '' },
      { label: 'INTENSIDADE', value: intLabel.toUpperCase(), unit: '' },
      { label: 'XP GANHO', value: `+${training.xp || 0}`, unit: 'pontos', highlight: true },
    ];
  }
  mainMetrics.forEach((m, i) => {
    const col = i % 2; const row = Math.floor(i / 2);
    const cx = PAD + col * (CELL_W + 16); const cy = GRID_Y + row * (CELL_H + 16);
    fillRoundRect(ctx, cx, cy, CELL_W, CELL_H, 8, '#141414');
    if (m.highlight) strokeRoundRect(ctx, cx, cy, CELL_W, CELL_H, 8, ACCENT, 2);
    text(ctx, m.label, cx + 20, cy + 36, '28px "Barlow Condensed", Arial Narrow, Arial', '#555');
    text(ctx, m.value, cx + 20, cy + 130, `bold 72px "Barlow Condensed", Arial Narrow, Arial`, m.highlight ? ACCENT : '#FFFFFF');
    if (m.unit) text(ctx, m.unit, cx + 20, cy + 162, '24px "Barlow Condensed", Arial Narrow, Arial', '#444');
  });

  // ── Linha de stats adicionais (660–740px)
  const STATS_Y = GRID_Y + 2 * (CELL_H + 16) + 8;
  let statsItems: { label: string; value: string }[];
  if (isExtra) {
    const ed = training.extraData!;
    statsItems = [
      { label: 'PACE', value: ed.pace || '--' },
      { label: 'ATIVIDADE', value: (EXTRA_ACTIVITY_LABELS[ed.activity]?.label || 'Atividade').toUpperCase() },
      { label: 'TIPO', value: 'OUTROS TREINOS' },
    ];
  } else {
    statsItems = [
      { label: 'TÉCNICAS', value: `${techCount}` },
      { label: 'SATISFAÇÃO', value: satLabel },
      { label: 'TIPO', value: sess.label.toUpperCase() },
    ];
  }
  const statW = (W - PAD * 2 - 32) / 3;
  statsItems.forEach((s, i) => {
    const sx = PAD + i * (statW + 16);
    fillRoundRect(ctx, sx, STATS_Y, statW, 72, 6, '#141414');
    text(ctx, s.label, sx + statW / 2, STATS_Y + 22, '24px "Barlow Condensed", Arial Narrow, Arial', '#555', 'center');
    text(ctx, s.value, sx + statW / 2, STATS_Y + 56, 'bold 36px "Barlow Condensed", Arial Narrow, Arial', '#CCC', 'center');
  });

  // ── Seção técnicas OU competição (760px–)
  const TECH_Y = STATS_Y + 72 + 24;
  ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, TECH_Y - 12); ctx.lineTo(W - PAD, TECH_Y - 12); ctx.stroke();

  if (isExtra) {
    // Extras: nada mais a exibir na seção inferior
  } else if (training.compData) {
    const cd = training.compData;
    const placementEmoji = cd.placement === '1º lugar' ? '🥇' : cd.placement === '2º lugar' ? '🥈' : cd.placement === '3º lugar' ? '🥉' : '🏆';
    fillRoundRect(ctx, PAD, TECH_Y, W - PAD * 2, 130, 8, '#141414');
    strokeRoundRect(ctx, PAD, TECH_Y, W - PAD * 2, 130, 8, ACCENT, 2);
    text(ctx, `${placementEmoji} ${cd.placement?.toUpperCase() || 'COMPETIÇÃO'}`, PAD + 24, TECH_Y + 38, 'bold 40px "Barlow Condensed", Arial Narrow, Arial', '#FFD700');
    text(ctx, (cd.tournament || '').toUpperCase(), PAD + 24, TECH_Y + 74, '28px "Barlow Condensed", Arial Narrow, Arial', '#CCC');
    const catLine = [cd.weightCategory, cd.ageCategory, cd.city].filter(Boolean).join(' · ');
    text(ctx, catLine.toUpperCase(), PAD + 24, TECH_Y + 106, '24px "Barlow Condensed", Arial Narrow, Arial', '#888');
  } else {
    text(ctx, `TÉCNICAS TREINADAS (${techCount})`, PAD, TECH_Y + 4,
      '26px "Barlow Condensed", Arial Narrow, Arial', '#444');

    let tagX = PAD; let tagY = TECH_Y + 28;
    const TAG_H = 40; const maxTagY = H - 52;
    ctx.font = 'bold 24px "Barlow Condensed", Arial Narrow, Arial';
    for (const tech of allTechs) {
      if (tagY + TAG_H > maxTagY) break;
      const tw = ctx.measureText(tech.toUpperCase()).width + 28;
      if (tagX + tw > W - PAD) { tagX = PAD; tagY += TAG_H + 8; if (tagY + TAG_H > maxTagY) break; }
      fillRoundRect(ctx, tagX, tagY, tw, TAG_H, 4, '#1A1A1A');
      strokeRoundRect(ctx, tagX, tagY, tw, TAG_H, 4, '#2A2A2A', 1);
      text(ctx, tech.toUpperCase(), tagX + 14, tagY + 28, 'bold 24px "Barlow Condensed", Arial Narrow, Arial', '#AAA');
      tagX += tw + 8;
    }
  }

  // Notas (se couber)
  if (training.notes && training.notes.trim()) {
    const notesY = H - 52;
    ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, notesY - 10); ctx.lineTo(W - PAD, notesY - 10); ctx.stroke();
    ctx.font = 'italic 20px "Barlow", Arial'; ctx.fillStyle = '#444'; ctx.textAlign = 'left';
    const note = `"${training.notes}"`;
    const maxW = W - PAD * 2;
    const truncated = ctx.measureText(note).width > maxW ? note.slice(0, 80) + '…"' : note;
    ctx.fillText(truncated, PAD, notesY + 8);
  }

  // Rodapé
  text(ctx, 'www.thebjjrats.com', W / 2, H - 14, '24px "Barlow Condensed", Arial Narrow, Arial', '#2A2A2A', 'center');
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function TrainingShareModal({ training, user, onClose, zIndex = 9999, currentUserUid, currentUserAcademyId, currentUserAcademyName, currentUserBelt }: Props) {
  const [template, setTemplate] = useState<Template>('card_foto_treino');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trainingPhoto, setTrainingPhoto] = useState<HTMLImageElement | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<HTMLImageElement | null>(null);
  const [brandLogo, setBrandLogo] = useState<HTMLImageElement | null>(null);
  const [appLinks, setAppLinks] = useState<{ playStoreUrl: string; appStoreUrl: string }>({ playStoreUrl: '', appStoreUrl: '' });
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
      const [tp, pp, logo] = await Promise.all([
        trainingPhotoSrc ? loadImg(trainingPhotoSrc) : Promise.resolve(null),
        user?.photoURL ? loadImg(user.photoURL) : Promise.resolve(null),
        loadImg('/favicon.png'),
      ]);
      if (!cancelled) { setTrainingPhoto(tp); setProfilePhoto(pp); setBrandLogo(logo); setPhotosReady(true); }
    };
    load();
    return () => { cancelled = true; };
  }, [trainingPhotoSrc, user?.photoURL]);

  useEffect(() => {
    let cancelled = false;
    api.settings.public()
      .then(settings => {
        if (cancelled) return;
        setAppLinks({
          playStoreUrl: String(settings.play_store_url || '').trim(),
          appStoreUrl: String(settings.app_store_url || '').trim(),
        });
      })
      .catch(() => {
        if (!cancelled) setAppLinks({ playStoreUrl: '', appStoreUrl: '' });
      });
    return () => { cancelled = true; };
  }, []);

  const renderCard = useCallback((tmpl: Template) => {
    const canvas = canvasRef.current;
    if (!canvas || !photosReady) return;
    setPreviewLoading(true);
    canvas.width = SHARE_CANVAS_WIDTH; canvas.height = SHARE_CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setPreviewLoading(false); return; }
    try {
      drawInstagramShareCard(ctx, tmpl, training, user, { trainingPhoto, brandLogo });
      setPreviewUrl(canvas.toDataURL('image/png'));
    } catch (e) { console.error('Canvas error:', e); setPreviewUrl(null); }
    setPreviewLoading(false);
  }, [photosReady, training, user, trainingPhoto, brandLogo]);

  useEffect(() => { if (photosReady) renderCard(template); }, [template, photosReady, renderCard]);

  const handleDownload = () => {
    if (!previewUrl) return;
    setGenerating(true);
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `bjjrats-${template}-${(training.trainingDate || 'treino').replace(/\//g, '-')}.png`;
    link.click();
    setTimeout(() => setGenerating(false), 800);
  };

  const handleShare = async () => {
    if (!previewUrl) return;
    try {
      const blob = await (await fetch(previewUrl)).blob();
      const file = new File([blob], 'bjjrats-treino.png', { type: 'image/png' });
      const caption = buildRichInstagramCaption();
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Meu treino no BJJRats', text: caption });
      } else { handleDownload(); }
    } catch { handleDownload(); }
  };

  const buildInstagramCaption = () => {
    const sess = SESSION_TYPES.find(s => s.id === training.sessionType) || SESSION_TYPES[0];
    const mod = MODALITIES.find(m => m.id === training.modality) || MODALITIES[0];
    const intensity = INTENSITY_LABELS[training.intensity || 3] || 'Médio';
    const lines = [
      `🥋 ${training.trainingDate || 'Hoje'} · ${user?.name || 'Atleta'}`,
      `⏱️ ${training.duration || 0} min · ${mod.label}`,
      `🔥 Intensidade: ${intensity}`,
      '',
      '#BJJRats #BJJ',
      '#BrazilianJiuJitsu #JiuJitsu',
      '#Treino #DiarioDoGuerreiro',
      training.academy ? `#${String(training.academy).replace(/\s+/g, '')}` : '',
      sess.label ? `#${String(sess.label).replace(/\s+/g, '')}` : '',
    ].filter(Boolean);
    return lines.join('\n');
  };

  const buildRichInstagramCaption = () => {
    const sess = SESSION_TYPES.find(s => s.id === training.sessionType) || SESSION_TYPES[0];
    const mod = MODALITIES.find(m => m.id === training.modality) || MODALITIES[0];
    const intensity = INTENSITY_LABELS[training.intensity || 3] || 'Medio';
    const satisfaction = SATISFACTION_LABELS[training.satisfaction || 4] || '';
    const techniqueCount = Object.values(training.techniques || {}).reduce((sum, items) => sum + items.length, 0);
    const cleanHash = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, '');
    const appLinkLines = [
      appLinks.playStoreUrl ? `Android: ${appLinks.playStoreUrl}` : '',
      appLinks.appStoreUrl ? `iPhone: ${appLinks.appStoreUrl}` : '',
    ].filter(Boolean);
    const lines = [
      'Treino registrado no BJJRats',
      `${training.trainingDate || 'Hoje'} · ${user?.name || 'Atleta'}`,
      '',
      `Duracao: ${training.duration || 0} min`,
      `Modalidade: ${mod.label}`,
      `Tipo: ${sess.label}`,
      `Intensidade: ${intensity}`,
      satisfaction ? `Satisfacao: ${satisfaction}` : '',
      `Tecnicas: ${techniqueCount}`,
      training.academy ? `Academia: ${training.academy}` : '',
      training.professor ? `Professor: ${training.professor}` : '',
      training.notes ? `"${training.notes}"` : '',
      appLinkLines.length ? '' : '',
      appLinkLines.length ? 'Baixe o app BJJRats:' : '',
      ...appLinkLines,
      '',
      '#BJJRats #BJJ',
      '#BrazilianJiuJitsu #JiuJitsu',
      '#Treino #DiarioDoGuerreiro',
      '#JiuJitsuBrasil #ArteSuave',
      training.academy ? `#${cleanHash(String(training.academy))}` : '',
      training.professor ? `#${cleanHash(String(training.professor))}` : '',
      sess.label ? `#${cleanHash(String(sess.label))}` : '',
    ].filter(Boolean);
    return lines.join('\n');
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(buildRichInstagramCaption());
      toast.success('Legenda copiada');
    } catch {
      toast.error('Nao foi possivel copiar a legenda');
    }
  };

  const handleOpenInstagram = async () => {
    if (disabled) return;
    handleDownload();
    try {
      await navigator.clipboard.writeText(buildRichInstagramCaption());
    } catch {
      // O navegador pode bloquear clipboard sem permissao.
    }
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    toast.success('Imagem salva e legenda copiada. Abra o Instagram e selecione o arquivo gerado.');
  };

  const instagramCaption = buildRichInstagramCaption();

  const TEMPLATES: { id: Template; icon: string; label: string; desc: string }[] = [
    { id: 'card_foto_treino', icon: '🖼️', label: 'FOTO TREINO', desc: 'Foto como fundo' },
    { id: 'card_foto_perfil', icon: '👤', label: 'FOTO PERFIL', desc: 'Seu avatar + dados' },
    { id: 'card_metricas',    icon: '📊', label: 'MÉTRICAS',    desc: 'Análise completa' },
  ];

  const noTrainingPhoto = (template === 'card_foto_treino' || template === 'card_foto_perfil') && !trainingPhoto;
  const noProfilePhoto  = false;
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
    if (!currentUserUid) { toast.error('Faça login para postar'); return; }
    if (target === 'academy' && !currentUserAcademyId) { toast.error('Você não está vinculado a uma academia'); return; }
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

      toast.success(target === 'academy' ? '\u2705 Postado no feed da academia!' : '\u2705 Postado no feed da comunidade!');
    } catch { toast.error('Erro ao publicar no feed'); }
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
      {(noTrainingPhoto || noProfilePhoto) && (
        <div style={{ width: '100%', maxWidth: '460px', marginBottom: '0.75rem', padding: '8px 14px', background: '#1A1200', border: '1px solid #554400', borderRadius: '4px' }}>
          <span style={{ color: '#AA8800', fontSize: '0.72rem', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {noTrainingPhoto ? '⚠️ Treino sem foto — fundo escuro será usado' : '⚠️ Sem foto de perfil — avatar com inicial'}
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
              style={{ width: 'min(390px, 100%)', aspectRatio: `${SHARE_CANVAS_WIDTH} / ${SHARE_CANVAS_HEIGHT}`, background: '#111', border: '1px solid #222', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
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
              style={{ width: 'min(390px, 100%)', maxHeight: '62vh', objectFit: 'contain', border: '1px solid #222', borderRadius: '18px', boxShadow: '0 22px 50px rgba(0,0,0,0.42)' }}
            />
          ) : (
            <motion.div
              key="preview-error"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              style={{ width: 'min(390px, 100%)', aspectRatio: `${SHARE_CANVAS_WIDTH} / ${SHARE_CANVAS_HEIGHT}`, background: '#111', border: '1px solid #222', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span style={{ color: '#444', fontSize: '0.75rem', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase' }}>Erro ao gerar</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ações */}
      <div style={{ width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '0.625rem', paddingBottom: '2rem' }}>

        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '18px', padding: '1rem', color: '#888', fontFamily: "'Barlow', sans-serif", fontSize: '0.92rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', maxHeight: '220px', overflowY: 'auto' }}>
          {instagramCaption}
        </div>

        <motion.button whileHover={disabled ? undefined : { y: -2 }} whileTap={disabled ? undefined : { scale: 0.98 }} onClick={handleShare} disabled={disabled} style={{ background: disabled ? '#333' : '#E63273', color: disabled ? '#666' : '#FFF', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.35rem', letterSpacing: '0.01em', padding: '1.1rem 1.25rem', border: 'none', borderRadius: '18px', width: '100%', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', lineHeight: 1.1, boxShadow: disabled ? 'none' : '0 16px 30px rgba(230, 50, 115, 0.25)' }}>
          <span style={{ fontSize: '1.7rem' }}>📸</span>
          <span>{previewLoading ? 'Gerando imagem...' : 'Gerar Imagem e Compartilhar'}</span>
        </motion.button>
        <motion.button whileHover={disabled ? undefined : { y: -2 }} whileTap={disabled ? undefined : { scale: 0.98 }} onClick={handleOpenInstagram} disabled={disabled} style={{ background: disabled ? '#222' : '#8738C4', color: disabled ? '#555' : '#FFF', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.01em', padding: '1rem 1.25rem', border: 'none', borderRadius: '18px', width: '100%', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', boxShadow: disabled ? 'none' : '0 16px 30px rgba(135, 56, 196, 0.23)' }}>
          <span style={{ fontSize: '1.6rem' }}>📱</span>
          <span>Gerar e Abrir no Instagram</span>
        </motion.button>
        <motion.button whileHover={{ y: -2, borderColor: '#333' }} whileTap={{ scale: 0.98 }} onClick={handleCopyCaption} style={{ background: '#111', color: '#FFF', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.01em', padding: '1rem 1.25rem', border: '1px solid #222', borderRadius: '18px', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem' }}>
          <span style={{ fontSize: '1.55rem' }}>📋</span>
          <span>Copiar Legenda</span>
        </motion.button>

        <div style={{ display: 'none' }}>

        {/* Compartilhar redes sociais */}
        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', margin: '0.25rem 0 0' }}>REDES SOCIAIS</p>
        <button onClick={handleShare} disabled={disabled} style={{ background: disabled ? '#333' : '#CC0000', color: disabled ? '#666' : '#FFF', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1rem', border: 'none', borderRadius: '4px', width: '100%', cursor: disabled ? 'not-allowed' : 'pointer' }}>
          {previewLoading ? 'GERANDO CARD...' : '📤 COMPARTILHAR (INSTAGRAM / REDES)'}
        </button>
        <button onClick={handleDownload} disabled={disabled} style={{ background: 'transparent', color: disabled ? '#333' : '#AAA', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.875rem', border: `1px solid ${disabled ? '#1A1A1A' : '#2A2A2A'}`, borderRadius: '4px', width: '100%', cursor: disabled ? 'not-allowed' : 'pointer' }}>
          {generating ? 'BAIXANDO...' : '⬇ SALVAR IMAGEM (1080×1080)'}
        </button>

        </div>

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
