import { songLabel } from "@/lib/song";
import type { QueueEntry } from "@/types/queue";

// Лимит Discord — 2000 символов. Оставляем запас на подпись "(1/2)".
export const DISCORD_CHUNK_LIMIT = 1900;

type Person = Pick<QueueEntry, "nickname" | "discord_id">;
type Song = Pick<QueueEntry, "song" | "song_artist">;

// Пинг работает только через <@ID>. Ник без ID просто выделяем жирным.
export function mention(person: Person): string {
  const id = person.discord_id?.trim();
  return id ? `<@${id}>` : `**${person.nickname}**`;
}

function songSuffix(entry: Song): string {
  const label = songLabel(entry);
  return label ? ` — ${label}` : "";
}

export function buildQueueMessages(
  mainQueue: QueueEntry[],
  repeatQueue: QueueEntry[],
  singing: QueueEntry | null,
): string[] {
  const lines: string[] = ["🎤 **Очередь караоке**", ""];

  if (singing) {
    lines.push(
      `🎶 **Сейчас поёт:** ${mention(singing)}${songSuffix(singing)}`,
      "",
    );
  }

  lines.push("**Основная очередь**");
  if (mainQueue.length === 0) {
    lines.push("_пусто_");
  } else {
    mainQueue.forEach((e, i) =>
      lines.push(`${i + 1}. ${mention(e)}${songSuffix(e)}`),
    );
  }

  lines.push("", "**Повторные участники**");
  if (repeatQueue.length === 0) {
    lines.push("_пусто_");
  } else {
    repeatQueue.forEach((e, i) =>
      lines.push(`${i + 1}. ${mention(e)}${songSuffix(e)}`),
    );
  }

  lines.push(
    "",
    "Чтобы записаться: ПКМ по моему нику -> Упомянуть. По желанию можно указать название трека, который вы будете петь.",
  );

  // Режем по строкам, чтобы не разрывать одного человека посередине
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > DISCORD_CHUNK_LIMIT && current) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  if (chunks.length === 1) return chunks;
  return chunks.map((chunk, i) => `${chunk}\n\n_(${i + 1}/${chunks.length})_`);
}
