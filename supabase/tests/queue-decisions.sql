-- PostgreSQL integration smoke test for queue RPCs.
-- Run after applying every migration in filename order.

do $$
declare
  entry public.queue_entries%rowtype;
  inserted_count integer;
begin
  select * into entry from public.queue_add_entry(
    'Preloaded.Video', null, 'Nightcall', 'Kavinsky', null, null, 'main', null, 'dQw4w9WgXcQ'
  );
  perform public.queue_start_session();

  if not exists (
    select 1 from public.karaoke_session_entries
    where queue_entry_id = entry.id and song_youtube_id = 'dQw4w9WgXcQ'
  ) then
    raise exception 'Expected prepared YouTube video to be copied into session history';
  end if;
  delete from public.queue_entries where id = entry.id;
  update public.karaoke_session_entries
    set result = 'not_performed'
    where queue_entry_id = entry.id;

  select * into entry from public.queue_add_entry(
    'Repeat.Me', null, 'Test track', 'Test artist', null, null, 'auto', null, 'M7lc1UVf-VE'
  );
  if entry.song_youtube_id <> 'M7lc1UVf-VE' then
    raise exception 'YouTube video ID was not stored on the queue entry';
  end if;
  if not exists (
    select 1 from public.karaoke_session_entries
    where queue_entry_id = entry.id and song_youtube_id = 'M7lc1UVf-VE'
  ) then
    raise exception 'YouTube video ID was not copied into session history';
  end if;
  if entry.queue_type <> 'main' then raise exception 'Expected first performance in main queue, got %', entry.queue_type; end if;

  -- First call starts the singer; second call archives the performance.
  select * into entry from public.queue_call_next();
  select * into entry from public.queue_call_next();

  select * into entry from public.queue_add_entry('repeat.me', null, null, null, null, null, 'auto', null);
  if entry.queue_type <> 'repeat' then raise exception 'Expected returning singer in repeat queue, got %', entry.queue_type; end if;

  select count(*) into inserted_count from public.queue_add_entries(array['fresh.one', 'fresh.two', 'FRESH.ONE', 'Repeat.Me']);
  if inserted_count <> 3 then raise exception 'Expected 3 unique bulk rows, got %', inserted_count; end if;

  -- A malformed row later in the batch must roll back earlier inserts.
  begin
    perform public.queue_add_entries(array['atomic.good', '']);
    raise exception 'Expected invalid bulk insert to fail';
  exception when others then
    if sqlerrm = 'Expected invalid bulk insert to fail' then raise; end if;
  end;
  if exists (select 1 from public.queue_entries where nickname = 'atomic.good') then
    raise exception 'Invalid bulk insert did not roll back atomically';
  end if;

  select * into entry from public.queue_call_next();
  if entry.nickname <> 'fresh.one' then raise exception 'Expected fresh.one first, got %', entry.nickname; end if;
  select * into entry from public.queue_call_next();
  if entry.nickname <> 'fresh.two' then raise exception 'Expected fresh.two second, got %', entry.nickname; end if;
  select * into entry from public.queue_call_next();
  if entry.nickname <> 'repeat.me' and entry.nickname <> 'Repeat.Me' then
    raise exception 'Expected returning singer after main queue, got %', entry.nickname;
  end if;

  perform public.queue_finish_session();
end;
$$;
