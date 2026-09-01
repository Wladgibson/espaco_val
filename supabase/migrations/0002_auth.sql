-- ============================================================
-- Salão PWA — Migração 0002: Auth custom (sem Supabase Auth)
-- ============================================================

-- Tabela de credenciais (1 por client)
create table if not exists public.auth_credentials (
  client_id uuid primary key references public.clients(id) on delete cascade,
  password_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de sessões ativas (permite revoke / logout de todos devices)
create table if not exists public.auth_sessions (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists auth_sessions_client_idx on public.auth_sessions (client_id);
create index if not exists auth_sessions_expires_idx on public.auth_sessions (expires_at);

-- Trigger updated_at
create or replace function public.set_updated_at_auth_credentials()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_auth_cred on public.auth_credentials;
create trigger set_updated_at_auth_cred before update on public.auth_credentials
  for each row execute function public.set_updated_at_auth_credentials();

-- RLS
alter table public.auth_credentials enable row level security;
alter table public.auth_sessions enable row level security;
