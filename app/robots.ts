import type { MetadataRoute } from "next";
import { getConfig } from "@/lib/server/config";

export default function robots(): MetadataRoute.Robots {
  const { appUrl } = getConfig();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/pay", "/api"],
    },
    host: appUrl,
  };
}
