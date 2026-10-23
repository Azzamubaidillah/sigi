import { loadConfig } from "../src/config";
import { holderKey } from "../src/ownership/holder-names";
import { loadSnapshot } from "../src/views/snapshot";

/**
 * Lists holder keys that may be one holder spelled differently: keys that
 * become equal once legal-form words are dropped and the remaining words are
 * sorted. It decides nothing. Each group is read against the source rows, and
 * only a confirmed pair goes into HOLDER_ALIASES, with its reason.
 */
const legalForms = new Set([
  "PT",
  "TBK",
  "PERSERO",
  "LTD",
  "LIMITED",
  "INC",
  "CO",
  "CORP",
  "CORPORATION",
  "THE",
]);

function looseKey(key: string): string {
  return key
    .split(" ")
    .filter((word) => !legalForms.has(word))
    .sort()
    .join(" ");
}

const snapshot = loadSnapshot(loadConfig().databasePath);
if (!snapshot) {
  console.log("no database");
  process.exit(0);
}
const groups = new Map<
  string,
  Map<string, { types: Set<string>; codes: Set<string> }>
>();
for (const companies of snapshot.companies.values()) {
  for (const company of companies.values()) {
    for (const holding of company.holdings) {
      const key = holderKey(holding.investorName);
      const loose = looseKey(key);
      let group = groups.get(loose);
      if (!group) groups.set(loose, (group = new Map()));
      let entry = group.get(key);
      if (!entry)
        group.set(key, (entry = { types: new Set(), codes: new Set() }));
      entry.types.add(holding.investorType ?? "unclassified");
      entry.codes.add(company.shareCode);
    }
  }
}
let count = 0;
for (const group of groups.values()) {
  if (group.size < 2) continue;
  count += 1;
  for (const [key, entry] of group) {
    console.log(
      `  ${key}  [${[...entry.types].join(",")}]  ${[...entry.codes].sort().join(" ")}`,
    );
  }
  console.log("");
}
console.log(`${count} candidate groups`);
