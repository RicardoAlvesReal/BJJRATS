// BJJRats — Constantes compartilhadas (idênticas ao app móvel)
// Mantém compatibilidade total com a estrutura de dados do Firestore

export const BELTS = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'] as const;
export type Belt = typeof BELTS[number];

export const BELT_COLORS: Record<string, string> = {
  Branca: '#FFFFFF',
  Azul: '#3B82F6',
  Roxa: '#7C3AED',
  Marrom: '#92400E',
  Preta: '#374151',
};

export const SESSION_TYPES = [
  { id: 'aula_coletiva',   label: 'Aula Coletiva',   icon: '🥋', color: '#1A6ECC' },
  { id: 'aula_particular', label: 'Aula Particular', icon: '🎯', color: '#7C1ACC' },
  { id: 'treino_livre',    label: 'Treino Livre',    icon: '🥊', color: '#CC4400' },
  { id: 'competicao',      label: 'Competição',      icon: '🏆', color: '#CC8800' },
  { id: 'seminario',       label: 'Seminário',       icon: '📚', color: '#0D9E6E' },
  { id: 'outros_treinos',  label: 'Outros Treinos',  icon: '🏃', color: '#0EA5E9' },
];

export const MODALITIES = [
  { id: 'gi',   label: 'Gi',    color: '#1A6ECC' },
  { id: 'nogi', label: 'No-Gi', color: '#7C1ACC' },
];

export const INTENSITY_LABELS = ['', 'Leve', 'Moderado', 'Médio', 'Intenso', 'Máximo'];
export const SATISFACTION_LABELS = ['', '😞', '😐', '🙂', '😊', '🤩'];

// Estrutura de treino compatível com o app móvel
export interface Training {
  firestoreId?: string;
  id?: string;
  uid: string;
  trainingDate?: string;  // DD/MM/AAAA
  trainingTime?: string;  // HH:MM
  date?: number;          // timestamp ms (fallback)
  createdAt?: string | any;
  duration: number;       // minutos
  modality?: string;
  sessionType?: string;
  academy?: string;
  professor?: string;
  intensity?: number;     // 1-5
  satisfaction?: number;  // 1-5
  techniques?: Record<string, string[] | boolean> | string[];
  notes?: string;
  xp?: number;
  trainingPhoto?: string; // URL do Firebase Storage
}

// ─── CÁLCULO DE XP ────────────────────────────────────────────────────────────
// XP por treino: base 10 + bônus por duração, tipo de sessão e conquistas
export function calcXP(trainings: Training[]): number {
  let xp = 0;
  trainings.forEach(t => {
    let pts = 10; // base por treino
    const dur = t.duration || 0;
    if (dur >= 60)  pts += 5;
    if (dur >= 90)  pts += 5;
    if (dur >= 120) pts += 5;
    if (t.sessionType === 'treino_livre')    pts += 5;
    if (t.sessionType === 'aula_particular')  pts += 5;
    if (t.sessionType === 'competicao')       pts += 20;
    if (t.sessionType === 'seminario')        pts += 10;
    xp += pts;
  });
  // Bônus por conquistas desbloqueadas (+50 XP cada)
  const unlocked = ACHIEVEMENTS.filter(a => a.check(trainings));
  xp += unlocked.length * 50;
  return xp;
}

