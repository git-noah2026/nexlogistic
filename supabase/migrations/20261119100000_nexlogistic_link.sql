-- =====================================================================
-- NEXLOGISTIC – Verknüpfung mit NEXCOUNT (Buchhaltung)
-- Eine NEXLOGISTIC-Firma kann mit genau einer NEXCOUNT-Firma verknüpft werden.
-- NEXCOUNT liest dann Lagerartikel und Bestände und bucht Warenausgänge (Rechnungen)
-- und Wareneingänge (Eingangsrechnungen) – nur über die Funktionen hier, nie direkt.
-- Die NEXCOUNT-Tabellen (public.companies, public.members) liegen im selben Projekt.
-- Wiederholbar.
-- =====================================================================

create table if not exists public.nl_links (
  nl_company_id uuid primary key references public.nl_companies(id) on delete cascade,
  nc_company_id uuid not null unique,
  created_at    timestamptz not null default now(),
  created_by    uuid
);

-- Wird die NEXCOUNT-Firma gelöscht, verschwindet auch die Verknüpfung
do $$
begin
  if to_regclass('public.companies') is not null
     and not exists (select 1 from pg_constraint where conname = 'nl_links_nc_company_fk') then
    alter table public.nl_links add constraint nl_links_nc_company_fk
      foreign key (nc_company_id) references public.companies(id) on delete cascade;
  end if;
end $$;

create table if not exists public.nl_link_codes (
  nl_company_id uuid primary key references public.nl_companies(id) on delete cascade,
  code          text not null unique,
  expires_at    timestamptz not null
);

alter table public.nl_links enable row level security;
alter table public.nl_link_codes enable row level security;
revoke all on public.nl_links, public.nl_link_codes from public, anon, authenticated;

-- ---------------------------------------------------------------- Hilfsfunktionen
-- NEXCOUNT-Firma und -Rolle der angemeldeten Person
create or replace function public.nl_nc_company() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  if to_regclass('public.members') is null then return null; end if;
  execute 'select company_id from public.members where user_id = $1' into v using auth.uid();
  return v;
end $$;

create or replace function public.nl_nc_role() returns text
language plpgsql stable security definer set search_path = '' as $$
declare v text;
begin
  if to_regclass('public.members') is null then return null; end if;
  execute 'select role from public.members where user_id = $1' into v using auth.uid();
  return v;
end $$;

