"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/",
    label: "Companies",
    matches: (path: string) => path === "/" || path.startsWith("/t/"),
  },
  {
    href: "/data",
    label: "Data & sources",
    matches: (path: string) => path === "/data",
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
