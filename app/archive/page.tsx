import type { Metadata } from "next";
import { PublicArchive } from "@/components/public/PublicArchive";

export const metadata: Metadata = {
  title: "Песенный архив · Bunker Karaoke",
  description:
    "История выступлений, песни и исполнители вечеров Bunker Karaoke.",
};

export default function ArchivePage() {
  return <PublicArchive />;
}
