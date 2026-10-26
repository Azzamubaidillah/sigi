import type { Observation } from "@/src/macro/parse";

/**
 * A year of a series as a filled line with a dot on the latest value, drawn on
 * the server from Sigi's own stored observations. The tile prints the range,
 * so the shape needs no axes. A meeting series (the BI-Rate) is drawn as
 * steps: the rate holds between decisions. Styles: app/styles/macro.css.
 */
export function Sparkline({
  points,
  steps,
  label,
}: {
  points: readonly Observation[];
  steps: boolean;
  label: string;
}) {
  if (points.length < 2) return null;
  const width = 240;
  const height = 56;
  const pad = 5;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - 2 * pad);
  const y = (v: number) =>
    height - pad - ((v - min) / span) * (height - 2 * pad);
  const coordinates = points.flatMap((p, i) => {
    const here = `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
    return steps && i > 0
      ? [`${x(i).toFixed(1)},${y(points[i - 1].value).toFixed(1)}`, here]
      : [here];
  });
  const last = points.length - 1;
  const line = `M${coordinates.join("L")}`;
  const area = `${line}L${x(last).toFixed(1)},${height}L${x(0).toFixed(1)},${height}Z`;
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      <path className="sparkline-area" d={area} />
      <path
        className="sparkline-line"
        d={line}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        className="sparkline-dot"
        cx={x(last).toFixed(1)}
        cy={y(points[last].value).toFixed(1)}
        r="3.5"
      />
    </svg>
  );
}
