# Bancos Fly.io: desenvolvimento e producao

Este projeto deve usar dois bancos independentes:

- `bjjrats-db-prod`: banco real do app em producao.
- `bjjrats-db-dev`: banco para desenvolvimento, manutencao e testes.

O fluxo correto e sempre de mao unica:

```text
producao -> copia/snapshot/sanitizacao -> desenvolvimento
desenvolvimento -x-> producao
```

## Apps Fly

O arquivo `fly.toml` atual continua sendo o app de producao:

```text
app = "bjjrats"
```

O arquivo `fly.dev.toml` e o app separado de desenvolvimento:

```text
app = "bjjrats-dev"
```

## Criar banco de producao

```powershell
fly postgres create --name bjjrats-db-prod --region gru
fly postgres attach bjjrats-db-prod --app bjjrats
```

Na criacao do banco de producao, escolha uma configuracao de producao/alta disponibilidade se o app real ja estiver em uso.

## Criar banco de desenvolvimento

```powershell
fly postgres create --name bjjrats-db-dev --region gru
fly apps create bjjrats-dev
fly postgres attach bjjrats-db-dev --app bjjrats-dev
fly deploy -c fly.dev.toml
```

Na criacao do banco de desenvolvimento, a configuracao `Development` e suficiente para manutencao e testes.

## Secrets por ambiente

Producao:

```powershell
fly secrets set JWT_SECRET="..." CORS_ORIGIN="https://seu-dominio.com" PUBLIC_API_URL="https://seu-dominio.com" --app bjjrats
```

Desenvolvimento:

```powershell
fly secrets set JWT_SECRET="..." CORS_ORIGIN="https://bjjrats-dev.fly.dev" PUBLIC_API_URL="https://bjjrats-dev.fly.dev" --app bjjrats-dev
```

O `DATABASE_URL` nao deve ser copiado manualmente entre ambientes quando o banco foi ligado com `fly postgres attach`; o Fly cria o secret certo para cada app.

## Deploy

Producao:

```powershell
fly deploy -c fly.toml
```

Desenvolvimento:

```powershell
fly deploy -c fly.dev.toml
```

## Migrations

Use `pnpm db:migrate` somente com a `DATABASE_URL` do ambiente correto.

O historico antigo do Drizzle foi arquivado em `drizzle/archive-pre-baseline-20260617`.
O baseline atual e `drizzle/0000_freezing_mach_iv.sql`; os bancos `bjjrats-db-dev`
e `bjjrats-db-prod` foram recriados vazios com este baseline e registram 1 migration
em `drizzle.__drizzle_migrations`.

Para novas alteracoes de schema:

```powershell
pnpm db:generate
```

Depois aplique primeiro no banco de desenvolvimento e so entao em producao.

Para desenvolvimento local usando o banco dev remoto:

```powershell
fly proxy 15432:5432 -a bjjrats-db-dev
$env:DATABASE_URL="postgres://postgres:<senha-dev>@localhost:15432/postgres"
pnpm db:migrate
```

Para producao, faca isso apenas quando tiver certeza absoluta:

```powershell
fly proxy 15433:5432 -a bjjrats-db-prod
$env:DATABASE_URL="postgres://postgres:<senha-prod>@localhost:15433/postgres"
pnpm db:migrate
```

Evite `pnpm db:push` em producao. Prefira migrations versionadas.

## Copiar producao para dev

Quando quiser alimentar o banco dev com dados parecidos com producao:

1. Gere um dump/snapshot da producao.
2. Restaure no banco dev.
3. Sanitize dados sensiveis antes de usar:
   - telefones;
   - emails;
   - CPF/CNPJ;
   - tokens do WhatsApp/Evolution;
   - chaves do Asaas;
   - links de pagamento.

Nunca restaure um dump do dev em producao.
