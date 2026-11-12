import { connection, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ValidationError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";

const PAGE_SIZE = 25;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanSearch(value: string | null): string {
  // .or() accepts PostgREST filter syntax, so remove punctuation that could
  // alter the expression. Letters from all alphabets, digits and spaces remain.
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export async function GET(request: Request) {
  await connection();
  try {
    const url = new URL(request.url);
    const search = cleanSearch(url.searchParams.get("q"));
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const page =
      Number.isInteger(requestedPage) && requestedPage > 0
        ? Math.min(requestedPage, 10_000)
        : 1;
    const sessionFilter = url.searchParams.get("session") ?? "all";

    if (
      sessionFilter !== "all" &&
      sessionFilter !== "legacy" &&
      !UUID.test(sessionFilter)
    ) {
      throw new ValidationError("Некорректный фильтр вечера");
    }

    const supabase = createServerClient();

    const [
      { data: regularSessions, error: sessionsError },
      { data: legacySession, error: legacyError },
      { count: performanceCount, error: performanceError },
      { count: songCount, error: songError },
      { count: sessionCount, error: sessionCountError },
    ] = await Promise.all([
      supabase
        .from("karaoke_sessions")
        .select("id, started_at, ended_at, is_legacy")
        .eq("is_legacy", false)
        .order("started_at", { ascending: false })
        .limit(500),
      supabase
        .from("karaoke_sessions")
        .select("id, started_at, ended_at, is_legacy")
        .eq("is_legacy", true)
        .maybeSingle(),
      supabase
        .from("karaoke_session_entries")
        .select("id", { count: "exact", head: true })
        .eq("result", "performed"),
      supabase
        .from("karaoke_session_entries")
        .select("id", { count: "exact", head: true })
        .eq("result", "performed")
        .not("song", "is", null),
      supabase
        .from("karaoke_sessions")
        .select("id", { count: "exact", head: true })
        .eq("is_legacy", false),
    ]);

    if (sessionsError) throw new Error(sessionsError.message);
    if (legacyError) throw new Error(legacyError.message);
    if (performanceError) throw new Error(performanceError.message);
    if (songError) throw new Error(songError.message);
    if (sessionCountError) throw new Error(sessionCountError.message);

    const sessions = [
      ...(regularSessions ?? []),
      ...(legacySession ? [legacySession] : []),
    ];

    let query = supabase
      .from("karaoke_session_entries")
      .select(
        "id, session_id, nickname, song, song_artist, song_url, song_cover, queue_type, result, queued_at, performed_at",
        { count: "exact" },
      )
      .eq("result", "performed");

    if (sessionFilter === "legacy") {
      if (!legacySession) {
        return NextResponse.json(
          {
            sessions,
            entries: [],
            total: 0,
            page,
            pageSize: PAGE_SIZE,
            stats: {
              performances: performanceCount ?? 0,
              songs: songCount ?? 0,
              evenings: sessionCount ?? 0,
            },
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      query = query.eq("session_id", legacySession.id);
    } else if (sessionFilter !== "all") {
      query = query.eq("session_id", sessionFilter);
    }

    if (search) {
      const pattern = "%" + search + "%";
      query = query.or(
        "nickname.ilike." +
          pattern +
          ",song.ilike." +
          pattern +
          ",song_artist.ilike." +
          pattern,
      );
    }

    const from = (page - 1) * PAGE_SIZE;
    const { data: entries, count, error: entriesError } = await query
      .order("performed_at", { ascending: false, nullsFirst: false })
      .order("queued_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (entriesError) throw new Error(entriesError.message);

    return NextResponse.json(
      {
        sessions,
        entries: entries ?? [],
        total: count ?? 0,
        page,
        pageSize: PAGE_SIZE,
        stats: {
          performances: performanceCount ?? 0,
          songs: songCount ?? 0,
          evenings: sessionCount ?? 0,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
