"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { QueueSnapshot } from "@/types/queue";

const EMPTY: QueueSnapshot = { active: [], history: [], isActive: true };

export function useQueue() {
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Защита от устаревших ответов: применяем только последний refresh.
  const refreshRevision = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++refreshRevision.current;

    try {
      const data = await api<QueueSnapshot>("/api/queue");
      if (requestId !== refreshRevision.current) return;

      setSnapshot(data);
      setError(null);
    } catch (e) {
      if (requestId === refreshRevision.current) {
        setError(
          e instanceof Error ? e.message : "Не удалось загрузить очередь",
        );
      }
    } finally {
      if (requestId === refreshRevision.current) setLoading(false);
    }
  }, []);

  const { singing, main, repeat } = useMemo(() => {
    const waiting = snapshot.active.filter((entry) => entry.status === "waiting");

    return {
      singing: snapshot.active.find((entry) => entry.status === "singing") ?? null,
      main: waiting.filter((entry) => entry.queue_type === "main"),
      repeat: waiting.filter((entry) => entry.queue_type === "repeat"),
    };
  }, [snapshot.active]);

  const upNext = main[0] ?? repeat[0] ?? null;
  const hasSungBefore = useCallback(
    (nickname: string) => snapshot.history.includes(nickname.trim().toLowerCase()),
    [snapshot.history],
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "karaoke_settings" },
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
    singing,
    main,
    repeat,
    upNext,
    hasSungBefore,
    loading,
    error,
    refresh,
  };
}
