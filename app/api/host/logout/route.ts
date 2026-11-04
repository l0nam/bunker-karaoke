import { NextResponse } from "next/server";
import { HOST_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete({ name: HOST_COOKIE, path: "/" });
  return response;
}
