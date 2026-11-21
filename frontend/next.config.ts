import type { NextConfig } from "next";

const assistantUrl = (
  process.env.JARVIS_ASSISTANT_URL ??
  `http://127.0.0.1:${process.env.JARVIS_PORT ?? "8787"}`
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  experimental: { externalDir: true },
  async rewrites() {
    return [
      {
        source: "/jarvis-widget.js",
        destination: `${assistantUrl}/jarvis.js`,
      },
      {
        source: "/api/assistant/:path*",
        destination: `${assistantUrl}/api/assistant/:path*`,
      },
    ];
  },
};

export default nextConfig;
