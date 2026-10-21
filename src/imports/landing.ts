import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Stores a source file under its SHA-256, read-only, and never replaces one.
 *
 * Written to a temporary name and renamed, so a crash leaves either the whole
 * file or nothing under the final name. If the name already exists its bytes
 * are checked against the hash rather than trusted.
 */
export async function landFile(
  landingDirectory: string,
  bytes: Uint8Array,
  extension: string,
): Promise<{ sha256: string; storedName: string }> {
  const sha256 = sha256Hex(bytes);
  const storedName = `${sha256}.${extension}`;
  // The landing directory is runtime data, not part of the build to trace.
  const target = path.join(
    /*turbopackIgnore: true*/ landingDirectory,
    storedName,
  );
  await fs.mkdir(landingDirectory, { recursive: true, mode: 0o700 });
  try {
    await readLandedFile(landingDirectory, storedName, sha256);
    return { sha256, storedName };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const temporary = `${target}.${randomBytes(6).toString("hex")}.tmp`;
  const handle = await fs.open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.chmod(temporary, 0o400);
  await fs.rename(temporary, target);
  return { sha256, storedName };
}

/** Reads a landed file back, refusing it if the bytes no longer match. */
export async function readLandedFile(
  landingDirectory: string,
  storedName: string,
  expectedSha256: string,
): Promise<Uint8Array> {
  const bytes = new Uint8Array(
    await fs.readFile(
      path.join(/*turbopackIgnore: true*/ landingDirectory, storedName),
    ),
  );
  const actual = sha256Hex(bytes);
  if (actual !== expectedSha256) {
    throw new Error(
      `landed file ${storedName} has SHA-256 ${actual}; expected ${expectedSha256}`,
    );
  }
  return bytes;
}
