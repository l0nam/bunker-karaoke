import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Бункер-оке · Караоке Bunker Online",
    short_name: "Бункер-оке",
    description: "Живая очередь караоке, выступления и панель ведущего Bunker Online.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f7f4f5",
    theme_color: "#f7f4f5",
    lang: "ru",
    categories: ["music", "entertainment", "social"],
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
