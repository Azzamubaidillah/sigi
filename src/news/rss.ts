/**
 * Headlines from an RSS 2.0 feed: title, link and time of each item, and
 * nothing else (DATA-SOURCES S10 allows no article text). A feed with no
 * readable item is an error, so a changed format shows on /data instead of
 * passing as a quiet day.
 */

export interface Headline {
  title: string;
  url: string;
  publishedAt: number;
}

const MAX_ITEMS = 200;
const MAX_TITLE = 300;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function textOf(raw: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  const text = cdata
    ? cdata[1]!
    : raw.replace(
        /&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi,
        (entity) =>
          ENTITIES[entity.toLowerCase()] ??
          String.fromCodePoint(
            entity[2]?.toLowerCase() === "x"
              ? parseInt(entity.slice(3, -1), 16)
              : parseInt(entity.slice(2, -1), 10),
          ),
      );
  return text.replace(/\s+/g, " ").trim();
}

function element(item: string, name: string): string | null {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(
    item,
  );
  return match ? textOf(match[1]!) : null;
}

export function parseRss(xml: string): Headline[] {
  const items = [
    ...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/g),
  ].slice(0, MAX_ITEMS);
  const headlines: Headline[] = [];
  for (const [, item = ""] of items) {
    const title = element(item, "title");
    const url = element(item, "link");
    const date = element(item, "pubDate");
    const publishedAt = date === null ? Number.NaN : Date.parse(date);
    if (
      !title ||
      title.length > MAX_TITLE ||
      !url ||
      !/^https?:\/\//i.test(url) ||
      Number.isNaN(publishedAt)
    ) {
      continue;
    }
    headlines.push({ title, url, publishedAt });
  }
  if (headlines.length === 0) {
    throw new Error(
      items.length === 0
        ? "the feed has no <item>"
        : `none of the feed's ${items.length} items has a title, link and date`,
    );
  }
  return headlines;
}
