import { Icon, Pill, type Tone } from "@/app/_components/ui";
import type { Lang } from "@/src/i18n/lang";
import { dataMessages } from "@/src/i18n/messages/data";
import type { GateRow } from "@/src/views/data-health";

const TONES: Record<GateRow["verdict"], Tone> = {
  pass: "positive",
  warn: "warn",
  fail: "negative",
};

/**
 * An import's checks as a checklist: one line says how they came out, and
 * opens to every check with its verdict as a word and an icon. Styles:
 * app/styles/data.css.
 */
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
    <details className="gates">
      <summary>
        <Icon name={failed > 0 || warned > 0 ? "alert" : "check"} />
        {summary}
      </summary>
      <ul className="gate-list">
        {gates.map((gate) => (
          <li key={gate.gate}>
            <Icon name={gate.verdict === "pass" ? "check" : "alert"} />
            <span>
              <Pill tone={TONES[gate.verdict]}>
                {m.verdicts[gate.verdict] ?? gate.verdict}
              </Pill>{" "}
              <strong>{m.names[gate.gate] ?? gate.gate}</strong>
              <br />
              {gate.detail}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
