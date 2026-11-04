import { MagnifyingGlassIcon, PlayIcon } from "@phosphor-icons/react";
import { songLabel, yandexMusicSearchUrl } from "@/lib/song";
import type { QueueEntry } from "@/types/queue";
import Link from "next/link";
import { cn } from "cn";
import { buttonVariants } from "../ui/button";

interface Props {
  entry: Pick<QueueEntry, "song" | "song_artist" | "song_url">;
  compact?: boolean;
}

export function SongLinks({ entry, compact = false }: Props) {
  const label = songLabel(entry);
  if (!label) return null;

  const size = compact ? "icon-sm" : "sm";

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {entry.song_url && (
        <Link
          href={entry.song_url}
          target="_blank"
          rel="noopener noreferrer"
          title="Слушать трек"
          aria-label={`Слушать: ${label}`}
          className={cn(buttonVariants({ size: size, variant: "outline" }))}
        >
          <PlayIcon weight="fill" />
          {!compact && "Слушать"}
        </Link>
      )}

      <Link
        href={yandexMusicSearchUrl(label)}
        target="_blank"
        rel="noopener noreferrer"
        title="Найти в Яндекс Музыке"
        aria-label={`Найти в Яндекс Музыке: ${label}`}
        className={buttonVariants({ variant: "outline", size: size })}
      >
        <MagnifyingGlassIcon weight="bold" />
        {!compact && "Яндекс Музыка"}
      </Link>
    </div>
  );
}
