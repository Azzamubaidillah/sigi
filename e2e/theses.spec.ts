import { expect, type Page, test } from "./fixture";
import { COMPANIES, EMPTY_ORIGIN, manifest, THESES } from "./world";

const NOT_ADVICE = /not investment advice/;

const notAdvice = (page: Page) =>
  page.getByRole("main").getByText(NOT_ADVICE).first();

test.describe("theses index", () => {
  test("carries the not-advice notice and the conditions hit", async ({
    page,
  }) => {
    await page.goto("/theses");
    await expect(notAdvice(page)).toContainText(
      "they do not recommend any transaction in any security",
    );

    const hit = page
      .getByRole("heading", { level: 2, name: "Conditions hit" })
      .locator("xpath=following::table[1]");
    await expect(hit.getByRole("columnheader")).toHaveText([
      "Thesis",
      "Condition",
      "What was compared",
      "Met since",
    ]);
    await expect(hit.locator("tbody tr")).toHaveCount(1);
    const row = hit.locator("tbody tr");
    await expect(
      row.getByRole("link", { name: THESES.valid.title }),
    ).toHaveAttribute("href", `/theses/${THESES.valid.slug}`);
    await expect(row).toContainText("macro bi-rate above 6.25");
    await expect(row).toContainText(
      "BI-Rate is 6.50 (%) for 2026-09-16, as published (condition: above 6.25).",
    );
  });

  test("lists every thesis, naming one whose conditions cannot be read", async ({
    page,
  }) => {
    await page.goto("/theses");
    const all = page
      .getByRole("heading", { level: 2, name: "All theses" })
      .locator("xpath=following::table[1]");
    await expect(all.getByRole("columnheader")).toHaveText([
      "Thesis",
      "Tickers",
      "Status",
      "Stance",
      "Review",
      "Version",
    ]);
    await expect(all.locator("tbody tr")).toHaveCount(2);

    const valid = all.getByRole("row", {
      name: new RegExp(THESES.valid.title),
    });
    await expect(valid).toContainText("Active");
    await expect(valid).toContainText("2 versions");
    await expect(
      valid.getByRole("link", { name: COMPANIES.steady.code }),
    ).toHaveAttribute("href", `/t/${COMPANIES.steady.code}`);

    const broken = all.getByRole("row", {
      name: new RegExp(THESES.unreadable.title),
    });
    await expect(broken).toContainText("Conditions unreadable:");
    await expect(broken).toContainText(
      "Line 1 of the conditions block: float takes only below",
    );
  });
});

