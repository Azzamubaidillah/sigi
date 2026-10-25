import type { Lang } from "@/src/i18n/lang";
import { dataMessages } from "@/src/i18n/messages/data";
import type { GateRow } from "@/src/views/data-health";

export function GateList({ gates, lang }: { gates: GateRow[]; lang: Lang }) {
  if (gates.length === 0) return <span className="muted">—</span>;
  const m = dataMessages[lang].gates;
  const failed = gates.filter((gate) => gate.verdict === "fail").length;
  const warned = gates.filter((gate) => gate.verdict === "warn").length;
  const summary =
    failed > 0
      ? m.failed(failed, gates.length)
      : warned > 0
        ? m.warned(warned)
        : m.allPassed(gates.length);
  return (
    <details>
      <summary>{summary}</summary>
      <ul>
        {gates.map((gate) => (
          <li key={gate.gate}>
            <span className={`badge ${gate.verdict}`}>
              {m.verdicts[gate.verdict] ?? gate.verdict}
            </span>{" "}
            {m.names[gate.gate] ?? gate.gate}: {gate.detail}
          </li>
        ))}
      </ul>
    </details>
  );
}
