import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { loadConfig } from "@/src/config";
import { messagesFor } from "@/src/i18n/define";
import { shellMessages } from "@/src/i18n/messages/shell";

import "./sigi.css";
import { SiteNav } from "./_components/SiteNav";
import { getLang } from "./_lib/lang";

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
    <html lang={lang}>
      <body>
        <a className="skip" href="#content">
          {m.skip}
        </a>
        <div className="shell">
          <header className="masthead">
            <Link href="/" className="brand">
              Sigi
            </Link>
            <SiteNav labels={m.nav} language={m.language} current={lang} />
          </header>
          <main id="content" tabIndex={-1}>
            {children}
          </main>
          <footer className="site">
            <p>
              {m.footer.before}
              <Link href="/data">{m.footer.sources}</Link>
              {m.footer.middle}
              <Link href="/privacy">{m.footer.privacy}</Link>
              {m.footer.after}
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
