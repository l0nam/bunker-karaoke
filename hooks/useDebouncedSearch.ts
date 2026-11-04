"use client";

import { useEffect, useState } from "react";

interface Options<T> {
  query: string;
  search: (query: string, signal: AbortSignal) => Promise<T[]>;
  enabled?: boolean;
  minChars?: number;
  debounceMs?: number;
}

export function useDebouncedSearch<T>({
  query,
  search,
  enabled = true,
  minChars = 2,
  debounceMs = 300,
}: Options<T>) {
  const normalizedQuery = query.trim();
  const searchable = enabled && normalizedQuery.length >= minChars;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchable) {
      setItems([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setItems([]);
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await search(normalizedQuery, controller.signal);
        if (!controller.signal.aborted) setItems(results);
      } catch {
        if (!controller.signal.aborted) setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, searchable, search, debounceMs]);

  return { items, loading };
}
