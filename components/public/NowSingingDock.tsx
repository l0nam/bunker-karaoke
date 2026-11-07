"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  MicrophoneStageIcon,
  MusicNotesSimpleIcon,
} from "@phosphor-icons/react";
import { useQueue } from "@/hooks/useQueue";
import { songLabel } from "@/lib/song";
import { Card, CardContent } from "@/components/ui/card";

function NowSingingDockContent() {
  const { singing, session, isActive, loading } = useQueue();

  if (loading || !session || !isActive) return null;

  return (
    <div className="now-singing-dock pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]">
      <Card
        size="sm"
        className="pointer-events-auto w-full max-w-md border-border/80 bg-card/95 shadow-md backdrop-blur"
      >
        <CardContent className="flex flex-row items-center gap-3 py-2.5">
          {singing?.song_cover ? (
            <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
              <Image
                src={singing.song_cover}
                alt={singing.song || "Обложка текущего трека"}
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <MusicNotesSimpleIcon className="size-5" weight="duotone" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-medium leading-none text-muted-foreground">
              <MicrophoneStageIcon className="size-3.5" weight="bold" />
              Сейчас поёт
            </p>

            {singing ? (
              <>
                <p className="mt-1 truncate text-sm font-semibold">
                  {singing.nickname}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {songLabel(singing) || "Песня не указана"}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm font-medium">Пока никто не поёт</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function NowSingingDock() {
  const pathname = usePathname();

  if (
    pathname === "/" ||
    pathname === "/host" ||
    pathname.startsWith("/host/")
  ) {
    return null;
  }

  return <NowSingingDockContent />;
}