create or replace function public.nl_nc_company_name(p_id uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare n text;
begin
  if p_id is null or to_regclass('public.companies') is null then return null; end if;
  execute 'select name from public.companies where id = $1' into n using p_id;
  return n;
end $$;

-- Für NEXCOUNT-Aufrufe: verknüpfte NEXLOGISTIC-Firma (oder Fehler)
create or replace function public.nl_link_target(p_admin boolean default false) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  nc uuid := public.nl_nc_company();
  ncr text := public.nl_nc_role();
  cid uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.' using errcode = '28000'; end if;
  if nc is null then raise exception 'NO_COMPANY'; end if;
  if p_admin and ncr <> 'admin' then raise exception 'Nur für Administratoren.' using errcode = '42501'; end if;
  select nl_company_id into cid from public.nl_links where nc_company_id = nc;
  if cid is null then raise exception 'NEXCOUNT ist nicht mit NEXLOGISTIC verknüpft.'; end if;
  return cid;
end $$;

-- ---------------------------------------------------------------- NEXLOGISTIC-Seite
create or replace function public.nl_link_info() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cid uuid := public.nl_my_company_id();
  l   public.nl_links%rowtype;
  c   public.nl_link_codes%rowtype;
begin
  if cid is null then raise exception 'NO_COMPANY'; end if;
  select * into l from public.nl_links where nl_company_id = cid;
  if public.nl_my_role() = 'admin' then
    select * into c from public.nl_link_codes where nl_company_id = cid and expires_at > now();
  end if;
  return jsonb_build_object(
    'linked', case when l.nl_company_id is null then null
                   else jsonb_build_object('name', public.nl_nc_company_name(l.nc_company_id), 'at', l.created_at) end,
    'code', case when c.code is null then null else jsonb_build_object('code', c.code, 'expiresAt', c.expires_at) end);
end $$;

create or replace function public.nl_link_create_code() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.nl_require_admin();
begin
  if exists (select 1 from public.nl_links where nl_company_id = cid) then raise exception 'Bereits mit NEXCOUNT verknüpft.'; end if;
  insert into public.nl_link_codes (nl_company_id, code, expires_at)
    values (cid, 'NC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), now() + interval '24 hours')
  on conflict (nl_company_id) do update set code = excluded.code, expires_at = excluded.expires_at;
  return public.nl_link_info();
end $$;

-- Trennen: Admin der NEXLOGISTIC-Firma oder Admin der verknüpften NEXCOUNT-Firma
create or replace function public.nl_link_remove() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  nc uuid := public.nl_nc_company();
  ncr text := public.nl_nc_role();
  n int := 0;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.' using errcode = '28000'; end if;
  if public.nl_my_role() = 'admin' then
    delete from public.nl_links where nl_company_id = public.nl_my_company_id();
    get diagnostics n = row_count;
  end if;
  if n = 0 and ncr = 'admin' then
    delete from public.nl_links where nc_company_id = nc;
    get diagnostics n = row_count;
  end if;
  if n = 0 then raise exception 'Keine Verknüpfung gefunden oder keine Berechtigung.'; end if;
  return jsonb_build_object('removed', true);
end $$;

-- ---------------------------------------------------------------- NEXCOUNT-Seite
create or replace function public.nl_link_status() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  nc  uuid := public.nl_nc_company();
  ncr text := public.nl_nc_role();
  l   public.nl_links%rowtype;
  nlm public.nl_members%rowtype;
  direct jsonb := null;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.' using errcode = '28000'; end if;
  if nc is null then raise exception 'NO_COMPANY'; end if;
  select * into l from public.nl_links where nc_company_id = nc;
  if l.nl_company_id is null and ncr = 'admin' then
    -- Ist die Person auch Admin einer (noch nicht verknüpften) NEXLOGISTIC-Firma? → Verknüpfen mit einem Klick
    select * into nlm from public.nl_members where user_id = auth.uid() and role = 'admin';
    if nlm.company_id is not null and not exists (select 1 from public.nl_links where nl_company_id = nlm.company_id) then
      direct := jsonb_build_object('name', (select name from public.nl_companies where id = nlm.company_id));
    end if;
  end if;
  return jsonb_build_object(
    'linked', case when l.nl_company_id is null then null
                   else jsonb_build_object('name', (select name from public.nl_companies where id = l.nl_company_id), 'at', l.created_at) end,
    'direct', direct,
    'admin', ncr = 'admin');
end $$;

create or replace function public.nl_link_accept(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  nc  uuid := public.nl_nc_company();
  ncr text := public.nl_nc_role();
  cid uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.' using errcode = '28000'; end if;
  if nc is null then raise exception 'NO_COMPANY'; end if;
  if ncr <> 'admin' then raise exception 'Nur für Administratoren.' using errcode = '42501'; end if;
  if exists (select 1 from public.nl_links where nc_company_id = nc) then raise exception 'Bereits mit NEXLOGISTIC verknüpft.'; end if;
  select nl_company_id into cid from public.nl_link_codes
   where code = upper(btrim(coalesce(p_code, ''))) and expires_at > now();
  if cid is null then raise exception 'Verknüpfungscode ist ungültig oder abgelaufen.'; end if;
  if exists (select 1 from public.nl_links where nl_company_id = cid) then raise exception 'Diese NEXLOGISTIC-Firma ist bereits verknüpft.'; end if;
  insert into public.nl_links (nl_company_id, nc_company_id, created_by) values (cid, nc, auth.uid());
  delete from public.nl_link_codes where nl_company_id = cid;
  return public.nl_link_status();
end $$;

create or replace function public.nl_link_direct() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  nc  uuid := public.nl_nc_company();
  ncr text := public.nl_nc_role();
  cid uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.' using errcode = '28000'; end if;
  if nc is null or ncr <> 'admin' then raise exception 'Nur für Administratoren.' using errcode = '42501'; end if;
  select company_id into cid from public.nl_members where user_id = auth.uid() and role = 'admin';
  if cid is null then raise exception 'Du bist in keiner NEXLOGISTIC-Firma Administrator.'; end if;
  if exists (select 1 from public.nl_links where nc_company_id = nc or nl_company_id = cid) then raise exception 'Bereits verknüpft.'; end if;
  insert into public.nl_links (nl_company_id, nc_company_id, created_by) values (cid, nc, auth.uid());
  delete from public.nl_link_codes where nl_company_id = cid;
  return public.nl_link_status();
end $$;

-- Lagerartikel mit aktuellem Bestand (aus den Bewegungen berechnet)
create or replace function public.nl_link_articles() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare cid uuid := public.nl_link_target();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'sku', a.data ->> 'sku', 'name', a.data ->> 'name', 'unit', a.data ->> 'unit',
      'ean', a.data ->> 'ean', 'category', a.data ->> 'category',
      'cost', coalesce((a.data ->> 'cost')::numeric, 0), 'min', coalesce((a.data ->> 'min')::numeric, 0),
      'archived', coalesce((a.data ->> 'archived')::boolean, false),
      'stock', coalesce(s.qty, 0)) order by a.data ->> 'name')
    from public.nl_records a
    left join (
      select data ->> 'articleId' as aid, sum(coalesce((data ->> 'qty')::numeric, 0)) as qty
        from public.nl_records where company_id = cid and collection = 'movements' and not deleted
       group by 1) s on s.aid = a.id
   where a.company_id = cid and a.collection = 'articles' and not a.deleted), '[]'::jsonb);
