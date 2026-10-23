import type { Metadata } from "next";

import { S1Citation } from "@/app/_components/Citation";
import { HolderTable } from "@/app/_components/HolderTable";
import { formatDate } from "@/app/_lib/format";
import { loadConfig } from "@/src/config";
import { loadHolderIndex } from "@/src/views/holders";

export const metadata: Metadata = { title: "Holders" };

export default function HoldersPage() {
  const index = loadHolderIndex(loadConfig().databasePath);
  return (
    <>
      <div className="page-header">
        <h1>Holders</h1>
        <p className="lede">
          Companies, funds and institutions holding more than 1% of a listed
          company, and what each holds. Individuals have no pages here: they
          appear only on the company tables, as published.
        </p>
      </div>
      <section className="panel">
        {index.kind === "absent" ? (
          <p className="absent">
            No month of the &gt;1% register has been published yet.
          </p>
        ) : (
          <>
            <p className="muted">
              As of {formatDate(index.month.recordDate)}: {index.holders.length}{" "}
              institutional holders. {index.withheld} other holders
              (individuals, or holders the source leaves unclassified) have no
              page.
            </p>
            <HolderTable holders={index.holders} />
            <S1Citation month={index.month} />
          </>
        )}
      </section>
    </>
  );
}
