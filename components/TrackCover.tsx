import { cn } from "cn";
import Image from "next/image";

interface Props {
  src?: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function TrackCover({ src, size = "md", className }: Props) {
  if (!src) return null;

  return (
    <Image
      src={src}
      alt="Обложка трека"
      width={500}
      height={500}
      className={cn(
        className,
        size === "sm" ? "size-20" : "size-25",
        "rounded-lg object-cover ring-1 ring-foreground/20",
      )}
    />
  );
}
