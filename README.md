# Espaço Val — PWA Depilação & Sobrancelhas

PWA mobile-first para agendamento em salão de depilação e design de sobrancelhas. Nome fantasia: **Espaço Val — um complemento para sua Beleza**.
1 salão, 1 profissional. Cliente agenda pelo celular; salão gerencia pelo painel web.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Supabase** (Postgres + Auth + Storage + RLS)
- **Tailwind CSS v4** + shadcn/ui (estilo `base-nova`)
- **PWA** nativo via `manifest.json` (sem `next-pwa`)
- **Deploy:** Vercel (frontend) + Supabase Cloud (backend)

## Setup local

### 1. Subir Supabase local (Docker)

```bash
supabase start
```

Isso sobe Postgres, Auth, Storage, Realtime, PostgREST, Studio, Inbucket e Kong.
A saída final mostra as chaves — copie para `.env.local`.

### 2. Aplicar migrations

```bash
supabase db reset   # recria DB + aplica todas migrations + seeds
```

Ou aplicar manualmente:

```bash
supabase db push
```

### 3. Variáveis de ambiente

```bash
cp .env.example .env.local
# cole as chaves da saída de `supabase start`
```

### 4. Rodar

```bash
npm install
npm run dev
```

App em `http://localhost:3000`.

- **Studio:** http://127.0.0.1:54323 (dados)
- **Inbucket:** http://127.0.0.1:54324 (emails — magic links caem aqui em dev)

### 5. Criar admin (para /admin/agenda)

Após criar conta de cliente (fluxo OTP), promover para admin via SQL no Studio:

```sql
insert into public.admin_users (id, email)
select id, email from auth.users where email = 'seu-admin@email.com';
```

### 6. (Opcional) Sentry + Upstash

**Sentry** (error monitoring, free tier 5k eventos/mês):
1. Criar projeto em https://sentry.io (Next.js)
2. Settings → Client Keys (DSN) → copiar
3. Colar em `.env.local`: `SENTRY_DSN=...` e `NEXT_PUBLIC_SENTRY_DSN=...`

**Upstash Redis** (rate limit, free tier 10k req/dia):
1. Criar database regional em https://console.upstash.com
2. Copiar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` pro `.env.local`

Sem essas vars, o app roda normal (degrada graciosamente: Sentry vira no-op, rate limit desabilitado).

## Estrutura

```
salao-pwa/
├── src/
│   ├── app/
│   │   ├── actions/            # server actions
│   │   │   ├── appointments.ts # book/cancel/updateStatus
│   │   │   ├── auth.ts         # sendOtp / signOut
│   │   │   └── profile.ts      # updateProfile
│   │   ├── admin/agenda/       # painel admin
│   │   ├── agendar/            # wizard de 4 passos
│   │   ├── api/slots/          # API get_available_slots
│   │   ├── auth/callback/      # handler de magic link
│   │   ├── cadastro/
│   │   ├── login/
│   │   ├── minha-conta/
│   │   ├── meus-agendamentos/
│   │   ├── servicos/           # catálogo público
│   │   ├── layout.tsx
│   │   ├── page.tsx            # landing
│   │   └── globals.css
│   ├── components/ui/          # shadcn/ui (base-nova)
│   ├── components/SubmitButton.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # browser
│   │   │   ├── server.ts       # server components / actions
│   │   │   └── middleware.ts   # refresh session + gate
│   │   ├── format.ts           # BRL, duration
│   │   ├── slots.ts            # wrapper TS para get_available_slots
│   │   ├── timezone.ts         # SALON_TIMEZONE
│   │   ├── ratelimit.ts        # Upstash sliding window
│   │   └── utils.ts            # cn() (shadcn)
│   ├── types/database.ts
│   └── middleware.ts
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 0001_init.sql       # schema + RLS + seeds
│       └── 0002_functions.sql  # get_available_slots + no-overlap trigger
├── public/
│   ├── manifest.json
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── scripts/make_icons.py
├── .env.example
└── .env.local                  # não commitado
```

## Fases concluídas

- ✅ **Fase 0** — Scaffold + PWA (manifest, ícones, metadata)
- ✅ **Fase 1** — Schema + RLS (clients, professionals, services, appointments + admin_users + função get_available_slots + trigger no-overlap + seed)
- ✅ **Fase 2** — Auth (magic link OTP via Supabase, /login, /cadastro, /minha-conta, signOut)
- ✅ **Fase 3** — Catálogo público /servicos
- ✅ **Fase 4** — Agendamento (wizard 4 passos /agendar, /meus-agendamentos, /admin/agenda com confirmar/concluir/cancelar)
- ✅ **Fase 6** — Hardening (Sentry error tracking + Upstash Redis rate limit + CI GitHub Actions + Dependabot)

**Próximas:** Fase 5 (PWA polish).

## Notas técnicas

- **Next.js 16 + Tailwind v4 + shadcn `base-nova`.** Componente `form` shadcn não disponível nesse estilo — usar `react-hook-form` + Zod manuais com `<SubmitButton>` (helper que usa `useFormStatus`).
- **shadcn Button** neste estilo **não** suporta `asChild`. Envolver `<Link>` por fora:
  ```tsx
  <Link href="/x"><Button>...</Button></Link>
  ```
- **Middleware** no Next.js 16 fica em `src/middleware.ts` (não mais em `pages/`). Matcher ignora assets estáticos e ícones.
- **Timezone do salão** hardcoded em `src/lib/timezone.ts` (`America/Sao_Paulo`). DB armazena `timestamptz`; conversão fica no client/server via `date-fns-tz` e `toLocaleString` com `timeZone` explícito.
- **Auth via Supabase Auth (OTP magic link).** Trigger `on_auth_user_created` cria automaticamente a linha em `clients` ao confirmar o email — o cliente só preenche nome/telefone no formulário de cadastro antes do OTP, esses dados vão como `raw_user_meta_data`.
- **RLS** impede cliente de ver agendamentos alheios. Admin (presente em `admin_users`) vê tudo via policy `auth.uid() = client_id or is_admin()`.
- **Constraint de overlap** é trigger `check_appointment_no_overlap` (BEFORE INSERT/UPDATE). Se 2 clientes clicarem no mesmo slot ao mesmo tempo, o segundo leva `Slot já ocupado` (exibido como toast).

## Migração para Supabase Cloud (quando provisionar)

1. Criar projeto em https://supabase.com/dashboard (região São Paulo).
2. `supabase link --project-ref <ref>`.
3. `supabase db push` aplica migrations no cloud.
4. Inserir seed admin via SQL editor do dashboard.
5. Atualizar `.env.local` (e variáveis na Vercel) com as keys do cloud.
6. Deploy na Vercel conectado ao GitHub.

## Licença

Privado.
