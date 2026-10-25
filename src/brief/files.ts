import { z } from "zod";

import { recommendationLanguage } from "../safety/recommendation";

/**
 * The two files the daily brief exchanges with the web (PRD F12, D-025), from
 * Sunrise's `src/brief/files.ts`.
 *
 * `context/<date>.json` is what Sigi tells the agent: its own readings, each
 * citable item with an evidence `key`, and the sections it could not build.
 * It names no individual holder (D-007). `analysis/<date>.json` is what the
 * agent writes back: what changed and what is worth a closer look, never what
 * to do. Both live under `<dataDirectory>/brief/`; the web only reads them.
 */

export const BRIEF_PATHS = {
  context: ["brief", "context"],
  analysis: ["brief", "analysis"],
} as const;

export const BRIEF_FILE = /^(\d{4}-\d{2}-\d{2})\.json$/;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoInstant = z.string().datetime({ offset: true });
const shareCode = z.string().regex(/^[A-Z]{4}$/);
/** A figure as published or as Sigi computed it, written as decimal text. */
const decimalText = z.string().regex(/^-?\d+(\.\d+)?$/);
const evidenceKey = z
  .string()
  .regex(/^[a-z][a-z0-9-]*(:[A-Za-z0-9._-]+)*$/)
  .max(80);
const httpUrl = z
  .string()
  .max(2_000)
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "http(s) only");

/** What a reading has been shown to be worth, for the agent to respect. */
const section = {
  key: evidenceKey,
  asOf: z.string().min(1),
  source: z.string().min(1),
  evidenceStatus: z.string().min(1),
};

/* ---------------------------------------------------------------- context */

const holderMove = z.strictObject({
  key: evidenceKey,
  /** An institution's published name; individuals are never named (D-007). */
  holder: z.string().min(1),
  change: z.enum(["entered", "exited", "increased", "decreased"]),
  beforePercent: decimalText.nullable(),
  afterPercent: decimalText.nullable(),
});

const ownershipSection = z.strictObject({
  ...section,
  previous: isoDate.nullable(),
  companiesCompared: z.number().int().nonnegative(),
  companiesWithChanges: z.number().int().nonnegative(),
  /** The companies with the largest moves, largest first. */
  companies: z.array(
    z.strictObject({
      key: evidenceKey,
      code: shareCode,
      issuer: z.string(),
      entered: z.number().int().nonnegative(),
      exited: z.number().int().nonnegative(),
      increased: z.number().int().nonnegative(),
      decreased: z.number().int().nonnegative(),
      /** Moves by individuals or unclassified holders, counted but not named. */
      unnamedMoves: z.number().int().nonnegative(),
      moves: z.array(holderMove),
    }),
  ),
});

const floatCompany = z.strictObject({
  key: evidenceKey,
  code: shareCode,
  boundPercent: decimalText,
});

const floatSection = z.strictObject({
  ...section,
  certainlyBelow15: z.number().int().nonnegative(),
  companies: z.number().int().nonnegative(),
  official: z.strictObject({
    asOf: isoDate,
    belowMinimum: z.number().int(),
    listed: z.number().int().nullable(),
    publisher: z.string(),
  }),
  crossedBelow: z.array(floatCompany),
  crossedAbove: z.array(floatCompany),
  deadlines: z.array(
    z.strictObject({
      key: evidenceKey,
      date: isoDate,
      label: z.string(),
      inDays: z.number().int(),
    }),
  ),
});

const macroSection = z.strictObject({
  ...section,
  released: z.array(
    z.strictObject({
      key: evidenceKey,
      series: z.string(),
      name: z.string(),
      unit: z.string(),
      period: z.string(),
      value: decimalText,
      previousValue: decimalText.nullable(),
      firstSeenAt: isoInstant,
      source: z.string(),
    }),
  ),
  scheduled: z.array(
    z.strictObject({
      key: evidenceKey,
      series: z.string(),
      name: z.string(),
      expectedOn: isoDate,
      approximate: z.boolean(),
    }),
  ),
});

const thesesSection = z.strictObject({
  ...section,
  items: z.array(
    z.strictObject({
      key: evidenceKey,
      slug: z.string(),
      title: z.string().nullable(),
      tickers: z.array(shareCode),
      status: z.enum(["active", "invalidated", "closed"]).nullable(),
      review: isoDate.nullable(),
      reviewDue: z.boolean(),
      unreadable: z.string().nullable(),
      conditions: z.array(
        z.strictObject({
          key: evidenceKey,
          text: z.string(),
          status: z.enum(["met", "not-met", "unknown", "manual"]).nullable(),
          detail: z.string().nullable(),
          checkedOn: isoDate.nullable(),
          metSince: isoDate.nullable(),
          changedToday: z.boolean(),
        }),
      ),
    }),
  ),
});

const eventsSection = z.strictObject({
  ...section,
  items: z.array(
    z.strictObject({
      key: evidenceKey,
      date: isoDate,
      label: z.string(),
      publisher: z.string(),
      inDays: z.number().int(),
    }),
  ),
});

