"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { shellMessages } from "@/src/i18n/messages/shell";

type Shell = (typeof shellMessages)["en"];

const links = [
  {
    href: "/",
    key: "market",
    matches: (path: string) => path === "/" || path.startsWith("/t/"),
  },
  {
    href: "/brief",
    key: "brief",
    matches: (path: string) => path === "/brief",
  },
  {
    href: "/investability",
    key: "investability",
    matches: (path: string) => path === "/investability",
  },
  {
    href: "/holders",
    key: "holders",
    matches: (path: string) => path.startsWith("/holders"),
  },
  {
    href: "/macro",
    key: "macro",
    matches: (path: string) => path === "/macro",
  },
  {
    href: "/theses",
    key: "theses",
    matches: (path: string) => path.startsWith("/theses"),
  },
  {
    href: "/data",
    key: "data",
    matches: (path: string) => path === "/data" || path === "/privacy",
  },
] as const satisfies readonly {
  href: string;
  key: keyof Shell["nav"];
  matches: (path: string) => boolean;
}[];

export function SiteNav({
  labels,
  language,
  current,
}: {
  labels: Shell["nav"];
  language: Shell["language"];
  current: "en" | "id";
}) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const here = query ? `${pathname}?${query}` : pathname;
  return (
    <>
      <nav aria-label={labels.label}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.matches(pathname) ? "page" : undefined}
          >
            {labels[link.key]}
          </Link>
        ))}
      </nav>
      {/* Plain links, not `Link`: a prefetch of /lang would switch the language. */}
      <nav aria-label={language.label} className="lang">
        {(["en", "id"] as const).map((code) => (
          <a
            key={code}
            href={`/lang?set=${code}&next=${encodeURIComponent(here)}`}
            lang={code}
            aria-current={code === current ? "true" : undefined}
            rel="nofollow"
          >
            {code.toUpperCase()}
            <span className="sr-only"> {language[code]}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
