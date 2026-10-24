/**
 * Language that turns a description into a recommendation (PRD F7 stance,
 * F12 brief, R3, R9). Ownership research has to say "the controller must sell
 * down", so bare verbs are allowed inside a sentence. Rejected: ratings,
 * targets and trading instructions anywhere, and a sentence that opens with
 * a transaction verb ("Buy below 3,000"). English and Indonesian,
 * case-insensitive, whole words only.
 */
const ANYWHERE = [
  "strong (?:buy|sell)",
  "(?:buy|sell|hold) rating",
  "rated (?:a )?(?:buy|sell|hold)",
  "recommend(?:s|ed|ing)? (?:buying|selling|holding)",
  "accumulate",
  "take profit",
  "stop[- ]loss",
  "cut loss",
  "price target",
  "target price",
  "entry (?:price|point)",
  "overweight",
  "underweight",
  "outperform",
  "underperform",
  "rekomendasi (?:beli|jual|tahan)",
  "akumulasi",
  "ambil untung",
  "target harga",
  "harga target",
  "layak (?:beli|dibeli|jual|dijual)",
];

/** Verbs that read as an instruction when they open a sentence. */
const OPENING = ["buy", "sell", "hold", "beli", "jual", "tahan"];

const WORD_START = "(?<![\\p{L}\\p{N}])";
const WORD_END = "(?![\\p{L}\\p{N}])";
const spaced = (phrase: string) => phrase.replace(/ /g, "\\s+");

const ANYWHERE_PATTERN = new RegExp(
  `${WORD_START}(${ANYWHERE.map(spaced).join("|")})${WORD_END}`,
  "iu",
);
const OPENING_PATTERN = new RegExp(
  `(?:^|[.!?;:\\n]\\s*|^\\s*[-*•]\\s*)(${OPENING.join("|")})${WORD_END}`,
  "imu",
);

/** The first recommendation word or phrase in `text`, as written; null when there is none. */
export function recommendationLanguage(text: string): string | null {
  return (
    ANYWHERE_PATTERN.exec(text)?.[1] ??
    OPENING_PATTERN.exec(text.trimStart())?.[1] ??
    null
  );
}
