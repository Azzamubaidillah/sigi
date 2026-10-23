import Link from "next/link";

import { holderKey } from "@/src/ownership/holder-names";

/**
 * A holder's name as published, linked to its page when it has one. Only
 * institutional holders have pages (PRD C6), so an individual's name is plain
 * text wherever it appears.
 */
export function HolderName({
  name,
  links,
}: {
  name: string;
  links: ReadonlyMap<string, string>;
}) {
  const slug = links.get(holderKey(name));
  return slug ? <Link href={`/holders/${slug}`}>{name}</Link> : <>{name}</>;
}
