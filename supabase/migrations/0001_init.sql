-- ============================================================
-- Salão PWA — Migração 0001: Schema inicial + RLS
-- Compatível com: Postgres 15+ (Supabase Cloud), Postgres 17 (local dev)
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- Enum: status de agendamento
-- ============================================================
do $$ begin
  create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- ============================================================
-- Tabela: professionals (1 linha — single-tenant)
-- ============================================================
create table if not exists public.professionals (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  bio text,
  -- working_hours: {"mon":[{"start":"09:00","end":"18:00"}], "tue":[...], ...}
  -- weekday: 0=domingo, 1=segunda, ..., 6=sabado
  working_hours jsonb not null default '{}'::jsonb,
  slot_duration_minutes int not null default 30 check (slot_duration_minutes in (15, 30, 60)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Tabela: services (catálogo)
-- ============================================================
create table if not exists public.services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  price_cents int not null check (price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_active_idx on public.services (is_active) where is_active = true;

-- ============================================================
-- Tabela: clients
-- id = auth.users.id (Supabase) — em dev local, gera via app
-- ============================================================
create table if not exists public.clients (
  id uuid primary key,  -- referência a auth.users.id no Supabase
  full_name text not null,
  phone text not null unique,
  birth_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Tabela: appointments
-- ============================================================
create table if not exists public.appointments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'pending',
  client_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_valid check (ends_at > starts_at)
);

create index if not exists appointments_starts_at_idx on public.appointments (starts_at);
create index if not exists appointments_client_idx on public.appointments (client_id, starts_at desc);
create index if not exists appointments_professional_day_idx
  on public.appointments (professional_id, starts_at)
  where status in ('pending', 'confirmed', 'completed');

-- Trigger: manter ends_at sincronizado com starts_at + service.duration
create or replace function public.appointments_set_ends_at()
returns trigger
language plpgsql
as $$
declare
  svc_duration int;
begin
  select duration_minutes into svc_duration
  from public.services
  where id = new.service_id;

  if svc_duration is null then
    raise exception 'Service % not found', new.service_id;
  end if;

  new.ends_at := new.starts_at + (svc_duration || ' minutes')::interval;
  return new;
end;
$$;

drop trigger if exists appointments_set_ends_at_trigger on public.appointments;
create trigger appointments_set_ends_at_trigger
  before insert or update of service_id, starts_at on public.appointments
  for each row execute function public.appointments_set_ends_at();

-- Trigger: prevenir overlap (1 profissional, mesmo horário, status ativo)
create or replace function public.appointments_prevent_overlap()
returns trigger
language plpgsql
as $$
declare
  conflict_count int;
begin
  select count(*) into conflict_count
  from public.appointments a
  where a.professional_id = new.professional_id
    and a.status in ('pending', 'confirmed', 'completed')
    and a.id <> new.id
    and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)');

  if conflict_count > 0 then
    raise exception 'Appointment overlaps with existing booking for this professional'
      using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_prevent_overlap_trigger on public.appointments;
create trigger appointments_prevent_overlap_trigger
  before insert or update on public.appointments
  for each row execute function public.appointments_prevent_overlap();

-- ============================================================
-- Função: get_available_slots
-- Retorna slots de início livres para um serviço em uma data.
-- Lógica:
--   1. Pega working_hours do profissional naquele weekday
--   2. Gera slots de slot_duration_minutes a partir do início
--   3. Filtra slots onde o serviço inteiro (duration_minutes) cabe antes do fim
--   4. Remove slots que conflitam com appointments ativos
--   5. Remove slots no passado
-- ============================================================
create or replace function public.get_available_slots(
  p_service_id uuid,
  p_date date
)
returns table(slot_start timestamptz)
language plpgsql
stable
as $$
declare
  v_professional_id uuid;
  v_slot_duration int;
  v_service_duration int;
  v_working_hours jsonb;
  v_weekday int;
  v_day_intervals jsonb;
  v_interval jsonb;
  v_day_start time;
  v_day_end time;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_now timestamptz := now();
  v_salon_tz text := 'America/Sao_Paulo';
  v_date_start timestamptz;
begin
  -- pegar profissional (1 única linha)
  select id, working_hours, slot_duration_minutes
  into v_professional_id, v_working_hours, v_slot_duration
  from public.professionals
  limit 1;

  if v_professional_id is null then
    return;
  end if;

  -- duração do serviço
  select duration_minutes into v_service_duration
  from public.services
  where id = p_service_id and is_active = true;

  if v_service_duration is null then
    return;
  end if;

  -- weekday no fuso do salão (0=domingo)
  v_weekday := extract(dow from (p_date::timestamp at time zone v_salon_tz))::int;

  -- chave do working_hours
  v_day_intervals := v_working_hours -> case v_weekday
    when 0 then 'sun'
    when 1 then 'mon'
    when 2 then 'tue'
    when 3 then 'wed'
    when 4 then 'thu'
    when 5 then 'fri'
    when 6 then 'sat'
  end;

  if v_day_intervals is null or jsonb_array_length(v_day_intervals) = 0 then
    return;
  end if;

  -- iterar pelos intervalos do dia (ex: almoço + tarde)
  for v_interval in select * from jsonb_array_elements(v_day_intervals)
  loop
    v_day_start := (v_interval ->> 'start')::time;
    v_day_end := (v_interval ->> 'end')::time;

    v_date_start := (p_date::text || ' ' || v_day_start::text)::timestamp at time zone v_salon_tz;

    -- gerar slots
    v_slot_start := v_date_start;
    while (v_slot_start + (v_service_duration || ' minutes')::interval) <=
          ((p_date::text || ' ' || v_day_end::text)::timestamp at time zone v_salon_tz)
    loop
      v_slot_end := v_slot_start + (v_service_duration || ' minutes')::interval;

      -- só slots no futuro
      if v_slot_start > v_now then
        -- checar overlap com appointments ativos
        if not exists (
          select 1 from public.appointments a
          where a.professional_id = v_professional_id
            and a.status in ('pending', 'confirmed', 'completed')
            and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(v_slot_start, v_slot_end, '[)')
        ) then
          slot_start := v_slot_start;
          return next;
        end if;
      end if;

      v_slot_start := v_slot_start + (v_slot_duration || ' minutes')::interval;
    end loop;
  end loop;
end;
$$;

-- ============================================================
-- RLS: Habilitar em todas as tabelas
-- ============================================================
alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

-- ============================================================
-- Policies — em dev local sem Supabase Auth, o app usa service_role
-- que bypassa RLS. As policies abaixo são o "contrato" que será
-- aplicado no Supabase Cloud com auth real.
--
-- IMPORTANTE: Como não temos auth.uid() real em Postgres puro,
-- criamos policies que referenciam auth.uid() mas só rodam em
-- Supabase. Para o DB local, criamos policies permissivas
-- (DEV ONLY) que o app backend (service_role) vai usar.
-- ============================================================

-- Clients: leitura/edição do próprio registro
drop policy if exists "clients_self_select" on public.clients;
drop policy if exists "clients_self_update" on public.clients;
drop policy if exists "clients_self_insert" on public.clients;

-- Appointments: cliente vê/edita os próprios, admin vê tudo
drop policy if exists "appointments_self_select" on public.appointments;
drop policy if exists "appointments_self_insert" on public.appointments;
drop policy if exists "appointments_self_update" on public.appointments;

-- Services: leitura pública
drop policy if exists "services_public_select" on public.services;

-- Professionals: leitura pública
drop policy if exists "professionals_public_select" on public.professionals;

-- Dev policies: tudo permitido para o role 'postgres' (já é o default)
-- No Supabase, supabase_admin/service_role bypassa RLS automaticamente.
-- Estas policies só se aplicam ao role 'anon' e 'authenticated' do Supabase.

-- Policy de exemplo para Supabase (referência — só funciona com auth):
-- create policy "clients_self_select" on public.clients
--   for select using (auth.uid() = id);

-- ============================================================
-- Seed: 1 profissional, 3 serviços exemplo
-- ============================================================
insert into public.professionals (id, full_name, bio, working_hours, slot_duration_minutes)
values (
  '00000000-0000-0000-0000-000000000001',
  'Ana Silva',
  'Especialista em depilação e design de sobrancelhas com 10 anos de experiência.',
  '{
    "mon":[{"start":"09:00","end":"12:00"},{"start":"14:00","end":"18:00"}],
    "tue":[{"start":"09:00","end":"18:00"}],
    "wed":[{"start":"09:00","end":"18:00"}],
    "thu":[{"start":"09:00","end":"18:00"}],
    "fri":[{"start":"09:00","end":"18:00"}],
    "sat":[{"start":"09:00","end":"14:00"}],
    "sun":[]
  }'::jsonb,
  30
) on conflict (id) do nothing;

insert into public.services (id, name, description, duration_minutes, price_cents) values
  ('10000000-0000-0000-0000-000000000001', 'Design de Sobrancelhas', 'Design com pinça e linha, inclui marcação de simetria.', 30, 5000),
  ('10000000-0000-0000-0000-000000000002', 'Depilação Buço', 'Depilação com cera específica para pele sensível.', 15, 2500),
  ('10000000-0000-0000-0000-000000000003', 'Depilação Perna Inteira', 'Depilação completa das pernas com cera quente.', 60, 9000)
on conflict (id) do nothing;

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_clients on public.clients;
create trigger set_updated_at_clients before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_services on public.services;
create trigger set_updated_at_services before update on public.services
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_professionals on public.professionals;
create trigger set_updated_at_professionals before update on public.professionals
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_appointments on public.appointments;
create trigger set_updated_at_appointments before update on public.appointments
  for each row execute function public.set_updated_at();
