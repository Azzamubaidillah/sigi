import { expect, type Page, test } from "./fixture";
import { EMPTY_ORIGIN, MONTHS } from "./world";

const section = (page: Page, heading: string) =>
  page
    .locator("section.panel")
    .filter({ has: page.getByRole("heading", { level: 2, name: heading }) });

test.describe("data and sources page", () => {
  test("shows the published month with its size and when the next file is due", async ({
    page,
  }) => {
    await page.goto("/data");
    const s1 = section(page, "Holders above 1% (S1)");
    await expect(s1).toContainText("30 Sept 2026");
    await expect(
      s1.locator("div", { hasText: "Rows · companies" }).last(),
    ).toContainText("9 · 4");
    await expect(s1).toContainText("Next file (end of October 2026)");
    await expect(s1).toContainText("expected by 7 Nov 2026");
  });

  test("a file that failed a check is listed as rejected, with the check that failed", async ({
    page,
  }) => {
    await page.goto("/data");
    const imports = section(page, "Imports");
    await expect(imports.getByRole("columnheader")).toHaveText([
      "Run",
      "Imported",
      "File",
      "Latest period",
      "Rows",
      "Outcome",
      "Checks",
    ]);
    const rejected = imports
      .getByRole("row")
      .filter({ hasText: "2026-10-30.xlsx" });
    await expect(rejected).toContainText("Rejected");
    await expect(rejected).toContainText("1 of 8 failed");
    // The checks fold away; open them to read each verdict and its detail.
    await rejected.getByText("1 of 8 failed").click();
    await expect(rejected).toContainText(
      "Percent sum per company: FAIL: AAAA totals 104.00% (limit 100%)",
    );
    await expect(rejected.locator(".badge.fail")).toHaveText("fail");
    await expect(rejected.locator(".badge.warn")).toHaveText("warn");
    await expect(
      rejected.getByRole("link", {
        name: "Pemegang Saham di Atas 1% 2026-10-30.xlsx",
      }),
    ).toHaveAttribute("href", "https://example.test/idx/2026-10-30.xlsx");
  });

  test("an unreadable file is listed with the reason it could not be read", async ({
    page,
  }) => {
    await page.goto("/data");
    const unreadable = section(page, "Imports")
      .getByRole("row")
      .filter({ hasText: "2026-10-29.xlsx" });
    await expect(unreadable).toContainText("Rejected");
    await expect(unreadable).toContainText(
      "Unreadable: header row not found in sheet 1",
    );
  });

  test("the rejected file leaves the previous month published everywhere", async ({
    page,
  }) => {
    await page.goto("/data");
    const imports = section(page, "Imports");
    const published = imports.getByRole("row").filter({ hasText: "Published" });
    // Two S1 months and five macro files are published; the S1 months are both there.
    await expect(
      imports.getByRole("row").filter({ hasText: "2026-09-30.xlsx" }),
    ).toContainText("Published");
    await expect(
      imports.getByRole("row").filter({ hasText: "2026-08-31.xlsx" }),
    ).toContainText("Published");
    await expect(published).toHaveCount(7);
    await expect(section(page, "Holders above 1% (S1)")).toContainText(
      "30 Sept 2026",
    );

    // The market page still shows September, not the rejected October file.
    await page.goto("/");
    await expect(
      page.getByText(`As of 30 Sept 2026, changes against 31 Aug 2026.`),
    ).toBeVisible();
    await expect(page.getByText(/30 Oct 2026/)).toHaveCount(0);
    await page.goto("/holders");
    await expect(page.getByText("As of 30 Sept 2026:")).toBeVisible();
  });

  test("a published file with a warning shows the warning", async ({
    page,
  }) => {
    await page.goto("/data");
    const row = section(page, "Imports")
      .getByRole("row")
      .filter({ hasText: "2026-09-30.xlsx" });
    await expect(row).toContainText("All passed, 1 with a warning");
    await row.getByText("All passed, 1 with a warning").click();
    await expect(row).toContainText(
      "1 row where scripless + scrip differs from total (CCCC)",
    );
    await expect(
      row.getByText(MONTHS.latest, { exact: false }).first(),
    ).toBeVisible();
  });

  test("shows the latest check of each feed, including failures and feeds never checked", async ({
    page,
  }) => {
    await page.goto("/data");
    const feeds = section(page, "Checks of each source");
    await expect(feeds.getByRole("columnheader")).toHaveText([
      "Feed",
      "Source",
      "Last checked",
      "Outcome",
      "Last new data",
    ]);
    // The exchange page, four BI tables' worth of feeds, the pink sheet, three FRED series and news.
    await expect(feeds.locator("tbody tr")).toHaveCount(10);
    await expect(
      feeds.getByRole("row", { name: /FRED DFEDTARU/ }),
    ).toContainText("Failed: HTTP 503 from fred.stlouisfed.org");
    await expect(
      feeds.getByRole("row", { name: /Cadangan Devisa/ }),
    ).toContainText("Not yet");
    await expect(feeds.getByRole("row", { name: /BI-Rate/ })).toContainText(
      "OK, 1 imported",
    );
    await expect(
      feeds.getByRole("row", { name: /CNBC Indonesia/ }),
    ).toContainText("Failed: feed timed out");
  });

  test("lists every source with its licence status and whether it is in use", async ({
    page,
  }) => {
    await page.goto("/data");
    const sources = section(page, "Sources and licences");
    await expect(sources.getByRole("columnheader")).toHaveText([
      "ID",
      "Source",
      "Status",
      "Terms",
      "In use",
    ]);
    await expect(sources.locator("tbody tr")).toHaveCount(10);
    const s1 = sources.getByRole("row", { name: /^S1 / });
    await expect(s1).toContainText("Cleared for non-commercial use");
    await expect(s1).toContainText("Yes");
    await expect(
      s1.getByRole("link", { name: "Holders above 1% (monthly)" }),
    ).toHaveAttribute(
      "href",
      "https://www.idx.co.id/id/perusahaan-tercatat/data-kepemilikan-saham/",
    );
    await expect(sources.getByRole("row", { name: /^S2/ })).toContainText(
      "Withheld until its terms are clear",
    );
    await expect(sources.getByRole("row", { name: /^S2/ })).toContainText(
      "Not yet",
    );
    await expect(sources.getByRole("row", { name: /^S5/ })).toContainText(
      "Excluded",
    );
  });
});

test.describe("privacy page", () => {
  test("states what the site collects and links TradingView's policy", async ({
    page,
  }) => {
    await page.goto("/privacy");
    const prose = page.locator("section.prose");
    await expect(prose.locator("p")).toHaveCount(4);
    await expect(prose).toContainText("no analytics and no advertising");
    await expect(
      prose.getByRole("link", { name: "privacy policy" }),
    ).toHaveAttribute("href", "https://www.tradingview.com/privacy-policy/");
  });
});

test.describe("data page with nothing published yet", () => {
  test.use({ baseURL: EMPTY_ORIGIN });

  test("says so for the month, the imports and each feed", async ({ page }) => {
    await page.goto("/data");
    await expect(page.getByText("No month published yet.")).toBeVisible();
    await expect(
      page.getByText("No file has been imported yet."),
    ).toBeVisible();
    const feeds = section(page, "Checks of each source");
    await expect(
      feeds.getByRole("row").filter({ hasText: "Not yet" }),
    ).toHaveCount(10);
  });
});
