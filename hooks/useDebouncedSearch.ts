"use client";

import { useEffect, useState } from "react";

interface Options<T> {
  query: string;
  search: (query: string, signal: AbortSignal) => Promise<T[]>;
  enabled?: boolean;
  minChars?: number;
  debounceMs?: number;
}

interface SearchResult<T> {
  query: string;
  items: T[];
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
  const [result, setResult] = useState<SearchResult<T> | null>(null);
  const [loadingQuery, setLoadingQuery] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (!searchable) {
        setResult(null);
        setLoadingQuery(null);
        return;
      }

      setLoadingQuery(normalizedQuery);
      void search(normalizedQuery, controller.signal)
        .then((items) => {
          if (!controller.signal.aborted) {
            setResult({ query: normalizedQuery, items });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setResult({ query: normalizedQuery, items: [] });
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoadingQuery((current) =>
              current === normalizedQuery ? null : current,
            );
          }
        });
    }, searchable ? debounceMs : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, searchable, search, debounceMs]);

  const items =
    searchable && result?.query === normalizedQuery ? result.items : [];
  const loading =
    searchable &&
    (loadingQuery === normalizedQuery || result?.query !== normalizedQuery);

  return { items, loading };
}
