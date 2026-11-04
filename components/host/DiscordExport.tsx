"use client";

import { useState } from "react";
import { buildQueueMessages } from "@/lib/discord";
import { notifyError, notifySuccess } from "@/components/ui/toast";
import type { QueueEntry } from "@/types/queue";
import { ChatIcon, CopyIcon } from "@phosphor-icons/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";

interface Props {
  main: QueueEntry[];
  repeat: QueueEntry[];
  singing: QueueEntry | null;
}

export function DiscordExport({ main, repeat, singing }: Props) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messages = buildQueueMessages(main, repeat, singing);

  async function copy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      notifySuccess("Скопировано", "Вставляй в чат Discord");
      setTimeout(() => setCopiedIndex((c) => (c === index ? null : c)), 2000);
    } catch (e) {
      notifyError(e, "Не удалось скопировать");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChatIcon className="size-4" weight="bold" /> Сообщения для Discord
        </CardTitle>
        <CardDescription>
          Текст уже с пингами (если указан discord id). Если очередь длинная,
          она разбивается на несколько сообщений.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {messages.map((message, i) => (
          <article
            key={i}
            className="overflow-hidden rounded-lg bg-background ring-1 ring-foreground/20"
          >
            <header className="flex items-center justify-between gap-3 border-b border-foreground/20 px-4 py-2.5 text-xs">
              <span className="tabular-nums">
                Сообщение {i + 1} из {messages.length} · {message.length}/2000
              </span>
              <Button
                onClick={() => copy(message, i)}
                variant="secondary"
                size="sm"
              >
                <CopyIcon weight="bold" />
                {copiedIndex === i ? "Скопировано" : "Скопировать"}
              </Button>
            </header>
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap wrap-break-word p-4 font-sans text-sm leading-relaxed text-zinc-200">
              {message}
            </pre>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
