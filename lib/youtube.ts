const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeVideoId(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (VIDEO_ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const allowedHost =
    host === "youtu.be" ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube-nocookie.com");

  if (!allowedHost) return null;

  let videoId: string | null = null;
  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  } else {
    videoId =
      url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] ?? null;
  }

  return videoId && VIDEO_ID.test(videoId) ? videoId : null;
}

export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}
