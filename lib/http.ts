import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/errors";
import { isHostAuthenticated } from "@/lib/auth";
import type { QueueChoice, QueueType } from "@/types/queue";

export type JsonBody = Record<string, unknown>;

export function jsonNoStore<T>(body: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  return NextResponse.json(body, { ...init, headers });
}

export async function readJson(request: Request): Promise<JsonBody> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new ValidationError("Ожидался JSON-объект");
    }
    return body as JsonBody;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("Некорректный JSON");
  }
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parseQueueType(value: unknown): QueueType {
  if (value === "main" || value === "repeat") return value;
  throw new ValidationError("Очередь должна быть main или repeat");
}

export function parseQueueChoice(value: unknown): QueueChoice {
  if (value === "auto" || value === "main" || value === "repeat") return value;
  throw new ValidationError("Очередь должна быть auto, main или repeat");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseId(value: unknown): string {
  if (typeof value === "string" && UUID.test(value)) return value;
  throw new ValidationError("Некорректный id записи");
}

export function unauthorized() {
  return jsonNoStore(
    { error: "Нужно войти в панель ведущего" },
    { status: 401 },
  );
}

export function errorResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return jsonNoStore({ error: error.message }, { status: 400 });
  }
  console.error("Unhandled API error:", error);
  return jsonNoStore(
    { error: "Внутренняя ошибка сервера" },
    { status: 500 },
  );
}

export async function ensureHost(): Promise<NextResponse | null> {
  return (await isHostAuthenticated()) ? null : unauthorized();
}
