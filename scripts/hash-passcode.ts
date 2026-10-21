import { hashPasscode } from "../src/security/passcode";

async function readHiddenPasscode(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString("utf8").trimEnd();
  }

  process.stdout.write("Passcode: ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let value = "";

  return new Promise((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      const character = chunk.toString("utf8");
      if (character === "\u0003") {
        process.stdin.setRawMode?.(false);
        reject(new Error("Passcode entry cancelled"));
      } else if (character === "\r" || character === "\n") {
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.off("data", onData);
        process.stdout.write("\n");
        resolve(value);
      } else if (character === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += character;
      }
    };
    process.stdin.on("data", onData);
  });
}

const passcode = await readHiddenPasscode();
process.stdout.write(`${await hashPasscode(passcode)}\n`);
