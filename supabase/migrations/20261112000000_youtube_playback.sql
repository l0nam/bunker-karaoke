-- Store YouTube video IDs, never arbitrary iframe URLs or audio files.
-- Playback is embedded by the visitor's browser and does not pass through Vercel.

alter table public.queue_entries
  add column if not exists song_youtube_id text;

alter table public.karaoke_session_entries
  add column if not exists song_youtube_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'queue_entries_song_youtube_id_check'
      and conrelid = 'public.queue_entries'::regclass
  ) then
    alter table public.queue_entries
      add constraint queue_entries_song_youtube_id_check
      check (song_youtube_id is null or song_youtube_id ~ '^[A-Za-z0-9_-]{11}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'karaoke_session_entries_song_youtube_id_check'
      and conrelid = 'public.karaoke_session_entries'::regclass
  ) then
    alter table public.karaoke_session_entries
      add constraint karaoke_session_entries_song_youtube_id_check
      check (song_youtube_id is null or song_youtube_id ~ '^[A-Za-z0-9_-]{11}$');
  end if;
end;
$$;

-- Remove older overloads so PostgREST has one unambiguous queue-add RPC.
drop function if exists public.queue_add_entry(text, text, text, text, text, text, text, text);
drop function if exists public.queue_add_entry(text, text, text, text, text, text, text);

create or replace function public.queue_add_entry(
  p_nickname text,
  p_discord_id text,
  p_song text,
  p_song_artist text,
  p_song_url text,
  p_song_cover text,
  p_queue_type text,
  p_song_genre text,
  p_song_youtube_id text default null
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
  v_queue_type text;
  v_has_performed boolean := false;
begin
  perform pg_advisory_xact_lock(582347983421::bigint);

  if p_nickname is null or length(btrim(p_nickname)) = 0 or length(btrim(p_nickname)) > 40 then
    raise exception 'Некорректный никнейм';
  end if;

  if p_queue_type is null or p_queue_type not in ('auto', 'main', 'repeat') then
    raise exception 'Некорректный тип очереди';
  end if;

  if p_song_youtube_id is not null
     and p_song_youtube_id !~ '^[A-Za-z0-9_-]{11}$' then
    raise exception 'Некорректный идентификатор видео YouTube';
  end if;

  select id into v_session_id
    from public.karaoke_sessions
    where ended_at is null and not is_legacy
    limit 1;

  if p_queue_type = 'auto' then
    if v_session_id is not null then
      select exists (
        select 1
        from public.karaoke_session_entries
        where session_id = v_session_id
          and result = 'performed'
          and lower(nickname) = lower(btrim(p_nickname))
      ) into v_has_performed;
    end if;
    v_queue_type := case when v_has_performed then 'repeat' else 'main' end;
  else
    v_queue_type := p_queue_type;
  end if;

  insert into public.participants (nickname, discord_id, nickname_key)
  values (btrim(p_nickname), nullif(btrim(p_discord_id), ''), lower(btrim(p_nickname)))
  on conflict (nickname_key) do update
    set nickname = excluded.nickname,
        discord_id = coalesce(excluded.discord_id, participants.discord_id);

  select coalesce(max(position), 0) + 1
    into v_position
    from public.queue_entries
    where queue_type = v_queue_type
      and status in ('waiting', 'singing');

  insert into public.queue_entries (
    nickname, discord_id, song, song_artist, song_url, song_cover,
    song_genre, song_youtube_id, queue_type, status, position
  )
  values (
    btrim(p_nickname), nullif(btrim(p_discord_id), ''), p_song, p_song_artist,
    p_song_url, p_song_cover, nullif(btrim(p_song_genre), ''), p_song_youtube_id,
    v_queue_type, 'waiting', v_position
  )
  returning * into v_entry;

  if v_session_id is not null then
    insert into public.karaoke_session_entries (
      session_id, queue_entry_id, nickname, discord_id, song, song_artist,
      song_url, song_cover, song_youtube_id, queue_type, result, queued_at
    )
    values (
      v_session_id, v_entry.id, v_entry.nickname, v_entry.discord_id,
      v_entry.song, v_entry.song_artist, v_entry.song_url, v_entry.song_cover,
      v_entry.song_youtube_id, v_entry.queue_type, 'pending', v_entry.created_at
    );
  end if;

  return next v_entry;
  return;
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

  -- Prepared queue entries, including their YouTube IDs, belong to this session.
  insert into public.karaoke_session_entries (
    session_id, queue_entry_id, nickname, discord_id, song, song_artist,
    song_url, song_cover, song_youtube_id, queue_type, result, queued_at
  )
  select
    v_session_id, id, nickname, discord_id, song, song_artist,
    song_url, song_cover, song_youtube_id, queue_type, 'pending', created_at
  from public.queue_entries
  where status in ('waiting', 'singing');

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

revoke all on function public.queue_add_entry(text, text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.queue_add_entry(text, text, text, text, text, text, text, text, text)
  to service_role;

revoke all on function public.queue_start_session() from public, anon, authenticated;
grant execute on function public.queue_start_session() to service_role;
