"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { QueueSnapshot } from "@/types/queue";

const EMPTY: QueueSnapshot = { active: [], history: [] };

export function useQueue() {
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Очередь запросов, чтобы быстрые перемещения не конфликтовали.
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingMutations = useRef(0);

  // Защита от устаревших ответов refresh.
  const localRevision = useRef(0);
  const refreshRevision = useRef(0);

  const refresh = useCallback(async () => {
    // Не перезаписываем локальные изменения во время сохранения.
    if (pendingMutations.current > 0) return;

    const revision = localRevision.current;
    const requestId = ++refreshRevision.current;

    try {
      const data = await api<QueueSnapshot>("/api/queue");

      // Пока загружались данные, пользователь мог что-то переместить.
      if (
        pendingMutations.current > 0 ||
        revision !== localRevision.current ||
        requestId !== refreshRevision.current
      ) {
        return;
      }

      setSnapshot(data);
      setError(null);
    } catch (e) {
      if (
        pendingMutations.current === 0 &&
        revision === localRevision.current &&
        requestId === refreshRevision.current
      ) {
        setError(
          e instanceof Error ? e.message : "Не удалось загрузить очередь",
        );
      }
    } finally {
      if (
        pendingMutations.current === 0 &&
        revision === localRevision.current &&
        requestId === refreshRevision.current
      ) {
        setLoading(false);
      }
    }
  }, []);

  // Мгновенное локальное изменение очереди.
  const updateActive = useCallback(
    (
      updater: (current: QueueSnapshot["active"]) => QueueSnapshot["active"],
    ) => {
      localRevision.current += 1;

      setSnapshot((current) => ({
        ...current,
        active: updater(current.active),
      }));
    },
    [],
  );

  // Последовательно выполняет изменения API.
  const enqueueMutation = useCallback(
    (mutation: () => Promise<unknown>): Promise<unknown> => {
      pendingMutations.current += 1;

      const task = mutationQueue.current.then(
        () => mutation(),
        () => mutation(),
      );

      // Ошибка одного запроса не ломает последующие.
      mutationQueue.current = task.then(
        () => undefined,
        () => undefined,
      );

      return task.finally(async () => {
        pendingMutations.current -= 1;

        // После всех запросов один раз синхронизируем данные.
        if (pendingMutations.current === 0) {
          await refresh();
        }
      });
    },
    [refresh],
  );

  useEffect(() => {
    const channel = supabaseBrowser
      .channel("queue-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        () => {
          void refresh();
        },
      )
      .subscribe((status) => {
        if (
          status === "SUBSCRIBED" ||
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          void refresh();
        }
      });

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [refresh]);

  return {
    ...snapshot,
    loading,
    error,
    refresh,
    updateActive,
    enqueueMutation,
  };
}
