import type { Lang } from "./lang";

/**
 * A page's copy in both languages. The two sides must have the same shape,
 * so a message missing in Indonesian is a type error, not a blank on the page.
 * A message is a string, or a function when it carries a number, a name or a
 * date; markup is never in a message, so a sentence with a link is split
 * around the link.
 */
export interface Catalog<T> {
  en: T;
  id: T;
}

export function defineMessages<T>(catalog: Catalog<T>): Catalog<T> {
  return catalog;
}

export function messagesFor<T>(catalog: Catalog<T>, lang: Lang): T {
  return catalog[lang];
}

/** One string in both languages, for static data that lives outside a page (a series' rationale, a rule's label). */
export interface Text {
  en: string;
  id: string;
}

export function localise(text: Text, lang: Lang): string {
  return text[lang];
}
