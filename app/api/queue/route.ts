import { NextResponse } from "next/server";
import {
  addEntry,
  callNext,
  clearAll,
  fetchQueue,
  moveEntry,
  setKaraokeStatus,
  removeEntry,
  shiftEntry,
} from "@/lib/queue";
import { ValidationError } from "@/lib/errors";
import {
  asString,
  ensureHost,
  errorResponse,
  parseId,
  parseQueueType,
  readJson,
} from "@/lib/http";

// Публично: только чтение очереди (для публичной страницы и панели)
export async function GET() {
  try {
    return NextResponse.json(await fetchQueue());
  } catch (error) {
    return errorResponse(error);
  }
}

// Добавить человека в очередь
export async function POST(request: Request) {
  const denied = await ensureHost();
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const entry = await addEntry({
      nickname: asString(body.nickname) ?? "",
      discord_id: asString(body.discord_id) ?? null,
      song: asString(body.song) ?? null,
      song_artist: asString(body.song_artist) ?? null,
      song_url: asString(body.song_url) ?? null,
      song_cover: asString(body.song_cover) ?? null,
      queue_type: parseQueueType(body.queue_type),
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

// Действия над очередью: next | shift | move | remove
export async function PATCH(request: Request) {
  const denied = await ensureHost();
  if (denied) return denied;

  try {
    const body = await readJson(request);

    switch (body.action) {
      case "set-active": {
        if (typeof body.isActive !== "boolean") {
          throw new ValidationError("isActive должен быть boolean");
        }
        await setKaraokeStatus(body.isActive);
        return NextResponse.json({ isActive: body.isActive });
      }
      case "next": {
        const singer = await callNext();
        return NextResponse.json(singer);
      }
      case "shift": {
        if (body.direction !== "up" && body.direction !== "down") {
          throw new ValidationError("direction должен быть up или down");
        }
        await shiftEntry(parseId(body.id), body.direction);
        return NextResponse.json({ ok: true });
      }
      case "move": {
        await moveEntry(parseId(body.id), parseQueueType(body.to));
        return NextResponse.json({ ok: true });
      }
      case "remove": {
        await removeEntry(parseId(body.id));
        return NextResponse.json({ ok: true });
      }
      default:
        throw new ValidationError("Неизвестное действие");
    }
  } catch (error) {
    return errorResponse(error);
  }
}

// Очистить всё (начало нового вечера)
export async function DELETE() {
  const denied = await ensureHost();
  if (denied) return denied;

  try {
    await clearAll();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
