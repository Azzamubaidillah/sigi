/**
 * Publisher headlines for the daily brief (PRD F12, DATA-SOURCES S10):
 * headline, publisher, time and link only, never article text. One feed so
 * far: the other Indonesian publishers' feeds answered 403 to the host on
 * 2026-10-25.
 */
export const NEWS_FEED = "news-cnbc-market";

export const NEWS_SOURCE = {
  publisher: "CNBC Indonesia",
  title: "CNBC Indonesia market news (RSS)",
  url: "https://www.cnbcindonesia.com/market/rss",
} as const;

/** Headlines older than this are deleted at each check. */
export const NEWS_RETENTION_DAYS = 30;