// ─── STREAK ───────────────────────────────────────────────────────────────────
// Conta treinos em dias consecutivos (sem pular dia)
export function calcStreak(trainings: Training[]): number {
  if (!trainings.length) return 0;
  const sorted = [...trainings].sort((a, b) => {
    const ta = parseTrainingDate(a)?.getTime() ?? 0;
    const tb = parseTrainingDate(b)?.getTime() ?? 0;
    return tb - ta;
  });
  // Normaliza para início do dia
  const dayOf = (t: Training) => {
    const d = parseTrainingDate(t);
    if (!d) return 0;
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  // Remove duplicatas de mesmo dia
  const uniqueDays = Array.from(new Set(sorted.map(dayOf))).sort((a, b) => b - a);
  if (!uniqueDays.length) return 0;
  const DAY_MS = 24 * 60 * 60 * 1000;
  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    if (uniqueDays[i - 1] - uniqueDays[i] === DAY_MS) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Conta treinos na semana atual (segunda a domingo)
export function treinsNaSemana(trainings: Training[]): number {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=dom, 1=seg...
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  return trainings.filter(t => {
    const d = parseTrainingDate(t);
    return d && d >= monday && d < sunday;
  }).length;
}

// Conta treinos no mês atual
export function treinsNoMes(trainings: Training[]): number {
  const now = new Date();
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const fim    = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return trainings.filter(t => {
    const d = parseTrainingDate(t);
    return d && d >= inicio && d < fim;
  }).length;
}

// Converte a data do treino para Date object
export function parseTrainingDate(t: Training): Date | null {
  if (t.trainingDate) {
    const parts = t.trainingDate.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
  }
  if (t.date) return new Date(t.date);
  if (t.createdAt) return new Date(t.createdAt);
  return null;
}

// Conta todas as técnicas de um treino
export function countAllTechs(techniques?: Record<string, string[] | boolean> | string[]): number {
  if (!techniques) return 0;
  if (Array.isArray(techniques)) return techniques.length;
  let count = 0;
  Object.values(techniques).forEach(v => {
    if (Array.isArray(v)) count += v.length;
    else if (v === true) count += 1;
  });
  return count;
}

// Retorna lista de técnicas como array de strings
export function getTechniquesList(techniques?: Record<string, string[] | boolean> | string[]): string[] {
  if (!techniques) return [];
  if (Array.isArray(techniques)) return techniques;
  const list: string[] = [];
  Object.entries(techniques).forEach(([k, v]) => {
    if (v === true) list.push(k);
    else if (Array.isArray(v)) list.push(...v);
  });
  return list;
}

// Horas por semana (8 semanas, mais recente primeiro)
export function horasPorSemana(trainings: Training[]) {
  const semanas = [];
  const now = Date.now();
  for (let i = 7; i >= 0; i--) {
    const start = now - (i + 1) * 7 * 24 * 60 * 60 * 1000;
    const end   = now - i * 7 * 24 * 60 * 60 * 1000;
    const mins  = trainings
      .filter(t => {
        const d = parseTrainingDate(t);
        return d && d.getTime() >= start && d.getTime() < end;
      })
      .reduce((s, t) => s + (t.duration || 0), 0);
    const label = i === 0 ? 'Essa' : `${i}s`;
    semanas.push({ label, horas: Math.round(mins / 60 * 10) / 10 });
  }
  return semanas;
}

// Top 5 técnicas mais praticadas
export function topTecnicas(trainings: Training[]) {
  const contagem: Record<string, number> = {};
  trainings.forEach(t => {
    const list = getTechniquesList(t.techniques);
    list.forEach(tec => { contagem[tec] = (contagem[tec] || 0) + 1; });
  });
  return Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome, qtd]) => ({ nome, qtd }));
}

// Distribuição por tipo de sessão
export function distribuicaoSessao(trainings: Training[]) {
  const contagem: Record<string, number> = {};
  trainings.forEach(t => {
    const tipo = t.sessionType || 'treino';
    contagem[tipo] = (contagem[tipo] || 0) + 1;
  });
  return Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .map(([id, qtd]) => {
      const sess = SESSION_TYPES.find(s => s.id === id) || { label: id, color: '#555', icon: '🥋' };
      return { id, label: sess.label, icon: sess.icon, color: sess.color, qtd };
    });
}

// Calendário de atividade (42 dias)
export function calendarioAtividade(trainings: Training[]) {
  const dias = [];
  const now = new Date();
  for (let i = 41; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const start = d.getTime();
    const end   = start + 24 * 60 * 60 * 1000;
    const treinos = trainings.filter(t => {
      const td = parseTrainingDate(t);
      return td && td.getTime() >= start && td.getTime() < end;
    });
    const mins = treinos.reduce((s, t) => s + (t.duration || 0), 0);
    dias.push({ date: new Date(d), treinos: treinos.length, mins });
  }
  return dias;
}

