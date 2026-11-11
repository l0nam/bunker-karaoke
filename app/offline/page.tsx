import Link from "next/link";
import { WifiSlashIcon, HouseIcon } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Нет подключения · Бункер-оке",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <WifiSlashIcon size={26} weight="bold" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Бункер-оке
        </p>
        <h1 className="mt-2 font-heading text-2xl font-bold">Нет подключения</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Похоже, интернет временно недоступен. Публичная очередь обновится после восстановления соединения.
          Кабинет ведущего и действия с очередью доступны только онлайн.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <HouseIcon size={18} weight="bold" />
          Повторить попытку
        </Link>
      </section>
    </main>
  );
}
