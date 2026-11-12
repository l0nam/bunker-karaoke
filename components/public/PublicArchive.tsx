"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarBlankIcon,
  DiscIcon,
  MagnifyingGlassIcon,
  MicrophoneStageIcon,
  MusicNotesSimpleIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { PublicNavigation } from "@/components/public/PublicNavigation";
import { SongLinks } from "@/components/public/SongLinks";
import { TrackCover } from "@/components/TrackCover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { pluralRu } from "@/lib/helpers";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ru } from "date-fns/locale";
import { cn } from "cn";

interface ArchiveSession {
  id: string;
  started_at: string | null;
  ended_at: string | null;
  is_legacy: boolean;
}

interface ArchiveEntry {
  id: string;
  session_id: string;
  nickname: string;
  song: string | null;
  song_artist: string | null;
  song_url: string | null;
  song_cover: string | null;
  queue_type: "main" | "repeat";
  result: "performed";
  queued_at: string;
  performed_at: string | null;
}

interface ArchiveResponse {
  sessions: ArchiveSession[];
  entries: ArchiveEntry[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    performances: number;
    songs: number;
    evenings: number;
  };
}

const EMPTY: ArchiveResponse = {
  sessions: [],
  entries: [],
  total: 0,
  page: 1,
  pageSize: 24,
  stats: { performances: 0, songs: 0, evenings: 0 },
};

