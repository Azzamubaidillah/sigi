import type { Metadata } from "next";

import { PageHeader, Section } from "@/app/_components/ui";
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
      <PageHeader title={m.heading} lede={m.lede} />
      <Section id="visitors" title={m.visitorsTitle}>
        <div className="prose">
          <p>{m.visitors}</p>
        </div>
      </Section>
      <Section id="cookies" title={m.cookiesTitle}>
        <div className="prose">
          <p>
            {m.cookiesBefore}
            <code>{m.cookieName}</code>
            {m.cookiesAfter}
          </p>
        </div>
      </Section>
      <Section id="tradingview" title={m.tradingViewTitle}>
        <div className="prose">
          <p>
            {m.tradingViewBefore}
            <a
              href="https://www.tradingview.com/privacy-policy/"
              rel="noreferrer"
            >
              {m.tradingViewLink}
            </a>
            {m.tradingViewAfter}
          </p>
        </div>
      </Section>
      <Section id="personal" title={m.personalTitle}>
        <div className="prose">
          <p>{m.personal}</p>
        </div>
      </Section>
    </>
  );
}
