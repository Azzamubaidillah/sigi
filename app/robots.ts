import type { MetadataRoute } from "next";

import { loadConfig } from "@/src/config";

export const dynamic = "force-dynamic";

/**
 * What crawlers may fetch once the site is public (PRD M6). `/lang` only sets
 * a cookie and `/search` only redirects, so neither has anything to index. The site
 * has been open to search engines since the launch (DECISIONS D-028).
 */
export default function robots(): MetadataRoute.Robots {
  const { origin } = loadConfig();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/lang", "/search"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
