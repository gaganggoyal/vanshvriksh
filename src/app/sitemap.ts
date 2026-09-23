import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || BRAND.url;
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
