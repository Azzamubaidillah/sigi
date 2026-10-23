import type { GateRow } from "@/src/views/data-health";

const gateNames: Record<string, string> = {
  record_date: "Record date",
  row_count: "Row count",
  share_code: "Share codes",
  percent_range: "Percent range",
  percent_sum: "Percent sum per company",
  shares_identity: "Scripless + scrip = total",
  classification: "Investor types",
  holder_count_change: "Holder count change",
};

export function GateList({ gates }: { gates: GateRow[] }) {
  if (gates.length === 0) return <span className="muted">—</span>;
  const failed = gates.filter((gate) => gate.verdict === "fail").length;
  const warned = gates.filter((gate) => gate.verdict === "warn").length;
  const summary =
    failed > 0
      ? `${failed} of ${gates.length} failed`
      : warned > 0
        ? `All passed, ${warned} with a warning`
        : `All ${gates.length} passed`;
  return (
    <details>
      <summary>{summary}</summary>
      <ul>
        {gates.map((gate) => (
          <li key={gate.gate}>
            <span className={`badge ${gate.verdict}`}>{gate.verdict}</span>{" "}
            {gateNames[gate.gate] ?? gate.gate}: {gate.detail}
          </li>
        ))}
      </ul>
    </details>
  );
}
