import { NextResponse } from "next/server";

export async function GET() {
  const manifest = {
    name: "Aksora",
    short_name: "Aksora",
    description: "Aksora — One Team. One Flow. Workflow & issue tracking for teams.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
