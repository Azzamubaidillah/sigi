import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./sigi.css";
import { SiteNav } from "./_components/SiteNav";

// Every page renders per request: published data changes on import, and the
// proxy's CSP nonce must reach the inline scripts Next writes into each page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Sigi", template: "%s · Sigi" },
  description:
    "Who owns Indonesia's listed companies, how much really floats, and what changed this month. Every figure cites its source.",
  applicationName: "Sigi",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="masthead">
            <Link href="/" className="brand">
              Sigi
            </Link>
            <SiteNav />
          </header>
          <main>{children}</main>
          <footer className="site">
            <p>
              Sigi is a research site, not investment advice. Ownership figures
              come from the monthly register of holders above 1% published by PT
              Bursa Efek Indonesia with data from PT Kustodian Sentral Efek
              Indonesia; macro figures from Bank Indonesia, the World Bank and
              FRED. See <Link href="/data">Data &amp; sources</Link> for every
              source and its terms, and the{" "}
              <Link href="/privacy">privacy notice</Link>. Charts and the price
              screener are TradingView widgets.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
