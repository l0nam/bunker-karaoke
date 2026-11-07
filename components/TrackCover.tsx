import { cn } from "cn";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface Props {
  src?: string | null;
  title?: string | null;
  artist?: string | null;
  size?: "sm" | "md";
  className?: string;
}

function getHighQualityCover(src: string): string {
  try {
    const url = new URL(src);
    const hostname = url.hostname.toLowerCase();

    if (hostname.endsWith(".dzcdn.net") || hostname === "dzcdn.net") {
      url.pathname = url.pathname.replace(
        /\/(?:56|250|500)x(?:56|250|500)-000000-80-0-0(?=\.(?:jpg|jpeg|png|webp)$)/i,
        "/1000x1000-000000-80-0-0",
      );
    }

    if (hostname.endsWith(".mzstatic.com") || hostname === "mzstatic.com") {
      url.pathname = url.pathname.replace(
        /\/\d+x\d+(?=[^/]*\.(?:jpg|jpeg|png|webp)$)/i,
        "/1200x1200",
      );
    }

    return url.toString();
  } catch {
    return src;
  }
}

export function TrackCover({
  src,
  title,
  artist,
  size = "md",
  className,
}: Props) {
  if (!src) return null;

  const highQualitySrc = getHighQualityCover(src);
  const trackTitle = title?.trim() || "Обложка трека";
  const trackArtist = artist?.trim();

  return (
    <Dialog>
      <DialogTrigger
        className="cursor-zoom-in rounded-lg outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Открыть обложку: ${trackTitle}`}
      >
        <Image
          src={src}
          alt={trackTitle}
          width={500}
          height={500}
          quality={85}
          className={cn(
            className,
            size === "sm" ? "size-20" : "size-25",
            "rounded-lg object-cover ring-1 ring-foreground/20",
          )}
        />
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-xl font-bold leading-tight">
            {trackTitle}
          </DialogTitle>
          <DialogDescription>{trackArtist}</DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-lg bg-muted">
          <Image
            src={highQualitySrc}
            alt={`Обложка трека ${trackTitle}`}
            fill
            sizes="(max-width: 640px) 90vw, 480px"
            quality={95}
            className="object-cover"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
