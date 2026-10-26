import { FREE_FLOAT_MINIMUM_HUNDREDTHS } from "@/src/investability/rule";

import { cssVars } from "./ui";

export interface BarSegment {
  key: string;
  /** The holder's name, for the legend. */
  label: string;
  /** The share as the page writes it, e.g. "83.80%". */
  value: string;
  hundredths: number;
}

/** Below this share a segment is too narrow to carry its own figure. */
const LABEL_MIN_HUNDREDTHS = 900;

/**
 * Who holds a company as one bar of 100% (docs/DESIGN.md): holders of 5% or
 * more first, darkest to lightest, then the free float, lit. The upright line
 * is the 15% minimum. `summary` is the whole bar in words, for assistive
 * technology and for anyone who cannot tell the colours apart.
 */
export function OwnershipBar({
  controllers,
  float,
  summary,
  size,
  minimumLabel,
}: {
  controllers: readonly BarSegment[];
  float: { label: string; value: string; hundredths: number };
  summary: string;
  size: "sm" | "lg";
  /** What to call the minimum line; without it the line is not drawn. */
  minimumLabel?: string;
}) {
  const large = size === "lg";
  // The float sits at the right edge, so the minimum is that far from the left.
  const at = 100 - FREE_FLOAT_MINIMUM_HUNDREDTHS / 100;
  const segments = [
    ...controllers.map((segment, index) => ({
      ...segment,
      tone: String(Math.min(index + 1, 4)),
    })),
    { key: "float", ...float, tone: "float" },
  ];
  return (
    <figure className={large ? "obar-fig obar-fig--lg" : "obar-fig"}>
      <div
        className={large ? "obar obar--lg" : "obar obar--sm"}
        role="img"
        aria-label={summary}
        style={cssVars({ "--at": at })}
      >
        {segments.map((segment) =>
          segment.hundredths > 0 ? (
            <span
              key={segment.key}
              className="seg"
              data-tone={segment.tone}
              style={cssVars({ "--w": segment.hundredths / 100 })}
            >
              {large && segment.hundredths >= LABEL_MIN_HUNDREDTHS
                ? segment.value
                : null}
            </span>
          ) : null,
        )}
        {minimumLabel ? <span className="line" aria-hidden="true" /> : null}
        {minimumLabel && large ? (
          <span className="line-label" aria-hidden="true">
            {minimumLabel}
          </span>
        ) : null}
      </div>
      {large ? (
        <figcaption>
          <ul className="obar-legend">
            {segments
              .filter((segment) => segment.hundredths > 0)
              .map((segment) => (
                <li key={segment.key}>
                  <span className="sw" data-tone={segment.tone} />
                  {segment.label} <strong>{segment.value}</strong>
                </li>
              ))}
          </ul>
        </figcaption>
      ) : null}
    </figure>
  );
}
