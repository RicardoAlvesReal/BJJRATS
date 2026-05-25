// Animações compartilhadas (framer-motion variants)

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
} as const;

export const fadeUpSlow = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
} as const;

export const staggerContainer = {
  show: { transition: { staggerChildren: 0.07 } },
} as const;

export const pageVariant = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
} as const;

export const pageTransition = { duration: 0.18, ease: 'easeOut' } as const;

export const overlayVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const modalVariant: any = {
  hidden: { scale: 0.92, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
};

export const slideInRight = {
  hidden: { x: 60, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } },
} as const;

export const scaleIn = {
  hidden: { scale: 0.88, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
} as const;

// Scroll-reveal helper — gera props para motion elementos com whileInView
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fadeUpReveal = (delay = 0): any => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: 'easeOut', delay },
});

// Transição de abas — usado em Academy, Community, Goals, ProfessorPanel
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tabVariant: any = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};
export const tabTransition = { duration: 0.15, ease: 'easeOut' } as const;
