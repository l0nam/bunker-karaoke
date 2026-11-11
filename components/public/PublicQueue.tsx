"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArchiveBoxIcon,
  BroadcastIcon,
  DiscordLogoIcon,
  MicrophoneStageIcon,
  MusicNotesSimpleIcon,
  UsersIcon,
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { cn } from "cn";
import { Input } from "../ui/input";
import Link from "next/link";
import { buttonVariants } from "../ui/button";
import { TrackCover } from "../TrackCover";
import { QueueRow } from "../host/QueueRow";
import { Spinner } from "../ui/spinner";
import { SingingWave } from "@/components/public/SingingWave";
import { getWaveColors, getWaveMood } from "@/lib/music-profile";
import { Calendar } from "../ui/calendar";
import { ru } from "date-fns/locale";

const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL;
type ArchiveSession = {
  id: string;
  started_at: string | null;
};

export function PublicQueue() {
  const { singing, main, repeat, upNext, isActive, session, loading, error } =
    useQueue();
  const [lookup, setLookup] = useState("");

  const [karaokeDates, setKaraokeDates] = useState<Date[]>([]);

  useEffect(() => {
    if (loading || (session && isActive)) return;
    const controller = new AbortController();

    async function loadKaraokeDates() {
      try {
        const response = await fetch("/api/archive", {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data: { sessions?: ArchiveSession[] } = await response.json();
        const dates = (data.sessions ?? []).flatMap(({ started_at }) => {
          if (!started_at) return [];
          const date = new Date(started_at);
          return Number.isNaN(date.getTime()) ? [] : [date];
        });

        setKaraokeDates(dates);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Ошибка загрузки данных караоке:", error);
        }
      }
    }

    loadKaraokeDates();

    return () => controller.abort();
  }, [loading, session, isActive]);

  const query = lookup.trim().toLowerCase();
  const mainIndex = query
    ? main.findIndex((e) => e.nickname.toLowerCase() === query)
    : -1;
  const repeatIndex = query
    ? repeat.findIndex((e) => e.nickname.toLowerCase() === query)
    : -1;

  if (loading) {
    return (
      <PublicNavigation>
        <main className="flex min-h-svh w-full justify-center items-center px-4 py-8 sm:px-6 sm:py-12">
          <Spinner />
        </main>
      </PublicNavigation>
    );
  }

  const date = new Date();
  if (!loading && (!session || !isActive)) {
    return (
      <PublicNavigation active="home">
        <main className="flex min-h-svh w-full justify-center items-center px-4 py-8 sm:px-6 sm:py-12">
          <Card className="w-full max-w-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">
                {!session ? "Спасибо за вечер!" : "Сейчас караоке на паузе"}
              </CardTitle>
              <CardDescription className="max-w-sm text-base mx-auto mt-2 text-foreground">
                {!session
                  ? "Караоке подошло к концу. Загляни в песенный архив и вспомни, как проходили наши прошлые вечера."
                  : "Микрофоны пока отдыхают. Следи за новостями в Discord — там сообщим, когда продолжим петь."}
              </CardDescription>
            </CardHeader>

            {!session && (
              <CardContent>
                <Calendar
                  className="mx-auto pointer-events-none select-none"
                  disableNavigation
                  mode="single"
                  selected={date}
                  locale={ru}
                  modifiers={{
                    karaoke: karaokeDates,
                    weekend: { dayOfWeek: [0, 6] },
                  }}
                  modifiersClassNames={{
                    karaoke: "bg-primary/25 text-primary font-bold",
                    weekend: "bg-muted/60",
                  }}
                />

                <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-primary" />
                    Сегодня
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-primary/50" />
                    Караоке состоялось
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-muted" />
                    Выходные
                  </span>
                </div>

                <p className="mt-3 text-center text-sm">
                  Обычно встречаемся по выходным. Следи за анонсами в Discord!
                </p>
              </CardContent>
            )}

            <CardFooter className="mx-auto flex flex-col gap-2">
              <Link
                href="/archive"
                className={cn(buttonVariants({ variant: "default" }))}
              >
                <ArchiveBoxIcon weight="bold" />
                Открыть песенный архив
              </Link>

              {DISCORD_URL && (
                <Link
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "secondary" }))}
                >
                  <DiscordLogoIcon weight="fill" />
                  Новости в Discord
                </Link>
              )}
            </CardFooter>
          </Card>
        </main>
      </PublicNavigation>
    );
  }

  const isSinging = Boolean(query && singing?.nickname.toLowerCase() === query);

  const peopleAhead =
    mainIndex >= 0
      ? (singing ? 1 : 0) + mainIndex
      : repeatIndex >= 0
        ? (singing ? 1 : 0) + main.length + repeatIndex
        : -1;

  const overallPosition = peopleAhead + 1;

  const peopleWord = (count: number) => {
    const mod100 = count % 100;
    const mod10 = count % 10;

    if (mod100 >= 11 && mod100 <= 14) return "человек";
    if (mod10 === 1) return "человек";
    if (mod10 >= 2 && mod10 <= 4) return "человека";

    return "человек";
  };

  const lookupMessage = !query
    ? ""
    : isSinging
      ? `Сейчас поёшь ты — ${songLabel(singing!) ?? "трек не указан"}.`
      : mainIndex >= 0 || repeatIndex >= 0
        ? `${mainIndex >= 0 ? "Ты в основной" : "Ты в повторной"} очереди. До тебя ${
            peopleAhead === 0
              ? "никого"
              : `${peopleAhead} ${peopleWord(peopleAhead)}`
          }. Общая позиция — №${overallPosition}.`
        : "Тебя пока нет в очереди. Записаться можно в чате трибуны.";

  return (
    <PublicNavigation active="home">
      <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-col text-center">
          <h1 className="text-4xl font-bold font-heading text-primary sm:text-5xl">
            Бункер-оке
          </h1>
          <p className="mx-auto mt-3.5 max-w-lg">
            Здесь видно, кто сейчас поёт и всю дальшейшую очередь. Хочешь
            попеть? Записывайся в чате трибуны!
          </p>
        </header>

        {error && (
          <div className="mt-5 rounded-lg bg-destructive/10 p-4 text-sm text-destructive ring-1 ring-destructive/30">
            Не удалось загрузить очередь: {error}
          </div>
        )}

        {/* Сейчас поёт */}
        <Card className="relative isolate mt-5 overflow-hidden border-rose-200 bg-gradient-to-br from-rose-100 via-pink-50 to-violet-100 text-zinc-900 dark:border-pink-500/30 dark:from-[#211420] dark:via-[#170e1c] dark:to-[#12121a] dark:text-white">
          <SingingWave
            active={Boolean(singing)}
            trackKey={singing?.id ?? singing?.nickname ?? "unknown-track"}
            mood={getWaveMood(singing?.song_genre)}
            colors={getWaveColors(singing?.song_genre)}
          />
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2">
              <MicrophoneStageIcon className="size-4" weight="bold" />
              Сейчас поёт
            </CardTitle>
          </CardHeader>

          <CardContent className="relative z-10">
            {loading ? (
              <div className="h-27 w-full animate-pulse rounded-md bg-white/10" />
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                {singing ? (
                  <motion.div
                    key={singing.id}
                    initial={{
                      opacity: 0,
                      y: 14,
                      scale: 0.98,
                      filter: "blur(8px)",
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      filter: "blur(0px)",
                    }}
                    exit={{
                      opacity: 0,
                      y: -8,
                      scale: 0.98,
                      filter: "blur(6px)",
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex flex-wrap items-center gap-4"
                  >
                    {singing.song_cover && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85, rotate: -5 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{
                          duration: 0.45,
                          delay: 0.08,
                          ease: "easeOut",
                        }}
                      >
                        <TrackCover
                          src={singing.song_cover}
                          title={singing.song}
                          artist={singing.song_artist}
                        />
                      </motion.div>
                    )}

                    <div className="min-w-0">
                      <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.32, delay: 0.1 }}
                        className="font-heading text-3xl font-bold sm:text-4xl"
                      >
                        {singing.nickname}
                      </motion.p>

                      {songLabel(singing) && (
                        <motion.p
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.32, delay: 0.18 }}
                          className="flex items-center gap-2 text-lg"
                        >
                          <MusicNotesSimpleIcon
                            className="size-4 shrink-0"
                            weight="bold"
                          />
                          {songLabel(singing)}
                        </motion.p>
                      )}

                      <motion.div
                        initial={{ opacity: 0, y: 7 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.26 }}
                        className="mt-2.5"
                      >
                        <SongLinks entry={singing} />
                      </motion.div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.22 }}
                    className="text-xl text-muted-foreground"
                  >
                    Пока никто не поёт
                  </motion.p>
                )}
              </AnimatePresence>
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
                  showFullName
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

              <AnimatePresence mode="wait" initial={false}>
                {lookupMessage && (
                  <motion.p
                    key={lookupMessage}
                    initial={{ opacity: 0, y: 5, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -5, filter: "blur(3px)" }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="text-muted-foreground"
                  >
                    {lookupMessage}
                  </motion.p>
                )}
              </AnimatePresence>

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
                showFullName
                actions={<SongLinks entry={entry} compact />}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
