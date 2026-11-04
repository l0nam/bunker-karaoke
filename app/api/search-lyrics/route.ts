import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist")?.trim();
  const title = searchParams.get("title")?.trim();

  if (!artist || !title) {
    return NextResponse.json(
      { error: "Не указан исполнитель или название песни" },
      { status: 400 },
    );
  }

  const token = process.env.GENIUS_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "GENIUS_ACCESS_TOKEN не задан" },
      { status: 500 },
    );
  }

  const query = `${artist} ${title}`;
  const url = `https://api.genius.com/search?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Genius API error:", response.status, text);

      return NextResponse.json(
        { error: `Ошибка Genius API (${response.status})` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const hits = data.response?.hits ?? [];
    const songUrl = hits[0]?.result?.url ?? null;

    if (!songUrl) {
      return NextResponse.json({
        url: null,
        message: "Песня не найдена",
      });
    }

    return NextResponse.json({ url: songUrl });
  } catch (error) {
    console.error("Genius search failed:", error);

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return NextResponse.json(
        { error: "Genius API не ответил вовремя" },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
