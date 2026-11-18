-- =====================================================================
-- NEXLOGISTIC – Supabase-Schema (Postgres)
-- Läuft im selben Supabase-Projekt wie NEXCOUNT. Alle Objekte tragen das
-- Präfix nl_, damit sich die beiden Systeme nicht in die Quere kommen.
-- Die Anmeldung (auth.users) ist gemeinsam: ein Andrerer-Konto für alle NEX-Apps.
-- Wiederholbar: kann gefahrlos mehrfach eingespielt werden.
-- =====================================================================

-- ---------------------------------------------------------------- Tabellen
create table if not exists public.nl_companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  counters   jsonb not null default '{}'::jsonb,   -- fortlaufende Nummern (Sendungen, Touren …)
  created_at timestamptz not null default now()
);

create table if not exists public.nl_invites (
  company_id uuid primary key references public.nl_companies(id) on delete cascade,
  code       text not null unique
);

create table if not exists public.nl_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.nl_companies(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  email      text not null,
  role       text not null check (role in ('admin', 'dispo', 'driver')),
  created_at timestamptz not null default now()
);
create index if not exists nl_members_company_idx on public.nl_members(company_id);

-- Alle Geschäftsdaten als JSON-Dokumente je Sammlung.
-- Gelöscht wird weich (deleted = true), damit Live-Updates sauber gefiltert werden können.
create table if not exists public.nl_records (
  company_id uuid not null references public.nl_companies(id) on delete cascade,
  collection text not null check (collection in ('shipments','tours','vehicles','drivers','contacts','settings')),
  id         text not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  data       jsonb,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (company_id, collection, id),
  check (deleted or (data is not null and jsonb_typeof(data) = 'object' and octet_length(data::text) <= 262144))
);
create index if not exists nl_records_tracking_idx on public.nl_records ((data ->> 'trackingCode')) where collection = 'shipments';

-- ---------------------------------------------------------------- Hilfsfunktionen
create or replace function public.nl_my_company_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select company_id from public.nl_members where user_id = auth.uid()
$$;

create or replace function public.nl_my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.nl_members where user_id = auth.uid()
$$;

create or replace function public.nl_touch_record() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if new.deleted then new.data := null; end if;
  return new;
end $$;

drop trigger if exists nl_records_touch on public.nl_records;
create trigger nl_records_touch before insert or update on public.nl_records
  for each row execute function public.nl_touch_record();

-- ---------------------------------------------------------------- Row Level Security
alter table public.nl_companies enable row level security;
alter table public.nl_invites   enable row level security;
alter table public.nl_members   enable row level security;
alter table public.nl_records   enable row level security;

drop policy if exists "nl: eigene Firma lesen" on public.nl_companies;
create policy "nl: eigene Firma lesen" on public.nl_companies
  for select to authenticated using (id = public.nl_my_company_id());

drop policy if exists "nl: Einladungscode nur für Admins" on public.nl_invites;
create policy "nl: Einladungscode nur für Admins" on public.nl_invites
  for select to authenticated using (company_id = public.nl_my_company_id() and public.nl_my_role() = 'admin');

drop policy if exists "nl: Team der eigenen Firma lesen" on public.nl_members;
create policy "nl: Team der eigenen Firma lesen" on public.nl_members
  for select to authenticated using (company_id = public.nl_my_company_id());

drop policy if exists "nl: Daten lesen" on public.nl_records;
create policy "nl: Daten lesen" on public.nl_records
  for select to authenticated using (company_id = public.nl_my_company_id());

-- Admins & Disposition dürfen alles anlegen/ändern, Fahrer nur Sendungen und Touren (Status, Zustellung)
drop policy if exists "nl: Daten anlegen" on public.nl_records;
create policy "nl: Daten anlegen" on public.nl_records
  for insert to authenticated with check (
    company_id = public.nl_my_company_id() and public.nl_my_role() in ('admin', 'dispo'));

drop policy if exists "nl: Daten ändern" on public.nl_records;
create policy "nl: Daten ändern" on public.nl_records
  for update to authenticated
  using (company_id = public.nl_my_company_id()
         and (public.nl_my_role() in ('admin', 'dispo') or collection in ('shipments', 'tours')))
  with check (company_id = public.nl_my_company_id()
         and (public.nl_my_role() in ('admin', 'dispo') or (collection in ('shipments', 'tours') and not deleted)));

revoke all on public.nl_companies, public.nl_invites, public.nl_members, public.nl_records from anon;
revoke insert, update, delete, truncate on public.nl_companies, public.nl_invites, public.nl_members from authenticated;
revoke delete, truncate on public.nl_records from authenticated;
grant select on public.nl_companies, public.nl_invites, public.nl_members to authenticated;
grant select, insert, update on public.nl_records to authenticated;

