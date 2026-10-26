import { typeLabel } from "@/src/ownership/investor-classes";

/**
 * A holder's type labels as one phrase, each class once: the source spells
 * some classes in two cases ("Securities company", "Securities Company").
 */
export function holderTypeLabels(types: readonly string[]): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const type of types) {
    const label = typeLabel(type);
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels.join(", ");
}
