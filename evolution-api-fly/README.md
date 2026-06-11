# Deploy Evolution API no Fly.io

## Passo 1: Instalar Fly CLI

```powershell
# Windows PowerShell
iwr https://fly.io/install.ps1 -useb | iex
```

## Passo 2: Login no Fly.io

```bash
fly auth login
```

## Passo 3: Criar o app (execute dentro da pasta evolution-api-fly)

```bash
cd evolution-api-fly
fly apps create bjjrats-evolution-api
fly volumes create evolution_instances --region gru --size 1
```

## Passo 4: Deploy

```bash
fly deploy
```

## Passo 4.1: Configurar secrets no Fly.io

Nao deixe chaves nem connection strings no `fly.toml`. Configure os valores sensiveis com:

```bash
fly secrets set --app bjjrats-evolution-api AUTHENTICATION_API_KEY="SUA_CHAVE_FORTE" DATABASE_CONNECTION_URI="SUA_CONNECTION_STRING"
```

## Passo 5: Pegar a URL

```bash
fly status
```

A URL será algo como: `https://bjjrats-evolution-api.fly.dev`

## Passo 6: Configurar no BJJRats

Edite o arquivo `.env` na raiz do projeto BJJRats e adicione:

```env
EVOLUTION_API_URL=https://bjjrats-evolution-api.fly.dev
EVOLUTION_API_KEY=TROQUE_POR_UMA_CHAVE_SECRETA_FORTE
```

**IMPORTANTE:** Troque `TROQUE_POR_UMA_CHAVE_SECRETA_FORTE` por uma chave segura. O valor do `.env` do BJJRats deve ser o mesmo salvo no Fly Secret `AUTHENTICATION_API_KEY`; nao coloque esse valor no `fly.toml`.

## Passo 7: Reiniciar o servidor BJJRats

```bash
npm run dev
```

## Verificar se está funcionando

Acesse: `https://bjjrats-evolution-api.fly.dev/manager`
- Login: use a API Key que você configurou

## Logs

```bash
fly logs
```

## Reiniciar

```bash
fly restart
```
