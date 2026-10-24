/**
 * Whether bytes are a whole ZIP (an XLSX is one): the local-header magic at
 * the start and an end-of-central-directory record within the last 64 KB. A
 * download cut short, or an error page, fails this before any import.
 */
export function isCompleteZip(bytes: Uint8Array): boolean {
  if (bytes.length < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
  const tail = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= tail; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      return true;
    }
  }
  return false;
}
