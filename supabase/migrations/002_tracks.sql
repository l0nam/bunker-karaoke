-- Данные о треке, выбранном из подсказок (необязательные).
-- song остаётся названием, а исполнитель, ссылка и обложка лежат отдельно.

alter table public.queue_entries
  add column if not exists song_artist text,
  add column if not exists song_url    text,
  add column if not exists song_cover  text;
