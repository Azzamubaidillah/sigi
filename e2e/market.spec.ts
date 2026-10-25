import { expect, type Page, test } from "./fixture";
import {
  COMPANIES,
  EMPTY_ORIGIN,
  HOLDERS,
  THESES,
  UNKNOWN_CODE,
} from "./world";

const { steady, sellingDown, incomplete, belowMinimum } = COMPANIES;

const screenRow = (page: Page, code: string) =>
  page.getByRole("table").getByRole("row", { name: new RegExp(`^${code}`) });

/** The value beside one label of a figures list (`<dl class="figures">`). */
const figure = (page: Page, label: string) =>
  page
    .locator("dl.figures > div")
    .filter({ has: page.getByText(label, { exact: true }) });

test.describe("market page: the ownership screen", () => {
  test("lists every company of the latest month with its figures", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByText(
        /As of 30 Sept 2026, changes against 31 Aug 2026\. 4 of 4 companies shown; none excluded\./,
      ),
    ).toBeVisible();
    await expect(page.getByRole("table").getByRole("columnheader")).toHaveText([
      "Code",
      "Company",
      "Holders above 1%",
      "Largest holder",
      "Free float bound",
      "HHI",
      "Since last month",
    ]);
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(4);

    const aaaa = screenRow(page, steady.code);
    await expect(aaaa).toContainText(steady.issuer);
    await expect(aaaa.getByRole("link", { name: steady.code })).toHaveAttribute(
      "href",
      `/t/${steady.code}`,
    );
    await expect(aaaa).toContainText("60.00%");
    await expect(aaaa).toContainText("40.00%");
    await expect(aaaa).toContainText("1 new, 1 up");

    await expect(screenRow(page, sellingDown.code)).toContainText("18.00%");
    await expect(screenRow(page, sellingDown.code)).toContainText(
      "1 gone, 1 down",
    );
    await expect(screenRow(page, belowMinimum.code)).toContainText("10.00%");
  });

  test("gives no float figure for a register that is incomplete", async ({
    page,
  }) => {
    await page.goto("/");
    const row = screenRow(page, incomplete.code);
    await expect(row).toContainText("incomplete");
    await expect(row).not.toContainText("92.00%");
  });

  test("cites its source with the record date and access date", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.locator("p.citation", { hasText: "record date 30 Sept 2026" }),
    ).toContainText("accessed 24 Oct 2026");
  });

  test("filters through the form and keeps the filter in the address", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Free float bound below (%)").fill("15");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/floatMax=15/);
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(1);
    await expect(screenRow(page, belowMinimum.code)).toBeVisible();
    // The incomplete register is counted, never silently dropped.
    await expect(
      page.getByText(/1 of 4 companies shown; excluded: 1 \(/),
    ).toBeVisible();
    await expect(page.getByLabel("Free float bound below (%)")).toHaveValue(
      "15",
    );

    await page.getByRole("link", { name: "Reset" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(4);
  });

  test("filters by holders changed, by name and by foreign holder", async ({
    page,
  }) => {
    await page.goto("/?changed=1");
    await expect(
      page.getByLabel("Holders changed since the previous month"),
    ).toBeChecked();
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(2);
    await expect(screenRow(page, steady.code)).toBeVisible();
    await expect(screenRow(page, sellingDown.code)).toBeVisible();

    await page.goto("/?foreign=1");
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(1);
    await expect(screenRow(page, steady.code)).toBeVisible();

    await page.goto("/?q=dharma");
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(1);
    await expect(screenRow(page, belowMinimum.code)).toBeVisible();
  });

  test("ignores a malformed filter instead of guessing", async ({ page }) => {
    await page.goto("/?floatMax=abc&type=ZZ&sort=drop");
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(4);
  });

  test("shows the TradingView widgets as captioned embeds", async ({
    page,
  }) => {
    await page.goto("/");
    const captions = page.locator("figure.widget figcaption");
    await expect(captions).toHaveCount(2);
    await expect(
      captions.first().getByRole("link", { name: /TradingView/ }),
    ).toHaveAttribute("href", "https://www.tradingview.com/");
    // The loader is requested from TradingView, with the page's language.
    const configs = await page
      .locator('script[src^="https://s3.tradingview.com/external-embedding/"]')
      .evaluateAll((scripts) => scripts.map((script) => script.textContent));
    expect(configs).toHaveLength(2);
    for (const config of configs)
      expect(JSON.parse(config ?? "{}")).toMatchObject({ locale: "en" });
  });
});

