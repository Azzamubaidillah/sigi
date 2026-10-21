import type { GateRow } from "@/src/views/data-health";

const gateNames: Record<string, string> = {
  record_date: "Record date",
  row_count: "Row count",
  share_code: "Share codes",
  percent_range: "Percent range",
  percent_sum: "Percent sum per company",
  shares_identity: "Scripless + scrip = total",
  classification: "Investor type and local/foreign",
  holder_count_change: "Holder count change",
};

export function GateList({ gates }: { gates: GateRow[] }) {
  if (gates.length === 0) return <span className="muted">—</span>;
  const failing = gates.filter((gate) => gate.verdict !== "pass");
  return (
    <details>
      <summary>
        {failing.length === 0
          ? `All ${gates.length} passed`
          : `${failing.length} of ${gates.length} need attention`}
      </summary>
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
