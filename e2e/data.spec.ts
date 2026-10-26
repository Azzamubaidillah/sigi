import { expect, type Page, test } from "./fixture";
import { EMPTY_ORIGIN, MONTHS } from "./world";

const section = (page: Page, heading: string) =>
  page
    .locator("section.sec")
    .filter({ has: page.getByRole("heading", { level: 2, name: heading }) });

test.describe("data and sources page", () => {
  test("summarises freshness first: the overall status, the published month, its size and when the next file is due", async ({
    page,
  }) => {
    await page.goto("/data");
    // Two feeds failed their last check; the pill says so before any table.
    await expect(page.locator(".page-head-aside .pill")).toHaveText(
      "2 of 10 sources failed their last check",
    );
    const s1 = section(page, "Holders above 1% (S1)");
    await expect(s1).toContainText("30 Sept 2026");
    await expect(
      s1.locator(".kf > div").filter({ hasText: "Rows" }),
    ).toContainText("9");
    await expect(
      s1.locator(".kf > div").filter({ hasText: "Companies" }),
    ).toContainText("4");
    await expect(s1).toContainText("Next file expected by");
    await expect(s1).toContainText("7 Nov 2026");
    await expect(s1).toContainText("Covers the end of October 2026");
    await expect(section(page, "Checks of each source")).toContainText(
      "7 of 10 sources passed their last check; 2 failed and 1 not yet checked.",
    );
  });

  test("a file that failed a check is listed as rejected, with the check that failed", async ({
    page,
  }) => {
    await page.goto("/data");
    const imports = section(page, "Imports");
    await expect(imports.getByRole("columnheader")).toHaveText([
      "Imported",
      "File",
      "Period",
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
    await expect(rejected).toContainText("Percent sum per company");
    await expect(rejected).toContainText(
      "FAIL: AAAA totals 104.00% (limit 100%)",
    );
    // Each verdict is a word in a pill, with an icon beside it.
    await expect(
      rejected.locator('.gate-list .pill[data-tone="negative"]'),
    ).toHaveText("Fail");
    await expect(
      rejected.locator('.gate-list .pill[data-tone="warn"]'),
    ).toHaveText("Warn");
    await expect(rejected.locator(".gate-list svg.icon")).toHaveCount(8);
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
      "Status",
      "Last checked",
      "Outcome",
      "Next check",
      "Last new data",
    ]);
    // The exchange page, four BI tables' worth of feeds, the pink sheet, three FRED series and news.
    await expect(feeds.locator("tbody tr")).toHaveCount(10);
    const failed = feeds.getByRole("row", { name: /FRED DFEDTARU/ });
    await expect(failed).toContainText("Failed");
    await expect(failed).toContainText("HTTP 503 from fred.stlouisfed.org");
    // A failed check is retried after three hours; an expected time is shown.
    await expect(failed).toContainText("About");
    await expect(
      feeds.getByRole("row", { name: /Cadangan Devisa/ }),
    ).toContainText("Not yet checked");
    const imported = feeds.getByRole("row", { name: /BI-Rate/ });
    await expect(imported).toContainText("OK");
    await expect(imported).toContainText("1 imported");
    await expect(
      feeds.getByRole("row", { name: /CNBC Indonesia/ }),
    ).toContainText("feed timed out");
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
    // Four short readings, each under its own heading.
    await expect(page.locator(".prose p")).toHaveCount(4);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Visitors",
      "Cookies",
      "TradingView",
      "Personal data in the sources",
    ]);
    const main = page.locator("main");
    await expect(main).toContainText("no analytics and no advertising");
    await expect(
      main.getByRole("link", { name: "privacy policy" }),
    ).toHaveAttribute("href", "https://www.tradingview.com/privacy-policy/");
  });

  test("names the language cookie plainly", async ({ page }) => {
    await page.goto("/privacy");
    await expect(
      page.getByRole("heading", { level: 2, name: "Cookies" }),
    ).toBeVisible();
    await expect(page.locator("code")).toHaveText("sigi-lang");
    await expect(page.getByText("lasts a year")).toBeVisible();
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
      feeds.getByRole("row").filter({ hasText: "Not yet checked" }),
    ).toHaveCount(10);
  });
});
