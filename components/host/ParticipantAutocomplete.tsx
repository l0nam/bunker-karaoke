
"use client";

import { useEffect, useState } from "react";
import type { Ref } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { UserCircleIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { Spinner } from "../ui/spinner";
import { Input } from "../ui/input";

interface Participant {
  id: string;
  nickname: string;
  discord_id: string | null;
}

interface Props {
  value: string;
  onValueChange: (value: string) => void;
  onDiscordIdChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
}

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

export function ParticipantAutocomplete({
  value,
  onValueChange,
  onDiscordIdChange,
  inputRef,
}: Props) {
  const [suggestions, setSuggestions] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedNickname, setSelectedNickname] = useState<string | null>(
    null,
  );

  const query = value.trim();
  const searchable = query.length >= MIN_CHARS;

  useEffect(() => {
    if (!searchable) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setSuggestions([]);
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await api<{ participants: Participant[] }>(
          `/api/participants/search?q=${encodeURIComponent(query)}`,
          "GET",
          undefined,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setSuggestions(data.participants);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchable]);

  function pick(item: Participant) {
    setSelectedNickname(item.nickname);
    onValueChange(item.nickname);
    onDiscordIdChange(item.discord_id ?? "");
    setOpen(false);
  }

  function handleInputChange(
    next: string,
    details: { reason: string },
  ) {
    onValueChange(next);

    if (
      details.reason === "input-change" ||
      details.reason === "input-clear" ||
      details.reason === "clear-press"
    ) {
      // Если изменили выбранный ник, старый Discord ID больше не подходит.
      if (
        selectedNickname &&
        next.trim().toLowerCase() !== selectedNickname.toLowerCase()
      ) {
        onDiscordIdChange("");
      }

      setSelectedNickname(null);
      setOpen(next.trim().length >= MIN_CHARS);
    }
  }

  return (
    <div className="w-full min-w-0">
      <Autocomplete.Root
        items={suggestions}
        value={value}
        mode="none"
        itemToStringValue={(item: Participant) => item.nickname}
        open={open && searchable}
        onOpenChange={setOpen}
        onValueChange={handleInputChange}
      >
        <div className="relative w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
            <UserCircleIcon className="size-4.5" weight="bold" />
          </span>

          <Autocomplete.Input
            render={
              <Input
                ref={inputRef}
                id="nickname-input"
                placeholder="Начни вводить никнейм..."
                className="h-10 w-full pl-10 pr-10"
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
          <Autocomplete.Positioner
            sideOffset={6}
            className="z-50 outline-none"
          >
            <Autocomplete.Popup className="w-(--anchor-width) overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
              <Autocomplete.Empty className="flex items-center justify-center gap-2 px-3 py-4 text-center text-sm text-muted-foreground">
                {loading ? (
                  <>
                    <Spinner className="size-4" />
                    Ищем участников...
                  </>
                ) : (
                  "Участник не найден. Можно записать новый ник."
                )}
              </Autocomplete.Empty>

              <Autocomplete.List className="max-h-80 overflow-y-auto">
                {(item: Participant) => (
                  <Autocomplete.Item
                    key={item.id}
                    value={item}
                    onClick={() => pick(item)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 outline-none data-highlighted:bg-accent"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <UserCircleIcon
                        className="size-5"
                        weight="bold"
                      />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {item.nickname}
                      </span>

                      <span className="block truncate text-xs text-muted-foreground">
                        {item.discord_id
                          ? `Discord ID: ${item.discord_id}`
                          : "Discord ID не указан"}
                      </span>
                    </span>
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
    </div>
  );
}
