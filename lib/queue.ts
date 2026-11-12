import { ValidationError } from "@/lib/errors";
import { resolveTrackGenre } from "@/lib/tracks";
import { parseYouTubeVideoId } from "@/lib/youtube";
import { createServerClient } from "@/lib/supabase/server";
import type {
  NewEntryInput,
  QueueEntry,
  QueueSnapshot,
  QueueType,
} from "@/types/queue";

const TABLE = "queue_entries";
const ACTIVE_STATUSES = ["waiting", "singing"] as const;
const DISCORD_ID = /^\d{15,25}$/;

function check(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function cleanOrNull(value?: string | null): string | null {
  const v = value?.trim();
  return v ? v : null;
}

const LINK_HOSTS = ["deezer.com", "apple.com"];
const COVER_HOSTS = ["dzcdn.net", "mzstatic.com"];

function safeHttpsUrl(value: string | null | undefined, hosts: string[]): string | null {
  const raw = value?.trim();
  if (!raw || raw.length > 500) return null;
  try {
    const url = new URL(raw);
    const allowed = hosts.some((h) => url.hostname === h || url.hostname.endsWith("." + h));
    return url.protocol === "https:" && allowed ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function fetchQueue(): Promise<QueueSnapshot> {
  const supabase = createServerClient();
  const { data: active, error: activeError } = await supabase
    .from(TABLE)
    .select("*")
    .in("status", [...ACTIVE_STATUSES])
    .order("position", { ascending: true });
  check(activeError);

  const { data: session, error: sessionError } = await supabase
    .from("karaoke_sessions")
    .select("id, started_at")
    .eq("is_legacy", false)
    .is("ended_at", null)
    .maybeSingle();
  check(sessionError);

  let history: string[] = [];
  if (session) {
    const { data: performed, error: performedError } = await supabase
      .from("karaoke_session_entries")
      .select("nickname")
      .eq("session_id", session.id)
      .eq("result", "performed");
    check(performedError);
    history = [...new Set((performed ?? []).map((row) => row.nickname.toLowerCase()))];
  }

  const { data: settings, error: settingsError } = await supabase
    .from("karaoke_settings")
    .select("is_active")
    .eq("id", "main")
    .single();
  check(settingsError);
  if (!settings) throw new Error("Настройки караоке не найдены");

  return {
    active: (active ?? []) as QueueEntry[],
    history,
    isActive: settings.is_active,
    session: session ? { id: session.id, started_at: session.started_at } : null,
  };
}

export async function setKaraokeStatus(isActive: boolean): Promise<void> {
  const { error } = await createServerClient().rpc("queue_set_karaoke_active", { p_is_active: isActive });
  if (error?.message === "KARAOKE_SESSION_MISSING") throw new ValidationError("Сначала начните новый вечер.");
  check(error);
}

export async function startKaraokeSession(): Promise<void> {
  const { error } = await createServerClient().rpc("queue_start_session");
  if (error?.message === "KARAOKE_SESSION_ALREADY_OPEN") throw new ValidationError("Вечер уже начат.");
  check(error);
}

export async function finishKaraokeSession(): Promise<void> {
  const { error } = await createServerClient().rpc("queue_finish_session");
  if (error?.message === "KARAOKE_SESSION_MISSING") throw new ValidationError("Нет открытого вечера.");
  check(error);
}

export async function addEntry(input: NewEntryInput): Promise<QueueEntry> {
  const nickname = input.nickname.trim();
  if (!nickname) throw new ValidationError("Ник не может быть пустым");
  if (nickname.length > 40) throw new ValidationError("Ник слишком длинный");

  const discordId = cleanOrNull(input.discord_id);
  if (discordId && !DISCORD_ID.test(discordId)) throw new ValidationError("Discord ID — это число из 15–25 цифр");

  const song = cleanOrNull(input.song)?.slice(0, 120) ?? null;
  const rawYouTubeId = cleanOrNull(input.song_youtube_id);
  if (rawYouTubeId && !song) throw new ValidationError("Сначала укажи название песни");
  const songYouTubeId = rawYouTubeId ? parseYouTubeVideoId(rawYouTubeId) : null;
  if (rawYouTubeId && !songYouTubeId) {
    throw new ValidationError("Вставь корректную ссылку на видео YouTube");
  }
  const artist = song ? cleanOrNull(input.song_artist)?.slice(0, 120) ?? null : null;
  const songUrl = song ? safeHttpsUrl(input.song_url, LINK_HOSTS) : null;
  const songCover = song ? safeHttpsUrl(input.song_cover, COVER_HOSTS) : null;
  const providedGenre = song ? cleanOrNull(input.song_genre)?.slice(0, 100) ?? null : null;
  const songGenre = providedGenre ?? (song ? await resolveTrackGenre(input.song_source, input.song_album_id) : null);

  const { data, error } = await createServerClient().rpc("queue_add_entry", {
    p_nickname: nickname,
    p_discord_id: discordId,
    p_song: song,
    p_song_artist: artist,
    p_song_url: songUrl,
    p_song_cover: songCover,
    p_queue_type: input.queue_type,
    p_song_genre: songGenre,
    p_song_youtube_id: songYouTubeId,
  });
  check(error);
  const entry = Array.isArray(data) ? data[0] : data;
  if (!entry) throw new Error("Не удалось добавить запись в очередь");
  return entry as QueueEntry;
}

export async function addEntriesBulk(nicknames: string[]): Promise<QueueEntry[]> {
  if (nicknames.length === 0) throw new ValidationError("Список участников пуст");
  if (nicknames.length > 100) throw new ValidationError("За один раз можно добавить не более 100 участников");

  const cleaned = nicknames.map((name) => {
    const nickname = name.trim();
    if (!nickname || nickname.length > 40) {
      throw new ValidationError("Каждый ник должен содержать от 1 до 40 символов");
    }
    return nickname;
  });

  const { data, error } = await createServerClient().rpc("queue_add_entries", {
    p_nicknames: cleaned,
  });
  check(error);
  return (data ?? []) as QueueEntry[];
}

export async function callNext(): Promise<QueueEntry | null> {
  const { data, error } = await createServerClient().rpc("queue_call_next");
  if (error?.message === "KARAOKE_INACTIVE") throw new ValidationError("Караоке остановлено. Сначала запустите его.");
  if (error?.message === "KARAOKE_SESSION_MISSING") throw new ValidationError("Сначала начните новый вечер.");
  check(error);
  const entry = Array.isArray(data) ? data[0] : data;
  return (entry ?? null) as QueueEntry | null;
}

export async function shiftEntry(id: string, direction: "up" | "down"): Promise<void> {
  const { error } = await createServerClient().rpc("queue_shift_entry", { p_id: id, p_direction: direction });
  check(error);
}

export async function moveEntry(id: string, to: QueueType): Promise<void> {
  const { error } = await createServerClient().rpc("queue_move_entry", { p_id: id, p_to_queue: to });
  check(error);
}

export async function removeEntry(id: string): Promise<void> {
  const { error } = await createServerClient().rpc("queue_remove_entry", { p_id: id });
  check(error);
}

export async function clearAll(): Promise<void> {
  const { error } = await createServerClient().rpc("queue_clear_all");
  check(error);
}

export async function rememberParticipant(nicknameInput: string, discordIdInput?: string | null): Promise<void> {
  const nickname = nicknameInput.trim();
  if (!nickname) throw new ValidationError("Ник не может быть пустым");
  if (nickname.length > 40) throw new ValidationError("Ник слишком длинный");
  const discordId = cleanOrNull(discordIdInput);
  if (discordId && !DISCORD_ID.test(discordId)) throw new ValidationError("Discord ID — это число из 15–25 цифр");
  const { error } = await createServerClient().rpc("upsert_participant", {
    p_nickname: nickname,
    p_discord_id: discordId,
  });
  check(error);
}
