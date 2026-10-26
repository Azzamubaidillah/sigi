import type { MetadataRoute } from "next";

import { loadConfig } from "@/src/config";

export const dynamic = "force-dynamic";

/**
 * What crawlers may fetch once the site is public (PRD M6). `/lang` only sets
 * a cookie and `/search` only redirects, so neither has anything to index. Until launch the web
 * server's `X-Robots-Tag: noindex` header (DECISIONS D-020) overrides this.
 */
export default function robots(): MetadataRoute.Robots {
  const { origin } = loadConfig();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/lang", "/search"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
