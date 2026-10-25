import { expect, type Page, test } from "./fixture";
import { expectShell, headings } from "./support";
import { ORIGIN, SITE_PAGES } from "./world";

/**
 * The Indonesian site has the same structure as the English one on every
 * page: the same landmarks, headings, tables and links, a document language of
 * `id`, and the same data. These specs assert structure only, never wording,
 * so they hold whatever the copy says.
 */

interface Structure {
  lang: string | null;
  h1: number;
  h2: number;
  h3: number;
  tables: number;
  /** Column headers per table: their count, since the words differ. */
  columns: number[];
  forms: number;
  links: string[];
  /** Text inside table cells that is data, not copy: codes, holder names, numbers. */
  codes: string[];
}

async function structure(page: Page): Promise<Structure> {
  return page.evaluate(() => {
    const count = (selector: string) =>
      document.querySelectorAll(selector).length;
    const links = [...document.querySelectorAll("a[href]")]
      .map((link) => link.getAttribute("href") ?? "")
      // The language links differ only in which one is current; keep them as written.
      .sort();
    const codes = [
      ...document.querySelectorAll("main td.mono a, main h1 .mono"),
    ]
      .map((element) => element.textContent?.trim() ?? "")
      .sort();
    return {
      lang: document.documentElement.getAttribute("lang"),
      h1: count("h1"),
      h2: count("main h2"),
      h3: count("main h3"),
      tables: count("main table"),
      columns: [...document.querySelectorAll("main table")].map(
        (table) => table.querySelectorAll("thead th").length,
      ),
      forms: count("main form"),
      links,
      codes,
    };
  });
}

async function chooseLanguage(page: Page, lang: "en" | "id"): Promise<void> {
  await page.context().addCookies([
    {
      name: "sigi-lang",
      value: lang,
      url: ORIGIN,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

for (const sitePage of SITE_PAGES) {
  test(`${sitePage.path} in Indonesian has the English page's structure`, async ({
    page,
  }) => {
    await chooseLanguage(page, "en");
    await page.goto(sitePage.path);
    await expectShell(page, "en");
    const english = await structure(page);

    await chooseLanguage(page, "id");
    const response = await page.goto(sitePage.path);
    expect(response?.status()).toBe(200);
    await expectShell(page, "id");
    const indonesian = await structure(page);

    expect(indonesian).toEqual({ ...english, lang: "id" });
    expect(english.h1).toBe(1);
    await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
    // Whether the title is in Indonesian is for the copy to say; the shell
    // check above holds that it still ends with the site name.

    // Both navigations are named, so a screen reader can tell them apart.
    const names = await page
      .getByRole("navigation")
      .evaluateAll((navs) => navs.map((nav) => nav.getAttribute("aria-label")));
    expect(names).toHaveLength(2);
    for (const name of names)
      expect(name?.trim().length ?? 0).toBeGreaterThan(0);

    // The language links mark the current one, in the right language.
    const current = page
      .getByRole("navigation")
      .last()
      .locator('[aria-current="true"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText(/^ID/);
    await expect(current).toHaveAttribute("lang", "id");
  });
}

test("the document language follows the choice on every page of a visit", async ({
  page,
}) => {
  await chooseLanguage(page, "id");
  for (const { path } of SITE_PAGES) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  }
});

test("a visitor who has chosen a language keeps it when the browser asks for another", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "id-ID" });
  try {
    await context.addCookies([{ name: "sigi-lang", value: "en", url: ORIGIN }]);
    const page = await context.newPage();
    await page.goto(`${ORIGIN}/`);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  } finally {
    await context.close();
  }
});

test("the TradingView widgets follow the page's language", async ({ page }) => {
  for (const lang of ["en", "id"] as const) {
    await chooseLanguage(page, lang);
    await page.goto("/");
    await expect
      .poll(() =>
        page
          .locator(
            'script[src^="https://s3.tradingview.com/external-embedding/"]',
          )
          .evaluateAll((scripts) =>
            scripts.map(
              (script) => JSON.parse(script.textContent ?? "{}").locale,
            ),
          ),
      )
      .toEqual([lang, lang]);
  }
});

test("tables keep their data in Indonesian: codes, holder names and figures are not translated", async ({
  page,
}) => {
  await chooseLanguage(page, "id");
  await page.goto("/t/AAAA");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("AAAA");
  await expect(page.getByRole("link", { name: "PT INDUK AAAA" })).toBeVisible();
  await expect(page.getByText("BUDI CONTOH")).toBeVisible();
  // The register's own spelling of the investor type and domicile.
  await expect(page.getByText("SINGAPORE")).toBeVisible();
  await expect(page.getByText("Mutual Funds")).toBeVisible();

  await page.goto("/holders");
  await expect(
    page.getByRole("link", { name: "DANA PENSIUN CONTOH" }),
  ).toBeVisible();
});

test("every heading level of an Indonesian page follows the one above it", async ({
  page,
}) => {
  await chooseLanguage(page, "id");
  for (const { path } of SITE_PAGES) {
    await page.goto(path);
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((heading) =>
        Number(heading.tagName.slice(1)),
      ),
    );
    expect(levels[0], path).toBe(1);
    levels.forEach((level, index) => {
      if (index > 0)
        expect(level, `${path} heading ${index}`).toBeLessThanOrEqual(
          levels[index - 1]! + 1,
        );
    });
    expect((await headings(page, 2)).every((text) => text.length > 0)).toBe(
      true,
    );
  }
});
