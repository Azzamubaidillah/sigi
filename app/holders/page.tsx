import type { Metadata } from "next";

import { S1Citation } from "@/app/_components/Citation";
import { HolderTable } from "@/app/_components/HolderTable";
import { formatDate } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { loadConfig } from "@/src/config";
import { commonMessages } from "@/src/i18n/messages/common";
import { holdersMessages } from "@/src/i18n/messages/holders";
import { loadHolderIndex } from "@/src/views/holders";

export async function generateMetadata(): Promise<Metadata> {
  return { title: holdersMessages[await getLang()].index.metaTitle };
}

export default async function HoldersPage() {
  const lang = await getLang();
  const m = holdersMessages[lang].index;
  const index = loadHolderIndex(loadConfig().databasePath);
  return (
    <>
      <div className="page-header">
        <h1>{m.title}</h1>
        <p className="lede">{m.lede}</p>
      </div>
      <section className="panel">
        {index.kind === "absent" ? (
          <p className="absent">
            {commonMessages[lang].ownershipAbsence.no_published_month}
          </p>
        ) : (
          <>
            <p className="muted">
              {m.summary(
                formatDate(index.month.recordDate, lang),
                index.holders.length,
                index.withheld,
              )}
            </p>
            <HolderTable
              holders={index.holders}
              lang={lang}
              labels={holdersMessages[lang].table}
            />
            <S1Citation month={index.month} lang={lang} />
          </>
        )}
      </section>
    </>
  );
}
