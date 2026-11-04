-- Durable karaoke sessions and their entry history.
-- Apply this migration before using the new host-panel controls.

create table if not exists public.karaoke_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz,
  ended_at timestamptz,
  is_legacy boolean not null default false,
  constraint karaoke_sessions_started_at_check
    check (is_legacy or started_at is not null),
  constraint karaoke_sessions_time_check
    check (ended_at is null or started_at is null or ended_at >= started_at)
);

create unique index if not exists karaoke_sessions_one_open_idx
  on public.karaoke_sessions ((is_legacy))
  where ended_at is null and not is_legacy;

create table if not exists public.karaoke_session_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.karaoke_sessions(id) on delete cascade,
  queue_entry_id uuid,
  nickname text not null,
  discord_id text,
  song text,
  song_artist text,
  song_url text,
  song_cover text,
  queue_type text not null check (queue_type in ('main', 'repeat')),
  result text not null default 'pending'
    check (result in ('pending', 'performed', 'not_performed')),
  queued_at timestamptz not null default now(),
  performed_at timestamptz
);

create unique index if not exists karaoke_session_entries_queue_entry_uidx
  on public.karaoke_session_entries (session_id, queue_entry_id)
  where queue_entry_id is not null;

create index if not exists karaoke_session_entries_session_date_idx
  on public.karaoke_session_entries (session_id, queued_at desc);

create index if not exists karaoke_session_entries_performed_idx
  on public.karaoke_session_entries (session_id, result, performed_at desc);

alter table public.karaoke_sessions enable row level security;
alter table public.karaoke_session_entries enable row level security;

revoke all on table public.karaoke_sessions, public.karaoke_session_entries
  from public, anon, authenticated;
grant all on table public.karaoke_sessions, public.karaoke_session_entries
  to service_role;

-- Keep pre-archive completed queue records available as one undated legacy collection.
-- Their exact performance times and individual evening boundaries cannot be reconstructed.
do $$
declare
  v_legacy_session_id uuid;
begin
  if exists (
    select 1 from public.queue_entries where status = 'done'
  ) then
    insert into public.karaoke_sessions (is_legacy)
    values (true)
    returning id into v_legacy_session_id;

    insert into public.karaoke_session_entries (
      session_id, queue_entry_id, nickname, discord_id, song, song_artist,
      song_url, song_cover, queue_type, result, queued_at, performed_at
    )
    select
      v_legacy_session_id, id, nickname, discord_id, song, song_artist,
      song_url, song_cover, queue_type, 'performed', created_at, null
    from public.queue_entries
    where status = 'done';
  end if;
end;
$$;

-- A session must now be started explicitly by the host. Keep the public page paused
-- until the first session is deliberately opened.
update public.karaoke_settings
set is_active = false, updated_at = now()
where id = 'main';

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
  v_entry public.queue_entries%rowtype;
  v_session_id uuid;
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

  insert into public.queue_entries (
    nickname, discord_id, song, song_artist, song_url, song_cover,
    queue_type, status, position
  )
  values (
    btrim(p_nickname), p_discord_id, p_song, p_song_artist, p_song_url,
    p_song_cover, p_queue_type, 'waiting', v_position
  )
  returning * into v_entry;

  select id into v_session_id
    from public.karaoke_sessions
    where ended_at is null and not is_legacy
    limit 1;

  if v_session_id is not null then
    insert into public.karaoke_session_entries (
      session_id, queue_entry_id, nickname, discord_id, song, song_artist,
      song_url, song_cover, queue_type, result, queued_at
    )
    values (
      v_session_id, v_entry.id, v_entry.nickname, v_entry.discord_id,
      v_entry.song, v_entry.song_artist, v_entry.song_url, v_entry.song_cover,
      v_entry.queue_type, 'pending', v_entry.created_at
    );
  end if;

  return next v_entry;
  return;
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
  v_session_id uuid;
begin
  perform pg_advisory_xact_lock(582347983421::bigint);

  select id into v_session_id
    from public.karaoke_sessions
    where ended_at is null and not is_legacy
    limit 1;

  if v_session_id is null then
    raise exception using message = 'KARAOKE_SESSION_MISSING';
  end if;

  if not coalesce(
    (select is_active from public.karaoke_settings where id = 'main'),
    false
  ) then
    raise exception using message = 'KARAOKE_INACTIVE';
  end if;

  update public.karaoke_session_entries se
    set result = 'performed',
        performed_at = now()
    from public.queue_entries qe
    where se.session_id = v_session_id
      and se.queue_entry_id = qe.id
      and qe.status = 'singing'
      and se.result = 'pending';

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

