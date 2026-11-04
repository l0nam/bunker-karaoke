import Link from "next/link";
import { cn } from "cn";

type Props = {
  active: "home" | "archive";
};

export function PublicNavigation({ active }: Props) {
  return (
    <header className="absolute top-5 flex w-full justify-between max-w-6xl mx-auto">
      <Link href="/" className="font-heading font-bold">
        Bunker Karaoke
      </Link>

      <nav aria-label="Основная навигация" className="flex items-center gap-1">
        <Link
          href="/"
          aria-current={active === "home" ? "page" : undefined}
          className={cn(
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
