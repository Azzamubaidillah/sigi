import { loadConfig } from "../src/config";
import { openDatabase } from "../src/db/client";
import { checkRebuild } from "../src/imports/rebuild-check";

/**
 * Re-derives every published S1 month and macro series from its landed file
 * and compares content hashes (PRD F10). Exits non-zero if any differs.
 * Read-only.
 */
const config = loadConfig();
const { sqlite } = openDatabase(config.databasePath, {
  readonly: true,
  fileMustExist: true,
});
try {
  const results = await checkRebuild(sqlite, config.landingDirectory);
  for (const result of results) {
    console.log(
      [
        result.ok ? "ok      " : "MISMATCH",
        result.kind.padEnd(5),
        result.item.padEnd(11),
        `run #${result.importRunId}`,
        `stored ${result.storedHash.slice(0, 12)}`,
        `table ${result.tableHash.slice(0, 12)}`,
        `reparsed ${result.reparsedHash?.slice(0, 12) ?? "-"}`,
        result.error ?? "",
      ].join("  "),
    );
  }
  if (results.length === 0) console.log("nothing published");
  process.exitCode = results.every((result) => result.ok) ? 0 : 1;
} finally {
  sqlite.close();
}
