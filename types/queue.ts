export type QueueType = "main" | "repeat";
export type EntryStatus = "waiting" | "singing" | "done";

export interface QueueEntry {
  id: string;
  nickname: string;
  discord_id: string | null;
  // Название песни. Исполнитель, ссылка и обложка заполнены, только если трек выбран из подсказок.
  song: string | null;
  song_artist: string | null;
  song_url: string | null;
  song_cover: string | null;
  queue_type: QueueType;
  status: EntryStatus;
  position: number;
  created_at: string;
}

export interface NewEntryInput {
  nickname: string;
  discord_id?: string | null;
  song?: string | null;
  song_artist?: string | null;
  song_url?: string | null;
  song_cover?: string | null;
  queue_type: QueueType;
}

export interface KaraokeSessionSummary {
  id: string;
  started_at: string;
}

// Трек из поиска (Deezer или iTunes)
export interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string | null;
  url: string;
  source: "deezer" | "itunes";
}

// Ответ GET /api/queue
export interface QueueSnapshot {
  // Ожидающие и текущий исполнитель
  active: QueueEntry[];
  // Ники тех, кто уже выступил в текущем вечере (в нижнем регистре).
  history: string[];
  // Включено ли караоке сейчас.
  isActive: boolean;
  // Текущий вечер; null, если ведущий ещё не начал мероприятие.
  session: KaraokeSessionSummary | null;
}
