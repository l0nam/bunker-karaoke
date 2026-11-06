"use client";

import type { QueueEntry, QueueType } from "@/types/queue";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsLeftRightIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { QueueRow } from "./QueueRow";

interface Props {
  title: string;
  hint: string;
  items: QueueEntry[];
  busy: boolean;
  moveTo: QueueType;
  onShift: (id: string, direction: "up" | "down") => void;
  onMove: (id: string, to: QueueType) => void;
  onRemove: (id: string) => void;
}

export function QueueColumn({
  title,
  hint,
  items,
  busy,
  moveTo,
  onShift,
  onMove,
  onRemove,
}: Props) {
  const moveLabel =
    moveTo === "repeat" ? "Перенести в повторные" : "Перенести в основную";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction className="grid size-7 place-items-center rounded bg-muted">
          {items.length}
        </CardAction>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="mx-auto py-3 text-sm text-muted-foreground">Пусто</p>
        ) : (
          <ol className="space-y-2">
            {items.map((entry, index) => (
              <li key={entry.id} className="list-none">
                <QueueRow
                  entry={entry}
                  index={index + 1}
                  actions={
                    <div className="flex items-center gap-0.5">
                      <IconButton
                        label="Выше"
                        disabled={busy || index === 0}
                        onClick={() => onShift(entry.id, "up")}
                      >
                        <ArrowUpIcon />
                      </IconButton>

                      <IconButton
                        label="Ниже"
                        disabled={busy || index === items.length - 1}
                        onClick={() => onShift(entry.id, "down")}
                      >
                        <ArrowDownIcon />
                      </IconButton>

                      <IconButton
                        label={moveLabel}
                        disabled={busy}
                        onClick={() => onMove(entry.id, moveTo)}
                      >
                        <ArrowsLeftRightIcon />
                      </IconButton>

                      <IconButton
                        label="Удалить"
                        disabled={busy}
                        tone="danger"
                        onClick={() => onRemove(entry.id)}
                      >
                        <TrashIcon />
                      </IconButton>
                    </div>
                  }
                />
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-1.5 transition disabled:opacity-30 ${
        tone === "danger"
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
