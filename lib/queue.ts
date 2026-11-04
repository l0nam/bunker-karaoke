import { ValidationError } from "@/lib/errors";
import { createServerClient } from "@/lib/supabase/server";
import type {
  NewEntryInput,
  QueueEntry,
  QueueSnapshot,
  QueueType,
} from "@/types/queue";

// Все функции вызываются только на сервере после проверки сессии ведущего.

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

// Ссылки на трек и обложку попадают на публичную страницу, поэтому принимаем только https
// и только с адресов музыкальных сервисов, которые мы сами подключили.
const LINK_HOSTS = ["deezer.com", "apple.com"];
const COVER_HOSTS = ["dzcdn.net", "mzstatic.com"];

function safeHttpsUrl(
  value: string | null | undefined,
  hosts: string[],
): string | null {
  const raw = value?.trim();
  if (!raw || raw.length > 500) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const allowed = hosts.some(
      (h) => url.hostname === h || url.hostname.endsWith(`.${h}`),
    );
    return allowed ? url.toString() : null;
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

  const { data: done, error: doneError } = await supabase
    .from(TABLE)
    .select("nickname")
    .eq("status", "done");
  check(doneError);

  const history = [
    ...new Set((done ?? []).map((row) => row.nickname.toLowerCase())),
  ];
  return { active: (active ?? []) as QueueEntry[], history };
}

export async function addEntry(input: NewEntryInput): Promise<QueueEntry> {
  const nickname = input.nickname.trim();
  if (!nickname) throw new ValidationError("Ник не может быть пустым");
  if (nickname.length > 40) throw new ValidationError("Ник слишком длинный");

  const discordId = cleanOrNull(input.discord_id);
  if (discordId && !DISCORD_ID.test(discordId)) {
    throw new ValidationError("Discord ID — это число из 15–25 цифр");
  }

  // Исполнитель, ссылка и обложка имеют смысл только вместе с названием
  const song = cleanOrNull(input.song)?.slice(0, 120) ?? null;
  const artist = song
    ? (cleanOrNull(input.song_artist)?.slice(0, 120) ?? null)
    : null;
  const songUrl = song ? safeHttpsUrl(input.song_url, LINK_HOSTS) : null;
  const songCover = song ? safeHttpsUrl(input.song_cover, COVER_HOSTS) : null;

  await rememberParticipant(nickname, discordId);

  const { data, error } = await createServerClient().rpc("queue_add_entry", {
    p_nickname: nickname,
    p_discord_id: discordId,
    p_song: song,
    p_song_artist: artist,
    p_song_url: songUrl,
    p_song_cover: songCover,
    p_queue_type: input.queue_type,
  });

  check(error);
  const entry = Array.isArray(data) ? data[0] : data;
  if (!entry) throw new Error("Не удалось добавить запись в очередь");
  return entry as QueueEntry;
}

// Текущий исполнитель уходит в "done", следующим становится первый из основной очереди,
// и только если она пуста, — из повторной.
export async function callNext(): Promise<QueueEntry | null> {
  const { data, error } = await createServerClient().rpc("queue_call_next");
  check(error);

  const entry = Array.isArray(data) ? data[0] : data;
  return (entry ?? null) as QueueEntry | null;
}

// Сдвиг записи вверх или вниз внутри её очереди: меняем position местами с соседом.
export async function shiftEntry(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const { error } = await createServerClient().rpc("queue_shift_entry", {
    p_id: id,
    p_direction: direction,
  });
  check(error);
}

export async function moveEntry(id: string, to: QueueType): Promise<void> {
  const { error } = await createServerClient().rpc("queue_move_entry", {
    p_id: id,
    p_to_queue: to,
  });
  check(error);
}

export async function removeEntry(id: string): Promise<void> {
  const { error } = await createServerClient().rpc("queue_remove_entry", {
    p_id: id,
  });
  check(error);
}

// Полная очистка очереди и истории текущего вечера.
export async function clearAll(): Promise<void> {
  const { error } = await createServerClient().rpc("queue_clear_all");
  check(error);
}

export async function rememberParticipant(
  nicknameInput: string,
  discordIdInput?: string | null,
): Promise<void> {
  const nickname = nicknameInput.trim();

  if (!nickname) {
    throw new ValidationError("Ник не может быть пустым");
  }

  if (nickname.length > 40) {
    throw new ValidationError("Ник слишком длинный");
  }

  const discordId = cleanOrNull(discordIdInput);

  if (discordId && !DISCORD_ID.test(discordId)) {
    throw new ValidationError("Discord ID — это число из 15–25 цифр");
  }

  const { error } = await createServerClient().rpc("upsert_participant", {
    p_nickname: nickname,
    p_discord_id: discordId,
  });

  check(error);
}