// ─── 17 NÍVEIS DE XP ─────────────────────────────────────────────────────────
// Níveis calculados com 75% dos critérios reais de graduação do BJJ (CBJJ/IBJJF)
// Base: 12 treinos/mês × 15 XP médio = 180 XP/mês × 0,75 = 135 XP/mês efetivo
// Branca/Azul: 6 meses por grau → 800 XP cada | Roxa: 5,5 meses → 750 XP | Marrom: 12 meses → 1.600 XP
export const LEVELS = [
  { level:  1, name: 'Branca',     minXP:     0, maxXP:    800 },
  { level:  2, name: 'Branca I',   minXP:   800, maxXP:   1600 },
  { level:  3, name: 'Branca II',  minXP:  1600, maxXP:   2400 },
  { level:  4, name: 'Branca III', minXP:  2400, maxXP:   3200 },
  { level:  5, name: 'Branca IV',  minXP:  3200, maxXP:   4000 },
  { level:  6, name: 'Azul',       minXP:  4000, maxXP:   4800 },
  { level:  7, name: 'Azul I',     minXP:  4800, maxXP:   5600 },
  { level:  8, name: 'Azul II',    minXP:  5600, maxXP:   6400 },
  { level:  9, name: 'Azul III',   minXP:  6400, maxXP:   7200 },
  { level: 10, name: 'Azul IV',    minXP:  7200, maxXP:   8000 },
  { level: 11, name: 'Roxa',       minXP:  8000, maxXP:   8750 },
  { level: 12, name: 'Roxa I',     minXP:  8750, maxXP:   9500 },
  { level: 13, name: 'Roxa II',    minXP:  9500, maxXP:  10250 },
  { level: 14, name: 'Roxa III',   minXP: 10250, maxXP:  11000 },
  { level: 15, name: 'Roxa IV',    minXP: 11000, maxXP:  11750 },
  { level: 16, name: 'Marrom',     minXP: 11750, maxXP:  13350 },
  { level: 17, name: 'Elite',      minXP: 13350, maxXP: 999999 },
];

// Cor associada a cada nível (para UI)
export const LEVEL_COLORS: Record<string, string> = {
  'Branca':     '#E5E7EB',
  'Branca I':   '#D1D5DB',
  'Branca II':  '#C4C9D4',
  'Branca III': '#B8BFCC',
  'Branca IV':  '#A8B2C4',
  'Azul':       '#3B82F6',
  'Azul I':     '#2563EB',
  'Azul II':    '#1D4ED8',
  'Azul III':   '#1E40AF',
  'Azul IV':    '#1E3A8A',
  'Roxa':       '#7C3AED',
  'Roxa I':     '#6D28D9',
  'Roxa II':    '#5B21B6',
  'Roxa III':   '#4C1D95',
  'Roxa IV':    '#3B0764',
  'Marrom':     '#92400E',
  'Elite':      '#CC0000',
};

export function getLevelInfo(xp: number) {
  const currentLevel = LEVELS.find(l => xp >= l.minXP && xp < l.maxXP) || LEVELS[LEVELS.length - 1];
  const xpProgress = currentLevel.maxXP < 999999
    ? Math.round(((xp - currentLevel.minXP) / (currentLevel.maxXP - currentLevel.minXP)) * 100)
    : 100;
  const xpToNext = currentLevel.maxXP < 999999 ? currentLevel.maxXP - xp : 0;
  return { currentLevel, xpProgress, xpToNext };
}

