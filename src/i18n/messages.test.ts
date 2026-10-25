import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { Catalog } from "./define";

/**
 * Every message catalog has the same keys in both languages, and no
 * Indonesian message is the English one left in place. TypeScript already
 * forces the shapes to match; this checks the walk at run time and catches a
 * copied English sentence. Short strings and proper nouns may be equal.
 */
const directory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "messages",
);
const files = fs
  .readdirSync(directory)
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
  .sort();

/** Strings that are the same in both languages on purpose. */
const SAME_ON_PURPOSE = new Set([
  "%",
  "HHI",
  "Sigi",
  "English",
  "Bahasa Indonesia",
  "pp",
  // The source's own title, published in Indonesian.
  "Data Kepemilikan Saham Perusahaan Terbuka di atas 1%",
  // A licence line (the function's sample arguments fill the gaps) and a unit.
  ", CC BY 4.0, BBRI, ",
  "IDR per USD",
]);

const SAMPLE_ARGS = ["BBRI", 2, 2, 2, 2, 2] as const;

function walk(
  en: unknown,
  id: unknown,
  where: string,
  problems: string[],
): void {
  if (typeof en === "string" && typeof id === "string") {
    const words = en.trim().split(/\s+/).length;
    if (en === id && words > 2 && !SAME_ON_PURPOSE.has(en)) {
      problems.push(`${where}: Indonesian equals English: "${en}"`);
    }
    if (id.trim() === "") problems.push(`${where}: Indonesian is empty`);
    return;
  }
  if (typeof en === "function" && typeof id === "function") {
    const call = (fn: unknown): unknown =>
      (fn as (...args: readonly unknown[]) => unknown)(...SAMPLE_ARGS);
    walk(call(en), call(id), `${where}()`, problems);
    return;
  }
  if (
    en !== null &&
    id !== null &&
    typeof en === "object" &&
    typeof id === "object"
  ) {
    const enKeys = Object.keys(en).sort();
    const idKeys = Object.keys(id).sort();
    if (enKeys.join() !== idKeys.join()) {
      problems.push(
        `${where}: keys differ (en ${enKeys.join(",")} | id ${idKeys.join(",")})`,
      );
      return;
    }
    for (const key of enKeys) {
      walk(
        (en as Record<string, unknown>)[key],
        (id as Record<string, unknown>)[key],
        `${where}.${key}`,
        problems,
      );
    }
    return;
  }
  problems.push(`${where}: the two languages differ in kind`);
}

describe("message catalogs", () => {
  for (const file of files) {
    it(`${file} is complete in Indonesian`, async () => {
      // The module is chosen at run time from the files in the folder, so a
      // new catalog is checked without listing it here. `file` carries its
      // extension; Vite cannot see that through the template.
      const exports: Record<string, unknown> = await import(
        /* @vite-ignore */ `./messages/${file}`
      );
      const catalogs = Object.entries(exports).filter(
        (entry): entry is [string, Catalog<unknown>] =>
          typeof entry[1] === "object" &&
          entry[1] !== null &&
          "en" in entry[1] &&
          "id" in entry[1],
      );
      expect(catalogs.length).toBeGreaterThan(0);
      const problems: string[] = [];
      for (const [name, catalog] of catalogs) {
        walk(catalog.en, catalog.id, name, problems);
      }
      expect(problems).toEqual([]);
    });
  }
});
