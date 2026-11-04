"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SignOutIcon,
  SkipForwardIcon,
  TrashIcon,
  MicrophoneStageIcon,
  MusicNotesSimpleIcon,
  PowerIcon,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useQueue } from "@/hooks/useQueue";
import { notifyError, notifyInfo, notifySuccess } from "@/components/ui/toast";
import {
  AddEntryForm,
  type AddEntryInput,
} from "@/components/host/AddEntryForm";
import { songLabel } from "@/lib/song";
import { QueueColumn } from "@/components/host/QueueColumn";
import { DiscordExport } from "@/components/host/DiscordExport";
import type { QueueEntry, QueueType } from "@/types/queue";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Kbd } from "../ui/kbd";
import { TrackCover } from "../TrackCover";

export function QueuePanel() {
  const router = useRouter();
  const {
    singing,
    main,
    repeat,
    hasSungBefore,
    isActive,
    loading,
    error,
    refresh,
  } = useQueue();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (action: () => Promise<string | void>): Promise<boolean> => {
      setBusy(true);
      try {
        const message = await action();
        if (message) notifySuccess(message);
        await refresh();
        return true;
      } catch (e) {
        notifyError(e);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const toggleKaraoke = useCallback(
    () =>
      run(async () => {
        const nextIsActive = !isActive;
        await api("/api/queue", "PATCH", {
          action: "set-active",
          isActive: nextIsActive,
        });
        return nextIsActive ? "Караоке запущено" : "Караоке остановлено";
      }),
    [isActive, run],
  );

  const addOne = useCallback(
    (input: AddEntryInput) =>
      run(async () => {
        await api<QueueEntry>("/api/queue", "POST", {
          nickname: input.nickname,
          discord_id: input.discord_id || null,
          song: input.song || null,
          song_artist: input.song_artist || null,
          song_url: input.song_url || null,
          song_cover: input.song_cover || null,
          queue_type: input.queue_type,
        });
        return `Добавлен(а): ${input.nickname}`;
      }),
    [run],
  );

  const addMany = useCallback(
    (nicknames: string[]) =>
      run(async () => {
        let added = 0;
        for (const nickname of nicknames) {
          const queue: QueueType = hasSungBefore(nickname) ? "repeat" : "main";
          await api<QueueEntry>("/api/queue", "POST", {
            nickname,
            queue_type: queue,
          });
          added++;
        }
        return `Добавлено: ${added}`;
      }),
    [run, hasSungBefore],
  );

  const next = useCallback(
    () =>
      run(async () => {
        const entry = await api<QueueEntry | null>("/api/queue", "PATCH", {
          action: "next",
        });
        if (!entry) {
          notifyInfo("Очередь закончилась");
          return;
        }
        return `Выступает: ${entry.nickname}`;
      }),
    [run],
  );

  const shift = useCallback(
    (id: string, direction: "up" | "down") =>
      run(() => api("/api/queue", "PATCH", { action: "shift", id, direction })),
    [run],
  );

  const move = useCallback(
    (id: string, to: QueueType) =>
      run(async () => {
        await api("/api/queue", "PATCH", { action: "move", id, to });
        return to === "repeat"
          ? "Перенесено в повторные"
          : "Перенесено в основную";
      }),
    [run],
  );

  const remove = useCallback(
    (id: string) =>
      run(async () => {
        await api("/api/queue", "PATCH", { action: "remove", id });
        return "Удалено из очереди";
      }),
    [run],
  );

  const clearAll = useCallback(() => {
    if (!window.confirm("Очистить всю очередь и историю вечера?")) return;
    return run(async () => {
      await api("/api/queue", "DELETE");
      return "Очередь очищена";
    });
  }, [run]);

  async function logout() {
    try {
      await api("/api/host/logout", "POST");
      router.replace("/host");
      router.refresh();
    } catch (e) {
      notifyError(e, "Не удалось выйти");
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "т") &&
        !busy &&
        isActive
      ) {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, busy, isActive]);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-15 sm:px-6">
      {/* Шапка */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="font-bold text-2xl">Панель ведущего</CardTitle>
          <CardAction className="flex flex-wrap items-center gap-2">
            <Button
              onClick={toggleKaraoke}
              disabled={busy || loading}
              variant={isActive ? "destructive" : "default"}
            >
              <PowerIcon weight="bold" />
              {isActive ? "Остановить караоке" : "Запустить караоке"}
            </Button>
            <Button onClick={clearAll} disabled={busy} variant="secondary">
              <TrashIcon weight="bold" /> Очистить
            </Button>
            <Button onClick={logout} variant="destructive">
              <SignOutIcon weight="bold" /> Выйти
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive ring-1 ring-destructive/30">
          {error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3 mt-3">
        {/* Левая колонка: сейчас поёт и добавление */}
        <div className="flex flex-col gap-3">
          <Card className="bg-linear-to-br from-pink-600/30 via-fuchsia-600/10 to-violet-600/20 bg-transparent ring-pink-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MicrophoneStageIcon className="size-4" weight="bold" /> Сейчас
                поёт
              </CardTitle>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="h-13 w-full animate-pulse rounded-md bg-white/10" />
              ) : !isActive ? (
                <p className="text-muted-foreground text-xl">
                  Караоке остановлено
                </p>
              ) : singing ? (
                <div className="flex flex-wrap items-center gap-4">
                  {singing.song_cover && (
                    <TrackCover src={singing.song_cover} size="sm" />
                  )}
                  <div className="min-w-0">
                    <p className="text-2xl font-heading font-bold sm:text-3xl">
                      {singing.nickname}
                    </p>

                    {songLabel(singing) && (
                      <p className="flex items-center gap-2">
                        <MusicNotesSimpleIcon
                          className="size-4 shrink-0"
                          weight="bold"
                        />{" "}
                        {songLabel(singing)}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xl">Никто не поёт</p>
              )}
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                variant="white"
                onClick={next}
                disabled={busy || loading || !isActive}
              >
                <SkipForwardIcon weight="bold" /> Следующий <Kbd>N</Kbd>
              </Button>
            </CardFooter>
          </Card>

          <AddEntryForm
            hasSungBefore={hasSungBefore}
            onAdd={addOne}
            onBulkAdd={addMany}
            busy={busy}
          />
        </div>

        {/* Середина: очереди */}
        <div className="flex flex-col gap-3 lg:col-span-1">
          <QueueColumn
            title="Основная очередь"
            hint="Первые выступления. Идут раньше повторных."
            items={main}
            busy={busy}
            moveTo="repeat"
            onShift={shift}
            onMove={move}
            onRemove={remove}
          />

          <QueueColumn
            title="Повторные участники"
            hint="Вызываются, только когда основная очередь пуста."
            items={repeat}
            busy={busy}
            moveTo="main"
            onShift={shift}
            onMove={move}
            onRemove={remove}
          />
        </div>

        {/* Правая колонка: Discord */}
        <div className="lg:col-span-1">
          <DiscordExport main={main} repeat={repeat} singing={singing} />
        </div>
      </div>
    </main>
  );
}
