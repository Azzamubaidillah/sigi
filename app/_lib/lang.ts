import { cookies, headers } from "next/headers";

import { type Catalog, messagesFor } from "@/src/i18n/define";
import { LANG_COOKIE, type Lang, resolveLang } from "@/src/i18n/lang";

/** The visitor's language for this request: their cookie, else Accept-Language, else English. */
export async function getLang(): Promise<Lang> {
  const [jar, incoming] = await Promise.all([cookies(), headers()]);
  return resolveLang(
    jar.get(LANG_COOKIE)?.value,
    incoming.get("accept-language"),
  );
}

/** The language and one page's messages in it. */
export async function getMessages<T>(
  catalog: Catalog<T>,
): Promise<{ lang: Lang; m: T }> {
  const lang = await getLang();
  return { lang, m: messagesFor(catalog, lang) };
}
