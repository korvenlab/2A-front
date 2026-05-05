# 2AVendas — Frontend (TanStack Start)

Este diretório é pensado para virar **repositório Git próprio** e deploy na **Vercel**.

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

Defina pelo menos:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Opcional no servidor Nitro (SSR): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` — só se alguma rota/server function precisar (o app atual usa sobretudo o cliente Supabase no browser).

Copie de `.env.example` para `.env` em desenvolvimento **nesta pasta** quando não estiver no monorepo (com monorepo, o `vite.config` ainda lê `.env` na pasta pai se existir).

## Build

Na Vercel o ambiente define `VERCEL=1`; o Nitro gera saída para **`.vercel/output`**.

Localmente (preset Node):

```bash
npm install
npm run build
npm run start
```

## Repositório separado

Veja `REPOSITORIOS-GITHUB.md` na raiz do monorepo para copiar só esta pasta para um novo repo.
