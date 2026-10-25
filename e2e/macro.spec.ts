import { expect, type Page, test } from "./fixture";
import { EMPTY_ORIGIN, MACRO_ABSENT } from "./world";

const card = (page: Page, name: string) =>
  page.locator("article.macro-card").filter({
    has: page.getByRole("heading", { level: 3, name, exact: true }),
  });

test.describe("macro page", () => {
  test("groups the series under three headings, each with its cards", async ({
    page,
  }) => {
    await page.goto("/macro");
    const groups = page.locator("section.panel");
    await expect(groups.getByRole("heading", { level: 2 })).toHaveText([
      "Indonesia: rates, prices and the rupiah",
      "Commodities Indonesia sells",
      "Global money",
    ]);
    // 4 + 6 + 3 series, each with a card.
    await expect(page.locator("article.macro-card")).toHaveCount(13);
  });

  test("a published series shows its value, change, chart, source and next release", async ({
    page,
  }) => {
    await page.goto("/macro");
    const rate = card(page, "BI-Rate");
    await expect(rate.locator(".macro-value")).toContainText("6.50");
    await expect(rate.locator(".macro-value")).toContainText("published");
    await expect(rate.getByText("Previous, 19 Aug 2026")).toBeVisible();
    // Sigi's own calculation is labelled as such.
    await expect(rate.locator(".badge.derived").first()).toHaveText("Sigi");
    await expect(
      rate.getByRole("img", { name: "BI-Rate over the past year" }),
    ).toBeVisible();
    await expect(rate.getByText("Past year: 5.25 to 6.50")).toBeVisible();
    const citation = rate.locator("p.citation");
    await expect(citation).toContainText("Source: Bank Indonesia");
    await expect(citation).toContainText("accessed 24 Oct 2026");
    await expect(citation).toContainText("Next release expected around");
    await expect(
      citation.getByRole("link", { name: "example.test" }),
    ).toHaveAttribute("href", "https://example.test/macro/bi-rate");
  });

  test("a year-on-year series adds Sigi's percentage against a year earlier", async ({
    page,
  }) => {
    await page.goto("/macro");
    const brent = card(page, "Crude oil, Brent");
    await expect(brent.locator(".macro-value")).toContainText("80.40");
    await expect(brent.getByText("On Sept 2025")).toBeVisible();
    await expect(brent).toContainText("+13.6%");
    await expect(brent.locator("p.citation")).toContainText(
      "World Bank Commodity Price Data (The Pink Sheet)",
    );
    await expect(brent.locator("p.citation")).toContainText("CC BY 4.0");
  });

  test("shows why a series matters for sectors, behind a disclosure", async ({
    page,
  }) => {
    await page.goto("/macro");
    const rate = card(page, "BI-Rate");
    const details = rate.locator("details");
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
    const notFetched = card(page, MACRO_ABSENT.notFetched);
    await expect(notFetched.locator("p.absent")).toHaveText(
      "Not fetched yet: the worker has not checked this source.",
    );
    const failed = card(page, MACRO_ABSENT.fetchFailed);
    await expect(failed.locator("p.absent")).toHaveText(
      "The source could not be reached on the last check, and nothing has been published from it yet. (HTTP 503 from fred.stlouisfed.org)",
    );
    const rejected = card(page, MACRO_ABSENT.rejected);
    await expect(rejected.locator("p.absent")).toHaveText(
      "The last file from the source failed its checks, and nothing has been published from it yet.",
    );
    for (const absent of [notFetched, failed, rejected]) {
      await expect(absent.locator(".macro-value")).toHaveCount(0);
      await expect(absent.getByRole("img")).toHaveCount(0);
      // Even with no figure the source and its licence status are named.
      await expect(absent.locator("p.citation")).not.toBeEmpty();
    }
  });

  test("shows the TradingView sector indices beside the groups", async ({
    page,
  }) => {
    await page.goto("/macro");
    await expect(page.locator("figure.widget")).toHaveCount(6);
  });
});

test.describe("macro page with nothing fetched yet", () => {
  test.use({ baseURL: EMPTY_ORIGIN });

  test("every series shows that it has not been fetched", async ({ page }) => {
    await page.goto("/macro");
    await expect(page.locator("article.macro-card")).toHaveCount(13);
    await expect(page.locator("article.macro-card p.absent")).toHaveCount(13);
    await expect(page.locator(".macro-value")).toHaveCount(0);
  });
});
