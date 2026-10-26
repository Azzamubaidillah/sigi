import type { CSSProperties, ReactNode } from "react";

/** The shared parts of docs/DESIGN.md. Markup only; the styles are in app/styles/primitives.css. */

export type Tone = "positive" | "negative" | "warn" | "info";

const ICONS = {
  alert: (
    <>
      <path d="M12 3.5 2.8 19.5h18.4z" />
      <path d="M12 10v4.5M12 17.4v.1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.9v.1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12.5h6M9 16.5h6" />
    </>
  ),
  back: <path d="m14.5 6-6 6 6 6" />,
  up: <path d="m6 14.5 6-6 6 6" />,
  down: <path d="m6 9.5 6 6 6-6" />,
  flat: <path d="M5 12h14" />,
  external: (
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
} as const;

export type IconName = keyof typeof ICONS;

/** A line icon that follows the text colour. Always decorative: the words beside it carry the meaning. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}

/** Custom properties on an element (the bar's widths), typed once here. */
export function cssVars(vars: Record<`--${string}`, string | number>) {
  return vars as CSSProperties;
}

/** The top of every page: one title, one lede, optionally a stamp at the right. */
export function PageHeader({
  title,
  lede,
  aside,
}: {
  title: ReactNode;
  lede?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {aside ? <div className="page-head-aside">{aside}</div> : null}
    </header>
  );
}

/**
 * A titled part of a page. The title sits on a strong rule with the stamp (the
 * source and date, in a few words) opposite it; `note` is one plain sentence
 * under the title. `id` is the anchor and names the heading.
 */
export function Section({
  id,
  title,
  stamp,
  note,
  children,
}: {
  id: string;
  title: ReactNode;
  stamp?: ReactNode;
  note?: ReactNode;
  children: ReactNode;
}) {
  const heading = `${id}-heading`;
  return (
    <section className="sec" id={id} aria-labelledby={heading}>
      <header className="sec-head">
        <h2 id={heading}>{title}</h2>
        {stamp ? <p className="stamp">{stamp}</p> : null}
      </header>
      {note ? <p className="sec-note">{note}</p> : null}
      <div className="sec-body">{children}</div>
    </section>
  );
}

export interface FigureItem {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  /** The page's one focal figure: set larger. */
  lead?: boolean;
}

/** Key figures: a label over a number, as many as fit a row. */
export function Figures({ items }: { items: readonly FigureItem[] }) {
  return (
    <dl className="kf">
      {items.map((item, index) => (
        <div key={index} className={item.lead ? "lead" : undefined}>
          <dt>{item.label}</dt>
          <dd className="v">{item.value}</dd>
          {item.note ? <dd className="note">{item.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/** A status word in a pill. The tone tints it; the word carries the meaning. */
export function Pill({ tone, children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="pill" data-tone={tone}>
      {children}
    </span>
  );
}

/** A note that changes how a figure is read. */
export function Notice({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <aside className="notice" data-tone={tone}>
      <Icon name={tone === "info" ? "info" : "alert"} />
      <div>{children}</div>
    </aside>
  );
}

/** A section's source in one line; the full citation opens below it. */
export function SourceNote({
  summary,
  children,
}: {
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="src">
      <summary>
        <Icon name="doc" />
        {summary}
      </summary>
      <div className="src-body">{children}</div>
    </details>
  );
}
