import type { NextConfig } from "next";

const publicHost = process.env.STORAGE_PUBLIC_BASE_URL
  ? new URL(process.env.STORAGE_PUBLIC_BASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: publicHost
      ? [
          {
            protocol: "https",
            hostname: publicHost,
          },
        ]
      : [],
  },
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
