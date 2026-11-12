import { ensureHost, errorResponse, jsonNoStore } from "@/lib/http";
import { searchTracks } from "@/lib/tracks";

// Подсказки треков для панели ведущего.
// Закрыто паролем, чтобы сайт не использовали как бесплатный прокси к музыкальным API.
export async function GET(request: Request) {
  const denied = await ensureHost();
  if (denied) return denied;

  try {
    const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
    if (query.length < 2) return jsonNoStore({ tracks: [], failed: false });

    return jsonNoStore(await searchTracks(query.slice(0, 80)));
  } catch (error) {
    return errorResponse(error);
  }
}
