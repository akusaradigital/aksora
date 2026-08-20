import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: ["pdfkit", "exceljs"],
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "recharts"],
  },
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
    {
      // Static assets — aggressive caching
      source: "/:path*.(svg|png|jpg|jpeg|webp|ico|woff2|woff|ttf)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://www.gstatic.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://www.gstatic.com https://lh3.googleusercontent.com",
            "font-src 'self' data:",
            "connect-src 'self' https://accounts.google.com https://www.gstatic.com",
            "frame-src 'self' https://accounts.google.com https://www.gstatic.com",
            "frame-ancestors 'none'",
          ].join("; "),
        },
      ],
    },
  ],
};

export default bundleAnalyzer(nextConfig);
