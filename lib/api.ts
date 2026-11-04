// Небольшая обёртка над fetch для клиентских компонентов.
// Бросает ошибку с понятным текстом, если сервер ответил не 2xx.

export class ApiError extends Error {}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export async function api<T>(
  url: string,
  method: Method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal,
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? `Ошибка ${res.status}`);
  return data as T;
}
