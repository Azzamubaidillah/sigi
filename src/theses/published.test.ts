import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseThesis,
  readThesisMarkdown,
  thesisSlugs,
  thesisVersions,
} from "./folder";

/**
 * The theses committed under `theses/` are what the site publishes. A file the
 * parser refuses would ship as "unreadable" on the public page, so every
 * version is parsed here, and the launch bar of PRD section 10 (at least three
 * theses) is held by the build.
 */
const DIRECTORY = path.resolve(__dirname, "../../theses");

describe("published theses", () => {
  const slugs = thesisSlugs(DIRECTORY);

  it("number at least three (PRD section 10)", () => {
    expect(slugs.length).toBeGreaterThanOrEqual(3);
  });

  for (const slug of slugs) {
    for (const version of thesisVersions(DIRECTORY, slug)) {
      it(`${slug} ${version} has a readable header and conditions`, () => {
        const markdown = readThesisMarkdown(DIRECTORY, slug, version);
        expect(markdown).not.toBeNull();
        const parsed = parseThesis(markdown ?? "");
        expect(parsed.headerError).toBeNull();
        expect(parsed.conditionsError).toBeNull();
        expect(parsed.header?.tickers.length).toBeGreaterThan(0);
        expect(parsed.conditions?.length).toBeGreaterThan(0);
        expect(parsed.blocks.length).toBeGreaterThan(0);
      });
    }
  }
});
