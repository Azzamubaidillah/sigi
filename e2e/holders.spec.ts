import { expect, test } from "./fixture";
import { COMPANIES, EMPTY_ORIGIN, HOLDERS } from "./world";

test.describe("holders index", () => {
  test("lists institutions with the companies they hold and their largest position", async ({
    page,
  }) => {
    await page.goto("/holders");
    await expect(
      page.getByText(
        "As of 30 Sept 2026: 6 institutional holders. 2 other holders (individuals, or holders the source leaves unclassified) have no page.",
      ),
    ).toBeVisible();
    await expect(page.getByText("6 of 6 holders")).toBeVisible();
    const table = page.getByRole("table");
    await expect(table.getByRole("columnheader")).toHaveText([
      "Holder",
      "Type",
      "Companies",
      "Largest position",
    ]);
    await expect(table.locator("tbody tr")).toHaveCount(6);

    // An institution that appears at several companies.
    const fund = table.getByRole("row", { name: /^DANA PENSIUN CONTOH/ });
    await expect(fund.getByRole("link").first()).toHaveAttribute(
      "href",
      `/holders/${HOLDERS.fund.slug}`,
    );
    await expect(fund).toContainText("Pension Funds");
    await expect(fund).toContainText("2");
    await expect(fund).toContainText("AAAA 4.50%");
  });

  test("filters the list by part of a name and says how many are left", async ({
    page,
  }) => {
    await page.goto("/holders");
    const table = page.getByRole("table");
    await page.getByLabel("Filter holders by name").fill("pensiun");
    await expect(page.getByText("1 of 6 holders")).toBeVisible();
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await expect(
      table.getByRole("link", { name: HOLDERS.fund.name }),
    ).toBeVisible();
    await page.getByLabel("Filter holders by name").fill("");
    await expect(page.getByText("6 of 6 holders")).toBeVisible();
  });

  test("has no entry and no link for an individual", async ({ page }) => {
    await page.goto("/holders");
    await expect(page.getByText(HOLDERS.individual.name)).toHaveCount(0);
    await expect(
      page.locator(`a[href="/holders/${HOLDERS.individual.slug}"]`),
    ).toHaveCount(0);
  });
});

test.describe("holder page", () => {
  test("shows the positions of an institution at several companies", async ({
    page,
  }) => {
    await page.goto(`/holders/${HOLDERS.fund.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      HOLDERS.fund.name,
    );
    await expect(
      page.getByText("Pension Funds, domiciled in INDONESIA."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "All holders" }),
    ).toHaveAttribute("href", "/holders");

    const positions = page.getByRole("table").first();
    await expect(positions.getByRole("columnheader")).toHaveText([
      "Code",
      "Company",
      "Shares",
      "%",
    ]);
    await expect(positions.locator("tbody tr")).toHaveCount(2);
    const aaaa = positions.getByRole("row", { name: /^AAAA/ });
    await expect(aaaa).toContainText(COMPANIES.steady.issuer);
    await expect(aaaa).toContainText("4,500,000");
    await expect(aaaa).toContainText("4.50%");
    await expect(aaaa.getByRole("link", { name: "AAAA" })).toHaveAttribute(
      "href",
      "/t/AAAA",
    );
  });

  test("shows moves against the previous month, including entries and exits", async ({
    page,
  }) => {
    await page.goto(`/holders/${HOLDERS.fund.slug}`);
    const moves = page.getByRole("table").nth(1);
    await expect(moves.getByRole("columnheader")).toHaveText([
      "Code",
      "Company",
      "31 Aug 2026",
      "30 Sept 2026",
      "Shares",
      "Change",
    ]);
    await expect(moves.getByRole("row", { name: /^AAAA/ })).toContainText(
      "+2.50 pp",
    );
    // Gone from the file: the dash stands for "not above 1%", never zero.
    await expect(moves.getByRole("row", { name: /^BBBB/ })).toContainText(
      "−3.00 pp",
    );
    await expect(moves.getByRole("row", { name: /^DDDD/ })).toContainText(
      "+1.50 pp",
    );
    await expect(
      page.getByText(
        "A dash means the holding was at or below 1%, where the register does not report it, or that the holder was not in that month's file.",
      ),
    ).toBeVisible();
  });

  test.describe("pages that do not exist", () => {
    test.use({ allowedStatuses: [404] });

    for (const [what, slug] of [
      ["an individual", HOLDERS.individual.slug],
      ["an unclassified holder name", "campuran"],
      ["an unknown holder", "no-such-holder"],
      ["a path-traversal attempt", "..%2F..%2Fetc%2Fpasswd"],
      ["a slug with capitals", "Dana-Pensiun-Contoh"],
    ] as const) {
      test(`${what} (/holders/${slug}) is a 404`, async ({ page }) => {
        const response = await page.goto(`/holders/${slug}`);
        expect(response?.status()).toBe(404);
      });
    }
  });
});

test.describe("holders with nothing published yet", () => {
  test.use({ baseURL: EMPTY_ORIGIN, allowedStatuses: [404] });

  test("the index says so and no holder page exists", async ({ page }) => {
    await page.goto("/holders");
    await expect(
      page.getByText("No month of the >1% register has been published yet."),
    ).toBeVisible();
    const response = await page.goto(`/holders/${HOLDERS.fund.slug}`);
    expect(response?.status()).toBe(404);
  });
});
