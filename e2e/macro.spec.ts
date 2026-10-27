import { expect, type Page, test } from "./fixture";
import { EMPTY_ORIGIN, MACRO_ABSENT } from "./world";

const tile = (page: Page, name: string) =>
  page.locator("article.tile").filter({
    has: page.getByRole("heading", { level: 3, name, exact: true }),
  });

test.describe("macro page", () => {
  test("groups the series under three headings, each with its tiles, then the sector indices", async ({
    page,
  }) => {
    await page.goto("/macro");
    await expect(
      page.locator("main").getByRole("heading", { level: 2 }),
    ).toHaveText([
      "Indonesia: rates, prices and the rupiah",
      "Commodities Indonesia sells",
      "Global money",
      "Sector indices",
    ]);
    // The launch bar (PRD §10): five or more series in each group, each with a tile.
    for (const [group, count] of [
      ["indonesia", 5],
      ["commodities", 6],
      ["global", 5],
    ] as const) {
      await expect(page.locator(`#${group} article.tile`)).toHaveCount(count);
    }
    await expect(page.locator("article.tile")).toHaveCount(16);
  });

  test("a published series shows its value, move, chart, range and, folded, its source and next release", async ({
    page,
  }) => {
    await page.goto("/macro");
    const rate = tile(page, "BI-Rate");
    await expect(rate.locator(".tile-value")).toContainText("6.50");
    // The value is as published; the move beside it is Sigi's own calculation.
    await expect(rate.locator(".tile-line .pill").first()).toHaveText(
      "published",
    );
    await expect(rate.getByText("from 6.50 on 19 Aug 2026")).toBeVisible();
    await expect(rate.locator(".tile-move")).toContainText("unchanged");
    await expect(rate.locator(".tile-move .pill")).toHaveText("Sigi");
    await expect(
      rate.getByRole("img", { name: "BI-Rate over the past year" }),
    ).toBeVisible();
    await expect(rate.getByText("Past year: 5.25 to 6.50")).toBeVisible();

    const source = rate.locator("details.src").filter({
      hasText: "Source: Bank Indonesia",
    });
    await expect(source).not.toHaveAttribute("open", "");
    await source.locator("summary").click();
    await expect(source).toHaveAttribute("open", "");
    await expect(source).toContainText("Bank Indonesia,");
    await expect(source).toContainText("accessed 24 Oct 2026");
    await expect(source).toContainText("Next release expected around");
    await expect(
      source.getByRole("link", { name: "example.test" }),
    ).toHaveAttribute("href", "https://example.test/macro/bi-rate");
  });

  test("a series from the BIS cites the BIS, with its terms of use", async ({
    page,
  }) => {
    await page.goto("/macro");
    const reer = tile(page, "Rupiah, real effective exchange rate");
    await expect(reer.locator(".tile-value")).toContainText(
      "index (2020 = 100)",
    );
    const source = reer.locator("details.src").filter({
      hasText: "Source: Bank for International Settlements",
    });
    await source.locator("summary").click();
    await expect(source).toContainText(
      "Real effective exchange rate, broad basket (64 economies)",
    );
    await expect(source).toContainText("accessed 24 Oct 2026");
    await expect(source).toContainText("Licence: ");
  });

  test("a move is an icon, a signed number and a word, never green or red", async ({
    page,
  }) => {
    await page.goto("/macro");
    const brent = tile(page, "Crude oil, Brent");
    const move = brent.locator(".tile-move");
    await expect(move).toContainText(/[+−]\d/);
    await expect(move).toContainText(/up|down/);
    await expect(move.locator("svg.icon")).toHaveCount(1);
    await expect(move.locator(".tone-positive, .tone-negative")).toHaveCount(0);
  });

  test("a year-on-year series adds Sigi's percentage against a year earlier", async ({
    page,
  }) => {
    await page.goto("/macro");
    const brent = tile(page, "Crude oil, Brent");
    await expect(brent.locator(".tile-value")).toContainText("80.40");
    await expect(brent.getByText("against Sept 2025")).toBeVisible();
    await expect(brent).toContainText("+13.6%");
    const source = brent.locator("details.src").first();
    await expect(source).toContainText(
      "World Bank Commodity Price Data (The Pink Sheet)",
    );
    await expect(source).toContainText("CC BY 4.0");
  });

  test("shows why a series matters for sectors, behind a disclosure", async ({
    page,
  }) => {
    await page.goto("/macro");
    const rate = tile(page, "BI-Rate");
    const details = rate.locator("details.src").filter({
      hasText: "Why it matters for IDX sectors",
    });
    await expect(details).not.toHaveAttribute("open", "");
    await details.getByText("Why it matters for IDX sectors").click();
    await expect(details).toHaveAttribute("open", "");
    await expect(details.locator("li")).toHaveCount(2);
    await expect(details).toContainText("Financials.");
  });

  test("a series with no data shows its typed reason instead of a number", async ({
    page,
  }) => {
    await page.goto("/macro");
    const notFetched = tile(page, MACRO_ABSENT.notFetched);
    await expect(notFetched.locator("p.absent")).toHaveText(
      "Not fetched yet: the worker has not checked this source.",
    );
    const failed = tile(page, MACRO_ABSENT.fetchFailed);
    await expect(failed.locator("p.absent")).toHaveText(
      "The source could not be reached on the last check, and nothing has been published from it yet. (HTTP 503 from fred.stlouisfed.org)",
    );
    const rejected = tile(page, MACRO_ABSENT.rejected);
    await expect(rejected.locator("p.absent")).toHaveText(
      "The last file from the source failed its checks, and nothing has been published from it yet.",
    );
    for (const absent of [notFetched, failed, rejected]) {
      await expect(absent.locator(".tile-value")).toHaveCount(0);
      await expect(absent.getByRole("img")).toHaveCount(0);
      // Even with no figure the source and its licence status are named.
      await expect(absent.locator("details.src")).toContainText("Licence:");
    }
  });

  test("shows the TradingView sector indices in their own framed section", async ({
    page,
  }) => {
    await page.goto("/macro");
    await expect(page.locator("#indices figure.widget")).toHaveCount(6);
    await expect(page.locator("article.tile figure.widget")).toHaveCount(0);
  });
});

test.describe("macro page with nothing fetched yet", () => {
  test.use({ baseURL: EMPTY_ORIGIN });

  test("every series shows that it has not been fetched", async ({ page }) => {
    await page.goto("/macro");
    await expect(page.locator("article.tile")).toHaveCount(16);
    await expect(page.locator("article.tile p.absent")).toHaveCount(16);
    await expect(page.locator(".tile-value")).toHaveCount(0);
  });
});
