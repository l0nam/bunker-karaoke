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

// Следующая позиция в конце очереди
async function nextPosition(queue: QueueType): Promise<number> {
  const { data, error } = await createServerClient()
    .from(TABLE)
    .select("position")
    .eq("queue_type", queue)
    .in("status", [...ACTIVE_STATUSES])
    .order("position", { ascending: false })
    .limit(1);

  check(error);
  return (data?.[0]?.position ?? 0) + 1;
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
  const position = await nextPosition(input.queue_type);

  const { data, error } = await createServerClient()
    .from(TABLE)
    .insert({
      nickname,
      discord_id: discordId,
      song,
      song_artist: artist,
      song_url: songUrl,
      song_cover: songCover,
      queue_type: input.queue_type,
      position,
    })
    .select()
    .single();

  check(error);
  return data as QueueEntry;
}

// Текущий исполнитель уходит в "done", следующим становится первый из основной очереди,
// и только если она пуста, — из повторной.
export async function callNext(): Promise<QueueEntry | null> {
  const supabase = createServerClient();

  const { error: finishError } = await supabase
    .from(TABLE)
    .update({ status: "done" })
    .eq("status", "singing");
  check(finishError);

  for (const queue of ["main", "repeat"] as const) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("queue_type", queue)
      .eq("status", "waiting")
      .order("position", { ascending: true })
      .limit(1);
    check(error);

    const candidate = data?.[0];
    if (candidate) {
      const { data: singer, error: updateError } = await supabase
        .from(TABLE)
        .update({ status: "singing" })
        .eq("id", candidate.id)
        .select()
        .single();
      check(updateError);
      return singer as QueueEntry;
    }
  }

  return null;
}

// Сдвиг записи вверх или вниз внутри её очереди: меняем position местами с соседом.
export async function shiftEntry(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const supabase = createServerClient();

  const { data: current, error: currentError } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();
  check(currentError);
  const entry = current as QueueEntry;

  const isUp = direction === "up";
  const { data: neighbour, error: neighbourError } = await supabase
    .from(TABLE)
    .select("*")
    .eq("queue_type", entry.queue_type)
    .eq("status", "waiting")
    .filter("position", isUp ? "lt" : "gt", entry.position)
    .order("position", { ascending: !isUp })
    .limit(1);
  check(neighbourError);

  const other = neighbour?.[0] as QueueEntry | undefined;
  if (!other) return; // уже крайний в очереди

  const { error: e1 } = await supabase
    .from(TABLE)
    .update({ position: other.position })
    .eq("id", entry.id);
  check(e1);
  const { error: e2 } = await supabase
    .from(TABLE)
    .update({ position: entry.position })
    .eq("id", other.id);
  check(e2);
}

export async function moveEntry(id: string, to: QueueType): Promise<void> {
  const position = await nextPosition(to);
  const { error } = await createServerClient()
    .from(TABLE)
    .update({ queue_type: to, position })
    .eq("id", id);
  check(error);
}

export async function removeEntry(id: string): Promise<void> {
  const { error } = await createServerClient()
    .from(TABLE)
    .delete()
    .eq("id", id);
  check(error);
}

// Полная очистка (новый вечер). Фильтр нужен, потому что без него Supabase не даёт удалить.
export async function clearAll(): Promise<void> {
  const { error } = await createServerClient()
    .from(TABLE)
    .delete()
    .not("id", "is", null);
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
