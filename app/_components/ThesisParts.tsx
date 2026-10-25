import Link from "next/link";

import { formatDate } from "@/app/_lib/format";
import { localise } from "@/src/i18n/define";
import type { Lang } from "@/src/i18n/lang";
import { commonMessages } from "@/src/i18n/messages/common";
import { thesesMessages } from "@/src/i18n/messages/theses";
import { SOURCES } from "@/src/sources/register";
import type { CheckStatus } from "@/src/theses/conditions";
import type { ThesisStatus } from "@/src/theses/header";
import type { ConditionRow } from "@/src/views/theses";

/** On every thesis page and list (PRD F7, R3). */
export function NotAdvice({ lang }: { lang: Lang }) {
  return <p className="notice">{thesesMessages[lang].notAdvice}</p>;
}

export function CheckBadge({
  status,
  lang,
}: {
  status: CheckStatus;
  lang: Lang;
}) {
  return (
    <span className={status === "met" ? "badge warn" : "badge"}>
      {thesesMessages[lang].checkStatus[status]}
    </span>
  );
}

export function StatusBadge({
  status,
  lang,
}: {
  status: ThesisStatus;
  lang: Lang;
}) {
  return (
    <span className={status === "active" ? "badge pass" : "badge"}>
      {commonMessages[lang].thesisStatus[status]}
    </span>
  );
}

function ConditionText({ row, lang }: { row: ConditionRow; lang: Lang }) {
  return (
    <>
      <code>{row.condition.text}</code>
      {row.holderSlug ? (
        <>
          {" "}
          <Link href={`/holders/${row.holderSlug}`}>
            {thesesMessages[lang].conditions.holderPage}
          </Link>
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
  lang,
}: {
  rows: ConditionRow[];
  checked: boolean;
  lang: Lang;
}) {
  const m = thesesMessages[lang].conditions;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">{m.condition}</th>
            {checked ? (
              <>
                <th scope="col">{m.status}</th>
                <th scope="col">{m.compared}</th>
                <th scope="col">{m.checked}</th>
              </>
            ) : null}
            <th scope="col">{m.data}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.condition.text}>
              <td>
                <ConditionText row={row} lang={lang} />
              </td>
              {checked ? (
                row.check ? (
                  <>
                    <td>
                      <CheckBadge status={row.check.status} lang={lang} />
                      {row.check.metSince ? (
                        <span className="muted">
                          {" "}
                          {m.since(formatDate(row.check.metSince, lang))}
                        </span>
                      ) : null}
                    </td>
                    <td>{row.check.detail}</td>
                    <td className="mono">
                      {formatDate(row.check.checkedOn, lang)}
                    </td>
                  </>
                ) : (
                  <td colSpan={3} className="absent">
                    {m.notChecked}
                  </td>
                )
              ) : null}
              <td>
                {row.source
                  ? localise(SOURCES[row.source].name, lang)
                  : m.noSource}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
