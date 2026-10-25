import type { MetadataRoute } from "next";

import { loadConfig } from "@/src/config";
import { thesisSlugs } from "@/src/theses/folder";
import { loadSnapshot } from "@/src/views/snapshot";

export const dynamic = "force-dynamic";

const PAGES = [
  "/",
  "/investability",
  "/holders",
  "/macro",
  "/theses",
  "/brief",
  "/data",
  "/privacy",
] as const;

/**
 * The pages worth finding: the section pages, one page per company in the
 * latest register and one per thesis. Holder pages are reached from the
 * holders index, which lists every one of them, so they are not repeated here.
 * Both languages share each URL, so there is one entry per page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const config = loadConfig();
  const snapshot = loadSnapshot(config.databasePath);
  const latest = snapshot?.months[0];
  const codes = latest
    ? [...(snapshot?.companies.get(latest.recordDate)?.keys() ?? [])].sort()
    : [];
  const paths = [
    ...PAGES,
    ...codes.map((code) => `/t/${code}`),
    ...thesisSlugs(config.thesesDirectory).map((slug) => `/theses/${slug}`),
  ];
  return paths.map((path) => ({ url: `${config.origin}${path}` }));
}
