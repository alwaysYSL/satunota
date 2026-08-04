import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SATUNOTA — Pembuat Nota, Invoice & Kwitansi",
    short_name: "SATUNOTA",
    description: "Aplikasi web pembuat nota, invoice, dan kwitansi offline-first.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#2383E2",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  }
}
