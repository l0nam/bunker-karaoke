"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarBlankIcon,
  DiscIcon,
  MagnifyingGlassIcon,
  MicrophoneStageIcon,
  MusicNotesSimpleIcon,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { PublicNavigation } from "@/components/public/PublicNavigation";
import { SongLinks } from "@/components/public/SongLinks";
import { TrackCover } from "@/components/TrackCover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  pageSize: 25,
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

export function PublicArchive() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ArchiveResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    setLoading(true);
    setError(null);

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

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateSession(value: string) {
    setSessionFilter(value);
    setPage(1);
  }

  return (
    <PublicNavigation active="archive">
      <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Музыкальная летопись
        </p>
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
        className="mb-6 grid gap-3 sm:grid-cols-3"
      >
        <StatCard
          icon={<MicrophoneStageIcon className="size-5" weight="duotone" />}
          label="Исполнений"
          value={data.stats.performances}
        />
        <StatCard
          icon={<MusicNotesSimpleIcon className="size-5" weight="duotone" />}
          label="С исполненным треком"
          value={data.stats.songs}
        />
        <StatCard
          icon={<CalendarBlankIcon className="size-5" weight="duotone" />}
          label="Вечеров"
          value={data.stats.evenings}
        />
      </section>

      <Card className="mb-5">
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-[minmax(0,1fr)_minmax(230px,0.45fr)]">
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

          <select
            aria-label="Фильтр по вечеру"
            value={sessionFilter}
            onChange={(event) => updateSession(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="all">Все вечера</option>
            {data.sessions
              .filter((session) => !session.is_legacy)
              .map((session) => (
                <option key={session.id} value={session.id}>
                  {formatDate(session.started_at, false)}
                </option>
              ))}
            {data.sessions.some((session) => session.is_legacy) && (
              <option value="legacy">Старые записи без даты</option>
            )}
          </select>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold">Выступления</h2>
        <p className="text-sm text-muted-foreground">
          {data.total.toLocaleString("ru-RU")}{" "}
          {data.total === 1 ? "запись" : "записей"}
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

      <div className="flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl bg-white/5"
            />
          ))
        ) : data.entries.length === 0 ? (
          <Card>
            <CardContent className="items-center py-12 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <DiscIcon className="size-6" weight="duotone" />
              </div>
              <p className="font-medium">Пока ничего не найдено</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Попробуй изменить запрос или выбрать другой вечер. Новые
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
                <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                  {entry.song_cover ? (
                    <TrackCover
                      src={entry.song_cover}
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
                    <p className="truncate font-semibold">
                      {entry.song || "Песня не указана"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {entry.song_artist || "Исполнитель не указан"}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="text-muted-foreground">Исполнял(а): </span>
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
          onClick={() => setPage((current) => Math.max(1, current - 1))}
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
          onClick={() => setPage((current) => current + 1)}
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
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-row items-center gap-3 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-heading text-2xl font-bold tabular-nums">
            {value.toLocaleString("ru-RU")}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
