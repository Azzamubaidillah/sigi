import { FEEDS, type FeedId } from "../macro/feeds";
import type { FetchedFile } from "../macro/import";
import { jakartaDate } from "./s1-fetch";
import { isCompleteZip } from "./zip";

/**
 * Plain-HTTP fetchers for the macro feeds. None needs a browser:
 * - Bank Indonesia's pages are ASP.NET forms; each table is exported to
 *   Excel by posting the form back with its date range and the export
 *   button, as a reader's browser would (D-023). BI drops connections from
 *   clients that do not look like a browser, so these requests carry
 *   Chrome's user agent.
 * - The World Bank page links the current monthly workbook (S7).
 * - FRED serves each series as CSV (S8).
 * The World Bank and FRED are asked as Sigi, under its own name.
 */

const CHROME_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";
const SIGI_UA = "sigi (+https://sigi.ubaidillah.id/data)";
const TIMEOUT_MS = 90_000;
const MAX_BYTES = 20 * 1024 * 1024;

async function bodyOf(response: Response, url: string): Promise<Uint8Array> {
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES)
    throw new Error(`${url}: ${declared} bytes, over the limit`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES)
    throw new Error(`${url}: ${bytes.length} bytes, over the limit`);
  return bytes;
}

function requireWorkbook(bytes: Uint8Array, url: string): Uint8Array {
  if (!isCompleteZip(bytes))
    throw new Error(`${url}: not a complete workbook (${bytes.length} bytes)`);
  return bytes;
}

const entities = (value: string): string =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

/**
 * One ASP.NET page session: cookies carried across requests, and the form's
 * hidden state (view state, event validation) re-read from each response.
 */
class AspNetPage {
  private cookies = new Map<string, string>();
  private html = "";

  constructor(private readonly url: string) {}

  private async request(body?: URLSearchParams): Promise<Response> {
    const response = await fetch(this.url, {
      method: body ? "POST" : "GET",
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": CHROME_UA,
        "accept-language": "id-ID,id;q=0.9,en;q=0.8",
        referer: this.url,
        cookie: [...this.cookies]
          .map(([name, value]) => `${name}=${value}`)
          .join("; "),
        ...(body
          ? { "content-type": "application/x-www-form-urlencoded" }
          : {}),
      },
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const at = pair.indexOf("=");
      if (at > 0)
        this.cookies.set(pair.slice(0, at).trim(), pair.slice(at + 1));
    }
    return response;
  }

  async open(): Promise<void> {
    const response = await this.request();
    this.html = new TextDecoder().decode(await bodyOf(response, this.url));
  }

  /** The full form name of the control whose name ends with `suffix`. */
  private control(suffix: string): string {
    const names = [
      ...[...this.html.matchAll(/name="([^"]+)"/g)].map((m) => m[1]),
      ...[...this.html.matchAll(/__doPostBack\(&#39;([^&]+)&#39;/g)].map(
        (m) => m[1],
      ),
    ];
    const found = names.find((name) => name.endsWith(`$${suffix}`));
    if (!found)
      throw new Error(
        `${this.url}: no form control ending in ${suffix}; the page has changed`,
      );
    return found;
  }

  private form(fields: Record<string, string>): URLSearchParams {
    const form = new URLSearchParams();
    for (const match of this.html.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
      const name = /name="([^"]*)"/.exec(match[0])?.[1];
      if (name)
        form.set(name, entities(/value="([^"]*)"/.exec(match[0])?.[1] ?? ""));
    }
    for (const [suffix, value] of Object.entries(fields))
      form.set(this.control(suffix), value);
    return form;
  }

  /** Submits the form with `fields` set and the button `button` pressed. */
  async submit(fields: Record<string, string>, button: string): Promise<void> {
    const form = this.form(fields);
    form.set(this.control(button), "Cari");
    form.set("__EVENTTARGET", "");
    form.set("__EVENTARGUMENT", "");
    this.html = new TextDecoder().decode(
      await bodyOf(await this.request(form), this.url),
    );
  }

  /** Posts back to the control `target` (a link button) and returns the body. */
  async postBack(
    fields: Record<string, string>,
    target: string,
  ): Promise<Uint8Array> {
    const form = this.form(fields);
    form.set("__EVENTTARGET", this.control(target));
    form.set("__EVENTARGUMENT", "");
    return bodyOf(await this.request(form), this.url);
  }
}

/** "MM/YYYY" and "DD/MM/YYYY" in Jakarta time, as BI's date pickers write them. */
function biDates(at: number): {
  month: string;
  day: string;
  dayThreeYearsAgo: string;
} {
  const [year, month, day] = jakartaDate(at).split("-");
  return {
    month: `${month}/${year}`,
    day: `${day}/${month}/${year}`,
    dayThreeYearsAgo: `${day}/${month}/${Number(year) - 3}`,
  };
}