function formatDate(value: string | null, withTime = true): string {
  if (!value) return "Дата не записана";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не записана";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function PublicArchive() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ArchiveResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      q: debouncedSearch,
      session: sessionFilter,
      page: String(page),
    });

    void api<ArchiveResponse>(
      "/api/archive?" + params.toString(),
      "GET",
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Не удалось загрузить архив",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedSearch, sessionFilter, page]);

  const sessionById = useMemo(
    () => new Map(data.sessions.map((session) => [session.id, session])),
    [data.sessions],
  );

  const datedSessions = useMemo(
    () =>
      data.sessions
        .filter(
          (session) =>
            !session.is_legacy &&
            session.started_at &&
            !Number.isNaN(new Date(session.started_at).getTime()),
        )
        .sort(
          (a, b) =>
            new Date(b.started_at!).getTime() -
            new Date(a.started_at!).getTime(),
        ),
    [data.sessions],
  );

  const recentSessions = datedSessions.slice(0, 4);

  const karaokeDates = useMemo(
    () => datedSessions.map((session) => new Date(session.started_at!)),
    [datedSessions],
  );

  const karaokeDateKeys = useMemo(
    () => new Set(karaokeDates.map(getDateKey)),
    [karaokeDates],
  );

  const selectedSession = datedSessions.find(
    (session) => session.id === sessionFilter,
  );

  const selectedDate = selectedSession?.started_at
    ? new Date(selectedSession.started_at)
    : undefined;

  const sessionLabel =
    sessionFilter === "all"
      ? "Все вечера"
      : sessionFilter === "legacy"
        ? "Старые записи без даты"
        : selectedSession
          ? formatDate(selectedSession.started_at, false)
          : "Выбрать вечер";

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function updateSearch(value: string) {
    setSearch(value);
    setLoading(true);
    setError(null);
    setPage(1);
  }

  function updateSession(value: string) {
    setSessionFilter(value);
    setLoading(true);
    setError(null);
    setPage(1);
    setSessionPickerOpen(false);
  }

  function updatePage(nextPage: number) {
    setLoading(true);
    setError(null);
    setPage(nextPage);
  }

  function selectSessionByDate(date: Date | undefined) {
    if (!date) return;

    const selected = datedSessions.find(
      (session) =>
        getDateKey(new Date(session.started_at!)) === getDateKey(date),
    );

    if (selected) {
      updateSession(selected.id);
    }
  }

  return (
    <PublicNavigation active="archive">
      <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-7">
          <h1 className="font-heading text-3xl font-bold sm:text-5xl">
            Песенный архив
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Все песни, которые звучали на наших вечерах. Ищи по названию,
            исполнителю или нику участника и возвращайся к любимым выступлениям.
          </p>
        </header>

        <section
          aria-label="Статистика архива"
          className="mb-6 grid gap-3 sm:grid-cols-2"
        >
          <StatCard
            icon={<MicrophoneStageIcon className="size-5" weight="duotone" />}
            value={data.stats.performances}
            forms={["исполнение", "исполнения", "исполнений"]}
          />

          <StatCard
            icon={<CalendarBlankIcon className="size-5" weight="duotone" />}
            value={data.stats.evenings}
            forms={["вечер", "вечера", "вечеров"]}
          />
        </section>

        <Card className="mb-5">
          <CardContent className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(230px,0.45fr)]">
            <div className="relative">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                weight="bold"
              />

              <Input
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Песня, исполнитель или ник участника"
                aria-label="Поиск в песенном архиве"
                className="pl-9"
              />
            </div>

            <Popover
              open={sessionPickerOpen}
              onOpenChange={setSessionPickerOpen}
            >
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                  />
                }
              >
                <span className="flex min-w-0 items-center gap-2 truncate">
                  <CalendarBlankIcon className="shrink-0" weight="bold" />
                  <span className="truncate">{sessionLabel}</span>
                </span>

                <CaretDownIcon
                  className="shrink-0 text-muted-foreground"
                  weight="bold"
                />
              </PopoverTrigger>

              <PopoverContent
                align="end"
                className="w-[min(22rem,calc(100vw-2rem))] p-3"
              >
                <PopoverHeader>
                  <PopoverTitle>Выбрать вечер</PopoverTitle>
                </PopoverHeader>

                <div className="space-y-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={selectSessionByDate}
                    locale={ru}
                    disabled={(date) => !karaokeDateKeys.has(getDateKey(date))}
                    modifiers={{
                      karaoke: karaokeDates,
                    }}
                    modifiersClassNames={{
                      karaoke: "bg-primary/15 text-primary font-semibold",
                    }}
                    className="mx-auto"
                  />

                  <div className="space-y-2">
                    <p className="font-medium">Последние караоке</p>

                    {recentSessions.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {recentSessions.map((session) => (
                          <Button
                            key={session.id}
                            variant={
                              sessionFilter === session.id
                                ? "secondary"
                                : "outline"
                            }
                            size="sm"
                            className="h-auto min-h-9 justify-start whitespace-normal text-left"
                            onClick={() => updateSession(session.id)}
                          >
                            {formatDate(session.started_at, false)}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Проведённых вечеров пока нет.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    <Button
                      variant={sessionFilter === "all" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => updateSession("all")}
                    >
                      Все вечера
                    </Button>

                    {data.sessions.some((session) => session.is_legacy) && (
                      <Button
                        variant={
                          sessionFilter === "legacy" ? "secondary" : "ghost"
                        }
                        size="sm"
                        onClick={() => updateSession("legacy")}
                      >
                        Старые записи без даты
                      </Button>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-semibold">Выступления</h2>
          <p className="text-sm text-muted-foreground">
            {data.total.toLocaleString("ru-RU")}{" "}
            {pluralRu(data.total, ["запись", "записи", "записей"])}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive ring-1 ring-destructive/30"
          >
            {error}
          </div>
        )}

        <div
          className={cn(
            "grid gap-2",
            data.entries.length === 0 ? "grid-cols-1" : "grid-cols-3",
          )}
        >
          {loading ? (
            Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-lg bg-white/5"
              />
            ))
          ) : data.entries.length === 0 ? (
            <Card>
              <CardContent className="items-center py-12 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <DiscIcon className="size-6" weight="duotone" />
                </div>

                <p className="font-medium font-heading text-lg">
                  Пока ничего не найдено
                </p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Попробуйте изменить запрос или выбрать другой вечер. Новые
                  исполнения появятся здесь после обновления страницы.
                </p>
              </CardContent>
            </Card>
          ) : (
            data.entries.map((entry) => {
              const session = sessionById.get(entry.session_id);
              const track = {
                song: entry.song,
                song_artist: entry.song_artist,
                song_url: entry.song_url,
              };

              return (
                <Card key={entry.id} size="sm">
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {entry.song_cover ? (
                      <TrackCover
                        src={entry.song_cover}
                        title={entry.song}
                        artist={entry.song_artist}
                        size="sm"
                        className="shrink-0"
                      />
                    ) : (
                      <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <MusicNotesSimpleIcon
                          className="size-7"
                          weight="duotone"
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium font-heading">
                        {entry.song || "Песня не указана"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.song_artist || "Исполнитель не указан"}
                      </p>

                      <p className="mt-1 text-sm">
                        <span className="text-muted-foreground">
                          Исполнял(а):{" "}
                        </span>
                        <span className="font-medium">{entry.nickname}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {session?.is_legacy
                          ? "Старые записи · точная дата неизвестна"
                          : session?.started_at
                            ? "Вечер " + formatDate(session.started_at, false)
                            : "Историческое исполнение"}
                        {" · "}
                        {entry.performed_at
                          ? formatDate(entry.performed_at)
                          : "Время исполнения не сохранилось"}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <SongLinks entry={track} compact />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page <= 1}
            onClick={() => updatePage(Math.max(1, page - 1))}
          >
            Назад
          </Button>

          <p className="text-sm tabular-nums text-muted-foreground">
            Страница {Math.min(page, totalPages)} из {totalPages}
          </p>

          <Button
            variant="outline"
            size="sm"
            disabled={loading || page >= totalPages}
            onClick={() => updatePage(page + 1)}
          >
            Далее
          </Button>
        </div>
      </main>
    </PublicNavigation>
  );
}

function StatCard({
  icon,
  value,
  forms,
}: {
  icon: ReactNode;
  value: number;
  forms: [string, string, string];
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-row items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="font-heading text-2xl font-bold tabular-nums">
            {value.toLocaleString("ru-RU")}
          </p>
          <p className="text-xs text-muted-foreground">
            {pluralRu(value, forms)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