create or replace function public.queue_remove_entry(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(582347983421::bigint);

  update public.karaoke_session_entries se
    set result = 'not_performed'
    from public.queue_entries qe
    where se.queue_entry_id = qe.id
      and qe.id = p_id
      and se.result = 'pending';

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

  update public.karaoke_session_entries
    set result = 'not_performed'
    where result = 'pending'
      and session_id in (
        select id
        from public.karaoke_sessions
        where ended_at is null and not is_legacy
      );

  delete from public.queue_entries;
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

  if p_is_active and not exists (
    select 1
    from public.karaoke_sessions
    where ended_at is null and not is_legacy
  ) then
    raise exception using message = 'KARAOKE_SESSION_MISSING';
  end if;

  update public.karaoke_settings
    set is_active = p_is_active,
        updated_at = now()
    where id = 'main';

  if not found then
    raise exception 'KARAOKE_SETTINGS_MISSING';
  end if;
end;
$$;

create or replace function public.queue_start_session()
returns setof public.karaoke_sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  perform pg_advisory_xact_lock(582347983421::bigint);

  if exists (
    select 1
    from public.karaoke_sessions
    where ended_at is null and not is_legacy
  ) then
    raise exception using message = 'KARAOKE_SESSION_ALREADY_OPEN';
  end if;

  insert into public.karaoke_sessions (started_at)
  values (now())
  returning id into v_session_id;

  -- Anything prepared before the official start belongs to this evening.
  insert into public.karaoke_session_entries (
    session_id, queue_entry_id, nickname, discord_id, song, song_artist,
    song_url, song_cover, queue_type, result, queued_at
  )
  select
    v_session_id, id, nickname, discord_id, song, song_artist,
    song_url, song_cover, queue_type, 'pending', created_at
  from public.queue_entries
  where status in ('waiting', 'singing');

  -- Completed rows from before the archive rollout were imported above.
  delete from public.queue_entries where status = 'done';

  update public.karaoke_settings
    set is_active = true,
        updated_at = now()
    where id = 'main';

  if not found then
    raise exception 'KARAOKE_SETTINGS_MISSING';
  end if;

  return query
    select *
    from public.karaoke_sessions
    where id = v_session_id;
end;
$$;

create or replace function public.queue_finish_session()
returns setof public.karaoke_sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  perform pg_advisory_xact_lock(582347983421::bigint);

  select id into v_session_id
    from public.karaoke_sessions
    where ended_at is null and not is_legacy
    limit 1
    for update;

  if v_session_id is null then
    raise exception using message = 'KARAOKE_SESSION_MISSING';
  end if;

  -- The current singer and everyone still waiting are retained, but not counted
  -- as completed performances.
  update public.karaoke_session_entries
    set result = 'not_performed'
    where session_id = v_session_id
      and result = 'pending';

  update public.karaoke_sessions
    set ended_at = now()
    where id = v_session_id;

  update public.karaoke_settings
    set is_active = false,
        updated_at = now()
    where id = 'main';

  delete from public.queue_entries;

  return query
    select *
    from public.karaoke_sessions
    where id = v_session_id;
end;
$$;

revoke all on function public.queue_start_session() from public, anon, authenticated;
revoke all on function public.queue_finish_session() from public, anon, authenticated;
revoke all on function public.queue_add_entry(text, text, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.queue_call_next() from public, anon, authenticated;
revoke all on function public.queue_remove_entry(uuid) from public, anon, authenticated;
revoke all on function public.queue_clear_all() from public, anon, authenticated;
revoke all on function public.queue_set_karaoke_active(boolean) from public, anon, authenticated;

grant execute on function public.queue_start_session() to service_role;
grant execute on function public.queue_finish_session() to service_role;
grant execute on function public.queue_add_entry(text, text, text, text, text, text, text)
  to service_role;
grant execute on function public.queue_call_next() to service_role;
grant execute on function public.queue_remove_entry(uuid) to service_role;
grant execute on function public.queue_clear_all() to service_role;
grant execute on function public.queue_set_karaoke_active(boolean) to service_role;
