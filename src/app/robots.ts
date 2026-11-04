import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Public pages may be crawled; the signed-in app and the API may not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms"],
      disallow: ["/api/", "/unsubscribe", "/today", "/habits", "/calendar", "/reviews", "/analytics", "/workouts", "/nutrition", "/settings"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