/** Monthly BI tables go back to January 2016; JISDOR, daily, three years. */
async function fetchBi(
  feed: "bi-rate" | "bi-inflation" | "bi-jisdor" | "bi-reserves",
  at: number,
): Promise<Uint8Array> {
  const page = new AspNetPage(FEEDS[feed].pageUrl);
  await page.open();
  const dates = biDates(at);
  let fields: Record<string, string> = {};
  switch (feed) {
    case "bi-rate":
      // The export carries the whole history without a search.
      break;
    case "bi-inflation":
      fields = { TextBoxDateFrom: "01/2016", TextBoxDateTo: dates.month };
      await page.submit(fields, "ButtonCari");
      break;
    case "bi-jisdor":
      fields = {
        TextBoxFrom: dates.dayThreeYearsAgo,
        TextBoxDateTo: dates.day,
      };
      await page.submit(fields, "ButtonCari");
      break;
    case "bi-reserves":
      fields = { txtFrom: "01/2016", txtTo: dates.month };
      await page.submit(fields, "btnFilter");
      break;
  }
  return requireWorkbook(
    await page.postBack(fields, "ButtonExport"),
    FEEDS[feed].pageUrl,
  );
}

/** A GET under Sigi's own user agent, size-capped; also used for the news feed. */
export async function sigiGet(url: string): Promise<Uint8Array> {
  return bodyOf(
    await fetch(url, {
      headers: { "user-agent": SIGI_UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
    url,
  );
}

/** The current monthly workbook, found by its link on the commodity-markets page. */
async function fetchPinkSheet(): Promise<{ bytes: Uint8Array; url: string }> {
  const page = FEEDS["wb-pink-sheet"].pageUrl;
  const html = new TextDecoder().decode(await sigiGet(page));
  const links = [
    ...new Set(
      [
        ...html.matchAll(
          /href="(https:\/\/thedocs\.worldbank\.org\/[^"]+\/CMO-Historical-Data-Monthly\.xlsx)"/g,
        ),
      ].map((m) => m[1]),
    ),
  ];
  if (links.length !== 1)
    throw new Error(
      `${page}: ${links.length} links to the monthly workbook; expected one`,
    );
  return {
    bytes: requireWorkbook(await sigiGet(links[0]), links[0]),
    url: links[0],
  };
}

/** Three years of one FRED series. */
async function fetchFred(
  id: string,
  at: number,
): Promise<{ bytes: Uint8Array; url: string }> {
  const [year, month, day] = jakartaDate(at).split("-");
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${Number(year) - 3}-${month}-${day}`;
  return { bytes: await sigiGet(url), url };
}

/** Monthly history of Indonesia's real broad effective exchange rate, from 2016 like the BI tables. */
async function fetchBisEer(): Promise<{ bytes: Uint8Array; url: string }> {
  const url =
    "https://stats.bis.org/api/v2/data/dataflow/BIS/WS_EER/1.0/M.R.B.ID?format=csv&startPeriod=2016-01";
  return { bytes: await sigiGet(url), url };
}

/** Fetches one macro feed's file, ready for `importMacroFile`. */
export async function fetchMacroFeed(
  feed: FeedId,
  at: number,
): Promise<FetchedFile> {
  const accessedOn = jakartaDate(at);
  switch (feed) {
    case "bi-rate":
    case "bi-inflation":
    case "bi-jisdor":
    case "bi-reserves":
      return {
        bytes: await fetchBi(feed, at),
        originalName: `${feed}.xlsx`,
        sourceUrl: FEEDS[feed].pageUrl,
        accessedOn,
      };
    case "wb-pink-sheet": {
      const { bytes, url } = await fetchPinkSheet();
      return {
        bytes,
        originalName: "CMO-Historical-Data-Monthly.xlsx",
        sourceUrl: url,
        accessedOn,
      };
    }
    case "fred-DFEDTARU":
    case "fred-DGS10":
    case "fred-DTWEXBGS":
    case "fred-DEXCHUS":
    case "fred-DEXINUS": {
      const id = feed.slice("fred-".length);
      const { bytes, url } = await fetchFred(id, at);
      return { bytes, originalName: `${id}.csv`, sourceUrl: url, accessedOn };
    }
    case "bis-eer": {
      const { bytes, url } = await fetchBisEer();
      return {
        bytes,
        originalName: "bis-eer-id.csv",
        sourceUrl: url,
        accessedOn,
      };
    }
  }
}
