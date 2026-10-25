import { type NextRequest, NextResponse } from "next/server";

import { loadConfig } from "@/src/config";
import {
  isLang,
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  safeNext,
} from "@/src/i18n/lang";

/**
 * `/lang?set=id&next=/macro`: remembers the visitor's language in a cookie
 * and sends them back to the page they were on. It is a GET because the site
 * serves nothing else; it changes only this visitor's own cookie. Reached
 * from a plain link, not a `Link`, so a prefetch never switches the language.
 * The redirect is relative, so it is right behind any proxy.
 */
export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const set = searchParams.get("set");
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: safeNext(searchParams.get("next")) },
  });
  if (isLang(set)) {
    response.cookies.set(LANG_COOKIE, set, {
      path: "/",
      maxAge: LANG_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
      secure: loadConfig().origin.startsWith("https:"),
    });
  }
  return response;
}