test.describe("thesis page", () => {
  test("shows the summary, catalysts, checked conditions and history", async ({
    page,
  }) => {
    await page.goto(`/theses/${THESES.valid.slug}`);
    await expect(notAdvice(page)).toBeVisible();
    await expect(
      page.getByRole("main").getByText("not investment advice"),
    ).toHaveCount(1);

    const summary = page.locator("dl").first();
    await expect(summary).toContainText("Active");
    await expect(summary).toContainText("AAAA");
    await expect(summary).toContainText(
      "The register suggests the controller must sell down by 2030",
    );
    await expect(summary).toContainText("30 Jun 2030");
    await expect(summary).toContainText("20 Oct 2026");

    const catalysts = page
      .getByRole("heading", { level: 3, name: "Catalysts" })
      .locator("xpath=following::table[1]");
    // Sorted by date, earliest first.
    await expect(catalysts.locator("tbody tr")).toHaveText([
      /15 Dec 2029\s*Board meeting/,
      /31 Mar 2030\s*First deadline for large caps/,
    ]);

    const conditions = page
      .getByRole("heading", { level: 2, name: "Invalidation conditions" })
      .locator("xpath=following::table[1]");
    await expect(conditions.getByRole("columnheader")).toHaveText([
      "Condition",
      "Status",
      "What was compared",
      "Checked",
      "Data",
    ]);
    await expect(conditions.locator("tbody tr")).toHaveCount(5);
    const row = (text: string) =>
      conditions.getByRole("row").filter({ hasText: text });
    await expect(row("ownership AAAA")).toContainText("Not met");
    await expect(row("ownership AAAA")).toContainText(
      "Holds 60.00% of AAAA on 2026-09-30 (condition: below 50.00%).",
    );
    await expect(
      row("ownership AAAA").getByRole("link", { name: "holder page" }),
    ).toHaveAttribute("href", "/holders/pt-induk-aaaa");
    await expect(row("float BBBB")).toContainText("Not met");
    await expect(row("macro bi-rate")).toContainText(/Met since/);
    await expect(row("date 2030-01-01")).toContainText("Not met");
    await expect(row("price AAAA")).toContainText("Manual check");
    await expect(row("price AAAA")).toContainText("Sigi stores no prices");
  });

  test("renders the body with safe links only", async ({ page }) => {
    await page.goto(`/theses/${THESES.valid.slug}`);
    await expect(
      page.getByRole("heading", { level: 3, name: "Why" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Data & sources" }).last(),
    ).toHaveAttribute("href", "/data");
    const external = page.getByRole("link", { name: "the exchange notice" });
    await expect(external).toHaveAttribute(
      "href",
      "https://example.test/notice",
    );
    await expect(external).toHaveAttribute("rel", /noopener/);
    await expect(external).toHaveAttribute("rel", /nofollow/);
  });

  test("keeps every version and shows what changed since the previous one", async ({
    page,
  }) => {
    const [current, older] = THESES.valid.versions;
    await page.goto(`/theses/${THESES.valid.slug}`);
    const history = page
      .getByRole("heading", { level: 2, name: "History" })
      .locator("xpath=following-sibling::ul[1]");
    await expect(history.locator("li")).toHaveCount(2);
    await expect(history.locator("li").first()).toContainText("(current)");
    await expect(history.getByRole("link")).toHaveAttribute(
      "href",
      `/theses/${THESES.valid.slug}?version=${older}`,
    );
    await expect(
      page.getByText(/\d+ lines? added, \d+ removed since 15 Sept 2026\./),
    ).toBeVisible();
    await expect(page.locator("pre.diff").first()).toContainText(
      "+ review: 2030-06-30",
    );
    await expect(page.locator("pre.diff").first()).toContainText(
      "- review: 2030-03-31",
    );

    await history.getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`version=${older}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      THESES.valid.title,
    );
    // An older version is shown as written; only the current one is checked.
    await expect(
      page.getByText("Only the current version’s conditions are checked."),
    ).toBeVisible();
    await expect(page.getByText("This is the first version.")).toBeVisible();
    await expect(notAdvice(page)).toBeVisible();
    await expect(
      page
        .locator("li", { hasText: `${current.slice(8)} Oct 2026` })
        .getByRole("link"),
    ).toHaveAttribute(
      "href",
      `/theses/${THESES.valid.slug}?version=${current}`,
    );
  });

  test("names the reason when the conditions block cannot be read, and never runs a file's markup", async ({
    page,
  }) => {
    await page.goto(`/theses/${THESES.unreadable.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      THESES.unreadable.title,
    );
    await expect(notAdvice(page)).toBeVisible();
    await expect(
      page.getByText(/^Conditions unreadable: Line 1 of the conditions block/),
    ).toBeVisible();
    // The conditions table is absent, not empty.
    await expect(
      page.getByRole("table").filter({ hasText: "What was compared" }),
    ).toHaveCount(0);

    // Markup in the file stays text: no element, no handler, no script link.
    await expect(page.locator('img[src="/hostile.png"]')).toHaveCount(0);
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
    expect(await page.evaluate(() => "pwned" in window)).toBe(false);
  });

  test.describe("pages that do not exist", () => {
    test.use({ allowedStatuses: [404] });

    for (const path of [
      "/theses/no-such-thesis",
      "/theses/..%2F..%2Fpackage",
      "/theses/Float-Rule-AAAA",
      `/theses/${THESES.valid.slug}?version=2020-01-01`,
      `/theses/${THESES.valid.slug}?version=..%2Ffloat-rule-aaaa%2F2026-10-20`,
      `/theses/${THESES.valid.slug}?version=latest`,
    ]) {
      test(`${path} is a 404`, async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(404);
      });
    }
  });
});

test.describe("daily brief", () => {
  test("shows the newest brief that passed its checks, with what it rests on", async ({
    page,
  }) => {
    await page.goto("/brief");
    await expect(notAdvice(page)).toContainText("recommends no transaction");

    const brief = page.locator("section.panel").first();
    await expect(brief.locator(".badge")).toHaveText("Notable");
    await expect(brief.locator("p.lede")).toContainText(
      "free-float bound is 10% in the September register.",
    );
    const looks = brief.getByRole("table");
    await expect(looks.getByRole("columnheader")).toHaveText([
      "What",
      "Why",
      "Evidence",
    ]);
    const row = looks.locator("tbody tr");
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(COMPANIES.belowMinimum.code);
    await expect(row).toContainText("certainly below the minimum");
    // Evidence leads to the page that holds it.
    await expect(
      row.getByRole("link", { name: `float:${COMPANIES.belowMinimum.code}` }),
    ).toHaveAttribute("href", `/t/${COMPANIES.belowMinimum.code}`);
    await expect(brief.getByRole("heading", { level: 3 })).toHaveText([
      "Worth a closer look",
      "Changes since yesterday",
      "Risks to this reading",
      "Set aside, and why",
      "Web sources",
    ]);
    await expect(brief.getByText("No brief yesterday.")).toBeVisible();
    await expect(brief.getByText("Nothing.")).toBeVisible();
    const source = brief.getByRole("link", { name: "Example exchange notice" });
    await expect(source).toHaveAttribute("href", "https://example.test/notice");
    await expect(source).toHaveAttribute("rel", /noopener/);
    await expect(brief.locator("p.citation")).toContainText("Written");
  });

  test("names a newer file that failed validation and keeps the last good brief up", async ({
    page,
  }) => {
    const { rejectedFile, rejectedReason } = manifest().brief;
    await page.goto("/brief");
    await expect(
      page.getByText(
        `A newer file (${rejectedFile}) was not shown: ${rejectedReason}.`,
      ),
    ).toBeVisible();
    await expect(page.locator("section.panel .lede")).toHaveCount(1);
    // A fresh brief is not marked stale.
    await expect(page.getByText(/^Stale:/)).toHaveCount(0);
  });

  test("lists what went into it, saying which inputs were absent and why", async ({
    page,
  }) => {
    await page.goto("/brief");
    const inputs = page
      .getByRole("heading", { level: 2, name: "Inputs" })
      .locator("xpath=following::table[1]");
    await expect(inputs.getByRole("columnheader")).toHaveText([
      "Input",
      "As of",
      "Source",
      "What it is worth",
    ]);
    await expect(inputs.locator("tbody tr")).toHaveCount(7);
    const float = inputs.getByRole("row", { name: /^Float tracker/ });
    await expect(float).toContainText("2026-09-30");
    await expect(float).toContainText("S1");
    await expect(
      inputs.getByRole("row", { name: /^Ownership changes/ }),
    ).toContainText("Absent: not built");
    await expect(
      inputs.getByRole("row", { name: /^News for thesis tickers/ }),
    ).toContainText("Absent: No headline matched a thesis ticker.");
  });
});

test.describe("theses and brief with nothing published yet", () => {
  test.use({ baseURL: EMPTY_ORIGIN });

  test("the index says so, and keeps the notice", async ({ page }) => {
    await page.goto("/theses");
    await expect(notAdvice(page)).toBeVisible();
    await expect(page.getByText("No thesis is published yet.")).toHaveCount(2);
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  test("the brief says none has been written, and keeps the notice", async ({
    page,
  }) => {
    await page.goto("/brief");
    await expect(notAdvice(page)).toBeVisible();
    await expect(
      page.getByText(
        "No brief has been written yet. The agent runs each morning at about 06:00 WIB.",
      ),
    ).toBeVisible();
  });
});
