import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Support static export if Tauri desktop packaging is run in standalone mode
  // output: process.env.TAURI_BUILD ? 'export' : undefined,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
