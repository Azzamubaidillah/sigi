import fs from "node:fs";
import path from "node:path";

import { type Condition, parseConditions } from "./conditions";
import { parseHeader, type ThesisHeader } from "./header";
import {
  bodyBlocks,
  firstFence,
  lexThesis,
  plainText,
  sectionBlocks,
  type ThesisBlock,
} from "./markdown";

/**
 * Theses are files in this repository, published by a deploy (PRD F7, D-024):
 * `theses/<slug>/<YYYY-MM-DD>.md`, one file per version. The newest date is
 * the current version; older files are its history and are never edited.
 */

export const THESIS_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_FILE = /^(\d{4}-\d{2}-\d{2})\.md$/;
export const VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_THESIS_BYTES = 256 * 1024;
const MAX_SLUG_LENGTH = 80;

function regularFile(file: string): fs.Stats | null {
  try {
    const stat = fs.lstatSync(file);
    return stat.isFile() ? stat : null;
  } catch {
    return null;
  }
}

/** Version dates of one thesis, newest first: regular `YYYY-MM-DD.md` files under the size cap. */
export function thesisVersions(directory: string, slug: string): string[] {
  if (!THESIS_SLUG.test(slug) || slug.length > MAX_SLUG_LENGTH) return [];
  let names: string[];
  try {
    names = fs.readdirSync(path.join(directory, slug));
  } catch {
    return [];
  }
  const versions: string[] = [];
  for (const name of names) {
    const match = VERSION_FILE.exec(name);
    if (!match) continue;
    const stat = regularFile(path.join(directory, slug, name));
    if (stat && stat.size <= MAX_THESIS_BYTES) versions.push(match[1]!);
  }
  return versions.sort().reverse();
}

/** Every thesis slug with at least one version, sorted; none when the folder is absent. */
export function thesisSlugs(directory: string): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        THESIS_SLUG.test(entry.name) &&
        entry.name.length <= MAX_SLUG_LENGTH &&
        thesisVersions(directory, entry.name).length > 0,
    )
    .map((entry) => entry.name)
    .sort();
}

/**
 * One version's markdown, or null. The slug and version are matched against
 * their patterns and found in the listing before any path is built from them.
 */
export function readThesisMarkdown(
  directory: string,
  slug: string,
  version: string,
): string | null {
  if (!thesisVersions(directory, slug).includes(version)) return null;
  try {
    return fs.readFileSync(path.join(directory, slug, `${version}.md`), "utf8");
  } catch {
    return null;
  }
}

export interface ParsedThesis {
  header: ThesisHeader | null;
  /** Why the header could not be read; set exactly when `header` is null. */
  headerError: string | null;
  conditions: Condition[] | null;
  /** "conditions unreadable: <reason>"; set exactly when `conditions` is null. */
  conditionsError: string | null;
  /** The body without the header and conditions blocks. */
  blocks: ThesisBlock[];
}

const POST_MORTEM = /^post-mortem$/i;

export function parseThesis(markdown: string): ParsedThesis {
  const tokens = lexThesis(markdown);
  const blocks = bodyBlocks(tokens);
  const headerText = firstFence(tokens, "thesis");
  const conditionsText = firstFence(tokens, "conditions");
  const header =
    headerText === null
      ? { header: null, error: "The file has no thesis block." }
      : parseHeader(headerText);
  const conditions =
    conditionsText === null
      ? { conditions: null, error: "The file has no conditions block." }
      : parseConditions(conditionsText);
  let headerError = header.error;
  if (header.header?.status === "closed") {
    const postMortem = sectionBlocks(blocks, POST_MORTEM);
    const written = (postMortem ?? []).some(
      (block) => block.type !== "paragraph" || plainText(block.children) !== "",
    );
    if (!written) {
      headerError =
        'A closed thesis needs a "## Post-mortem" section with text (PRD F7).';
    }
  }
  return {
    header: headerError === null ? header.header : null,
    headerError,
    conditions: conditions.conditions,
    conditionsError: conditions.error,
    blocks,
  };
}
