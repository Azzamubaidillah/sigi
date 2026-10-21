import { loadConfig } from "../src/config";
import { openDatabase } from "../src/db/client";
import { checkRebuild } from "../src/imports/rebuild-check";

/**
 * Re-derives every published month from its landed file and compares content
 * hashes (PRD F10). Exits non-zero if any month differs. Read-only.
 */
const config = loadConfig();
const { sqlite } = openDatabase(config.databasePath, {
  readonly: true,
  fileMustExist: true,
});
try {
  const months = await checkRebuild(sqlite, config.landingDirectory);
  for (const month of months) {
    console.log(
      [
        month.ok ? "ok      " : "MISMATCH",
        month.recordDate,
        `run #${month.importRunId}`,
        `stored ${month.storedHash.slice(0, 12)}`,
        `table ${month.tableHash.slice(0, 12)}`,
        `reparsed ${month.reparsedHash?.slice(0, 12) ?? "-"}`,
        month.error ?? "",
      ].join("  "),
    );
  }
  if (months.length === 0) console.log("no published months");
  process.exitCode = months.every((month) => month.ok) ? 0 : 1;
} finally {
  sqlite.close();
}
