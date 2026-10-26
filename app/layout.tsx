import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import type { ReactNode } from "react";

import { loadConfig } from "@/src/config";
import { messagesFor } from "@/src/i18n/define";
import { shellMessages } from "@/src/i18n/messages/shell";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/shell.css";
import "./styles/primitives.css";
import { LanguageSwitch, PrimaryNav } from "./_components/SiteNav";
import { Icon } from "./_components/ui";
import { Wordmark } from "./_components/Wordmark";
import { getLang } from "./_lib/lang";

// Plus Jakarta Sans, drawn in Jakarta for the city's own identity, carries the
// interface and every figure; Newsreader sets long reading. Both are OFL and
// served from this origin (docs/DESIGN.md).
const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-VF.woff2",
  variable: "--font-jakarta",
  weight: "400 800",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const newsreader = localFont({
  src: [
    {
      path: "./fonts/Newsreader-VF.woff2",
      style: "normal",
      weight: "400 700",
    },
    {
      path: "./fonts/Newsreader-Italic-VF.woff2",
      style: "italic",
      weight: "400 700",
    },
  ],
  variable: "--font-newsreader",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

// Every page renders per request: published data changes on import, and the
// proxy's CSP nonce must reach the inline scripts Next writes into each page.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const m = messagesFor(shellMessages, lang);
  return {
    metadataBase: new URL(loadConfig().origin),
    title: { default: "Sigi", template: "%s · Sigi" },
    description: m.siteDescription,
    applicationName: "Sigi",
    openGraph: {
      type: "website",
      siteName: "Sigi",
      title: "Sigi",
      description: m.siteDescription,
      locale: lang === "id" ? "id_ID" : "en_GB",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const lang = await getLang();
  const m = messagesFor(shellMessages, lang);
  return (
    <html lang={lang} className={`${jakarta.variable} ${newsreader.variable}`}>
      <body>
        <a className="skip" href="#content">
          {m.skip}
        </a>
        <div className="shell">
          <header className="masthead">
            <Link href="/" className="brand" aria-label={m.home}>
              <Wordmark />
            </Link>
            <PrimaryNav labels={m.nav} />
            <form
              className="masthead-search"
              role="search"
              action="/search"
              method="get"
            >
              <label className="sr-only" htmlFor="masthead-q">
                {m.search.label}
              </label>
              <Icon name="search" />
              <input
                id="masthead-q"
                name="q"
                type="search"
                maxLength={80}
                autoComplete="off"
                placeholder={m.search.placeholder}
              />
            </form>
            <LanguageSwitch language={m.language} current={lang} />
          </header>
          <main id="content" tabIndex={-1}>
            {children}
          </main>
          <footer className="site">
            <div>
              <Link href="/" className="foot-brand" aria-label={m.home}>
                <Wordmark />
              </Link>
              <p className="tagline">{m.footer.tagline}</p>
            </div>
            <div>
              <nav aria-label={m.footer.links.label}>
                <ul>
                  <li>
                    <Link href="/data">{m.footer.links.sources}</Link>
                  </li>
                  <li>
                    <Link href="/privacy">{m.footer.links.privacy}</Link>
                  </li>
                </ul>
              </nav>
              <p>
                {m.footer.notAdvice} {m.footer.provenance}
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
