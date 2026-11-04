"use client";

import { useState } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { CheckCircleIcon, MusicNotesSimpleIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { trackLabel } from "@/lib/song";
import type { Track } from "@/types/queue";
import { Spinner } from "../ui/spinner";
import { Input } from "../ui/input";
import { TrackCover } from "../TrackCover";

interface Props {
  value: string;
  onValueChange: (text: string) => void;
  track: Track | null;
  onTrackChange: (track: Track | null) => void;
}

const MIN_CHARS = 2;

async function searchTracks(query: string, signal: AbortSignal) {
  const data = await api<{ tracks: Track[] }>(
    `/api/tracks/search?q=${encodeURIComponent(query)}`,
    "GET",
    undefined,
    signal,
  );

  return data.tracks;
}

const SOURCE_NAMES: Record<Track["source"], string> = {
  deezer: "Deezer",
  itunes: "Apple Music",
};

export function SongAutocomplete({
  value,
  onValueChange,
  track,
  onTrackChange,
}: Props) {
  const [open, setOpen] = useState(false);

  const query = value.trim();
  const searchable = !track && query.length >= MIN_CHARS;
  const { items: suggestions, loading } = useDebouncedSearch<Track>({
    query,
    enabled: !track,
    minChars: MIN_CHARS,
    search: searchTracks,
  });

  function pick(item: Track) {
    onTrackChange(item);
    onValueChange(trackLabel(item));
    setOpen(false);
  }

  function handleInputChange(next: string, details: { reason: string }) {
    onValueChange(next);

    if (
      details.reason === "input-change" ||
      details.reason === "input-clear" ||
      details.reason === "clear-press"
    ) {
      onTrackChange(null);
      setOpen(next.trim().length >= MIN_CHARS);
    }
  }

  return (
    <div className="min-w-0 w-full">
      <Autocomplete.Root
        items={suggestions}
        value={value}
        mode="none"
        itemToStringValue={(item: Track) => trackLabel(item)}
        open={open && searchable}
        onOpenChange={setOpen}
        onValueChange={handleInputChange}
      >
        <div className="relative w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
            {track?.cover ? (
              <TrackCover src={track.cover} className="size-6! rounded!" />
            ) : (
              <MusicNotesSimpleIcon className="size-4.5" weight="bold" />
            )}
          </span>

          <Autocomplete.Input
            render={
              <Input
                placeholder="Начни вводить название песни..."
                className="h-10 w-full pl-11 pr-10"
              />
            }
          />

          {loading && searchable && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner className="size-4" />
            </span>
          )}
        </div>

        <Autocomplete.Portal>
          <Autocomplete.Positioner sideOffset={6} className="z-50 outline-none">
            <Autocomplete.Popup className="w-(--anchor-width) overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
              <Autocomplete.Empty className="flex items-center justify-center gap-2 px-3 py-4 text-center text-sm text-muted-foreground">
                {loading ? (
                  <>
                    <Spinner className="size-4" />
                    Ищем треки...
                  </>
                ) : (
                  "Трек не найден. Можешь оставить своё название."
                )}
              </Autocomplete.Empty>

              <Autocomplete.List className="max-h-80 overflow-y-auto">
                {(item: Track) => (
                  <Autocomplete.Item
                    key={item.id}
                    value={item}
                    onClick={() => pick(item)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 outline-none data-highlighted:bg-accent"
                  >
                    {item.cover ? (
                      <TrackCover
                        src={item.cover}
                        className="size-10! shrink-0 rounded-md!"
                      />
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <MusicNotesSimpleIcon
                          className="size-5"
                          weight="bold"
                        />
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {item.title}
                      </span>

                      <span className="block truncate text-xs text-muted-foreground">
                        {item.artist}
                      </span>
                    </span>

                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {SOURCE_NAMES[item.source]}
                    </span>
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>

      {track && (
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-emerald-500">
          <CheckCircleIcon weight="fill" className="size-4" />
          Трек выбран, ссылка появится на главной
        </p>
      )}
    </div>
  );
}