// ─── CONQUISTAS ───────────────────────────────────────────────────────────────
// Semana Perfeita: 5 treinos na semana (base) + bônus para 6 e 7
// Mês do Guerreiro: 22 treinos no mês (base) + bônus progressivos para cada dia a mais
export const ACHIEVEMENTS = [
  // ── Treinos acumulados ──
  { id: 'first_training',   icon: '🥋', title: 'Primeiro Passo',      desc: 'Registrou o 1º treino',              check: (t: Training[]) => t.length >= 1 },
  { id: 'ten_trainings',    icon: '🔥', title: 'Dez Treinos',          desc: '10 treinos registrados',             check: (t: Training[]) => t.length >= 10 },
  { id: 'fifty_trainings',  icon: '🏆', title: 'Cinquenta Treinos',    desc: '50 treinos registrados',             check: (t: Training[]) => t.length >= 50 },
  { id: 'hundred_train',    icon: '💯', title: 'Cem Treinos',          desc: '100 treinos registrados',            check: (t: Training[]) => t.length >= 100 },
  { id: 'twohundred_train', icon: '🌟', title: 'Duzentos Treinos',     desc: '200 treinos registrados',            check: (t: Training[]) => t.length >= 200 },

  // ── Horas no tatame ──
  { id: 'ten_hours',        icon: '⏱',  title: '10 Horas',             desc: '10 horas no tatame',                 check: (t: Training[]) => t.reduce((s, x) => s + (x.duration || 0), 0) >= 600 },
  { id: 'fifty_hours',      icon: '⏰',  title: '50 Horas',             desc: '50 horas no tatame',                 check: (t: Training[]) => t.reduce((s, x) => s + (x.duration || 0), 0) >= 3000 },
  { id: 'hundred_hours',    icon: '🕛', title: '100 Horas',            desc: '100 horas no tatame',                check: (t: Training[]) => t.reduce((s, x) => s + (x.duration || 0), 0) >= 6000 },
  { id: 'fivehundred_hours',icon: '🔱', title: '500 Horas',            desc: '500 horas no tatame',                check: (t: Training[]) => t.reduce((s, x) => s + (x.duration || 0), 0) >= 30000 },

  // ── Semana Perfeita (5, 6 e 7 treinos na semana) ──
  { id: 'week_5',           icon: '🗓',  title: 'Semana Perfeita',      desc: '5 treinos em uma semana',            check: (t: Training[]) => treinsNaSemana(t) >= 5 },
  { id: 'week_6',           icon: '🔥', title: 'Semana Intensa',       desc: '6 treinos em uma semana',            check: (t: Training[]) => treinsNaSemana(t) >= 6 },
  { id: 'week_7',           icon: '⚡', title: 'Semana Máxima',        desc: '7 treinos em uma semana',            check: (t: Training[]) => treinsNaSemana(t) >= 7 },

  // ── Mês do Guerreiro (22+ treinos no mês, bônus progressivos) ──
  { id: 'month_22',         icon: '💪', title: 'Mês do Guerreiro',     desc: '22 treinos em um mês',               check: (t: Training[]) => treinsNoMes(t) >= 22 },
  { id: 'month_24',         icon: '🥊', title: 'Mês Dedicado',         desc: '24 treinos em um mês',               check: (t: Training[]) => treinsNoMes(t) >= 24 },
  { id: 'month_26',         icon: '🏅', title: 'Mês Excepcional',      desc: '26 treinos em um mês',               check: (t: Training[]) => treinsNoMes(t) >= 26 },
  { id: 'month_28',         icon: '🏆', title: 'Mês Lendário',         desc: '28 treinos em um mês',               check: (t: Training[]) => treinsNoMes(t) >= 28 },
  { id: 'month_30',         icon: '👑', title: 'Mês Perfeito',         desc: '30 treinos em um mês',               check: (t: Training[]) => treinsNoMes(t) >= 30 },

  // ── Tipos de sessão ──
  { id: 'sparring_10',      icon: '🥊', title: 'Lutador',              desc: '10 sessões de sparring',             check: (t: Training[]) => t.filter(x => x.sessionType === 'sparring').length >= 10 },
  { id: 'sparring_50',      icon: '⚔️', title: 'Guerreiro',            desc: '50 sessões de sparring',             check: (t: Training[]) => t.filter(x => x.sessionType === 'sparring').length >= 50 },
  { id: 'competition',      icon: '🥇', title: 'Competidor',           desc: 'Registrou uma competição',           check: (t: Training[]) => t.some(x => x.sessionType === 'competicao') },
  { id: 'competition_5',    icon: '🎖', title: 'Atleta',               desc: '5 competições registradas',          check: (t: Training[]) => t.filter(x => x.sessionType === 'competicao').length >= 5 },

  // ── Técnicas ──
  { id: 'techniques_50',    icon: '📚', title: 'Estudioso',            desc: '50 técnicas praticadas no total',    check: (t: Training[]) => topTecnicas(t).reduce((s, x) => s + x.qtd, 0) >= 50 },
  { id: 'techniques_200',   icon: '🎓', title: 'Enciclopédia',         desc: '200 técnicas praticadas no total',   check: (t: Training[]) => topTecnicas(t).reduce((s, x) => s + x.qtd, 0) >= 200 },
];

