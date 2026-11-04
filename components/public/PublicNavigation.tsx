import Link from "next/link";
import { cn } from "cn";

type Props = {
  active: "home" | "archive";
};

const linkClass =
  "rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-foreground";

export function PublicNavigation({ active }: Props) {
  return (
    <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
      <Link
        href="/"
        className="font-heading text-sm font-bold uppercase tracking-[0.18em] text-foreground"
      >
        Bunker Karaoke
      </Link>

      <nav aria-label="Основная навигация" className="flex items-center gap-1">
        <Link
          href="/"
          aria-current={active === "home" ? "page" : undefined}
          className={cn(
            linkClass,
            active === "home"
              ? "bg-white/10 text-foreground"
              : "text-muted-foreground",
          )}
        >
          Сейчас
        </Link>
        <Link
          href="/archive"
          aria-current={active === "archive" ? "page" : undefined}
          className={cn(
            linkClass,
            active === "archive"
              ? "bg-white/10 text-foreground"
              : "text-muted-foreground",
          )}
        >
          Песенный архив
        </Link>
      </nav>
    </header>
  );
}
