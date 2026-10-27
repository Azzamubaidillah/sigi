import type { Metadata } from "next";

import type { Lang } from "@/src/i18n/lang";

/**
 * A page's metadata for search engines and link previews: its own title and
 * description, and its canonical address. Both languages share each address,
 * so the canonical is the path alone, without filters or a thesis version,
 * and a filtered or paged view is not indexed as a page of its own. A page's
 * `openGraph` replaces the layout's rather than merging with it, so it is
 * written out in full here.
 */
export function pageMetadata(options: {
  lang: Lang;
  title: string;
  description: string;
  path: string;
}): Metadata {
  const { lang, title, description, path } = options;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Sigi",
      title,
      description,
      url: path,
      locale: lang === "id" ? "id_ID" : "en_GB",
    },
  };
}