-- ---------------------------------------------------------------- Profil, Firma & Team
create or replace function public.nl_me() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  m   public.nl_members%rowtype;
  c   public.nl_companies%rowtype;
  inv text;
  mem jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.' using errcode = '28000'; end if;
  select * into m from public.nl_members where user_id = auth.uid();
  if not found then
    return jsonb_build_object(
      'user', jsonb_build_object('id', auth.uid(), 'email', auth.jwt() ->> 'email',
                                 'name', auth.jwt() -> 'user_metadata' ->> 'name', 'role', null),
      'company', null, 'members', '[]'::jsonb);
  end if;
  select * into c from public.nl_companies where id = m.company_id;
  if m.role = 'admin' then
    select code into inv from public.nl_invites where company_id = c.id;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', x.user_id, 'name', x.name, 'email', x.email, 'role', x.role) order by x.name), '[]'::jsonb)
    into mem from public.nl_members x where x.company_id = c.id;
  return jsonb_build_object(
    'user', jsonb_build_object('id', m.user_id, 'name', m.name, 'email', m.email, 'role', m.role),
    'company', jsonb_build_object('id', c.id, 'name', c.name)
               || case when inv is not null then jsonb_build_object('inviteCode', inv) else '{}'::jsonb end,
    'members', mem);
end $$;

create or replace function public.nl_new_invite_code() returns text
language sql volatile set search_path = '' as $$
  select 'NL' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
$$;

create or replace function public.nl_display_name(p_name text) returns text
language sql stable set search_path = '' as $$
  select left(btrim(coalesce(nullif(btrim(p_name), ''),
                             nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
                             split_part(auth.jwt() ->> 'email', '@', 1))), 80)
$$;

