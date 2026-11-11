import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Панель ведущего · Бункер-оке",
  robots: { index: false, follow: false, nocache: true },
};

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
