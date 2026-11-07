-- Store the provider genre for each queued song.
-- Deezer genres are resolved server-side from the selected track's album.
alter table public.queue_entries
  add column if not exists song_genre text;

-- Replace the queue insert RPC with a genre-aware signature.
drop function if exists public.queue_add_entry(
  text, text, text, text, text, text, text
);

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
    song_genre, queue_type, status, position
  )
  values (
    btrim(p_nickname), p_discord_id, p_song, p_song_artist, p_song_url,
    p_song_cover, nullif(btrim(p_song_genre), ''), p_queue_type,
    'waiting', v_position
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

revoke all on function public.queue_add_entry(
  text, text, text, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.queue_add_entry(
  text, text, text, text, text, text, text, text
) to service_role;
