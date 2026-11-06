"use client";

import { useState } from "react";
import {
  BroadcastIcon,
  MicrophoneStageIcon,
  MusicNotesSimpleIcon,
  UsersIcon,
  MoonStarsIcon,
} from "@phosphor-icons/react";
import { SongLinks } from "@/components/public/SongLinks";
import { PublicNavigation } from "@/components/public/PublicNavigation";
import { useQueue } from "@/hooks/useQueue";
import { songLabel } from "@/lib/song";
import type { QueueEntry } from "@/types/queue";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { cn } from "cn";
import { Input } from "../ui/input";
import Link from "next/link";
import { buttonVariants } from "../ui/button";
import { TrackCover } from "../TrackCover";
import { QueueRow } from "../host/QueueRow";

const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL;

export function PublicQueue() {
  const { singing, main, repeat, upNext, isActive, session, loading, error } =
    useQueue();
  const [lookup, setLookup] = useState("");

  const query = lookup.trim().toLowerCase();
  const mainIndex = query
    ? main.findIndex((e) => e.nickname.toLowerCase() === query)
    : -1;
  const repeatIndex = query
    ? repeat.findIndex((e) => e.nickname.toLowerCase() === query)
    : -1;

  if (!loading && (!session || !isActive)) {
    return (
      <PublicNavigation active="home">
        <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        <section className="my-auto mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950/75 px-6 py-12 text-center shadow-2xl shadow-black/30 backdrop-blur-xl sm:px-10">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-pink-400/20 bg-pink-500/10 text-pink-300">
            <MoonStarsIcon className="size-8" weight="duotone" />
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-pink-300">
            Бункер-оке
          </p>

          <h1 className="font-heading text-3xl font-bold sm:text-4xl">
            {!session
              ? "Следующий вечер уже в планах"
              : "Сейчас караоке на паузе"}
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
            {!session
              ? "Сцена пока свободна. Загляни в песенный архив и вспомни, как проходили наши прошлые вечера."
              : "Микрофоны пока отдыхают. Следи за новостями в Discord — там сообщим, когда снова начнём."}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/archive"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <MusicNotesSimpleIcon weight="bold" />
              Открыть песенный архив
            </Link>

            {DISCORD_URL && (
              <Link
                href={DISCORD_URL}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <BroadcastIcon weight="bold" />
                Новости в Discord
              </Link>
            )}
          </div>

          <p className="mt-8 text-xs text-muted-foreground/70">
            История наших исполнений всегда под рукой.
          </p>
        </section>
        </main>
      </PublicNavigation>
    );
  }

  return (
    <PublicNavigation active="home">
      <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-15 sm:px-6">
      <header className="flex flex-col text-center">
        <h1 className="text-4xl font-bold font-heading text-primary sm:text-5xl">
          Караоке на Бункере
        </h1>
        <p className="mx-auto mt-3.5 max-w-2xl text-muted-foreground">
          Здесь видно, кто сейчас поёт и кто выступает дальше. Записаться можно
          в чате трибуны в Discord — ведущий добавит тебя в очередь.
        </p>
      </header>

      {error && (
        <div className="mt-5 rounded-lg bg-destructive/10 p-4 text-sm text-destructive ring-1 ring-destructive/30">
          Не удалось загрузить очередь: {error}
        </div>
      )}

      {/* Сейчас поёт */}
      <Card className="mt-5 bg-transparent bg-linear-to-br from-pink-600/30 via-fuchsia-600/10 to-violet-600/20 ring-pink-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-pink-200">
            <MicrophoneStageIcon className="size-4" weight="bold" />
            Сейчас поёт
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="h-27 w-full animate-pulse rounded-md bg-white/10" />
          ) : singing ? (
            <div className="flex flex-wrap items-center gap-4">
              {singing.song_cover && <TrackCover src={singing.song_cover} />}
              <div className="min-w-0">
                <p className="font-heading text-3xl font-bold sm:text-4xl">
                  {singing.nickname}
                </p>

                {songLabel(singing) && (
                  <p className="flex items-center gap-2 text-lg">
                    <MusicNotesSimpleIcon
                      className="size-4 shrink-0"
                      weight="bold"
                    />{" "}
                    {songLabel(singing)}
                  </p>
                )}

                <div className="mt-2.5">
                  <SongLinks entry={singing} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xl text-muted-foreground">Пока никто не поёт</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {/* Дальше */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BroadcastIcon className="size-4" weight="bold" /> Дальше
            </CardTitle>
          </CardHeader>

          <CardContent>
            {upNext ? (
              <QueueRow
                entry={upNext}
                numberless
                actions={<SongLinks entry={upNext} compact />}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Очередь пуста. Самое время записаться!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Поиск себя */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="size-4" weight="bold" /> Где я в очереди?
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Input
              value={lookup}
              onChange={(event) => setLookup(event.target.value)}
              placeholder="Введи свой ник"
            />

            <p className="text-muted-foreground">
              {!query
                ? ""
                : mainIndex >= 0
                  ? "Ты в основной очереди, №" + (mainIndex + 1) + "."
                  : repeatIndex >= 0
                    ? "Ты в повторной очереди, №" +
                      (repeatIndex + 1) +
                      ". Сначала выступают основные (" +
                      main.length +
                      ")."
                    : "Тебя пока нет в очереди. Записаться можно в чате трибуны."}
            </p>

            {DISCORD_URL && (
              <Link
                href={DISCORD_URL}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "default" }))}
              >
                Открыть Discord
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Полные списки */}
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <FullList
          title="Основная очередь"
          hint="Первые выступления, приоритет"
          entries={main}
        />

        <FullList
          title="Повторные участники"
          hint="Выступают, когда основная очередь пуста"
          entries={repeat}
        />
      </div>
      </main>
    </PublicNavigation>
  );
}

function FullList({
  title,
  hint,
  entries,
}: {
  title: string;
  hint: string;
  entries: QueueEntry[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{hint}</CardDescription>
        <CardAction className="grid size-7 place-items-center rounded bg-muted">
          {entries.length}
        </CardAction>
      </CardHeader>

      <CardContent>
        {entries.length === 0 ? (
          <p className="mx-auto py-5 text-sm text-muted-foreground">Пусто</p>
        ) : (
          <ol className="max-h-96 space-y-2 overflow-y-auto">
            {entries.map((entry, index) => (
              <QueueRow
                key={entry.id}
                entry={entry}
                index={index + 1}
                actions={<SongLinks entry={entry} compact />}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
