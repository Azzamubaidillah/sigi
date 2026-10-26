import { type NextRequest, NextResponse } from "next/server";

import { loadConfig } from "@/src/config";
import { exactShareCode } from "@/src/views/ownership";

/**
 * `/search?q=bbca`: the masthead's search box. An exact share code goes to
 * that company's page; anything else lands on the market page's name search.
 * The redirect is relative, so it is right behind any proxy.
 */
export function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "")
    .trim()
    .slice(0, 80);
  const code = exactShareCode(loadConfig().databasePath, query);
  const location = code
    ? `/t/${code}`
    : query
      ? `/?${new URLSearchParams({ q: query }).toString()}#register`
      : "/";
  return new NextResponse(null, {
    status: 303,
    headers: { Location: location },
  });
}
