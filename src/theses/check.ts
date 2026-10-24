import type Database from "better-sqlite3";

import { jakartaDate } from "../fetch/s1-fetch";
import { holderKey } from "../ownership/holder-names";
import { loadHolderLinks } from "../views/holders";
import { loadSnapshot } from "../views/snapshot";
import { evaluateCondition, type Readings } from "./conditions";
import {
  parseThesis,
  readThesisMarkdown,
  thesisSlugs,
  thesisVersions,
} from "./folder";

/** Sigi's own published data, as the conditions read it. */
export function loadReadings(
  sqlite: Database.Database,
  databasePath: string,
  now: number,
): Readings {
  const snapshot = loadSnapshot(databasePath);
  const latest = snapshot?.months[0];
  let ownership: Readings["ownership"] = null;
  if (snapshot && latest) {
    const knownHolders = new Set<string>();
    for (const companies of snapshot.companies.values()) {
      for (const company of companies.values()) {
        for (const holding of company.holdings) {
          knownHolders.add(holderKey(holding.investorName));
        }
      }
    }
    ownership = {
      recordDate: latest.recordDate,
      companies: snapshot.companies.get(latest.recordDate) ?? new Map(),
      knownHolders,
      institutions: new Set(loadHolderLinks(databasePath).keys()),
    };
  }
  const rows = sqlite
    .prepare(
      `SELECT s.series_id AS seriesId, o.period, o.value
         FROM macro_series s
         JOIN macro_observations o
           ON o.series_id = s.series_id AND o.period = s.latest_period`,
    )
    .all() as { seriesId: string; period: string; value: number }[];
  return {
    today: jakartaDate(now),
    ownership,
    macro: new Map(
      rows.map((row) => [
        row.seriesId,
        { period: row.period, value: row.value },
      ]),
    ),
  };
}

export interface ThesisCheckSummary {
  checkedOn: string;
  theses: number;
  conditions: number;
  met: number;
  /** Theses whose header or conditions block could not be read. */
  unreadable: string[];
}

/**
 * Checks every condition of every thesis's current version and records the
 * result for today (Jakarta). Re-running on the same day replaces that day's
 * rows, so the last check of the day stands.
 */
export function checkTheses(
  sqlite: Database.Database,
  options: { databasePath: string; thesesDirectory: string; now: number },
): ThesisCheckSummary {
  const readings = loadReadings(sqlite, options.databasePath, options.now);
  const upsert = sqlite.prepare(
    `INSERT INTO thesis_checks (slug, condition, checked_on, checked_at, version, status, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (slug, condition, checked_on) DO UPDATE SET
       checked_at = excluded.checked_at, version = excluded.version,
       status = excluded.status, detail = excluded.detail`,
  );
  const summary: ThesisCheckSummary = {
    checkedOn: readings.today,
    theses: 0,
    conditions: 0,
    met: 0,
    unreadable: [],
  };
  sqlite.transaction(() => {
    for (const slug of thesisSlugs(options.thesesDirectory)) {
      const version = thesisVersions(options.thesesDirectory, slug)[0]!;
      const markdown = readThesisMarkdown(
        options.thesesDirectory,
        slug,
        version,
      );
      summary.theses += 1;
      const thesis = markdown === null ? null : parseThesis(markdown);
      if (!thesis?.header || !thesis.conditions) {
        summary.unreadable.push(slug);
        continue;
      }
      for (const condition of thesis.conditions) {
        const evaluation = evaluateCondition(condition, readings);
        upsert.run(
          slug,
          condition.text,
          readings.today,
          options.now,
          version,
          evaluation.status,
          evaluation.detail,
        );
        summary.conditions += 1;
        if (evaluation.status === "met") summary.met += 1;
      }
    }
  })();
  return summary;
}