end $$;

-- Rechnung → Warenausgang, Eingangsrechnung → Wareneingang, Storno → Gegenbuchung.
-- Idempotent: Bewegungs-IDs werden aus Beleg-ID und Position gebildet, doppelte Aufrufe buchen nichts doppelt.
create or replace function public.nl_link_book(p_doc text, p_ref text, p_kind text, p_date date, p_lines jsonb, p_cancel boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cid    uuid := public.nl_link_target();
  who    text;
  line_  jsonb;
  i      int := 0;
  art    record;
  q      numeric;
  cost   numeric;
  mid    text;
  orig_id text;
  booked int := 0;
  rows_  int;
  have   numeric;
  warn   jsonb := '[]'::jsonb;
  now_t  text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  label  text;
begin
  if coalesce(p_doc, '') !~ '^[A-Za-z0-9_-]{1,40}$' then raise exception 'Ungültige Beleg-ID.'; end if;
  if p_kind not in ('sale', 'purchase') then raise exception 'Ungültige Belegart.'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) > 200 then raise exception 'Ungültige Positionen.'; end if;
  p_ref := left(coalesce(p_ref, ''), 60);
  label := case p_kind when 'sale' then 'Rechnung ' else 'Eingangsrechnung ' end || p_ref || ' (NEXCOUNT)';
  if to_regclass('public.members') is not null then
    execute 'select name from public.members where user_id = $1' into who using auth.uid();
  end if;
  for line_ in select * from jsonb_array_elements(p_lines) loop
    i := i + 1;
    select id, data into art from public.nl_records
     where company_id = cid and collection = 'articles' and id = line_ ->> 'articleId' and not deleted;
    if art.id is null then continue; end if;
    q := abs(coalesce((line_ ->> 'qty')::numeric, 0));
    if q = 0 then continue; end if;
    orig_id := 'nc_' || p_doc || '_' || i;
    if p_cancel then
      -- nur stornieren, was auch gebucht wurde
      if not exists (select 1 from public.nl_records where company_id = cid and collection = 'movements' and id = orig_id and not deleted) then continue; end if;
      mid := orig_id || '_s';
    else
      mid := orig_id;
    end if;
    cost := coalesce(nullif(line_ ->> 'unitCost', '')::numeric, (art.data ->> 'cost')::numeric, 0);
    -- Bestand vor der Buchung (für gleitenden Durchschnitt und Warnung)
    select coalesce(sum((data ->> 'qty')::numeric), 0) into have from public.nl_records
     where company_id = cid and collection = 'movements' and not deleted and data ->> 'articleId' = art.id;
    insert into public.nl_records (company_id, collection, id, data)
    values (cid, 'movements', mid, jsonb_build_object(
      'id', mid, 'articleId', art.id,
      'qty', case when (p_kind = 'sale') <> p_cancel then -q else q end,
      'type', case when p_cancel then 'storno' when p_kind = 'sale' then 'out' else 'in' end,
      'locationId', coalesce(art.data ->> 'locationId', ''),
      'date', coalesce(p_date, current_date)::text,
      'unitCost', cost,
      'note', case when p_cancel then 'Storno: ' || label else label end,
      'by', coalesce(who, 'NEXCOUNT'), 'source', 'nexcount', 'ncDoc', p_doc,
      'createdAt', now_t, 'updatedAt', now_t)
      || case when p_cancel then jsonb_build_object('reverses', orig_id) else '{}'::jsonb end)
    on conflict (company_id, collection, id) do nothing;
    get diagnostics rows_ = row_count;
    if rows_ = 0 then continue; end if;
    booked := booked + 1;
    if p_cancel then
      update public.nl_records set data = data || jsonb_build_object('reversedBy', mid, 'updatedAt', now_t)
       where company_id = cid and collection = 'movements' and id = orig_id;
    elsif p_kind = 'purchase' and nullif(line_ ->> 'unitCost', '') is not null then
      -- gleitender Durchschnittspreis wie in NEXLOGISTIC
      update public.nl_records
         set data = data || jsonb_build_object('cost', round(case when have > 0 and coalesce((data ->> 'cost')::numeric, 0) > 0
                                                              then (have * (data ->> 'cost')::numeric + q * cost) / (have + q) else cost end, 4),
                                               'updatedAt', now_t)
       where company_id = cid and collection = 'articles' and id = art.id;
    elsif p_kind = 'sale' and have - q < 0 then
      warn := warn || jsonb_build_object('name', art.data ->> 'name', 'stock', have - q);
    end if;
  end loop;
  return jsonb_build_object('booked', booked, 'warnings', warn);