// ─── CATEGORIAS DE TÉCNICAS ───────────────────────────────────────────────────
export const TECH_CATEGORIES = [
  {
    id: 'quedas', label: 'Quedas', icon: '🤼', color: '#CC4400',
    techniques: [
      'Projeção de quadril (O-Goshi)', 'Projeção de ombro (Seoi Nage)', 'Projeção de perna (Uchi Mata)',
      'Projeção de varredura (Harai Goshi)', 'Queda de joelho (Morote Seoi Nage)', 'Raspagem de perna (Osoto Gari)',
      'Raspagem de perna interna (Ouchi Gari)', 'Raspagem de perna externa (Kouchi Gari)',
      'Queda dupla de perna (Double Leg Takedown)', 'Queda de perna única (Single Leg Takedown)',
      'Derrubada de cabeça (Headlock Takedown)', 'Projeção de carregamento (Fireman Carry)',
      'Derrubada de gancho (Hook Throw)', 'Queda de joelho duplo (Knee Tap)',
    ],
  },
  {
    id: 'guardas', label: 'Guardas', icon: '🛡', color: '#1A6ECC',
    techniques: [
      'Guarda fechada (Closed Guard)', 'Meia guarda (Half Guard)', 'Guarda borboleta (Butterfly Guard)',
      'Guarda sentada (Seated Guard)', 'Guarda aranha (Spider Guard)', 'Guarda De La Riva (DLR)',
      'Guarda-X (X-Guard)', 'Guarda de perna única em X (Single Leg X)', 'Guarda 50/50 (Fifty-Fifty)',
      'Guarda worm (Worm Guard)', 'Guarda invertida (Inverted Guard)', 'Guarda de tartaruga (Turtle Guard)',
    ],
  },
  {
    id: 'controle', label: 'Posições de Controle', icon: '📌', color: '#7C1ACC',
    techniques: [
      'Montada (Mount)', 'Montada alta (High Mount)', '100 quilos (Side Control)',
      'Norte-Sul (North-South)', 'Joelho na barriga (Knee on Belly)', 'Costas (Back Control)',
      'Costas com gancho (Body Triangle)', 'Meia guarda por cima (Half Guard Top)',
    ],
  },
  {
    id: 'passagens', label: 'Passagens de Guarda', icon: '⚡', color: '#CC8800',
    techniques: [
      'Passagem de toreando (Toreando Pass)', 'Passagem de pressão (Pressure Pass)',
      'Passagem de joelho cortante (Knee Slice Pass)', 'Passagem de leg drag (Leg Drag Pass)',
      'Passagem de bull fighter (Bull Fighter Pass)', 'Passagem de x-pass (X-Pass)',
      'Passagem de stack (Stack Pass)', 'Passagem de smash (Smash Pass)',
      'Passagem de double under (Double Under Pass)', 'Passagem de over-under (Over-Under Pass)',
    ],
  },
  {
    id: 'raspagens', label: 'Raspagens', icon: '↑', color: '#0D9E6E',
    techniques: [
      'Raspagem de tesoura (Scissor Sweep)', 'Raspagem de bicicleta (Hip Bump Sweep)',
      'Raspagem de flor (Flower Sweep)', 'Raspagem de gancho (Hook Sweep)',
      'Raspagem de borboleta (Butterfly Sweep)', 'Raspagem de sit-up (Sit-Up Sweep)',
      'Raspagem de tripod (Tripod Sweep)', 'Raspagem de X (X-Guard Sweep)',
      'Raspagem de De La Riva (DLR Sweep)', 'Raspagem de meia guarda (Half Guard Sweep)',
      'Raspagem de meia guarda profunda (Deep Half Sweep)',
    ],
  },
  {
    id: 'finalizacoes', label: 'Finalizações', icon: '🏅', color: '#CC0000',
    techniques: [
      'Mata-leão (Rear Naked Choke)', 'Triângulo (Triangle Choke)', 'Guilhotina (Guillotine Choke)',
      'Chave de braço (Armbar)', 'Americana (Keylock)', 'Kimura', 'Omoplata',
      'Estrangulamento de lapela (Lapel Choke)', 'Estrangulamento de gola (Collar Choke)',
      'D\'arce (D\'Arce Choke)', 'Anaconda', 'Heel Hook', 'Kneebar', 'Toe Hold',
      'Estrangulamento de pescoço (Neck Crank)',
    ],
  },
  {
    id: 'defesas', label: 'Defesas e Escapes', icon: '🔰', color: '#0D8A7A',
    techniques: [
      'Escape de montada (Mount Escape)', 'Escape de cem quilos (Side Control Escape)',
      'Escape de costas (Back Escape)', 'Defesa de armlock (Armbar Defense)',
      'Defesa de triângulo (Triangle Defense)', 'Defesa de guilhotina (Guillotine Defense)',
      'Defesa de mata-leão (RNC Defense)', 'Defesa de kimura (Kimura Defense)',
    ],
  },
];
