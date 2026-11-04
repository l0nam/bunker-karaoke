"use client";

import type { ReactNode } from "react";
import type { QueueEntry } from "@/types/queue";
import { songLabel } from "@/lib/song";
import { MusicNotesSimpleIcon } from "@phosphor-icons/react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { TrackCover } from "../TrackCover";

interface Props {
  entry: QueueEntry;
  index?: number;
  numberless?: boolean;
  actions?: ReactNode;
}

export function QueueRow({ entry, index, numberless = false, actions }: Props) {
  return (
    <Item variant="outline" className="min-w-0 select-none">
      <ItemMedia className="shrink-0 text-muted-foreground">
        {numberless ? (
          entry.song_cover ? (
            <TrackCover
              src={entry.song_cover}
              className="size-14! rounded-md!"
            />
          ) : (
            <MusicNotesSimpleIcon className="size-5" weight="bold" />
          )
        ) : (
          index
        )}
      </ItemMedia>

      <ItemContent className="min-w-0">
        <ItemHeader className="flex min-w-0 flex-col items-start gap-1">
          <ItemTitle className={numberless ? "text-lg" : ""}>
            <span className="block truncate">{entry.nickname}</span>
          </ItemTitle>

          {songLabel(entry) && (
            <ItemDescription className="flex min-w-0 items-center gap-2 text-xs">
              <MusicNotesSimpleIcon className="size-3 shrink-0" weight="bold" />
              <span className="truncate">{songLabel(entry)}</span>
            </ItemDescription>
          )}
        </ItemHeader>
      </ItemContent>

      {actions && <ItemActions className="shrink-0">{actions}</ItemActions>}
    </Item>
  );
}
