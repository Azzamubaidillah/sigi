import type { Metadata } from "next";

import { GateList } from "@/app/_components/GateList";
import { formatDate, formatTimestamp } from "@/app/_lib/format";
import { loadConfig } from "@/src/config";
import { loadImportRuns } from "@/src/views/data-health";

import { ReviewForm, SignOut, UploadForm } from "./AdminForms";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default function AdminPage() {
  const held = loadImportRuns(loadConfig().databasePath, 100).filter(
    (run) => run.outcome === "held",
  );
  return (
    <>
      <div className="page-header">
        <h1>Admin</h1>
        <p className="lede">
          Import the monthly file after downloading it by hand from the IDX
          announcements page. Months go in oldest first; each import&apos;s
          checks appear on <a href="/data">Data &amp; sources</a>.
        </p>
        <div>
          <SignOut />
        </div>
      </div>

      <section className="panel">
        <h2>Import holders above 1% (S1)</h2>
        <UploadForm />
      </section>

      <section className="panel">
        <h2>Held for review</h2>
        {held.length === 0 ? (
          <p className="absent">Nothing is waiting.</p>
        ) : (
          <div className="stack">
            {held.map((run) => (
              <article key={run.id} className="stack">
                <h3>
                  Run #{run.id}, record date{" "}
                  {run.recordDate ? formatDate(run.recordDate) : "unknown"} (
                  {formatTimestamp(run.startedAt)})
                </h3>
                <GateList gates={run.gates} />
                <ReviewForm runId={run.id} />
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
