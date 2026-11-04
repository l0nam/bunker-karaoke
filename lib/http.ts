import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/errors";
import { isHostAuthenticated } from "@/lib/auth";
import type { QueueType } from "@/types/queue";

export type JsonBody = Record<string, unknown>;

export async function readJson(request: Request): Promise<JsonBody> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null) {
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseId(value: unknown): string {
  if (typeof value === "string" && UUID.test(value)) return value;
  throw new ValidationError("Некорректный id записи");
}

export function unauthorized() {
  return NextResponse.json(
    { error: "Нужно войти в панель ведущего" },
    { status: 401 },
  );
}

export function errorResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(error);
  const message =
    error instanceof Error ? error.message : "Внутренняя ошибка сервера";
  return NextResponse.json({ error: message }, { status: 500 });
}

// Проверка сессии для защищённых route handlers. Возвращает ответ с ошибкой или null.
export async function ensureHost(): Promise<NextResponse | null> {
  return (await isHostAuthenticated()) ? null : unauthorized();
}
