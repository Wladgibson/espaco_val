-- Fase 1: schema inicial + RLS

-- ENUM para status de appointment
create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

-- Tabela: profissionais (1 linha no MVP single-tenant)
create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  bio text,
  working_hours jsonb not null default '{
    "mon":[{"start":"09:00","end":"18:00"}],
    "tue":[{"start":"09:00","end":"18:00"}],
    "wed":[{"start":"09:00","end":"18:00"}],
    "thu":[{"start":"09:00","end":"18:00"}],
    "fri":[{"start":"09:00","end":"18:00"}],
    "sat":[{"start":"09:00","end":"14:00"}],
    "sun":[]
  }'::jsonb,
  slot_duration_minutes int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela: clientes (id alinhado com auth.users)
create table public.clients (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text unique not null,
  birth_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela: serviços
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  price_cents int not null check (price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela: agendamentos
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid not null references public.services(id),
  professional_id uuid not null references public.professionals(id),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status appointment_status not null default 'pending',
  client_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_starts_at_idx on public.appointments (starts_at);
create index appointments_client_id_idx on public.appointments (client_id);
create index appointments_professional_id_idx on public.appointments (professional_id);
create index appointments_status_idx on public.appointments (status);

-- Trigger: updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger professionals_updated_at before update on public.professionals
  for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- Trigger: ao criar usuário em auth.users, criar linha em clients
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.clients (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Novo cliente'),
    coalesce(new.raw_user_meta_data->>'phone', '00000000000')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Habilitar RLS em todas as tabelas
alter table public.professionals enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

-- Policies: services + professionals leitura pública, escrita só admin
-- (admin_users simplificado: qualquer authenticated com email em admin_users table)
create table public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_users where id = auth.uid());
$$;

-- Services: leitura pública, escrita só admin
create policy "services_select_public" on public.services
  for select using (true);

create policy "services_insert_admin" on public.services
  for insert with check (public.is_admin());

create policy "services_update_admin" on public.services
  for update using (public.is_admin());

create policy "services_delete_admin" on public.services
  for delete using (public.is_admin());

-- Professionals: leitura pública, escrita só admin
create policy "professionals_select_public" on public.professionals
  for select using (true);

create policy "professionals_insert_admin" on public.professionals
  for insert with check (public.is_admin());

create policy "professionals_update_admin" on public.professionals
  for update using (public.is_admin());

-- Clients: cliente só vê/edita o próprio registro
create policy "clients_select_own" on public.clients
  for select using (auth.uid() = id or public.is_admin());

create policy "clients_update_own" on public.clients
  for update using (auth.uid() = id or public.is_admin());

-- Appointments: cliente vê/edita os próprios, admin vê tudo
create policy "appointments_select_own_or_admin" on public.appointments
  for select using (auth.uid() = client_id or public.is_admin());

create policy "appointments_insert_own" on public.appointments
  for insert with check (auth.uid() = client_id);

create policy "appointments_update_own_or_admin" on public.appointments
  for update using (auth.uid() = client_id or public.is_admin());

create policy "appointments_delete_own_or_admin" on public.appointments
  for delete using (auth.uid() = client_id or public.is_admin());

-- Admin users: admin pode ler, escrita via service_role só
create policy "admin_users_select_admin" on public.admin_users
  for select using (public.is_admin());

-- Seed: profissional única
insert into public.professionals (full_name, bio, slot_duration_minutes)
values (
  'Ana Silva',
  'Especialista em depilação e design de sobrancelhas com 10 anos de experiência.',
  30
);

-- Seed: 3 serviços exemplo
insert into public.services (name, description, duration_minutes, price_cents) values
  ('Espaço Val — Depilação perna inteira', 'Depilação completa das pernas com cera de alta qualidade.', 45, 8000),
  ('Espaço Val — Design de sobrancelha', 'Design personalizado com pinça e linha.', 30, 5000),
  ('Espaço Val — Buço', 'Depilação rápida do buço com cera.', 15, 2500);
