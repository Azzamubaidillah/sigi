/**
 * A line diff between two versions of a thesis (PRD F7 history), as hunks with
 * a few lines of context. Longest common subsequence over lines: thesis files
 * are small, and a pair too large for the table is reported, not truncated.
 */

export type DiffLine =
  | { kind: "same"; text: string; before: number; after: number }
  | { kind: "removed"; text: string; before: number }
  | { kind: "added"; text: string; after: number };

export interface DiffHunk {
  lines: DiffLine[];
}

export type DiffResult =
  | { kind: "diff"; hunks: DiffHunk[]; added: number; removed: number }
  | { kind: "too-large"; lines: number };

const MAX_CELLS = 4_000_000;
const CONTEXT = 3;

function linesOf(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

export function diffLines(beforeText: string, afterText: string): DiffResult {
  const before = linesOf(beforeText);
  const after = linesOf(afterText);
  const n = before.length;
  const m = after.length;
  if ((n + 1) * (m + 1) > MAX_CELLS) {
    return { kind: "too-large", lines: Math.max(n, m) };
  }
  // lcs[i][j]: common subsequence length of before[i..] and after[j..].
  const width = m + 1;
  const lcs = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i * width + j] =
        before[i] === after[j]
          ? lcs[(i + 1) * width + j + 1]! + 1
          : Math.max(lcs[(i + 1) * width + j]!, lcs[i * width + j + 1]!);
    }
  }
  const all: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && before[i] === after[j]) {
      all.push({ kind: "same", text: before[i]!, before: i + 1, after: j + 1 });
      i += 1;
      j += 1;
    } else if (
      i < n &&
      (j === m || lcs[(i + 1) * width + j]! >= lcs[i * width + j + 1]!)
    ) {
      all.push({ kind: "removed", text: before[i]!, before: i + 1 });
      i += 1;
    } else {
      all.push({ kind: "added", text: after[j]!, after: j + 1 });
      j += 1;
    }
  }

  const changed = all.flatMap((line, index) =>
    line.kind === "same" ? [] : [index],
  );
  const hunks: DiffHunk[] = [];
  let start = -1;
  let end = -1;
  for (const index of changed) {
    if (start >= 0 && index - CONTEXT <= end + CONTEXT) {
      end = index;
      continue;
    }
    if (start >= 0) {
      hunks.push({
        lines: all.slice(Math.max(0, start - CONTEXT), end + CONTEXT + 1),
      });
    }
    start = index;
    end = index;
  }
  if (start >= 0) {
    hunks.push({
      lines: all.slice(Math.max(0, start - CONTEXT), end + CONTEXT + 1),
    });
  }
  return {
    kind: "diff",
    hunks,
    added: all.filter((line) => line.kind === "added").length,
    removed: all.filter((line) => line.kind === "removed").length,
  };
}
