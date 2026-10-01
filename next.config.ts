import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La app es una SPA de cliente montada bajo /, servida por el App Router.
  // La API vive en src/app/api/** como route handlers.
  reactStrictMode: false,
  serverExternalPackages: ["@google/genai", "@neondatabase/serverless", "pg", "pdfjs-dist"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
