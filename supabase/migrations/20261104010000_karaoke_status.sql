-- Persistent public availability toggle controlled by the host panel.
create table if not exists public.karaoke_settings (
  id text primary key default 'main' check (id = 'main'),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.karaoke_settings (id, is_active)
values ('main', true)
on conflict (id) do nothing;

alter table public.karaoke_settings enable row level security;

revoke all on table public.karaoke_settings from public, anon, authenticated;
grant select on table public.karaoke_settings to anon, authenticated;
grant all on table public.karaoke_settings to service_role;

drop policy if exists "Public can read karaoke status" on public.karaoke_settings;
create policy "Public can read karaoke status"
  on public.karaoke_settings
  for select
  to anon, authenticated
  using (id = 'main');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'karaoke_settings'
     ) then
    execute 'alter publication supabase_realtime add table public.karaoke_settings';
  end if;
end;
$$;

-- Keep the stop/start toggle and "next singer" transition serialized with the
-- same advisory lock used by all other queue mutations.
create or replace function public.queue_call_next()
returns setof public.queue_entries
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_candidate_id uuid;
begin
  perform pg_advisory_xact_lock(582347983421::bigint);

  if not coalesce(
    (select is_active from public.karaoke_settings where id = 'main'),
    false
  ) then
    raise exception using message = 'KARAOKE_INACTIVE';
  end if;

  update public.queue_entries
    set status = 'done'
    where status = 'singing';

  select id into v_candidate_id
    from public.queue_entries
    where queue_type = 'main' and status = 'waiting'
    order by position asc, created_at asc
    limit 1
    for update;

  if not found then
    select id into v_candidate_id
      from public.queue_entries
      where queue_type = 'repeat' and status = 'waiting'
      order by position asc, created_at asc
      limit 1
      for update;
  end if;

  if v_candidate_id is null then
    return;
  end if;

  return query
    update public.queue_entries
      set status = 'singing'
      where id = v_candidate_id
      returning *;
end;
$$;

create or replace function public.queue_set_karaoke_active(p_is_active boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(582347983421::bigint);

  update public.karaoke_settings
    set is_active = p_is_active,
        updated_at = now()
    where id = 'main';

  if not found then
    raise exception 'KARAOKE_SETTINGS_MISSING';
  end if;
end;
$$;

revoke all on function public.queue_set_karaoke_active(boolean) from public, anon, authenticated;
grant execute on function public.queue_set_karaoke_active(boolean) to service_role;
