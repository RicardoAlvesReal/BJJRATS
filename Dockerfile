# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Suporte a UTF-8 (caracteres acentuados)
ENV LANG=C.UTF-8 LC_ALL=C.UTF-8

# Habilita pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Instala dependências primeiro (cache layer)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile

# Chave pública do Turnstile (disponível no build do Vite)
ARG VITE_TURNSTILE_SITE_KEY
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

# Copia o código fonte e faz o build
COPY . .
RUN pnpm build


# ─── Stage 2: Produção ───────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Suporte a UTF-8 (caracteres acentuados)
ENV LANG=C.UTF-8 LC_ALL=C.UTF-8

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Instala apenas dependências de produção
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile --prod

# Copia os arquivos compilados do stage de build
COPY --from=builder /app/dist ./dist

# Diretório para uploads persistidos via volume do Fly.io
RUN mkdir -p /app/uploads

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]
