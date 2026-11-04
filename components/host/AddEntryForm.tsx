"use client";

import { useRef, useState } from "react";
import { UserPlusIcon, UsersIcon } from "@phosphor-icons/react";
import { notifyError } from "@/components/ui/toast";
import { SongAutocomplete } from "@/components/host/SongAutocomplete";
import type { QueueType, Track } from "@/types/queue";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Field, FieldContent, FieldLabel } from "../ui/field";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { ParticipantAutocomplete } from "./ParticipantAutocomplete";

type Choice = "auto" | QueueType;

export interface AddEntryInput {
  nickname: string;
  discord_id: string;
  song: string;
  song_artist: string;
  song_url: string;
  song_cover: string;
  queue_type: QueueType;
}

interface Props {
  hasSungBefore: (nickname: string) => boolean;
  onAdd: (input: AddEntryInput) => Promise<boolean>;
  onBulkAdd: (nicknames: string[]) => Promise<boolean>;
  busy: boolean;
}

const DISCORD_ID = /^\d{15,25}$/;

const inputClass =
  "w-full rounded-xl bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-700 placeholder:text-zinc-500 focus:ring-pink-500";

export function AddEntryForm({ hasSungBefore, onAdd, onBulkAdd, busy }: Props) {
  const nicknameRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [song, setSong] = useState("");
  const [track, setTrack] = useState<Track | null>(null);
  const [choice, setChoice] = useState<Choice>("auto");
  const [bulk, setBulk] = useState("");

  const trimmed = nickname.trim();
  const suggestRepeat = trimmed !== "" && hasSungBefore(trimmed);
  const resolvedQueue: QueueType =
    choice === "auto" ? (suggestRepeat ? "repeat" : "main") : choice;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || busy) return;

    const id = discordId.trim();
    if (id && !DISCORD_ID.test(id)) {
      notifyError(new Error("Discord ID — число из 15–25 цифр"), "Проверь ID");
      return;
    }

    const ok = await onAdd({
      nickname: trimmed,
      discord_id: id,
      song: track ? track.title : song.trim(),
      song_artist: track?.artist ?? "",
      song_url: track?.url ?? "",
      song_cover: track?.cover ?? "",
      queue_type: resolvedQueue,
    });

    if (ok) {
      setNickname("");
      setDiscordId("");
      setSong("");
      setTrack(null);
    }
    nicknameRef.current?.focus();
  }

  async function submitBulk(e: React.FormEvent) {
    e.preventDefault();
    const names = bulk
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0 || busy) return;

    const ok = await onBulkAdd(names);
    if (ok) setBulk("");
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlusIcon className="size-4" weight="bold" /> Записать участника
          </CardTitle>

          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5"
                >
                  <UsersIcon weight="bold" />
                  Списком
                </Button>
              }
            />

            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  Добавить списком
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={submitBulk} className="space-y-3">
                <Textarea
                  value={bulk}
                  onChange={(e) => setBulk(e.target.value)}
                  rows={5}
                  placeholder={"Ники в строку:\nlonam\ncrazy\ndobribog"}
                  className="min-h-40 max-h-60"
                />

                <DialogClose
                  className="w-full"
                  render={
                    <Button
                      className="w-full"
                      disabled={busy || !bulk.trim()}
                      variant={busy || !bulk.trim() ? "secondary" : "default"}
                      type="submit"
                    >
                      Добавить всех
                    </Button>
                  }
                />

                <p className="text-xs text-center text-muted-foreground">
                  Уже выступавшие попадут в повторные, остальные — в основную.
                </p>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="space-y-2.5">
            {/* Никнейм */}
            <Field className="gap-1.5">
              <FieldLabel htmlFor="nickname-input">
                Никнейм <span className="text-destructive">*</span>
              </FieldLabel>

              <FieldContent>
                <ParticipantAutocomplete
                  value={nickname}
                  onValueChange={setNickname}
                  onDiscordIdChange={setDiscordId}
                  inputRef={nicknameRef}
                />
              </FieldContent>
            </Field>

            {/* Тип очереди */}
            <Field className="gap-1.5">
              <div className="flex items-center justify-between">
                <FieldLabel>Очередь</FieldLabel>

                <span className="text-xs text-muted-foreground">
                  {choice === "auto"
                    ? `Авто · ${resolvedQueue === "repeat" ? "Повторная" : "Основная"}`
                    : "Выбрана вручную"}
                </span>
              </div>

              <FieldContent>
                <Tabs
                  value={choice}
                  onValueChange={(value) => setChoice(value as Choice)}
                  className="w-full"
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="auto">Авто</TabsTrigger>
                    <TabsTrigger value="main">Основная</TabsTrigger>
                    <TabsTrigger value="repeat">Повторная</TabsTrigger>
                  </TabsList>
                </Tabs>
              </FieldContent>
            </Field>

            {/* Discord Id */}
            <Field className="min-w-0 gap-1.5">
              <FieldLabel htmlFor="discord-id-input">Discord ID</FieldLabel>

              <FieldContent>
                <Input
                  id="discord-id-input"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                  placeholder="Необязательно"
                  inputMode="numeric"
                  className="min-w-0"
                />
              </FieldContent>
            </Field>

            {/* Трек */}
            <Field>
              <FieldLabel>Трек</FieldLabel>

              <FieldContent>
                <SongAutocomplete
                  value={song}
                  onValueChange={setSong}
                  track={track}
                  onTrackChange={setTrack}
                />
              </FieldContent>
            </Field>

            <Button
              type="submit"
              disabled={busy || !trimmed}
              className="w-full mt-2"
            >
              Добавить
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
