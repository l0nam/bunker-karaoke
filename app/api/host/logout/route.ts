import { jsonNoStore } from "@/lib/http";
import { HOST_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = jsonNoStore({ ok: true });
  response.cookies.delete({ name: HOST_COOKIE, path: "/" });
  return response;
}
