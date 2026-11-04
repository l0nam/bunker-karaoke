-- Таблица очереди караоке.
-- Записи в таблицу делаются только с сервера (service role key), поэтому
-- для браузера открыто только чтение. Realtime читает эту же политику.

create table if not exists public.queue_entries (
  id          uuid primary key default gen_random_uuid(),
  nickname    text not null,
  discord_id  text,                       -- числовой ID для пинга <@ID>, может быть пустым
  song        text,
  queue_type  text not null check (queue_type in ('main', 'repeat')),
  status      text not null default 'waiting' check (status in ('waiting', 'singing', 'done')),
  position    integer not null,           -- порядок внутри своей очереди
  created_at  timestamptz not null default now()
);

alter table public.queue_entries enable row level security;

-- Все могут читать очередь (публичная страница и панель ведущего)
create policy "queue is readable by everyone"
  on public.queue_entries
  for select
  to anon, authenticated
  using (true);

-- Включаем realtime для этой таблицы
alter publication supabase_realtime add table public.queue_entries;
