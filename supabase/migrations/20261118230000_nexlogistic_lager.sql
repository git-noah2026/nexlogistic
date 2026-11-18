-- =====================================================================
-- NEXLOGISTIC – Lager: Artikel, Bewegungen, Lagerorte und Rolle „Lager“
-- Wiederholbar.
-- =====================================================================

-- Neue Sammlungen
alter table public.nl_records drop constraint if exists nl_records_collection_check;
alter table public.nl_records add constraint nl_records_collection_check check (collection in (
  'shipments', 'tours', 'vehicles', 'drivers', 'contacts', 'settings',
  'articles', 'movements', 'locations'));

-- Neue Rolle „lager“ (Lagerist:in)
alter table public.nl_members drop constraint if exists nl_members_role_check;
alter table public.nl_members add constraint nl_members_role_check check (role in ('admin', 'dispo', 'lager', 'driver'));

create or replace function public.nl_set_member_role(p_user uuid, p_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.nl_require_admin();
begin
  if p_role not in ('admin', 'dispo', 'lager', 'driver') then raise exception 'Ungültige Rolle.'; end if;
  if p_user = auth.uid() then raise exception 'Du kannst deine eigene Rolle nicht ändern.'; end if;
  update public.nl_members set role = p_role where user_id = p_user and company_id = cid;
  if not found then raise exception 'Benutzer nicht gefunden.'; end if;
  return public.nl_me();
end $$;

-- Wer darf welche Sammlung anlegen / ändern / löschen?
--   admin, dispo: alles
--   lager:        Artikel, Bewegungen, Lagerorte, Kontakte; Sendungen ändern (Kommissionierung)
--   driver:       Sendungen & Touren ändern (Zustellung), Bewegungen anlegen (Warenausgang beim Tourstart)
-- Bewegungen werden nie gelöscht, sondern storniert (Gegenbuchung).
create or replace function public.nl_can_write(p_collection text, p_action text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case public.nl_my_role()
    when 'admin' then p_collection <> 'movements' or p_action <> 'delete'
    when 'dispo' then p_collection <> 'movements' or p_action <> 'delete'
    when 'lager' then case p_action
      when 'insert' then p_collection in ('articles', 'movements', 'locations', 'contacts')
      when 'update' then p_collection in ('articles', 'movements', 'locations', 'contacts', 'shipments')
      when 'delete' then p_collection in ('articles', 'locations', 'contacts')
      else false end
    when 'driver' then case p_action
      when 'insert' then p_collection = 'movements'
      when 'update' then p_collection in ('shipments', 'tours')
      else false end
    else false end
$$;
revoke execute on function public.nl_can_write(text, text) from public, anon;
grant execute on function public.nl_can_write(text, text) to authenticated;

drop policy if exists "nl: Daten anlegen" on public.nl_records;
create policy "nl: Daten anlegen" on public.nl_records
  for insert to authenticated with check (
    company_id = public.nl_my_company_id() and not deleted and public.nl_can_write(collection, 'insert'));

drop policy if exists "nl: Daten ändern" on public.nl_records;
create policy "nl: Daten ändern" on public.nl_records
  for update to authenticated
  using (company_id = public.nl_my_company_id() and (public.nl_can_write(collection, 'update') or public.nl_can_write(collection, 'delete')))
  with check (company_id = public.nl_my_company_id()
         and case when deleted then public.nl_can_write(collection, 'delete') else public.nl_can_write(collection, 'update') end);
