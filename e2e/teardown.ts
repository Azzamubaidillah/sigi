import fs from "node:fs";

import { DATA_DIR, EMPTY_DIR } from "./world";

/** Removes the seeded data directories once the run is over; `E2E_KEEP=1` keeps them for inspection. */
export default function teardown(): void {
  if (process.env.E2E_KEEP) return;
  for (const directory of [DATA_DIR, EMPTY_DIR])
    fs.rmSync(directory, { recursive: true, force: true });
}
