import Link from "next/link";
import {
  ArrowLeftIcon,
  MicrophoneStageIcon,
} from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <MicrophoneStageIcon size={26} weight="bold" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Бункер-оке
        </p>
        <p className="mt-2 font-heading text-5xl font-bold tabular-nums">404</p>
        <h1 className="mt-3 text-lg font-semibold">Такой страницы нет</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Возможно, ссылка устарела или адрес был введён с ошибкой.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <ArrowLeftIcon size={18} weight="bold" />
          На главную
        </Link>
      </section>
    </main>
  );
}