end $$;

-- Bisherige Lagerartikel aus NEXCOUNT übernehmen (Artikel + Anfangsbestand). Wiederholbar.
create or replace function public.nl_link_import(p_articles jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cid   uuid := public.nl_link_target(true);
  a     jsonb;
  aid   text;
  q     numeric;
  map   jsonb := '[]'::jsonb;
  made  int := 0;
  rows_ int;
  now_t text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if jsonb_typeof(p_articles) <> 'array' or jsonb_array_length(p_articles) > 2000 then raise exception 'Ungültige Artikelliste.'; end if;
  for a in select * from jsonb_array_elements(p_articles) loop
    if coalesce(a ->> 'ncId', '') !~ '^[A-Za-z0-9_-]{1,40}$' or btrim(coalesce(a ->> 'name', '')) = '' then continue; end if;
    aid := 'nc_' || (a ->> 'ncId');
    insert into public.nl_records (company_id, collection, id, data)
    values (cid, 'articles', aid, jsonb_build_object(
      'id', aid, 'name', left(a ->> 'name', 160), 'sku', left(coalesce(a ->> 'sku', ''), 40),
      'ean', left(coalesce(a ->> 'ean', ''), 20), 'category', left(coalesce(a ->> 'category', ''), 60),
      'unit', left(coalesce(nullif(a ->> 'unit', ''), 'Stk'), 20), 'locationId', '', 'bin', left(coalesce(a ->> 'location', ''), 40),
      'min', coalesce(nullif(a ->> 'min', '')::numeric, 0), 'cost', coalesce(nullif(a ->> 'cost', '')::numeric, 0),
      'description', 'Aus NEXCOUNT übernommen', 'source', 'nexcount', 'createdAt', now_t, 'updatedAt', now_t))
    on conflict (company_id, collection, id) do nothing;
    get diagnostics rows_ = row_count;
    q := coalesce(nullif(a ->> 'stock', '')::numeric, 0);
    if rows_ > 0 then
      made := made + 1;
      if q <> 0 then
        insert into public.nl_records (company_id, collection, id, data)
        values (cid, 'movements', 'nc_init_' || (a ->> 'ncId'), jsonb_build_object(
          'id', 'nc_init_' || (a ->> 'ncId'), 'articleId', aid, 'qty', q, 'type', 'initial', 'locationId', '',
          'date', current_date::text, 'unitCost', coalesce(nullif(a ->> 'cost', '')::numeric, 0),
          'note', 'Anfangsbestand aus NEXCOUNT', 'by', 'NEXCOUNT', 'source', 'nexcount', 'createdAt', now_t, 'updatedAt', now_t))
        on conflict (company_id, collection, id) do nothing;
      end if;
    end if;
    map := map || jsonb_build_object('ncId', a ->> 'ncId', 'nlId', aid);
  end loop;
  return jsonb_build_object('created', made, 'map', map);
end $$;

-- ---------------------------------------------------------------- Rechte
revoke execute on function public.nl_nc_company(), public.nl_nc_role(), public.nl_nc_company_name(uuid), public.nl_link_target(boolean),
  public.nl_link_info(), public.nl_link_create_code(), public.nl_link_remove(), public.nl_link_status(),
  public.nl_link_accept(text), public.nl_link_direct(), public.nl_link_articles(),
  public.nl_link_book(text, text, text, date, jsonb, boolean), public.nl_link_import(jsonb)
  from public, anon;
grant execute on function public.nl_link_info(), public.nl_link_create_code(), public.nl_link_remove(), public.nl_link_status(),
  public.nl_link_accept(text), public.nl_link_direct(), public.nl_link_articles(),
  public.nl_link_book(text, text, text, date, jsonb, boolean), public.nl_link_import(jsonb)
  to authenticated;
