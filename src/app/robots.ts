import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL || BRAND.url;
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/tree", "/find", "/matches", "/settings", "/onboarding", "/verify", "/auth/", "/welcome", "/forgot", "/reset", "/unsubscribe"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
