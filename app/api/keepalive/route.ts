import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// Раз в несколько дней Vercel Cron дёргает этот адрес.
// Один лёгкий запрос к базе не даёт бесплатному Supabase уснуть от бездействия.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await createServerClient()
    .from("queue_entries")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
