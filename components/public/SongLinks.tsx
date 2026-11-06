import { MagnifyingGlassIcon, TextAaIcon } from "@phosphor-icons/react";
import { songLabel, yandexMusicSearchUrl } from "@/lib/song";
import type { QueueEntry } from "@/types/queue";
import Link from "next/link";
import { buttonVariants } from "../ui/button";

interface Props {
  entry: Pick<QueueEntry, "song" | "song_artist">;
  compact?: boolean;
}

function geniusSearchUrl(label: string): string {
  return `https://genius.com/search?q=${encodeURIComponent(label)}`;
}

export function SongLinks({ entry, compact = false }: Props) {
  const label = songLabel(entry);
  if (!label) return null;

  const size = compact ? "icon-sm" : "sm";

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Link
        href={geniusSearchUrl(label)}
        target="_blank"
        rel="noopener noreferrer"
        title="Найти текст на Genius"
        aria-label={`Найти текст песни на Genius: ${label}`}
        className={buttonVariants({ variant: "outline", size })}
      >
        <TextAaIcon weight="bold" />
        {!compact && "Текст"}
      </Link>

      <Link
        href={yandexMusicSearchUrl(label)}
        target="_blank"
        rel="noopener noreferrer"
        title="Найти в Яндекс Музыке"
        aria-label={`Найти в Яндекс Музыке: ${label}`}
        className={buttonVariants({ variant: "outline", size })}
      >
        <MagnifyingGlassIcon weight="bold" />
        {!compact && "Яндекс Музыка"}
      </Link>
    </div>
  );
}
