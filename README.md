# Salão PWA — Depilação & Sobrancelhas

PWA mobile-first para agendamento em salão de depilação e design de sobrancelhas.
1 salão, 1 profissional. Cliente agenda pelo celular; salão gerencia pelo painel web.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Supabase** (Postgres + Auth + Storage)
- **Tailwind CSS v4** + shadcn/ui (estilo base-nova)
- **PWA** nativo via `manifest.json` (sem lib externa)
- **Deploy:** Vercel (frontend) + Supabase Cloud (backend)

## Status da Fase 0 ✅

- [x] Scaffold Next.js 16 + TypeScript + Tailwind v4
- [x] Supabase client libs instaladas (`@supabase/ssr`, `@supabase/supabase-js`)
- [x] shadcn/ui inicializado (estilo `base-nova`, paleta neutral)
- [x] Componentes: button, input, dialog, select, popover, sonner, card, label, textarea, separator, badge, calendar
- [x] PWA manifest + ícones 192/512/180 (PNGs placeholder rosa)
- [x] `proxy.ts` (Next.js 16 — antigo `middleware.ts` foi deprecado) protegendo rotas `/agendar`, `/meus-agendamentos`, `/minha-conta`, `/admin`
- [x] Helpers: `formatBRL`, `formatDuration`, `formatInSalonTime`, `cn`
- [x] `.env.example` documentado
- [x] `npm run build` ✅ | `tsc --noEmit` ✅

Próximas fases (veja plano completo em `../.hermes/plans/2026-09-01_002540-salao-depilacao-pwa.md`):

1. Fase 1 — Schema do banco + RLS
2. Fase 2 — Auth cliente (magic link)
3. Fase 3 — Catálogo de serviços
4. Fase 4 — Agendamento (parte crítica)
5. Fase 5 — PWA polish
6. Fase 6 — Hardening

## Setup local

### 1. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha com as credenciais do seu projeto Supabase (se ainda não tem, veja abaixo).

### 2. Provisionamento Supabase (1 salão, 1 profissional)

1. Crie conta gratuita em [supabase.com](https://supabase.com)
2. **New project** → região **South America (São Paulo)**, senha forte para o DB
3. Aguarde provisionar (~2 min)
4. **Settings → API**: copie `Project URL` e `anon public` → cole em `.env.local`
5. **Settings → API**: copie `service_role` (⚠️ NUNCA exponha ao frontend, só server-side)
6. **Authentication → Providers**: habilite **Email** (magic link). Desabilite "Confirm email" se quiser fluxo mais simples
7. **Authentication → URL Configuration**: adicione `http://localhost:3000` em **Site URL** e `http://localhost:3000/auth/callback` em **Redirect URLs**
8. **SQL Editor**: as migrations virão na Fase 1 — rode em ordem

### 3. Rodar localmente

```bash
npm install
npm run dev
```

App em `http://localhost:3000`.

### 4. Deploy Vercel (quando pronto)

1. Push para GitHub
2. Importe o repo em [vercel.com/new](https://vercel.com/new)
3. Em **Environment Variables**, adicione as 3 chaves do `.env.local`
4. Deploy

## Estrutura

```
salao-pwa/
├── src/
│   ├── app/                  # App Router (rotas)
│   │   ├── layout.tsx        # metadata PWA + Sonner
│   │   └── page.tsx          # landing
│   ├── components/ui/        # shadcn/ui
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts     # browser client
│   │   │   ├── server.ts     # server client (cookies)
│   │   │   └── middleware.ts # session refresh
│   │   ├── format.ts         # BRL, duração
│   │   ├── timezone.ts       # America/Sao_Paulo
│   │   └── utils.ts          # cn() helper
│   └── proxy.ts              # Next.js 16 proxy (ex-middleware)
├── public/
│   ├── manifest.json
│   ├── icon-192.png          # placeholder rosa
│   ├── icon-512.png          # placeholder rosa
│   └── apple-touch-icon.png  # placeholder rosa
├── scripts/
│   └── make_icons.py         # gerador de PNGs placeholder
└── .env.example
```

## Notas técnicas

- **Next.js 16** introduziu o file convention `proxy.ts` (substitui `middleware.ts`). O codemod `middleware-to-proxy` foi aplicado.
- **shadcn/ui** neste projeto usa estilo `base-nova` (mais novo que o tradicional `new-york`). Componente `form` ainda não está no registry desse estilo — adicionar manualmente quando a Fase 2 precisar.
- **Tailwind v4** usa `@import "tailwindcss"` e `@theme inline` em `globals.css` (não tem mais `tailwind.config.js`).
- **Timezone do salão:** `America/Sao_Paulo` hardcoded em `src/lib/timezone.ts`. Tudo em `timestamptz` no DB, conversão no client.

## Licença

Privado.