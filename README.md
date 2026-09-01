# Salão PWA — Depilação & Sobrancelhas

PWA mobile-first para agendamento em salão de depilação e design de sobrancelhas.
1 salão, 1 profissional. Cliente agenda pelo celular; salão gerencia pelo painel web.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Supabase** (Postgres + Auth + Storage)
- **Tailwind CSS v4** + shadcn/ui (estilo base-nova)
- **PWA** nativo via `manifest.json` (sem lib externa)
- **Deploy:** Vercel (frontend) + Supabase Cloud (backend)

## Status

### Fase 0 ✅ — Scaffold + PWA
- Next.js 16 + TS + Tailwind v4 + shadcn/ui (base-nova)
- PWA manifest + ícones 192/512/180
- `proxy.ts` protegendo rotas privadas

### Fase 1 ✅ — Schema + RLS
- 4 tabelas: `clients`, `professionals`, `services`, `appointments`
- 3 serviços seed, 1 profissional seed
- RLS habilitada em todas
- Função `get_available_slots(service_id, date)` (timezone, almoço, duração)
- Constraint de overlap impede 2 agendamentos no mesmo horário
- Triggers: `ends_at` automático, `updated_at`

### Fase 2 ✅ — Auth custom
- Tabelas `auth_credentials` + `auth_sessions`
- Senha + JWT em cookie HTTP-only (`salao_session`)
- bcrypt cost 12, validação Zod, rate limit 5/15min por IP
- Lock de conta após 5 tentativas falhas (15 min)
- API: `/api/auth/{register,login,logout}` + página `/minha-conta`
- Build verde, todos endpoints testados via curl

**Próximas fases:**

1. Fase 1 — Schema do banco + RLS
2. Fase 2 — Auth cliente (magic link)
3. Fase 3 — Catálogo de serviços
4. Fase 4 — Agendamento (parte crítica)
5. Fase 5 — PWA polish
6. Fase 6 — Hardening

## Setup local

### 1. Subir Postgres local

```bash
docker run -d --name salao-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=salao \
  -p 5433:5432 \
  -v salao_pgdata:/var/lib/postgresql/data \
  postgres:17-alpine
```

### 2. Aplicar migrations

```bash
PGPASSWORD=devpass psql -h localhost -p 5433 -U postgres -d salao \
  -f supabase/migrations/0001_init.sql
PGPASSWORD=devpass psql -h localhost -p 5433 -U postgres -d salao \
  -f supabase/migrations/0002_auth.sql
```

### 3. Variáveis de ambiente

```bash
cp .env.example .env.local
# gere JWT_SECRET:
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env.local
```

### 4. Instalar deps e rodar

```bash
npm install
npm run dev
```

App em `http://localhost:3000` (ou 3001 se 3000 estiver ocupada).

### Testar auth via curl

```bash
BASE=http://localhost:3001
curl -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Maria","phone":"11999998888","password":"senha12345"}'
```

## Estrutura

```
salao-pwa/
├── src/
│   ├── app/
│   │   ├── api/auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── register/route.ts
│   │   ├── cadastro/page.tsx
│   │   ├── login/page.tsx
│   │   ├── minha-conta/page.tsx
│   │   ├── minha-conta/logout-button.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/ui/        # shadcn/ui
│   ├── lib/
│   │   ├── auth.ts           # JWT, bcrypt, session
│   │   ├── db.ts             # pg pool singleton
│   │   ├── format.ts
│   │   ├── timezone.ts
│   │   └── utils.ts
│   └── proxy.ts
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql     # schema + RLS + get_available_slots
│       └── 0002_auth.sql     # auth_credentials + auth_sessions
├── public/
│   ├── manifest.json
│   └── icon-*.png
├── scripts/make_icons.py
└── .env.example
```

## Notas técnicas

- **Sem Supabase Auth:** auth custom com bcrypt + JWT (cookie HTTP-only). Migrar pra Supabase Cloud depois requer trocar a função `getCurrentUser` e os 3 endpoints, mas o modelo de dados continua.
- **Postgres local via Docker** na porta 5433 (5432 do host ocupada por outro serviço). Trocar `DATABASE_URL` no `.env.local` pra ambiente de produção.
- **Tailwind v4** sem `tailwind.config.js` (config em `globals.css` via `@theme`).
- **Timezone do salão:** `America/Sao_Paulo` hardcoded em `src/lib/timezone.ts`. DB armazena `timestamptz`, conversão no client.
- **shadcn/ui estilo `base-nova`** (mais novo que `new-york`). Componente `form` não está nesse estilo — usar RHF + Zod manuais (como em `/login`).

## Licença

Privado.