create or replace function public.nl_create_company(p_company_name text, p_name text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.' using errcode = '28000'; end if;
  if exists (select 1 from public.nl_members where user_id = auth.uid()) then raise exception 'Du gehörst bereits zu einer Firma.'; end if;
  p_company_name := btrim(coalesce(p_company_name, ''));
  if p_company_name = '' or char_length(p_company_name) > 120 then raise exception 'Bitte gib einen gültigen Firmennamen an.'; end if;
  insert into public.nl_companies (name) values (p_company_name) returning id into cid;
  insert into public.nl_invites (company_id, code) values (cid, public.nl_new_invite_code());
  insert into public.nl_members (user_id, company_id, name, email, role)
    values (auth.uid(), cid, public.nl_display_name(p_name), coalesce(auth.jwt() ->> 'email', ''), 'admin');
  return public.nl_me();
end $$;

create or replace function public.nl_join_company(p_code text, p_name text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.' using errcode = '28000'; end if;
  if exists (select 1 from public.nl_members where user_id = auth.uid()) then raise exception 'Du gehörst bereits zu einer Firma.'; end if;
  select company_id into cid from public.nl_invites where code = upper(btrim(coalesce(p_code, '')));
  if cid is null then raise exception 'Einladungscode ist ungültig.'; end if;
  insert into public.nl_members (user_id, company_id, name, email, role)
    values (auth.uid(), cid, public.nl_display_name(p_name), coalesce(auth.jwt() ->> 'email', ''), 'driver');
  return public.nl_me();
end $$;

create or replace function public.nl_update_profile(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  p_name := left(btrim(coalesce(p_name, '')), 80);
  if p_name = '' then raise exception 'Name darf nicht leer sein.'; end if;
  update public.nl_members set name = p_name where user_id = auth.uid();
  if not found then raise exception 'NO_COMPANY'; end if;
  return public.nl_me();
end $$;

create or replace function public.nl_require_admin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare cid uuid;
begin
  select company_id into cid from public.nl_members where user_id = auth.uid() and role = 'admin';
  if cid is null then raise exception 'Nur für Administratoren.' using errcode = '42501'; end if;
  return cid;
end $$;

create or replace function public.nl_update_company(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.nl_require_admin();
begin
  p_name := btrim(coalesce(p_name, ''));
  if p_name = '' or char_length(p_name) > 120 then raise exception 'Bitte gib einen gültigen Firmennamen an.'; end if;
  update public.nl_companies set name = p_name where id = cid;
  return public.nl_me();
end $$;

create or replace function public.nl_rotate_invite() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.nl_require_admin();
begin
  update public.nl_invites set code = public.nl_new_invite_code() where company_id = cid;
  return public.nl_me();
end $$;

create or replace function public.nl_set_member_role(p_user uuid, p_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.nl_require_admin();
begin
  if p_role not in ('admin', 'dispo', 'driver') then raise exception 'Ungültige Rolle.'; end if;
  if p_user = auth.uid() then raise exception 'Du kannst deine eigene Rolle nicht ändern.'; end if;
  update public.nl_members set role = p_role where user_id = p_user and company_id = cid;
  if not found then raise exception 'Benutzer nicht gefunden.'; end if;
  return public.nl_me();
end $$;

create or replace function public.nl_remove_member(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.nl_require_admin();
begin
  if p_user = auth.uid() then raise exception 'Du kannst dich nicht selbst entfernen.'; end if;
  delete from public.nl_members where user_id = p_user and company_id = cid;
  if not found then raise exception 'Benutzer nicht gefunden.'; end if;
  return public.nl_me();
end $$;

-- Firma verlassen; der letzte Admin kann nur gehen, wenn er allein ist (dann wird die Firma gelöscht)
create or replace function public.nl_leave_company() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m public.nl_members%rowtype;
  admins int;
  total int;
begin
  select * into m from public.nl_members where user_id = auth.uid();
  if not found then return public.nl_me(); end if;
  select count(*) filter (where role = 'admin'), count(*) into admins, total from public.nl_members where company_id = m.company_id;
  if m.role = 'admin' and admins = 1 and total > 1 then
    raise exception 'Ernenne zuerst eine andere Person zum Admin.';
  end if;
  delete from public.nl_members where user_id = m.user_id;
  if total = 1 then delete from public.nl_companies where id = m.company_id; end if;
  return public.nl_me();
end $$;

-- Fortlaufende Nummer je Art (z. B. 'shipment', 'tour') – lückenlos und konfliktfrei
create or replace function public.nl_next_number(p_kind text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  cid uuid := public.nl_my_company_id();
  n   bigint;
begin
  if cid is null then raise exception 'NO_COMPANY'; end if;
  if p_kind !~ '^[a-z]{1,20}$' then raise exception 'Ungültige Nummernart.'; end if;
  update public.nl_companies
     set counters = jsonb_set(counters, array[p_kind], to_jsonb(coalesce((counters ->> p_kind)::bigint, 0) + 1))
   where id = cid
   returning (counters ->> p_kind)::bigint into n;
  return n;
end $$;

-- ---------------------------------------------------------------- Öffentliche Sendungsverfolgung
-- Liefert für einen Tracking-Code nur unkritische Angaben (kein Name, keine Straße, keine Notizen).
create or replace function public.nl_track(p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r record;
  ev jsonb;
begin
  p_code := upper(btrim(coalesce(p_code, '')));
  if p_code !~ '^[A-Z0-9-]{8,32}$' then return null; end if;
  select x.data, c.name as company into r
    from public.nl_records x join public.nl_companies c on c.id = x.company_id
   where x.collection = 'shipments' and not x.deleted and x.data ->> 'trackingCode' = p_code
   limit 1;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object('status', e ->> 'status', 'at', e ->> 'at', 'place', e ->> 'place') order by e ->> 'at'), '[]'::jsonb)
    into ev from jsonb_array_elements(coalesce(r.data -> 'events', '[]'::jsonb)) e;
  return jsonb_build_object(
    'company', r.company,
    'number', r.data ->> 'number',
    'trackingCode', r.data ->> 'trackingCode',
    'status', r.data ->> 'status',
    'service', r.data ->> 'service',
    'packages', jsonb_array_length(coalesce(r.data -> 'packages', '[]'::jsonb)),
    'plannedDate', r.data ->> 'deliveryDate',
    'windowFrom', r.data ->> 'windowFrom',
    'windowTo', r.data ->> 'windowTo',
    'from', jsonb_build_object('zip', r.data #>> '{sender,zip}', 'city', r.data #>> '{sender,city}', 'country', r.data #>> '{sender,country}'),
    'to', jsonb_build_object('zip', r.data #>> '{recipient,zip}', 'city', r.data #>> '{recipient,city}', 'country', r.data #>> '{recipient,country}'),
    'events', ev);
end $$;

-- ---------------------------------------------------------------- Rechte auf Funktionen
revoke execute on function public.nl_my_company_id(), public.nl_my_role(), public.nl_touch_record(), public.nl_me(),
  public.nl_new_invite_code(), public.nl_display_name(text), public.nl_create_company(text, text),
  public.nl_join_company(text, text), public.nl_update_profile(text), public.nl_require_admin(),
  public.nl_update_company(text), public.nl_rotate_invite(), public.nl_set_member_role(uuid, text),
  public.nl_remove_member(uuid), public.nl_leave_company(), public.nl_next_number(text), public.nl_track(text)
  from public, anon;

grant execute on function public.nl_my_company_id(), public.nl_my_role(), public.nl_me(),
  public.nl_create_company(text, text), public.nl_join_company(text, text), public.nl_update_profile(text),
  public.nl_update_company(text), public.nl_rotate_invite(), public.nl_set_member_role(uuid, text),
  public.nl_remove_member(uuid), public.nl_leave_company(), public.nl_next_number(text), public.nl_track(text)
  to authenticated;

grant execute on function public.nl_track(text) to anon;

-- ---------------------------------------------------------------- Live-Updates (Supabase Realtime)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'nl_records') then
    alter publication supabase_realtime add table public.nl_records;
  end if;
end $$;
