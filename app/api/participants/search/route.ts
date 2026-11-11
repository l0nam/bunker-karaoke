import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ensureHost, errorResponse, jsonNoStore } from "@/lib/http";

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function GET(request: Request) {
  const denied = await ensureHost();
  if (denied) return denied;

  try {
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      return jsonNoStore({ participants: [] });
    }

    if (query.length > 40) {
      return NextResponse.json({ participants: [] });
    }

    const pattern = `${escapeLike(query.toLowerCase())}%`;

    const { data, error } = await createServerClient()
      .from("participants")
      .select("id, nickname, discord_id")
      .ilike("nickname_key", pattern)
      .order("nickname_key", { ascending: true })
      .limit(8);

    if (error) throw error;

    return jsonNoStore({ participants: data ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}