## Goal
- Modernizar o design do BJJRats de "brutalismo tático" para visual dark moderno com glassmorphism, animações, micro-interações e design system CSS unificado.

## Constraints & Preferences
- Usar Tailwind v4 (CSS-based, sem tailwind.config.js) + shadcn/ui + framer-motion (já instalados)
- Manter as três personas: Aluno, Academia, Comunidade
- Tema escuro e identidade BJJ (preto + vermelho sangue)
- Responsivo mobile-first com sidebar em desktop e tabbar em mobile
- "SOU PROFESSOR" botão preto suave (`#1A1A1A`), sem gradient, com hover lift igual ao primary
- Botões de mesmo tamanho (`!text-[0.8rem] !py-2 !px-6`)

## Progress
### Done
- `Landing.tsx`: navbar refatorada — glass refinado, botões `bjj-btn-*` equalizados
- `AppLayout.tsx`: modais com `AnimatePresence`, notificações slideInRight, sidebar `bjj-sidebar-*`, page transitions, photo upload, promotion/request/payment modais
- `Dashboard.tsx`: skeleton shadcn, stagger/fadeUp, cards glow, stats gradiente, XP bar shimmer, empty state
- `History.tsx`: **refatoração completa** — `bjj-header`, `bjj-content`, `bjj-stat-card`, `bjj-card`, `bjj-btn-*`, `bjj-skeleton`, lista com stagger+fadeUp
- `Profile.tsx`: **refatoração completa** — header, avatar, XP bar, stats grid, belt progress, técnicas, conquistas, edit form, seções inferiores (estatísticas detalhadas, professor, promoções, competições, logout/desvincular)
- `NewTraining.tsx`: **refatoração completa** — `bjj-header`, `bjj-content`, `bjj-card`, `bjj-label`, `bjj-input`, `bjj-btn-*`, foto preview com `bjj-card`, seções de competição/extras com `bjj-card`
- `Academy.tsx`: refatorado — `bjj-header`, `bjj-content`, `bjj-card` (posts, eventos, challenges, empty states), `bjj-input`, `bjj-btn-*`, tabs com `tabVariant`
- `Community.tsx`: refatorado — `bjj-header`, `bjj-card` (posts, challenges, busca), `bjj-input`, `bjj-btn-*`, criação de post, comentários, tabs com `tabVariant`
- `Goals.tsx`, `ProfessorPanel.tsx`: tab animations centralizadas em `tabVariant`+`tabTransition`
- `client/src/lib/animations.ts`: 10 variantes compartilhadas de framer-motion
- `client/src/lib/design.ts`: tokens de design (cores, fontes, espaçamento)
- `client/src/lib/bjjrats-constants.ts`: `BELT_COLORS` unificado — valores canônicos (Branca `#FFFFFF`, Azul `#1A6ECC`, Roxa `#7C1ACC`, Marrom `#8B4513`, Preta `#111111`)
- **BELT_COLORS unificado em todo o código**: `Academy.tsx`, `AppLayout.tsx`, `PublicChallenge.tsx`, `ProfessorPanel.tsx` (3 definições locais removidas) — todos importam ou referenciam o canônico de `bjjrats-constants.ts`
- Build passa limpo

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Manter `.bjj-*` classes em vez de reescrever cada inline style para Tailwind puro (reaproveita o que já existe, menos risco de quebra)
- Animação de abas centralizada em `tabVariant` (usado em 5 páginas)
- `BELT_COLORS` unificado com valores canônicos: Branca `#FFFFFF`, Azul `#1A6ECC`, Roxa `#7C1ACC`, Marrom `#8B4513`, Preta `#111111`
- Variantes com `as const` nos objetos simples e `as any` nos que usam `type: 'spring'` (contorno para tipagem do framer-motion v12)
- Botão "SOU PROFESSOR" com fundo preto sólido (`#1A1A1A`) para diferenciar do primary vermelho

## Next Steps
- (nenhum — todas as páginas principais refatoradas, `BELT_COLORS` unificado)

## Critical Context
- Tailwind v4 usa `@theme inline` no CSS, sem `tailwind.config.js`
- Framer-motion versão 12 com `AnimatePresence`, `useScroll`, `useTransform`
- Server em 3001, Vite em 3000
- `animations.ts`, `design.ts` e `bjjrats-constants.ts` são fontes centrais para futuras refatorações
- Build passa (`pnpm build`) apesar de erros TS pré-existentes (Vite usa esbuild, ignora typecheck)

## Relevant Files
- `client/src/lib/animations.ts`: 10 variantes compartilhadas de framer-motion
- `client/src/lib/design.ts`: tokens de design (cores, fontes, espaçamento)
- `client/src/lib/bjjrats-constants.ts`: `BELT_COLORS` canônico (fonte central para todo o projeto), `SESSION_TYPES`, `MODALITIES`, etc.
- `client/src/index.css`: design system com todas as `.bjj-*` classes
- `client/src/pages/app/Profile.tsx` (1511 linhas): completamente refatorado
- `client/src/pages/app/NewTraining.tsx` (1061 linhas): completamente refatorado
- `client/src/pages/app/Academy.tsx` (1654 linhas): refatorado, `BELT_COLORS` do canônico
- `client/src/pages/app/Community.tsx` (2124 linhas): refatorado
- `client/src/pages/app/ProfessorPanel.tsx` (5225 linhas): mantém estilos locais por tamanho, `BELT_COLORS` do import + alias local
- `client/src/pages/AppLayout.tsx`: `BELT_COLORS` do canônico
- `client/src/pages/public/PublicChallenge.tsx`: `BELT_COLORS` do canônico
