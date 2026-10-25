import fs from "node:fs";
import path from "node:path";

import {
  analysisSchema,
  BRIEF_FILE,
  BRIEF_PATHS,
  type BriefAnalysis,
  type BriefContext,
  briefContextSchema,
  unknownEvidenceKeys,
} from "../brief/files";
import { UNPUBLISHED } from "../brief/unpublished";

/**
 * The daily brief (PRD F12, D-025), from Sunrise's `src/views/brief.ts`. The
 * analysis and its context are files under `<dataDirectory>/brief/`, written
 * on the host; the web only reads them. A file it cannot trust is named and
 * passed over, never half-shown: one that does not validate, that recommends,
 * or that cites evidence its own context does not hold.
 */

const STALE_AFTER_MS = 30 * 3_600_000;
export const MAX_BRIEF_BYTES = 512 * 1024;
const REASON_MAX = 200;

export interface PassedOver {
  file: string;
  reason: string;
}

export type BriefView =
  | { status: "missing"; withdrawn: PassedOver[] }
  | { status: "unreadable"; reason: string; withdrawn: PassedOver[] }
  | {
      status: "ok";
      analysis: BriefAnalysis;
      /** The context the analysis read; always present for an accepted file. */
      context: BriefContext;
      /** `generatedAt` is more than 30 hours old. */
      stale: boolean;
      /** A newer file that failed validation, left unshown. */
      rejected: PassedOver | null;
      /** Newer briefs the owner withdrew, with the reasons. */
      withdrawn: PassedOver[];
    };

type FileRead = { ok: true; value: unknown } | { ok: false; reason: string };

function readJson(file: string): FileRead {
  let text: string;
  try {
    const size = fs.statSync(file).size;
    if (size > MAX_BRIEF_BYTES) {
      return {
        ok: false,
        reason: `over the ${MAX_BRIEF_BYTES / 1024} KiB size cap`,
      };
    }
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error ? error.code : null;
    return {
      ok: false,
      reason: code === "ENOENT" ? "missing" : "could not be read",
    };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "not JSON" };
  }
}

function issueText(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): string {
  const issue = error.issues[0];
  if (!issue) return "invalid";
  const where = issue.path.map(String).join(".");
  const text = where ? `${where}: ${issue.message}` : issue.message;
  return text.length > REASON_MAX ? `${text.slice(0, REASON_MAX - 1)}…` : text;
}

function fileNames(directory: string): string[] {
  try {
    return fs
      .readdirSync(directory)
      .filter((name) => BRIEF_FILE.test(name))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/** Why one analysis file cannot be shown, or the accepted brief. */
function judge(
  dataDirectory: string,
  file: string,
):
  | { ok: true; analysis: BriefAnalysis; context: BriefContext }
  | { ok: false; reason: string } {
  const directory = path.join(dataDirectory, ...BRIEF_PATHS.analysis);
  const read = readJson(path.join(directory, file));
  if (!read.ok) return read;
  const parsed = analysisSchema.safeParse(read.value);
  if (!parsed.success) return { ok: false, reason: issueText(parsed.error) };
  const analysis = parsed.data;
  if (analysis.date !== file.slice(0, 10)) {
    return { ok: false, reason: "its date does not match the file name" };
  }
  const contextRead = readJson(
    path.join(dataDirectory, ...BRIEF_PATHS.context, `${analysis.date}.json`),
  );
  const context = contextRead.ok
    ? briefContextSchema.safeParse(contextRead.value)
    : null;
  if (!context?.success) {
    return { ok: false, reason: "its context file is missing or invalid" };
  }
  if (context.data.today !== analysis.date) {
    return { ok: false, reason: "its context was made for another day" };
  }
  if (analysis.contextGeneratedAt !== context.data.generatedAt) {
    return {
      ok: false,
      reason: "its context timestamp does not match its context file",
    };
  }
  const unknown = unknownEvidenceKeys(analysis, context.data);
  if (unknown.length > 0) {
    return {
      ok: false,
      reason: `cites evidence its context lacks: ${unknown.slice(0, 3).join(", ")}`,
    };
  }
  return { ok: true, analysis, context: context.data };
}

/**
 * The newest analysis that validates and whose evidence is in its context. A
 * newer file that fails is named beside it, so a bad run is visible while the
 * last good brief stays up; only when nothing passes is the brief unreadable.
 */
export function readBrief(
  dataDirectory: string,
  nowMs: number,
  unpublished: Readonly<Record<string, string>> = UNPUBLISHED,
): BriefView {
  const directory = path.join(dataDirectory, ...BRIEF_PATHS.analysis);
  const withdrawn: PassedOver[] = [];
  let rejected: PassedOver | null = null;
  for (const file of fileNames(directory)) {
    const reason = unpublished[file.slice(0, 10)];
    if (reason !== undefined) {
      withdrawn.push({ file, reason });
      continue;
    }
    const verdict = judge(dataDirectory, file);
    if (verdict.ok) {
      return {
        status: "ok",
        analysis: verdict.analysis,
        context: verdict.context,
        stale:
          nowMs - Date.parse(verdict.analysis.generatedAt) > STALE_AFTER_MS,
        rejected,
        withdrawn,
      };
    }
    rejected ??= { file, reason: verdict.reason };
  }
  if (!rejected) return { status: "missing", withdrawn };
  return {
    status: "unreadable",
    reason: `${rejected.file}: ${rejected.reason}`,
    withdrawn,
  };
}

/** The brief as of now, for the page. */
export function loadBrief(dataDirectory: string): BriefView {
  return readBrief(dataDirectory, Date.now());
}
