import type { Metadata } from "next";

import { S1Citation } from "@/app/_components/Citation";
import { HolderTable } from "@/app/_components/HolderTable";
import { PageHeader, Section } from "@/app/_components/ui";
import { formatDate } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { pageMetadata } from "@/app/_lib/seo";
import { loadConfig } from "@/src/config";
import { commonMessages } from "@/src/i18n/messages/common";
import { holdersMessages } from "@/src/i18n/messages/holders";
import { seoMessages } from "@/src/i18n/messages/seo";
import { loadHolderIndex } from "@/src/views/holders";

import "../styles/holders.css";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return pageMetadata({
    lang,
    title: holdersMessages[lang].index.metaTitle,
    description: seoMessages[lang].holders,
    path: "/holders",
  });
}

export default async function HoldersPage() {
  const lang = await getLang();
  const m = holdersMessages[lang].index;
  const index = loadHolderIndex(loadConfig().databasePath);
  return (
    <>
      <PageHeader title={m.title} lede={m.lede} />
      <Section
        id="list"
        title={m.heading}
        note={
          index.kind === "index"
            ? m.summary(
                formatDate(index.month.recordDate, lang),
                index.holders.length,
                index.withheld,
              )
            : undefined
        }
      >
        {index.kind === "absent" ? (
          <p className="absent">
            {commonMessages[lang].ownershipAbsence.no_published_month}
          </p>
        ) : (
          <>
            <HolderTable
              holders={index.holders}
              lang={lang}
              labels={holdersMessages[lang].table}
            />
            <S1Citation month={index.month} lang={lang} />
          </>
        )}
      </Section>
    </>
  );
}
