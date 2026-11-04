import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const HOST_COOKIE = "host_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // неделя

// Секрет для подписи токенов. Если SESSION_SECRET не задан, берём HOST_PASSWORD.
function getSecret(): string | null {
  return process.env.SESSION_SECRET || process.env.HOST_PASSWORD || null;
}

// Сравнение строк без утечки времени. Хэши всегда одинаковой длины,
// поэтому timingSafeEqual не выбросит ошибку и не выдаст длину пароля.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function checkPassword(input: string): boolean {
  const pass = process.env.HOST_PASSWORD;
  if (!pass) return false;
  return safeEqual(input, pass);
}

// Токен: "<срок_истечения_в_мс>.<случайная_строка>.<подпись>"
export function createSessionToken(): string {
  const secret = getSecret();
  if (!secret) throw new Error("Не задан SESSION_SECRET или HOST_PASSWORD");

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const data = `${expiresAt}.${randomBytes(16).toString("base64url")}`;
  return `${data}.${sign(data, secret)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;

  const secret = getSecret();
  if (!secret) return false;

  const cut = token.lastIndexOf(".");
  if (cut <= 0) return false;

  const data = token.slice(0, cut);
  const signature = token.slice(cut + 1);
  if (!safeEqual(signature, sign(data, secret))) return false;

  // Подпись верна, теперь проверяем срок
  const expiresAt = Number(data.split(".")[0]);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export async function isHostAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(HOST_COOKIE)?.value);
}

export const hostCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_TTL_MS / 1000,
};
