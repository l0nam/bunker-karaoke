import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PwaRegister } from "@/components/PwaRegister";

const manropeHeading = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-heading",
});

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Бункер-оке · Караоке Bunker Online",
  description: "Живая очередь караоке Bunker Online, выступления, песенный архив и кабинет ведущего.",
  applicationName: "Бункер-оке",
  manifest: "/manifest.webmanifest",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Бункер-оке",
    title: "Бункер-оке · Караоке Bunker Online",
    description: "Живая очередь караоке и песенный архив Bunker Online.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#121114" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={cn(
        "h-full antialiased font-sans",
        inter.variable,
        manropeHeading.variable,
      )}
    >
      <body className="min-h-full">
        <ThemeProvider>
          {children}
          <Toaster />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
