import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SOURCES } from "./register";

/**
 * The public sources page renders this register, and docs/DATA-SOURCES.md is
 * where each entry's terms were read and recorded. A source added to one and
 * not the other would put a figure online with no recorded terms, or record
 * terms for a source the page never lists.
 */
describe("source register", () => {
  it("lists exactly the sources the register document records", () => {
    const document = fs.readFileSync(
      path.join(process.cwd(), "docs", "DATA-SOURCES.md"),
      "utf8",
    );
    const documented = [...document.matchAll(/^## (S\d+)\. /gm)].map(
      (match) => match[1],
    );
    expect(Object.keys(SOURCES)).toEqual(documented);
  });

  it("marks a source live only if its status allows public display", () => {
    for (const [id, source] of Object.entries(SOURCES)) {
      if (source.live) {
        expect([id, source.status]).not.toEqual([id, "withheld"]);
        expect([id, source.status]).not.toEqual([id, "excluded"]);
      }
    }
  });
});
