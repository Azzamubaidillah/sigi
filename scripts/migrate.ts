import { loadConfig } from "../src/config";
import { openDatabase } from "../src/db/client";
import { migrateDatabase } from "../src/db/migrate";
import { createLogger } from "../src/logger";

const config = loadConfig();
const logger = createLogger("sigi-cli", config);
const { sqlite, db } = openDatabase(config.databasePath);

try {
  const outcome = migrateDatabase(db);
  logger.info(
    { databasePath: config.databasePath, ...outcome },
    "database migrated",
  );
} finally {
  sqlite.close();
}
