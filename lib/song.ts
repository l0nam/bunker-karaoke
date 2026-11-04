import type { QueueEntry, Track } from "@/types/queue";

type SongFields = Pick<QueueEntry, "song" | "song_artist">;

// "Исполнитель — Название" или просто название, если исполнитель неизвестен
export function songLabel(entry: SongFields): string | null {
  const title = entry.song?.trim();
  if (!title) return null;
  const artist = entry.song_artist?.trim();
  return artist ? `${artist} — ${title}` : title;
}

export function trackLabel(track: Pick<Track, "artist" | "title">): string {
  return `${track.artist} — ${track.title}`;
}

// У Яндекс Музыки нет публичного API, поэтому даём ссылку на поиск по названию
export function yandexMusicSearchUrl(label: string): string {
  return `https://music.yandex.ru/search?text=${encodeURIComponent(label)}`;
}
