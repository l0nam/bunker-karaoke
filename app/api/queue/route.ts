import { ValidationError } from "@/lib/errors";
import {
  addEntry,
  addEntriesBulk,
  callNext,
  clearAll,
  fetchQueue,
  finishKaraokeSession,
  moveEntry,
  setKaraokeStatus,
  removeEntry,
  shiftEntry,
  startKaraokeSession,
} from "@/lib/queue";
import {
  asString,
  ensureHost,
  errorResponse,
  jsonNoStore,
  parseId,
  parseQueueChoice,
  parseQueueType,
  readJson,
} from "@/lib/http";

export async function GET() {
  try {
    return jsonNoStore(await fetchQueue());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const denied = await ensureHost();
  if (denied) return denied;

  try {
    const body = await readJson(request);
    if (Array.isArray(body.nicknames)) {
      if (!body.nicknames.every((name): name is string => typeof name === "string")) {
        throw new ValidationError("Список должен содержать только строки");
      }
      const requested = body.nicknames.length;
      const entries = await addEntriesBulk(body.nicknames);
      const main = entries.filter((entry) => entry.queue_type === "main").length;
      const repeat = entries.length - main;
      return jsonNoStore(
        { entries, requested, added: entries.length, skippedDuplicates: requested - entries.length, main, repeat },
        { status: 201 },
      );
    }

    const entry = await addEntry({
      nickname: asString(body.nickname) ?? "",
      discord_id: asString(body.discord_id) ?? null,
      song: asString(body.song) ?? null,
      song_artist: asString(body.song_artist) ?? null,
      song_url: asString(body.song_url) ?? null,
      song_cover: asString(body.song_cover) ?? null,
      song_genre: asString(body.song_genre) ?? null,
      song_source: body.song_source === "deezer" || body.song_source === "itunes" ? body.song_source : null,
      song_album_id: asString(body.song_album_id) ?? null,
      queue_type: parseQueueChoice(body.queue_type ?? "auto"),
    });
    return jsonNoStore(entry, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const denied = await ensureHost();
  if (denied) return denied;

  try {
    const body = await readJson(request);
    switch (body.action) {
      case "start-session":
        await startKaraokeSession();
        return jsonNoStore({ ok: true, isActive: true });
      case "finish-session":
        await finishKaraokeSession();
        return jsonNoStore({ ok: true, isActive: false });
      case "set-active":
        if (typeof body.isActive !== "boolean") throw new ValidationError("isActive должен быть boolean");
        await setKaraokeStatus(body.isActive);
        return jsonNoStore({ isActive: body.isActive });
      case "next":
        return jsonNoStore(await callNext());
      case "shift":
        if (body.direction !== "up" && body.direction !== "down") throw new ValidationError("direction должен быть up или down");
        await shiftEntry(parseId(body.id), body.direction);
        return jsonNoStore({ ok: true });
      case "move":
        await moveEntry(parseId(body.id), parseQueueType(body.to));
        return jsonNoStore({ ok: true });
      case "remove":
        await removeEntry(parseId(body.id));
        return jsonNoStore({ ok: true });
      default:
        throw new ValidationError("Неизвестное действие");
    }
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  const denied = await ensureHost();
  if (denied) return denied;
  try {
    await clearAll();
    return jsonNoStore({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
