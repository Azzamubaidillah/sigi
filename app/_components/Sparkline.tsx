import type { Observation } from "@/src/macro/parse";

/**
 * A year of a series as an SVG line, drawn on the server from Sigi's own
 * stored observations. The axis labels give the range, so the shape needs no
 * gridlines. A meeting series (the BI-Rate) is drawn as steps: the rate holds
 * between decisions.
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
  const width = 260;
  const height = 64;
  const pad = 3;
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
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <polyline
        points={coordinates.join(" ")}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
