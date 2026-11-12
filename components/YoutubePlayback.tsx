"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { youtubeWatchUrl } from "@/lib/youtube";

interface Props {
  videoId: string;
  title?: string | null;
  artist?: string | null;
  className?: string;
}

export function YoutubePlayback({
  videoId,
  title,
  artist,
  className,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const trackLabel = [artist?.trim(), title?.trim()].filter(Boolean).join(" — ");

  return (
    <div className={cn("w-full min-w-0", className)}>
      {isOpen ? (
        <div className="space-y-2">
          <iframe
            className="block aspect-video min-h-[200px] min-w-[200px] w-full rounded-xl border bg-black"
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&controls=1&rel=0&playsinline=1`}
            title={`YouTube-плеер: ${trackLabel || "музыкальное видео"}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              Свернуть плеер
            </Button>
            <Link
              href={youtubeWatchUrl(videoId)}
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
              className="text-xs font-medium text-primary underline underline-offset-4"
            >
              Открыть на YouTube
            </Link>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsOpen(true)}
        >
          Слушать на сайте
        </Button>
      )}
    </div>
  );
}
