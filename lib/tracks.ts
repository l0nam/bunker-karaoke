import type { Track } from "@/types/queue";

// Поиск треков для подсказок. Работает только на сервере.
// Основной источник — Deezer (без ключа, есть ссылка на трек и обложка),
// запасной — iTunes Search API (тоже без ключа).
// У Яндекс Музыки официального API нет, поэтому она подключена только ссылкой на поиск.

const TIMEOUT_MS = 4000;
const LIMIT = 8;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;

export interface SearchResult {
  tracks: Track[];
  // true, если не ответил ни один источник (интерфейс тогда просто не показывает подсказки)
  failed: boolean;
}

type Provider = (query: string) => Promise<Track[]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function httpsUrl(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  try {
    return new URL(raw).protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

export function parseDeezer(json: unknown): Track[] {
  if (!isRecord(json) || !Array.isArray(json.data)) return [];

  const tracks: Track[] = [];
  for (const item of json.data) {
    if (!isRecord(item)) continue;

    const id = item.id;
    const title = text(item.title);
    const artist = isRecord(item.artist) ? text(item.artist.name) : null;
    const url = httpsUrl(item.link);
    if ((typeof id !== "number" && typeof id !== "string") || !title || !artist || !url) continue;

    const album = isRecord(item.album) ? item.album : null;
    const albumId =
      album && (typeof album.id === "number" || typeof album.id === "string")
        ? String(album.id)
        : null;

    tracks.push({
      id: `deezer:${id}`,
      title,
      artist,
      url,
      cover: album ? (httpsUrl(album.cover_medium) ?? httpsUrl(album.cover_small)) : null,
      source: "deezer",
      genre: null,
      albumId,
    });
  }
  return tracks;
}

export function parseItunes(json: unknown): Track[] {
  if (!isRecord(json) || !Array.isArray(json.results)) return [];

  const tracks: Track[] = [];
  for (const item of json.results) {
    if (!isRecord(item)) continue;

    const id = item.trackId;
    const title = text(item.trackName);
    const artist = text(item.artistName);
    const url = httpsUrl(item.trackViewUrl);
    if ((typeof id !== "number" && typeof id !== "string") || !title || !artist || !url) continue;

    tracks.push({
      id: `itunes:${id}`,
      title,
      artist,
      url,
      cover: httpsUrl(item.artworkUrl100),
      source: "itunes",
      genre: text(item.primaryGenreName),
      albumId: null,
    });
  }
  return tracks;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Поиск треков вернул ${response.status}`);
  return response.json();
}

const genreCache = new Map<string, { at: number; genre: string | null }>();

/**
 * Deezer's track search includes an album ID, while the genre is exposed by
 * the album endpoint. Resolve it only after a host picks a track, never for
 * every autocomplete suggestion.
 */
export async function resolveTrackGenre(
  source: Track["source"] | null | undefined,
  albumId: string | null | undefined,
): Promise<string | null> {
  if (source !== "deezer" || !albumId || !/^\\d+$/.test(albumId)) {
    return null;
  }

  const cached = genreCache.get(albumId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.genre;
  }

  try {
    const json = await fetchJson(
      `https://api.deezer.com/album/${encodeURIComponent(albumId)}`,
    );
    if (!isRecord(json) || !isRecord(json.genres) || !Array.isArray(json.genres.data)) {
      return null;
    }

    const genres = json.genres.data
      .flatMap((item) => (isRecord(item) ? [text(item.name)] : []))
      .filter((genre): genre is string => Boolean(genre))
      .slice(0, 3);
    const genre = genres.length ? genres.join(" / ").slice(0, 100) : null;

    if (genreCache.size >= CACHE_MAX) {
      const oldest = genreCache.keys().next().value;
      if (oldest !== undefined) genreCache.delete(oldest);
    }
    genreCache.set(albumId, { at: Date.now(), genre });
    return genre;
  } catch {
    // Genre is optional metadata. A temporary provider failure must not block
    // adding someone to the queue.
    return null;
  }
}

const deezer: Provider = async (query) =>
  parseDeezer(
    await fetchJson(`https://api.deezer.com/search/track?q=${encodeURIComponent(query)}&limit=${LIMIT}`),
  );

const itunes: Provider = async (query) =>
  parseItunes(
    await fetchJson(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${LIMIT}`,
    ),
  );

const PROVIDERS: Provider[] = [deezer, itunes];

// Небольшой кэш в памяти: ведущие часто ищут одно и то же, а у Deezer и iTunes есть лимиты запросов
const cache = new Map<string, { at: number; tracks: Track[] }>();

function dedupe(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    const key = `${track.artist}|${track.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchTracks(rawQuery: string): Promise<SearchResult> {
  const query = rawQuery.trim().replace(/\s+/g, " ").toLowerCase();

  const hit = cache.get(query);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { tracks: hit.tracks, failed: false };

  let answered = 0;
  let tracks: Track[] = [];

  // Идём по источникам, пока кто-то не вернёт результаты
  for (const provider of PROVIDERS) {
    try {
      tracks = dedupe(await provider(query));
      answered++;
      if (tracks.length > 0) break;
    } catch {
      // источник недоступен, пробуем следующий
    }
  }

  if (answered === 0) return { tracks: [], failed: true };

  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(query, { at: Date.now(), tracks });

  return { tracks, failed: false };
}