test.describe("ticker page", () => {
  test("shows the figures, holders and changes of a company", async ({
    page,
  }) => {
    await page.goto(`/t/${steady.code}`);
    await expect(figure(page, "Free float, upper bound")).toContainText(
      "40.00%",
    );
    await expect(figure(page, "Largest holder")).toContainText("60.00%");
    await expect(figure(page, "Held below 1%")).toContainText("31.00%");
    await expect(figure(page, "HHI, holders above 1%")).toContainText("3,632");
    await expect(figure(page, "Holders above 1%")).toContainText("4");

    const holders = page.getByRole("table").first();
    await expect(holders.getByRole("columnheader")).toHaveText([
      "Holder",
      "Type",
      "Local / foreign",
      "Domicile",
      "Scripless",
      "Scrip",
      "Total shares",
      "%",
    ]);
    await expect(holders.locator("tbody tr")).toHaveCount(4);
    const global = holders.getByRole("row", { name: /GLOBAL FUND LTD/ });
    await expect(global).toContainText("Mutual Funds");
    await expect(global).toContainText("Foreign");
    await expect(global).toContainText("SINGAPORE");
    await expect(global).toContainText("3,000,000");

    await expect(
      page.getByText(
        "Against 31 Aug 2026: 1 new, 0 gone, 1 up, 0 down, 2 unchanged.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText("No company-specific deadline can be shown"),
    ).toBeVisible();
  });

  test("links institutions to their page and never an individual", async ({
    page,
  }) => {
    await page.goto(`/t/${steady.code}`);
    const table = page.getByRole("table").first();
    await expect(
      table.getByRole("link", { name: HOLDERS.parent.name }),
    ).toHaveAttribute("href", `/holders/${HOLDERS.parent.slug}`);
    await expect(
      table.getByRole("link", { name: HOLDERS.fund.name }),
    ).toHaveAttribute("href", `/holders/${HOLDERS.fund.slug}`);
    await expect(table.getByText(HOLDERS.individual.name)).toBeVisible();
    await expect(
      page.locator(`a[href="/holders/${HOLDERS.individual.slug}"]`),
    ).toHaveCount(0);
  });

  test("names the theses that mention the company", async ({ page }) => {
    await page.goto(`/t/${steady.code}`);
    await expect(
      page.getByRole("link", { name: THESES.valid.title }),
    ).toHaveAttribute("href", `/theses/${THESES.valid.slug}`);
  });

  test("gives possible deadlines for a company certainly below 15%", async ({
    page,
  }) => {
    await page.goto(`/t/${belowMinimum.code}`);
    await expect(figure(page, "Free float, upper bound")).toContainText(
      "10.00%",
    );
    await expect(
      page.getByText(`Possible deadlines for ${belowMinimum.code}:`),
    ).toBeVisible();
  });

  test("gives no float figure for an incomplete register and flags a row that does not add up", async ({
    page,
  }) => {
    await page.goto(`/t/${incomplete.code}`);
    await expect(figure(page, "Free float, upper bound")).toContainText(
      "not given",
    );
    await expect(page.getByText(/too little to be complete/)).toBeVisible();
    await expect(
      page.getByText(
        "In the source file, one row's total shares differ from scripless plus scrip.",
      ),
    ).toBeVisible();
    await expect(page.getByText("as published", { exact: true })).toBeVisible();
  });

  test("a code not in the register says so, with the source", async ({
    page,
  }) => {
    const response = await page.goto(`/t/${UNKNOWN_CODE}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      UNKNOWN_CODE,
    );
    await expect(
      page.getByText(
        "This code has no holder above 1% in the latest published month, or is not a listed share.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(`No thesis names ${UNKNOWN_CODE}.`),
    ).toBeVisible();
    await expect(
      page.getByText(`ZZZZ has no entry in the register.`),
    ).toBeVisible();
  });

  test("a code in lower case is read as the same company", async ({ page }) => {
    const response = await page.goto(`/t/${steady.code.toLowerCase()}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `${steady.code} · ${steady.issuer}`,
    );
  });

  test.describe("a malformed code", () => {
    test.use({ allowedStatuses: [404] });
    for (const code of ["abc", "AAAAA", "AA1A", "AAA"]) {
      test(`/t/${code} is a 404`, async ({ page }) => {
        const response = await page.goto(`/t/${code}`);
        expect(response?.status()).toBe(404);
      });
    }
  });
});

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
    await expect(row).toContainText("If Rp5T or more: 12.5% by 2027-03-31");
    await expect(
      page.getByText("1 rose above 15% (BBBB), 0 fell below (none)"),
    ).toBeVisible();
    await expect(page.getByText(/Register incomplete \(CCCC\)/)).toBeVisible();
  });

  test("shows the timeline with a source on every date and the methodology", async ({
    page,
  }) => {
    await page.goto("/investability");
    const timeline = page
      .getByRole("heading", { level: 2, name: "Timeline" })
      .locator("xpath=following::table[1]");
    await expect(timeline.getByRole("row")).toHaveCount(7);
    for (const row of await timeline.getByRole("row").all())
      await expect(row.getByRole("link")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 2, name: "Methodology" }),
    ).toBeVisible();
    await page.goto("/investability#methodology");
    await expect(page.locator("#methodology")).toBeVisible();
  });
});

test.describe("market pages with nothing published yet", () => {
  test.use({ baseURL: EMPTY_ORIGIN });

  test("say so instead of showing an empty table", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("No month of the >1% register has been published yet."),
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    await page.goto("/investability");
    await expect(
      page.getByText("No month of the >1% register has been published yet."),
    ).toBeVisible();
    await page.goto("/holders");
    await expect(
      page.getByText("No month of the >1% register has been published yet."),
    ).toBeVisible();
    await page.goto(`/t/${steady.code}`);
    await expect(
      page.getByText("No month of the >1% register has been published yet."),
    ).toBeVisible();
  });
});