const healthSection = z.strictObject({
  ...section,
  feeds: z.array(
    z.strictObject({
      key: evidenceKey,
      feed: z.string(),
      lastCheck: isoInstant.nullable(),
      outcome: z.enum(["ok", "failed"]).nullable(),
      error: z.string().nullable(),
    }),
  ),
  ownershipMonth: isoDate.nullable(),
  nextOwnershipFileBy: isoDate.nullable(),
  ownershipOverdue: z.boolean(),
});

const newsSection = z.strictObject({
  ...section,
  items: z.array(
    z.strictObject({
      key: evidenceKey,
      tickers: z.array(shareCode),
      title: z.string(),
      publisher: z.string(),
      publishedAt: isoInstant,
      url: httpUrl,
    }),
  ),
});

export const briefContextSchema = z.strictObject({
  version: z.literal(1),
  generatedAt: isoInstant,
  timezone: z.literal("Asia/Jakarta"),
  /** The Jakarta date of the export. */
  today: isoDate,
  /** Sections the exporter could not build, with why: absent, never empty. */
  absent: z.array(z.strictObject({ section: z.string(), reason: z.string() })),
  ownership: ownershipSection.nullable(),
  float: floatSection.nullable(),
  macro: macroSection.nullable(),
  theses: thesesSection.nullable(),
  events: eventsSection.nullable(),
  dataHealth: healthSection.nullable(),
  news: newsSection.nullable(),
});

export type BriefContext = z.infer<typeof briefContextSchema>;
export type ContextSectionName = Exclude<
  keyof BriefContext,
  "version" | "generatedAt" | "timezone" | "today" | "absent"
>;
export const CONTEXT_SECTIONS: readonly ContextSectionName[] = [
  "ownership",
  "float",
  "macro",
  "theses",
  "events",
  "dataHealth",
  "news",
];

/** Every `key` in the document: the names an item may cite as evidence. */
export function contextKeys(context: unknown): Set<string> {
  const keys = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
    } else if (value !== null && typeof value === "object") {
      for (const [name, child] of Object.entries(value)) {
        if (name === "key" && typeof child === "string") keys.add(child);
        else walk(child);
      }
    }
  };
  walk(context);
  return keys;
}

/* --------------------------------------------------------------- analysis */

/** Plain text that may not recommend (R9): checked here, not only in the prompt. */
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .superRefine((value, ctx) => {
      const word = recommendationLanguage(value);
      if (word !== null) {
        ctx.addIssue({
          code: "custom",
          message: `reads as a recommendation ("${word}")`,
        });
      }
    });

const source = z.strictObject({
  title: text(240),
  url: httpUrl,
  publisher: z.string().max(80).optional(),
  date: isoDate.optional(),
});

export const LOOK_AT_KINDS = [
  "ownership",
  "float",
  "macro",
  "thesis",
  "event",
  "data",
] as const;

const lookAt = z.strictObject({
  kind: z.enum(LOOK_AT_KINDS),
  /** An exchange code or a short topic. */
  subject: text(60),
  reason: text(400),
  /** Keys of the context's evidence this rests on; checked against it. */
  evidenceKeys: z.array(evidenceKey).min(1).max(8),
});

export const BRIEF_STANCES = ["quiet", "notable", "watch"] as const;

/**
 * No buy, sell, hold, target, price or size field exists, and the strict
 * objects refuse any extra one.
 */
export const analysisSchema = z
  .strictObject({
    version: z.literal(1),
    /** The Jakarta date of the run, equal to the context's `today`; also the file's name. */
    date: isoDate,
    generatedAt: isoInstant,
    /** The context's `generatedAt`: which snapshot of Sigi this reads. */
    contextGeneratedAt: isoInstant,
    stance: z.enum(BRIEF_STANCES),
    headline: text(200),
    lookAt: z.array(lookAt).max(8),
    changesSinceYesterday: z.array(text(300)).max(6),
    risks: z.array(text(300)).max(6),
    /** Signals deliberately set aside, and why. */
    setAside: z.array(text(300)).max(8),
    /** For any figure that did not come from the context. */
    sources: z.array(source).max(10),
  })
  .superRefine((analysis, ctx) => {
    if (analysis.stance === "quiet" && analysis.lookAt.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["lookAt"],
        message: "a quiet brief has nothing to look at",
      });
    }
    if (analysis.stance !== "quiet" && analysis.lookAt.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["lookAt"],
        message: `a ${analysis.stance} brief names at least one thing to look at`,
      });
    }
  });

export type BriefAnalysis = z.infer<typeof analysisSchema>;
export type BriefLookAt = z.infer<typeof lookAt>;
export type BriefStance = BriefAnalysis["stance"];

/** Evidence keys an analysis cites that its context does not hold. */
export function unknownEvidenceKeys(
  analysis: BriefAnalysis,
  context: BriefContext,
): string[] {
  const known = contextKeys(context);
  return [
    ...new Set(
      analysis.lookAt
        .flatMap((entry) => entry.evidenceKeys)
        .filter((key) => !known.has(key)),
    ),
  ];
}
