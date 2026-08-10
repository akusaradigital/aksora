import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://aksora.akusaraproject.my.id";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/admin/", "/activity-log"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
