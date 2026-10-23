import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <>
      <div className="page-header">
        <h1>Privacy</h1>
      </div>
      <section className="panel stack prose">
        <p>
          <strong>Visitors.</strong> Sigi has no accounts for readers, no
          analytics and no advertising. The web server keeps standard access
          logs (address, time, page requested) for operating the site.
        </p>
        <p>
          <strong>Cookies.</strong> Only the owner&apos;s sign-in uses cookies:
          a session cookie and an anti-forgery cookie, set on this host only.
          Reading the site sets none.
        </p>
        <p>
          <strong>TradingView.</strong> Charts and the price screener are
          TradingView widgets loaded from TradingView&apos;s servers.
          TradingView states that its widgets set no cookies, and that it
          receives the embedding page&apos;s address, the widget type, the
          symbol and your IP address. Its own{" "}
          <a
            href="https://www.tradingview.com/privacy-policy/"
            rel="noreferrer"
          >
            privacy policy
          </a>{" "}
          applies to that.
        </p>
        <p>
          <strong>Personal data in the sources.</strong> The ownership register
          published by the exchange names individual shareholders above 1%. Sigi
          shows those names only on the company&apos;s own table, exactly as
          published and with the source, and builds no pages or searches about
          individuals.
        </p>
      </section>
    </>
  );
}
