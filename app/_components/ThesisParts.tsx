import Link from "next/link";

import { formatDate } from "@/app/_lib/format";
import { SOURCES } from "@/src/sources/register";
import type { CheckStatus } from "@/src/theses/conditions";
import { STATUS_LABELS, type ThesisStatus } from "@/src/theses/header";
import type { ConditionRow } from "@/src/views/theses";

/** On every thesis page and list (PRD F7, R3). */
export function NotAdvice() {
  return (
    <p className="notice">
      Theses are the author&rsquo;s research notes, not investment advice. They
      describe a view and the conditions that would show it wrong; they do not
      recommend any transaction in any security.
    </p>
  );
}

const CHECK_LABELS: Record<CheckStatus, string> = {
  met: "Met",
  "not-met": "Not met",
  unknown: "Unknown",
  manual: "Manual check",
};

export function CheckBadge({ status }: { status: CheckStatus }) {
  return (
    <span className={status === "met" ? "badge warn" : "badge"}>
      {CHECK_LABELS[status]}
    </span>
  );
}

export function StatusBadge({ status }: { status: ThesisStatus }) {
  return (
    <span className={status === "active" ? "badge pass" : "badge"}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function ConditionText({ row }: { row: ConditionRow }) {
  return (
    <>
      <code>{row.condition.text}</code>
      {row.holderSlug ? (
        <>
          {" "}
          <Link href={`/holders/${row.holderSlug}`}>holder page</Link>
        </>
      ) : null}
    </>
  );
}

/**
 * The conditions with the worker's latest check. `checked` is false for an
 * older version, whose conditions are shown but not checked.
 */
export function ConditionTable({
  rows,
  checked,
}: {
  rows: ConditionRow[];
  checked: boolean;
}) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">Condition</th>
            {checked ? (
              <>
                <th scope="col">Status</th>
                <th scope="col">What was compared</th>
                <th scope="col">Checked</th>
              </>
            ) : null}
            <th scope="col">Data</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.condition.text}>
              <td>
                <ConditionText row={row} />
              </td>
              {checked ? (
                row.check ? (
                  <>
                    <td>
                      <CheckBadge status={row.check.status} />
                      {row.check.metSince ? (
                        <span className="muted">
                          {" "}
                          since {formatDate(row.check.metSince)}
                        </span>
                      ) : null}
                    </td>
                    <td>{row.check.detail}</td>
                    <td className="mono">{formatDate(row.check.checkedOn)}</td>
                  </>
                ) : (
                  <td colSpan={3} className="absent">
                    Not checked yet; the worker checks every condition daily.
                  </td>
                )
              ) : null}
              <td>
                {row.source ? SOURCES[row.source].name : "No data source"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
