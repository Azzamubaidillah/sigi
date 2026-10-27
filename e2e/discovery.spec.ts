import { expect, type Page, test } from "./fixture";
import { COMPANIES, HOLDERS, ORIGIN, THESES, UNKNOWN_CODE } from "./world";

/**
 * What a crawler or an AI assistant reads before it renders anything: each
 * page's own description and canonical address, structured data, and the
 * plain-text map at /llms.txt.
 */
const PAGES = [
  "/",
  "/investability",
  "/holders",
  "/macro",
  "/theses",
  "/brief",
  "/data",
  "/privacy",
  `/t/${COMPANIES.steady.code}`,
  `/t/${COMPANIES.belowMinimum.code}`,
  `/t/${COMPANIES.incomplete.code}`,
  `/theses/${THESES.valid.slug}`,
  `/holders/${HOLDERS.fund.slug}`,
] as const;

/** Next writes the root address without its trailing slash. */
const canonicalOf = (path: string) =>
  path === "/" ? ORIGIN : `${ORIGIN}${path}`;

const description = (page: Page) =>
  page.locator('meta[name="description"]').getAttribute("content");

async function jsonLd(page: Page): Promise<unknown[]> {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return blocks.map((block): unknown => JSON.parse(block));
}

test.describe("discovery", () => {
  test("every page names its own address and has a description no other page shares", async ({
    page,
  }) => {
    const seen = new Map<string, string>();
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator('link[rel="canonical"]'), path).toHaveAttribute(
        "href",
        canonicalOf(path),
      );
      const text = (await description(page)) ?? "";
      expect(text.length, path).toBeGreaterThan(40);
      expect(
        seen.get(text),
        `${path} repeats ${seen.get(text)}`,
      ).toBeUndefined();
      seen.set(text, path);
    }
  });

  test("a filtered or paged register and an old thesis version point at the one canonical page", async ({
    page,
  }) => {
    await page.goto("/?q=aldebaran&sort=float&page=1");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      canonicalOf("/"),
    );
    await page.goto(
      `/theses/${THESES.valid.slug}?version=${THESES.valid.versions[1]}`,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${ORIGIN}/theses/${THESES.valid.slug}`,
    );
  });

  test("a company's description carries aggregate figures and no holder's name", async ({
    page,
  }) => {
    await page.goto(`/t/${COMPANIES.belowMinimum.code}`);
    const below = (await description(page)) ?? "";
    expect(below).toContain(COMPANIES.belowMinimum.issuer);
    expect(below).toMatch(/free float at most \d+\.\d{2}% on /);
    expect(below).toContain("below the exchange's 15% minimum");

    await page.goto(`/t/${COMPANIES.steady.code}`);
    const steady = (await description(page)) ?? "";
    expect(steady).toMatch(/free float at most /);
    expect(steady).not.toContain("below the exchange's 15% minimum");

    await page.goto(`/t/${COMPANIES.incomplete.code}`);
    expect((await description(page)) ?? "").toContain(
      "too little above 1% to give a free-float figure",
    );

    // The seeded individual holds a stake in the steady company; the name
    // belongs on the table, not in a search snippet (PRD C6).
    for (const text of [below, steady]) {
      expect(text).not.toContain("BUDI");
    }
  });

  test("a thesis page's description is the thesis in one line", async ({
    page,
  }) => {
    await page.goto(`/theses/${THESES.valid.slug}`);
    expect(await description(page)).toBe(THESES.valid.summary);
  });

  test("a code the register does not list is kept out of the index", async ({
    page,
  }) => {
    await page.goto(`/t/${UNKNOWN_CODE}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await page.goto(`/t/${COMPANIES.steady.code}`);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test("structured data names the site, the company and the thesis", async ({
    page,
  }) => {
    await page.goto("/");
    expect(await jsonLd(page)).toMatchObject([
      { "@type": "WebSite", name: "Sigi", url: ORIGIN },
    ]);

    await page.goto(`/t/${COMPANIES.steady.code}`);
    expect(await jsonLd(page)).toMatchObject([
      {
        "@type": "WebPage",
        url: `${ORIGIN}/t/${COMPANIES.steady.code}`,
        about: {
          "@type": "Corporation",
          name: COMPANIES.steady.issuer,
          tickerSymbol: `XIDX ${COMPANIES.steady.code}`,
        },
      },
    ]);

    await page.goto(`/theses/${THESES.valid.slug}`);
    expect(await jsonLd(page)).toMatchObject([
      {
        "@type": "WebPage",
        name: THESES.valid.title,
        datePublished: THESES.valid.versions[1],
        dateModified: THESES.valid.versions[0],
      },
    ]);
  });

  test("llms.txt is plain text that maps the pages and lists each thesis with a readable header", async ({
    request,
  }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");
    const body = await response.text();
    expect(body.startsWith("# Sigi\n")).toBe(true);
    expect(body).toContain(`[Investability](${ORIGIN}/investability)`);
    expect(body).toContain(
      `[${THESES.valid.title}](${ORIGIN}/theses/${THESES.valid.slug}): ${THESES.valid.summary}`,
    );
    // A thesis whose conditions are unreadable still has a header to list.
    expect(body).toContain(
      `[${THESES.unreadable.title}](${ORIGIN}/theses/${THESES.unreadable.slug})`,
    );
  });
});
