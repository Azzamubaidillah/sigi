import { expect, test } from "./fixture";
import { COMPANIES, EMPTY_ORIGIN } from "./world";

const { belowMinimum } = COMPANIES;

test.describe("investability page", () => {
  test("counts the companies certainly below 15% against the exchange's count", async ({
    page,
  }) => {
    await page.goto("/investability");
    const counts = page.locator("dl").first();
    await expect(counts).toContainText(
      "Sigi, 30 Sept 2026: certainly below 15%",
    );
    await expect(counts).toContainText("358 of 918");
    await expect(
      page.getByText(
        "Sigi counts a company only when even its upper bound is under 15%, so its count is a floor",
      ),
    ).toBeVisible();
  });

  test("buckets companies by float bound with links into the screen", async ({
    page,
  }) => {
    await page.goto("/investability");
    const table = page
      .getByRole("table")
      .filter({ hasText: "Upper bound on free float" });
    await expect(table.getByRole("columnheader")).toHaveText([
      "Upper bound on free float",
      "Companies",
    ]);
    await expect(table.getByRole("row", { name: /^Under 5%/ })).toContainText(
      "0",
    );
    await expect(
      table.getByRole("row", { name: /^5% to 12.5%/ }),
    ).toContainText("1");
    await expect(
      table.getByRole("row", { name: /^No figure: register incomplete/ }),
    ).toContainText("1");
    await expect(
      table.getByRole("link", { name: "5% to 12.5%" }),
    ).toHaveAttribute("href", "/?sort=float-asc&floatMin=5&floatMax=12.5");
    // The 15% minimum is drawn between the band under it and the band above.
    await expect(table.getByRole("row")).toContainText([
      "Upper bound on free float",
      "Under 5%",
      "5% to 12.5%",
      "12.5% to 15%",
      "15% minimum",
      "15% to 25%",
      "25% to 50%",
      "50% and above",
      "No figure: register incomplete",
    ]);
  });

  test("lists the company below the minimum, the crossings and the deadlines", async ({
    page,
  }) => {
    await page.goto("/investability");
    const row = page.getByRole("row", {
      name: new RegExp(`^${belowMinimum.code}`),
    });
    await expect(row).toContainText(belowMinimum.issuer);
    await expect(row).toContainText("10.00%");
    // The deadlines still possible stand once over the group of companies they apply to.
    const group = page.locator("tbody").filter({ has: row });
    await expect(group).toContainText(
      "If Rp5T or more: 12.5% by 31 Mar 2027, 15% by 31 Mar 2028",
    );
    await expect(group).toContainText("If under Rp5T: 15% by 31 Mar 2029");
    await expect(
      page.getByText("1 rose above 15% since 31 Aug 2026: BBBB"),
    ).toBeVisible();
    await expect(
      page.getByText("0 fell below 15% since 31 Aug 2026: none"),
    ).toBeVisible();
    // Every company fits on the page, so there is no link to the rest.
    await expect(
      page.getByRole("link", { name: /in the register$/ }),
    ).toHaveCount(0);
    await expect(page.getByText(/Register incomplete \(CCCC\)/)).toBeVisible();
  });

  test("shows the timeline with a source on every date and the methodology", async ({
    page,
  }) => {
    await page.goto("/investability");
    const timeline = page
      .getByRole("heading", { level: 2, name: "Timeline" })
      .locator("xpath=following::table[1]");
    await expect(timeline.locator("tbody").getByRole("row")).toHaveCount(7);
    for (const row of await timeline.locator("tbody").getByRole("row").all())
      await expect(row.getByRole("link")).toHaveCount(1);
    // Past dates are marked, and at most one date is the next.
    await expect(
      timeline.getByText("Passed", { exact: true }).first(),
    ).toBeVisible();
    expect(
      await timeline.getByText("Next", { exact: true }).count(),
    ).toBeLessThanOrEqual(1);
    await expect(
      page.getByRole("heading", { level: 2, name: "Methodology" }),
    ).toBeVisible();
    await page.goto("/investability#methodology");
    await expect(page.locator("#methodology")).toBeVisible();
  });
});

test.describe("investability with nothing published yet", () => {
  test.use({ baseURL: EMPTY_ORIGIN });

  test("says so instead of showing an empty table", async ({ page }) => {
    await page.goto("/investability");
    await expect(
      page.getByText("No month of the >1% register has been published yet."),
    ).toBeVisible();
  });
});
