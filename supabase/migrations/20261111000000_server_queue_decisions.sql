-- Resolve automatic queue placement inside the same transaction as insertion.
-- Bulk imports are atomic: either every valid unique nickname is queued, or none is.

create or replace function public.queue_add_entry(
  p_nickname text,
  p_discord_id text,
  p_song text,
  p_song_artist text,
  p_song_url text,
  p_song_cover text,
  p_queue_type text,
  p_song_genre text
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
    song_genre, queue_type, status, position
  )
  values (
    btrim(p_nickname), nullif(btrim(p_discord_id), ''), p_song, p_song_artist,
    p_song_url, p_song_cover, nullif(btrim(p_song_genre), ''), v_queue_type,
    'waiting', v_position
  )
  returning * into v_entry;

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

create or replace function public.queue_add_entries(p_nicknames text[])
returns setof public.queue_entries
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_raw text;
  v_nickname text;
  v_key text;
  v_seen text[] := array[]::text[];
  v_queue_type text;
  v_position integer;
  v_session_id uuid;
  v_has_performed boolean;
  v_entry public.queue_entries%rowtype;
begin
  perform pg_advisory_xact_lock(582347983421::bigint);

  if p_nicknames is null or cardinality(p_nicknames) = 0 then
    raise exception 'Список участников пуст';
  end if;

  if cardinality(p_nicknames) > 100 then
    raise exception 'За один раз можно добавить не более 100 участников';
  end if;

  select id into v_session_id
    from public.karaoke_sessions
    where ended_at is null and not is_legacy
    limit 1;

  foreach v_raw in array p_nicknames loop
    v_nickname := btrim(coalesce(v_raw, ''));

    if v_nickname = '' or length(v_nickname) > 40 then
      raise exception 'Каждый ник должен содержать от 1 до 40 символов';
    end if;

    v_key := lower(v_nickname);
    if v_key = any(v_seen) then
      continue;
    end if;
    v_seen := array_append(v_seen, v_key);

    v_has_performed := false;
    if v_session_id is not null then
      select exists (
        select 1
        from public.karaoke_session_entries
        where session_id = v_session_id
          and result = 'performed'
          and lower(nickname) = v_key
      ) into v_has_performed;
    end if;

    v_queue_type := case when v_has_performed then 'repeat' else 'main' end;

    insert into public.participants (nickname, discord_id, nickname_key)
    values (v_nickname, null, v_key)
    on conflict (nickname_key) do update
      set nickname = excluded.nickname;

    select coalesce(max(position), 0) + 1
      into v_position
      from public.queue_entries
      where queue_type = v_queue_type
        and status in ('waiting', 'singing');

    insert into public.queue_entries (
      nickname, queue_type, status, position
    )
    values (v_nickname, v_queue_type, 'waiting', v_position)
    returning * into v_entry;

    if v_session_id is not null then
      insert into public.karaoke_session_entries (
        session_id, queue_entry_id, nickname, queue_type, result, queued_at
      )
      values (
        v_session_id, v_entry.id, v_entry.nickname, v_entry.queue_type,
        'pending', v_entry.created_at
      );
    end if;

    return next v_entry;
  end loop;

  return;
end;
$$;

revoke all on function public.queue_add_entry(text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.queue_add_entries(text[])
  from public, anon, authenticated;
grant execute on function public.queue_add_entry(text, text, text, text, text, text, text, text)
  to service_role;
grant execute on function public.queue_add_entries(text[])
  to service_role;
