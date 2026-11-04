-- Initial database schema for Karaoke Queue.
-- Queue mutations share one transaction-scoped advisory lock so position allocation,
-- promotion and reordering cannot interleave across concurrent requests.

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  discord_id text,
  nickname_key text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  discord_id text,
  song text,
  song_artist text,
  song_url text,
  song_cover text,
  queue_type text not null default 'main' check (queue_type in ('main', 'repeat')),
  status text not null default 'waiting' check (status in ('waiting', 'singing', 'done')),
  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default now()
);

create or replace function public.set_participant_nickname_key()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.nickname := btrim(new.nickname);
  new.nickname_key := lower(new.nickname);
  return new;
end;
$$;

drop trigger if exists participants_set_nickname_key on public.participants;
create trigger participants_set_nickname_key
before insert or update of nickname on public.participants
for each row execute function public.set_participant_nickname_key();

update public.participants
set nickname = btrim(nickname), nickname_key = lower(btrim(nickname))
where nickname_key is distinct from lower(btrim(nickname));

create unique index if not exists participants_nickname_key_uidx
  on public.participants (nickname_key);

create index if not exists queue_entries_active_order_idx
  on public.queue_entries (queue_type, position, created_at)
  where status in ('waiting', 'singing');

create index if not exists queue_entries_status_idx
  on public.queue_entries (status);

create or replace function public.upsert_participant(
  p_nickname text,
  p_discord_id text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_nickname is null or length(btrim(p_nickname)) = 0 then
    raise exception 'Ник не может быть пустым';
  end if;

  insert into public.participants (nickname, discord_id, nickname_key)
  values (btrim(p_nickname), nullif(btrim(p_discord_id), ''), lower(btrim(p_nickname)))
  on conflict (nickname_key) do update
    set nickname = excluded.nickname,
        discord_id = coalesce(excluded.discord_id, participants.discord_id);
end;
$$;

create or replace function public.queue_add_entry(
  p_nickname text,
  p_discord_id text,
  p_song text,
  p_song_artist text,
  p_song_url text,
  p_song_cover text,
  p_queue_type text
)
returns setof public.queue_entries
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_position integer;
begin
  perform pg_advisory_xact_lock(582347983421::bigint);

  if p_queue_type is null or p_queue_type not in ('main', 'repeat') then
    raise exception 'Некорректный тип очереди';
  end if;

  select coalesce(max(position), 0) + 1
    into v_position
    from public.queue_entries
    where queue_type = p_queue_type
      and status in ('waiting', 'singing');

  return query
    insert into public.queue_entries (
      nickname, discord_id, song, song_artist, song_url, song_cover,
      queue_type, status, position
    )
    values (
      btrim(p_nickname), p_discord_id, p_song, p_song_artist, p_song_url,
      p_song_cover, p_queue_type, 'waiting', v_position
    )
    returning *;
end;
$$;

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

create or replace function public.queue_shift_entry(
  p_id uuid,
  p_direction text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_entry public.queue_entries%rowtype;
  v_neighbor public.queue_entries%rowtype;
begin
  perform pg_advisory_xact_lock(582347983421::bigint);

  if p_direction is null or p_direction not in ('up', 'down') then
    raise exception 'Некорректное направление перемещения';
  end if;

  select * into v_entry
    from public.queue_entries
    where id = p_id and status = 'waiting'
    for update;

  if not found then
    return;
  end if;

  if p_direction = 'up' then
    select * into v_neighbor
      from public.queue_entries
      where queue_type = v_entry.queue_type
        and status = 'waiting'
        and position < v_entry.position
      order by position desc
      limit 1
      for update;
  else
    select * into v_neighbor
      from public.queue_entries
      where queue_type = v_entry.queue_type
        and status = 'waiting'
        and position > v_entry.position
      order by position asc
      limit 1
      for update;
  end if;

  if not found then
    return;
  end if;

  update public.queue_entries
    set position = case
      when id = v_entry.id then v_neighbor.position
      else v_entry.position
    end
    where id in (v_entry.id, v_neighbor.id);
end;
$$;

create or replace function public.queue_move_entry(
  p_id uuid,
  p_to_queue text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_position integer;
begin
  perform pg_advisory_xact_lock(582347983421::bigint);

  if p_to_queue is null or p_to_queue not in ('main', 'repeat') then
    raise exception 'Некорректный тип очереди';
  end if;

  if not exists (select 1 from public.queue_entries where id = p_id) then
    return;
  end if;

  select coalesce(max(position), 0) + 1
    into v_position
    from public.queue_entries
    where queue_type = p_to_queue
      and status in ('waiting', 'singing');

  update public.queue_entries
    set queue_type = p_to_queue, position = v_position
    where id = p_id;
end;
$$;

alter table public.participants enable row level security;
alter table public.queue_entries enable row level security;

revoke all on table public.participants from anon, authenticated;
revoke all on table public.queue_entries from anon, authenticated;
grant select on table public.queue_entries to anon, authenticated;
grant all on table public.participants, public.queue_entries to service_role;

drop policy if exists "Public can read queue entries" on public.queue_entries;
create policy "Public can read queue entries"
  on public.queue_entries
  for select
  to anon, authenticated
  using (true);

revoke all on function public.upsert_participant(text, text) from public, anon, authenticated;
revoke all on function public.queue_add_entry(text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.queue_call_next() from public, anon, authenticated;
revoke all on function public.queue_shift_entry(uuid, text) from public, anon, authenticated;
revoke all on function public.queue_move_entry(uuid, text) from public, anon, authenticated;

grant execute on function public.upsert_participant(text, text) to service_role;
grant execute on function public.queue_add_entry(text, text, text, text, text, text, text) to service_role;
grant execute on function public.queue_call_next() to service_role;
grant execute on function public.queue_shift_entry(uuid, text) to service_role;
grant execute on function public.queue_move_entry(uuid, text) to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'queue_entries'
     ) then
    execute 'alter publication supabase_realtime add table public.queue_entries';
  end if;
end;
$$;


create or replace function public.queue_remove_entry(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(582347983421::bigint);
  delete from public.queue_entries where id = p_id;
end;
$$;

create or replace function public.queue_clear_all()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(582347983421::bigint);
  delete from public.queue_entries;
end;
$$;

revoke all on function public.queue_remove_entry(uuid) from public, anon, authenticated;
revoke all on function public.queue_clear_all() from public, anon, authenticated;
grant execute on function public.queue_remove_entry(uuid) to service_role;
grant execute on function public.queue_clear_all() to service_role;
