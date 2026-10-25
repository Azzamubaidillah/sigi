/**
 * Writes the daily brief's context (PRD F12, D-025) to stdout as JSON: Sigi's
 * own readings with an evidence key per citable item. The brief runner calls
 * it in a throwaway container of the deployed worker image, with no network
 * and the data directory mounted read-only, and saves the output as
 * `brief/context/<date>.json`. It validates its own output before printing,
 * so a malformed context never reaches the agent.
 *
 *   tsx scripts/brief-context.ts > context.json
 */
import { buildBriefContext } from "../src/brief/build";
import { briefContextSchema } from "../src/brief/files";
import { loadConfig } from "../src/config";
import { closeReadDatabases, readDatabase } from "../src/db/read";

const config = loadConfig();
const context = readDatabase(config.databasePath, (sqlite) =>
  buildBriefContext(sqlite, {
    databasePath: config.databasePath,
    thesesDirectory: config.thesesDirectory,
    now: Date.now(),
  }),
);
closeReadDatabases();
if (context === null) {
  console.error(`no database at ${config.databasePath}`);
  process.exit(1);
}
process.stdout.write(
  `${JSON.stringify(briefContextSchema.parse(context), null, 2)}\n`,
);
