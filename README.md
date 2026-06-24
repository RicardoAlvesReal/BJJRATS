# BJJRats — Plataforma de Gestão para Academias de Jiu-Jitsu

Plataforma SaaS completa para academias e professores de Jiu-Jitsu gerenciarem alunos, treinos, finanças e comunidade.

## 🏗️ Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript, Vite, Wouter, Framer Motion |
| Backend | Express.js + Node.js, REST API |
| Banco | PostgreSQL + Drizzle ORM |
| Pagamentos | Asaas (assinaturas e cobranças PIX/Cartão) |
| WhatsApp | Evolution API (QR Code, notificações) |
| Deploy | Fly.io + Docker |

## 📁 Estrutura do Projeto

```
bjjrats/
├── client/                    # Frontend React (Vite)
│   ├── src/
│   │   ├── components/        # Componentes reutilizáveis (NotificationBell, Map, etc.)
│   │   ├── contexts/          # AuthContext, ThemeContext
│   │   ├── hooks/             # useMobile, useComposition, etc.
│   │   ├── lib/               # api.ts, utils, design tokens, constants
│   │   └── pages/
│   │       ├── admin/         # Painel Superadmin
│   │       ├── academia/      # Painel da Academia
│   │       ├── app/           # App do aluno/professor
│   │       │   └── professor/ # Sub-componentes do ProfessorPanel (extraídos por tamanho)
│   │       └── public/        # Páginas públicas
├── server/                    # Backend Express
│   ├── db/                    # Schema, migrations, seeds
│   ├── middleware/            # auth, subscription
│   ├── routes/                # API endpoints
│   └── services/              # Asaas, Evolution API, email, etc.
├── drizzle/                   # Migrations Drizzle
└── fly.toml                   # Deploy Fly.io
```

## 👥 Hierarquia de Usuários

| Role | Descrição | Permissões |
|------|-----------|------------|
| `superadmin` | Dono da plataforma | Acesso total, CRM, gestão de planos |
| `academy` / `admin` | Dono de academia | Painel da academia, finanças, professores, alunos |
| `professor` | Professor particular | Painel do professor, gestão de alunos, finanças próprias |
| `professor` (interno) | Professor vinculado a academia | Acesso restrito, sem aba financeira |
| `student` | Aluno | Dashboard pessoal, treinos, comunidade, mensalidades |

## 🚀 Setup Local

### Pré-requisitos
- Node.js 22+
- pnpm
- PostgreSQL

### Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Rodar migrations
pnpm db:migrate

# Popular banco com dados de desenvolvimento
pnpm db:seed:dev

