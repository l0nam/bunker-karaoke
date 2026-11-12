import { NextResponse } from "next/server";

interface GeniusHit {
  type?: string;
  result?: {
    url?: string | null;
  } | null;
}

function isGeniusSongUrl(value: string | null | undefined): value is string {
  if (!value) return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "genius.com" || url.hostname.endsWith(".genius.com"))
    );
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist")?.trim();
  const title = searchParams.get("title")?.trim();
  const shouldRedirect = searchParams.get("redirect") === "1";

  if (!title) {
    return NextResponse.json(
      { error: "Не указано название песни" },
      { status: 400 },
    );
  }

  const query = [artist, title].filter(Boolean).join(" ");
  const searchUrl = `https://genius.com/search?q=${encodeURIComponent(query)}`;
  const token = process.env.GENIUS_ACCESS_TOKEN;

  if (!token) {
    if (shouldRedirect) {
      return NextResponse.redirect(searchUrl, 302);
    }

    return NextResponse.json(
      {
        error: "GENIUS_ACCESS_TOKEN не задан",
        url: searchUrl,
      },
      { status: 500 },
    );
  }

  const apiUrl = `https://api.genius.com/search?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error("Genius API error:", response.status, details);

      if (shouldRedirect) {
        return NextResponse.redirect(searchUrl, 302);
      }

      return NextResponse.json(
        {
          error: `Ошибка Genius API (${response.status})`,
          url: searchUrl,
        },
        { status: 502 },
      );
    }

    const data: unknown = await response.json();
    const hits = (
      data &&
      typeof data === "object" &&
      "response" in data &&
      data.response &&
      typeof data.response === "object" &&
      "hits" in data.response &&
      Array.isArray(data.response.hits)
        ? data.response.hits
        : []
    ) as GeniusHit[];

    // Берём именно песню, а не любой результат поиска Genius.
    const songUrl =
      hits.find(
        (hit) => hit.type === "song" && isGeniusSongUrl(hit.result?.url),
      )?.result?.url ?? null;

    // Даже если точного совпадения нет, возвращаем рабочую ссылку на поиск Genius.
    const destination = songUrl ?? searchUrl;

    if (shouldRedirect) {
      return NextResponse.redirect(destination, 302);
    }

    return NextResponse.json({
      url: destination,
      found: songUrl !== null,
      message: songUrl
        ? undefined
        : "Точная песня не найдена, открыт поиск Genius",
    });
  } catch (error) {
    console.error("Genius search failed:", error);

    // Если API Genius недоступен, хотя бы откроем обычный поиск по песне.
    if (shouldRedirect) {
      return NextResponse.redirect(searchUrl, 302);
    }

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return NextResponse.json(
        {
          error: "Genius API не ответил вовремя",
          url: searchUrl,
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
        url: searchUrl,
      },
      { status: 500 },
    );
  }
}
