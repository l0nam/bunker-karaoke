import { NextResponse } from "next/server";
import { checkPassword, createSessionToken, HOST_COOKIE, hostCookieOptions } from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const password = typeof body.password === "string" ? body.password : "";

    if (!password || !checkPassword(password)) {
      return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(HOST_COOKIE, createSessionToken(), hostCookieOptions);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
