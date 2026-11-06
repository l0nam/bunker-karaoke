import type { Metadata } from "next";
import { PublicArchive } from "@/components/public/PublicArchive";

export const metadata: Metadata = {
  title: "Песенный архив · Бункер-оке",
  description:
    "История выступлений, песни и исполнители вечеров Бункер-оке.",
};

export default function ArchivePage() {
  return <PublicArchive />;
}
