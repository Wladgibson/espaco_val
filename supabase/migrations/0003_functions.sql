-- Fase 1.2: get_available_slots + constraint no-overlap

-- Função: get_available_slots(service_id, date)
-- Retorna timestamptz slots disponíveis para um serviço em uma data (TZ do salão)
create or replace function public.get_available_slots(
  p_service_id uuid,
  p_date date
)
returns table(slot_start timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_duration int;
  v_slot_minutes int;
  v_weekday text;
  v_intervals jsonb;
  v_interval jsonb;
  v_slot timestamptz;
  v_end timestamptz;
begin
  -- duração do serviço
  select duration_minutes into v_duration
  from public.services where id = p_service_id and is_active = true;
  if v_duration is null then return; end if;

  -- slot base do profissional (single-tenant: pega a primeira/única)
  select slot_duration_minutes into v_slot_minutes from public.professionals limit 1;
  v_slot_minutes := greatest(v_slot_minutes, v_duration);

  -- weekday em PT (date_trunc weekday) -> mon/tue/wed/thu/fri/sat/sun
  v_weekday := lower(to_char(p_date, 'dy'));
  v_weekday := case v_weekday
    when 'mon' then 'mon' when 'tue' then 'tue' when 'wed' then 'wed'
    when 'thu' then 'thu' when 'fri' then 'fri' when 'sat' then 'sat'
    when 'sun' then 'sun' else v_weekday end;

  -- working_hours do profissional único
  select working_hours->v_weekday into v_intervals
  from public.professionals limit 1;

  if v_intervals is null then return; end if;

  -- iterar cada intervalo (ex: manhã + tarde)
  for v_interval in select * from jsonb_array_elements(v_intervals)
  loop
    v_slot := (p_date::text || ' ' || (v_interval->>'start'))::timestamp at time zone 'America/Sao_Paulo';
    v_end := (p_date::text || ' ' || (v_interval->>'end'))::timestamp at time zone 'America/Sao_Paulo';

    while v_slot + (v_slot_minutes || ' minutes')::interval <= v_end
    loop
      -- só slots futuros
      if v_slot > now() then
        -- checa overlap com appointments não-cancelados
        if not exists (
          select 1 from public.appointments a
          where a.status in ('pending','confirmed','completed')
            and tstzrange(a.starts_at, a.ends_at, '[)') &&
                tstzrange(v_slot, v_slot + (v_slot_minutes || ' minutes')::interval, '[)')
        ) then
          slot_start := v_slot;
          return next;
        end if;
      end if;
      v_slot := v_slot + (v_slot_minutes || ' minutes')::interval;
    end loop;
  end loop;
end;
$$;

-- Preenche ends_at a partir de services.duration_minutes
create or replace function public.set_appointment_ends_at()
returns trigger language plpgsql as $$
declare
  v_duration int;
begin
  select duration_minutes into v_duration from public.services where id = new.service_id;
  if v_duration is null then
    raise exception 'Serviço não encontrado';
  end if;
  if new.ends_at is null then
    new.ends_at := new.starts_at + (v_duration || ' minutes')::interval;
  end if;
  return new;
end;
$$;

create trigger appointments_set_ends_at
  before insert on public.appointments
  for each row execute function public.set_appointment_ends_at();

-- Constraint: impedir overlap de appointments ativos para o mesmo profissional
create or replace function public.check_appointment_no_overlap()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from public.appointments a
    where a.id <> new.id
      and a.professional_id = new.professional_id
      and a.status in ('pending','confirmed','completed')
      and tstzrange(a.starts_at, a.ends_at, '[)') &&
          tstzrange(new.starts_at, new.ends_at, '[)')
  ) then
    raise exception 'Slot já ocupado para este profissional';
  end if;
  return new;
end;
$$;

create trigger appointments_no_overlap
  before insert or update on public.appointments
  for each row execute function public.check_appointment_no_overlap();
