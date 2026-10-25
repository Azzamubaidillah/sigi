import type { Metadata } from "next";

import { getLang } from "@/app/_lib/lang";
import { privacyMessages } from "@/src/i18n/messages/privacy";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: privacyMessages[lang].metaTitle };
}

export default async function PrivacyPage() {
  const lang = await getLang();
  const m = privacyMessages[lang];
  return (
    <>
      <div className="page-header">
        <h1>{m.heading}</h1>
      </div>
      <section className="panel stack prose">
        <p>
          <strong>{m.visitorsLabel}</strong>
          {m.visitors}
        </p>
        <p>
          <strong>{m.cookiesLabel}</strong>
          {m.cookies}
        </p>
        <p>
          <strong>{m.tradingViewLabel}</strong>
          {m.tradingViewBefore}
          <a
            href="https://www.tradingview.com/privacy-policy/"
            rel="noreferrer"
          >
            {m.tradingViewLink}
          </a>
          {m.tradingViewAfter}
        </p>
        <p>
          <strong>{m.personalLabel}</strong>
          {m.personal}
        </p>
      </section>
    </>
  );
}
