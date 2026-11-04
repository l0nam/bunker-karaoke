"use client";

import { useState } from "react";
import {
  BroadcastIcon,
  MicrophoneStageIcon,
  MusicNotesSimpleIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { SongLinks } from "@/components/public/SongLinks";
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
  const { active, loading, error } = useQueue();
  const [lookup, setLookup] = useState("");

  const singing = active.find((e) => e.status === "singing") ?? null;
  const main = active.filter(
    (e) => e.status === "waiting" && e.queue_type === "main",
  );
  const repeat = active.filter(
    (e) => e.status === "waiting" && e.queue_type === "repeat",
  );
  const upNext = [...main, ...repeat][0];

  const query = lookup.trim().toLowerCase();
  const mainIndex = query
    ? main.findIndex((e) => e.nickname.toLowerCase() === query)
    : -1;
  const repeatIndex = query
    ? repeat.findIndex((e) => e.nickname.toLowerCase() === query)
    : -1;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-15 sm:px-6">
      <header className="flex flex-col text-center">
        <h1 className="text-4xl font-bold font-heading text-primary sm:text-5xl">
          Караоке на Бункере
        </h1>
        <p className="max-w-2xl mt-3.5 text-muted-foreground mx-auto">
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
      <Card className="bg-transparent mt-5 bg-linear-to-br from-pink-600/30 via-fuchsia-600/10 to-violet-600/20 ring-pink-500/30">
        <CardHeader>
          <CardTitle className="flex gap-2 items-center text-pink-200">
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
                <p className="text-3xl font-heading font-bold sm:text-4xl">
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
              onChange={(e) => setLookup(e.target.value)}
              placeholder="Введи свой ник"
            />

            <p className="text-muted-foreground">
              {!query
                ? ""
                : mainIndex >= 0
                  ? `Ты в основной очереди, №${mainIndex + 1}.`
                  : repeatIndex >= 0
                    ? `Ты в повторной очереди, №${repeatIndex + 1}. Сначала выступают основные (${main.length}).`
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
      <div className="grid gap-6 md:grid-cols-2 mt-5">
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
        <CardAction className="size-7 grid place-items-center bg-muted rounded">
          {entries.length}
        </CardAction>
      </CardHeader>

      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground mx-auto py-5">Пусто</p>
        ) : (
          <ol className="max-h-96 space-y-2 overflow-y-auto">
            {entries.map((e, i) => (
              <QueueRow
                key={e.id}
                entry={e}
                index={i + 1}
                actions={<SongLinks entry={e} compact />}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
