// Design tokens compartilhados

export const COLORS = {
  red: '#CC0000',
  redBright: '#FF2200',
  redGlow: 'rgba(204, 0, 0, 0.3)',
  redGlowHover: 'rgba(204, 0, 0, 0.45)',
  redBorder: 'rgba(204, 0, 0, 0.15)',
  redBorderLight: 'rgba(204, 0, 0, 0.12)',
  bg: '#0A0A0A',
  surface: '#111',
  surfaceLight: '#1A1A1A',
  border: '#1E1E1E',
  borderLight: '#2A2A2A',
  borderLighter: '#333',
  text: '#FFF',
  textMuted: '#CCC',
  textDim: '#888',
  textFaint: '#555',
} as const;

export const FONTS = {
  condensed: "'Barlow Condensed', sans-serif",
  barlow: "'Barlow', sans-serif",
} as const;

export const SPACING = {
  page: '1rem 1.25rem',
  card: '1rem',
} as const;

export const RADIUS = {
  card: '12px',
  btn: '10px',
  full: '9999px',
} as const;

export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #CC0000, #FF2200)',
  text: 'linear-gradient(135deg, #CC0000, #FF4400)',
} as const;
