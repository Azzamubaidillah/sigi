"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/",
    label: "Market",
    matches: (path: string) => path === "/" || path.startsWith("/t/"),
  },
  {
    href: "/brief",
    label: "Brief",
    matches: (path: string) => path === "/brief",
  },
  {
    href: "/investability",
    label: "Investability",
    matches: (path: string) => path === "/investability",
  },
  {
    href: "/holders",
    label: "Holders",
    matches: (path: string) => path.startsWith("/holders"),
  },
  {
    href: "/macro",
    label: "Macro",
    matches: (path: string) => path === "/macro",
  },
  {
    href: "/theses",
    label: "Theses",
    matches: (path: string) => path.startsWith("/theses"),
  },
  {
    href: "/data",
    label: "Data & sources",
    matches: (path: string) => path === "/data" || path === "/privacy",
  },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.matches(pathname) ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