# Iniciar servidor de desenvolvimento
pnpm dev:all
```

## 📱 iOS App (via Capacitor)

### Build com GitHub Actions (sem Mac)

Push na branch `dev` ou `master` dispara o workflow `.github/workflows/ios.yml`:

1. Runner macOS-15 da GitHub Actions
2. Build do web app + Capacitor sync
3. `xcodebuild archive` gera `.xcarchive`
4. Empacota em `.ipa` (unsigned)
5. Disponível como artefato por 7 dias

### Build local (Mac)

```bash
pnpm ios                 # build + sync + abrir Xcode
pnpm ios:sync            # só sincronizar assets
```

### Para publicar na App Store

Necessário:
- Apple Developer Account ($99/ano)
- Configurar `CODE_SIGN_IDENTITY` e provisioning profile no workflow
- Ou usar [Fastlane Match](https://fastlane.tools) para gerenciar certificados
- Upload via `xcodebuild -exportArchive` ou Transporter

### Variáveis de Ambiente (.env)

```env
DATABASE_URL=postgres://...
JWT_SECRET=seu_segredo
ASAAS_API_KEY=sua_chave
ASAAS_SANDBOX=true
ASAAS_WEBHOOK_TOKEN=token_webhook
PAYMENT_INTEGRATION_SECRET=segredo_pagamentos
PUBLIC_API_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
```

## 💰 Sistema de Pagamentos

### Assinaturas da Plataforma (SaaS)
- Planos configuráveis pelo superadmin (Admin > Planos)
- Integração com Asaas: PIX e Cartão de Crédito
- Período de trial configurável por plano
- Tolerância de inadimplência configurável (Admin > App)
- Planos com preço `R$ 0,00` são ativados diretamente no banco e não criam cliente, assinatura ou cobrança no Asaas
- Usuários de plano gratuito podem migrar para um plano pago sem criar uma segunda assinatura local

### Cobranças de Alunos (Academias/Professores)
- Pagamentos manuais (PIX, dinheiro, transferência)
- Integração Asaas automatizada
- Geração automática de mensalidades
- Controle de inadimplência e suspensão

### Configuração de Pagamento do Usuário
- Página `/app/subscription` acessível por todos os usuários
- Visualização do plano atual, status e forma de pagamento
- Troca de método de pagamento (PIX ↔ Cartão)
- Planos gratuitos não exibem forma de pagamento ou próximo vencimento financeiro

## ⭐ Planos Gratuitos e PLUS

- O superadmin define os recursos de cada plano pela lista de `features`
- Usuários gratuitos recebem um banner de upgrade e selos `PLUS` nos recursos não incluídos
- Ao tentar acessar um recurso bloqueado, o frontend abre um modal explicando o benefício e direciona para `/pricing`
- Respostas da API com código `feature_not_included` também acionam automaticamente o modal de upgrade
- O backend continua sendo a fonte de segurança por meio do middleware `requireFeature`
- Usuários pagantes podem acessar os recursos previstos para seu plano; o selo PLUS é usado para orientar usuários com plano de preço zero

### Features de navegação do aluno

| Feature | Área controlada |
|---------|-----------------|
| `training_tracking` | Registro de novo treino |
| `training_history` | Aba Treinos |
| `academy_search` | Aba Academia e busca de academias |
| `professor_search` | Aba Professores e busca de professores |
| `community` | Aba Comunidade |
| `goals` | Aba Metas |

Os painéis de professor e academia também relacionam suas abas de gestão às features configuradas pelo superadmin, como `student_management`, `payments`, `promotions`, `class_schedules`, `class_checkins`, `crm`, `multiple_professors`, `reports` e `revenue_analytics`.

## 📊 CRM do Superadmin

### Abas
- **Visão Geral** — MRR, assinantes ativos/trial/inadimplentes
- **Financeiro** — Detalhamento de receita SaaS
- **Métricas** — Economia da plataforma: faturamento das academias, top earners, volume de pagamentos

### Funcionalidades
- Dashboard de assinaturas (SaaS)
- Métricas de economia (pagamentos de alunos)
- Gestão de planos, usuários e configurações globais
- Moderação da comunidade

## 🔔 Notificações

- Sino de notificações com contagem de não lidas
- Tipos: promoção de faixa, convite de matrícula, aprovação de solicitação, anúncios
- Integração WhatsApp para notificações de cobrança

## � Segurança

- Redefinição de senha visual no painel superadmin (Dashboard → 🔒 Senha)
- Script CLI: `npx tsx server/reset-superadmin.ts <email> <senha>`
- Senha do superadmin inicial: `admin@bjjrats.com` / `Admin@123`

## 🪟 Modal de Assinatura

- Acessível pela sidebar (AppLayout) e header (AcademiaLayout)
- Modal overlay com portal React — dados do plano, status, forma de pagamento
- Troca de método PIX/Cartão sem sair do painel
- Rota `/app/subscription` mantida como página completa (fallback/redirect)

## �📱 WhatsApp Integration

- Conexão via QR Code (Evolution API)
- Instância separada para academias (`bjjrats_academy_`)
- Envio automático de cobranças e lembretes

## 🛠️ Scripts Disponíveis

```bash
pnpm dev           # Frontend (Vite)
pnpm dev:server    # Backend (Express)
pnpm dev:all       # Ambos simultaneamente
pnpm build         # Build produção
pnpm start         # Iniciar produção
pnpm db:generate   # Gerar migration
pnpm db:migrate    # Rodar migrations
pnpm db:seed       # Seed produção
pnpm db:seed:dev   # Seed desenvolvimento
pnpm check         # TypeScript type check
```

## 🌐 Rotas da Aplicação

| Rota | Descrição |
|------|-----------|
| `/` | Landing page |
| `/login` / `/register` | Autenticação |
| `/pricing` | Planos e preços |
| `/app` | App principal (aluno/professor) |
| `/app/subscription` | Gerenciar assinatura |
| `/academia` | Painel da academia |
| `/admin` | Painel superadmin |
| `/post/:id` | Post público |
| `/trial/:id` | Aula experimental |

## 📦 Deploy (Fly.io)

```bash
fly deploy -a bjjrats
fly deploy -a bjjrats-dev -c fly.dev.toml
fly secrets set ASAAS_API_KEY=... ASAAS_WEBHOOK_TOKEN=...
```

### Conexão com banco remoto

```bash
# WireGuard (uma vez)
fly wireguard create
# Importar .conf no cliente WireGuard

# Depois, DBeaver:
# Host: bjjrats-db-prod.flycast / Port: 5432
# Database: bjjrats / User: bjjrats_app
```

### Restore de dump local para produção

```bash
fly proxy 15433:5432 -a bjjrats-db-prod
psql "postgres://user:pass@localhost:15433/db?sslmode=disable" -f dump.sql
```

---

**BJJRats** — Domine seu dojo. 🥋
