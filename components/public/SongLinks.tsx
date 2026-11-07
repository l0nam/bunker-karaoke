import { songLabel, yandexMusicSearchUrl } from "@/lib/song";
import type { QueueEntry } from "@/types/queue";
import Link from "next/link";
import { buttonVariants } from "../ui/button";
import Image from "next/image";
import { cn } from "cn";

interface Props {
  entry: Pick<QueueEntry, "song" | "song_artist">;
  compact?: boolean;
}

function geniusLyricsUrl(entry: Props["entry"]): string {
  const params = new URLSearchParams({
    title: entry.song?.trim() ?? "",
    redirect: "1",
  });
  const artist = entry.song_artist?.trim();

  if (artist) params.set("artist", artist);

  return `/api/search-lyrics?${params.toString()}`;
}

export function SongLinks({ entry, compact = false }: Props) {
  const label = songLabel(entry);
  if (!label) return null;

  const size = compact ? "icon-sm" : "sm";

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Link
        href={geniusLyricsUrl(entry)}
        target="_blank"
        rel="noopener noreferrer"
        prefetch={false}
        title="Найти текст на Genius"
        aria-label={`Найти текст песни на Genius: ${label}`}
        className={cn("gap-2!", buttonVariants({ variant: "outline", size }))}
      >
        <span
          className="size-4 bg-current text-foreground"
          style={{
            maskImage: "url('/logos/genius.svg')",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            maskSize: "contain",
          }}
        />
        {!compact && "Текст на Genius"}
      </Link>

      <Link
        href={yandexMusicSearchUrl(label)}
        target="_blank"
        rel="noopener noreferrer"
        title="Найти в Яндекс Музыке"
        aria-label={`Найти в Яндекс Музыке: ${label}`}
        className={cn("gap-2!", buttonVariants({ variant: "outline", size }))}
      >
        <span
          className="size-4 bg-current text-foreground"
          style={{
            maskImage: "url('/logos/yandex-music.svg')",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            maskSize: "contain",
          }}
        />
        {!compact && "Яндекс Музыка"}
      </Link>
    </div>
  );
}
