import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";

const keyLength = 64;
const cost = 16_384;
const blockSize = 8;
const parallelization = 1;
const maximumMemory = 64 * 1024 * 1024;

function deriveKey(
  passcode: string,
  salt: Buffer,
  length: number,
  options: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(passcode, salt, length, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPasscode(passcode: string): Promise<string> {
  if (passcode.length < 8) {
    throw new Error("Passcode must contain at least eight characters");
  }

  // "." rather than "$": Next's env loader expands "$digits"/"$word" as
  // variable references and silently drops undefined ones, corrupting a
  // "$"-delimited hash stored in .env.

  const salt = randomBytes(16);
  const hash = await deriveKey(passcode, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: maximumMemory,
  });

  return [
    "scrypt",
    cost,
    blockSize,
    parallelization,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join(".");
}

export async function verifyPasscode(
  passcode: string,
  encodedHash: string,
): Promise<boolean> {
  const [
    algorithm,
    costValue,
    blockValue,
    parallelValue,
    saltValue,
    hashValue,
  ] = encodedHash.split(".");
  if (
    algorithm !== "scrypt" ||
    !costValue ||
    !blockValue ||
    !parallelValue ||
    !saltValue ||
    !hashValue
  ) {
    return false;
  }

  const expected = Buffer.from(hashValue, "base64url");
  if (expected.length !== keyLength) return false;

  try {
    const actual = await deriveKey(
      passcode,
      Buffer.from(saltValue, "base64url"),
      expected.length,
      {
        N: Number(costValue),
        r: Number(blockValue),
        p: Number(parallelValue),
        maxmem: maximumMemory,
      },
    );
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
