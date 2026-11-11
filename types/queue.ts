export type QueueType = "main" | "repeat";
export type QueueChoice = QueueType | "auto";
export type EntryStatus = "waiting" | "singing" | "done";

export interface QueueEntry {
  id: string;
  nickname: string;
  discord_id: string | null;
  song: string | null;
  song_artist: string | null;
  song_url: string | null;
  song_cover: string | null;
  song_genre?: string | null;
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
  song_genre?: string | null;
  song_source?: Track["source"] | null;
  song_album_id?: string | null;
  queue_type: QueueChoice;
}

export interface KaraokeSessionSummary {
  id: string;
  started_at: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string | null;
  url: string;
  source: "deezer" | "itunes";
  genre?: string | null;
  albumId?: string | null;
}

export interface QueueSnapshot {
  active: QueueEntry[];
  history: string[];
  isActive: boolean;
  session: KaraokeSessionSummary | null;
}
