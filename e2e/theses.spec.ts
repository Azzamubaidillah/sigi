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

    const hit = page.locator("#hits table");
    await expect(hit.getByRole("columnheader")).toHaveText([
      "Thesis",
      "Condition",
      "Reading",
      "Hit since",
    ]);
    await expect(hit.locator("tbody tr")).toHaveCount(1);
    const row = hit.locator("tbody tr");
    await expect(
      row.getByRole("link", { name: THESES.valid.title }),
    ).toHaveAttribute("href", `/theses/${THESES.valid.slug}`);
    await expect(row).toContainText("Hit");
    await expect(row).toContainText("BI-Rate: above 6.25%");
    await expect(row).toContainText(
      "BI-Rate is 6.50 (%) for 2026-09-16, as published (condition: above 6.25).",
    );
  });

  test("lists every thesis, naming one whose conditions cannot be read", async ({
    page,
  }) => {
    await page.goto("/theses");
    const all = page.locator("#held table");
    await expect(all.getByRole("columnheader")).toHaveText([
      "Thesis",
      "Status",
      "Review by",
      "Latest check",
    ]);
    await expect(all.locator("tbody tr")).toHaveCount(2);

    const valid = all.getByRole("row", {
      name: new RegExp(THESES.valid.title),
    });
    await expect(valid).toContainText("Active");
    await expect(valid).toContainText("2 versions");
    await expect(valid).toContainText("1 hit, 3 holding, 1 to check by hand");
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

    const head = page.locator("header.page-head");
    await expect(head).toContainText("Active");
    await expect(head).toContainText("AAAA");
    await expect(head.locator(".lede")).toContainText(
      "The register suggests the controller must sell down by 2030",
    );
    await expect(head).toContainText("Version of 20 Oct 2026");
    await expect(page.locator("#thesis .sec-note")).toContainText(
      "The float rule forces a placement",
    );

    const standing = page.locator("#standing");
    await expect(standing).toContainText("1 of 5 conditions hit.");
    await expect(standing.locator(".kf .lead")).toContainText("Hit");
    await expect(standing.locator(".kf .lead .v")).toHaveText("1");
    await expect(standing).toContainText("Holding");
    await expect(standing).toContainText("Check by hand");

    // Sorted by date, earliest first; the review date is one of them.
    await expect(page.locator("#dates li")).toHaveText([
      /15 Dec 2029\s*Board meeting/,
      /31 Mar 2030\s*First deadline for large caps/,
      /30 Jun 2030\s*Review: the author reads this thesis again\./,
    ]);

    const conditions = page.locator("#conditions table");
    await expect(conditions.getByRole("columnheader")).toHaveText([
      "Condition",
      "Threshold",
      "Current reading",
      "Status",
    ]);
    await expect(conditions.locator("tbody tr")).toHaveCount(5);
    const row = (text: string) =>
      conditions.getByRole("row").filter({ hasText: text });
    await expect(row("Stake of PT INDUK AAAA in AAAA")).toContainText(
      "below 50%",
    );
    await expect(row("Stake of PT INDUK AAAA in AAAA")).toContainText(
      "Holding",
    );
    await expect(row("Stake of PT INDUK AAAA in AAAA")).toContainText(
      "Holds 60.00% of AAAA on 2026-09-30 (condition: below 50.00%).",
    );
    await expect(
      row("Stake of PT INDUK AAAA in AAAA").getByRole("link", {
        name: "holder page",
      }),
    ).toHaveAttribute("href", "/holders/pt-induk-aaaa");
    await expect(row("Free float of BBBB")).toContainText("Holding");
    await expect(row("Free float of BBBB")).toContainText("12.5%");
    await expect(row("BI-Rate")).toContainText("Hit");
    await expect(row("BI-Rate")).toContainText(/Hit since/);
    await expect(row("BI-Rate")).toContainText("above 6.25%");
    await expect(
      row("By the date: no placement announced by then"),
    ).toContainText("Holding");
    await expect(
      row("By the date: no placement announced by then"),
    ).toContainText("1 Jan 2030");
    await expect(row("Price of AAAA")).toContainText("Check by hand");
    await expect(row("Price of AAAA")).toContainText("Sigi stores no prices");
    await expect(row("Price of AAAA")).toContainText("As of");
  });

  test("renders the body with safe links only", async ({ page }) => {
    await page.goto(`/theses/${THESES.valid.slug}`);
    await expect(
      page.getByRole("heading", { level: 3, name: "Why" }),
    ).toBeVisible();
    await expect(
      page.locator("#thesis").getByRole("link", { name: "Data & sources" }),
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
    const history = page.locator("#history details");
    // The history is folded until asked for.
    await expect(history.locator("li").first()).toBeHidden();
    await history.locator("summary").click();
    await expect(history.locator("li")).toHaveCount(2);
    await expect(history.locator("li").first()).toContainText("(current)");
    await expect(history.getByRole("link")).toHaveAttribute(
      "href",
      `/theses/${THESES.valid.slug}?version=${older}`,
    );
    await expect(
      page.getByText(/\d+ lines? added, \d+ removed since 15 Sept 2026\./),
    ).toBeVisible();
    await expect(page.locator("pre.th-diff").first()).toContainText(
      "+ review: 2030-06-30",
    );
    await expect(page.locator("pre.th-diff").first()).toContainText(
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
    await expect(notAdvice(page)).toBeVisible();
    // The client-side navigation keeps the fold as it was left: open.
    await expect(page.locator("#history details")).toHaveJSProperty(
      "open",
      true,
    );
    await expect(page.getByText("This is the first version.")).toBeVisible();
    await expect(
      page
        .locator("#history li", { hasText: `${current.slice(8)} Oct 2026` })
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
    await expect(page.locator("#conditions table")).toHaveCount(0);

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

    const today = page.locator("#today");
    await expect(today.locator(".pill")).toHaveText("Notable");
    await expect(today.locator(".br-headline")).toContainText(
      "free-float bound is 10% in the September register.",
    );
    const row = page.locator("#look-at li");
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(COMPANIES.belowMinimum.code);
    await expect(row).toContainText("certainly below the minimum");
    // The evidence keys are folded; each leads to the page that holds it.
    const evidence = row.locator("details");
    await evidence.locator("summary").click();
    await expect(
      evidence.getByRole("link", {
        name: `float:${COMPANIES.belowMinimum.code}`,
      }),
    ).toHaveAttribute("href", `/t/${COMPANIES.belowMinimum.code}`);
    await expect(
      page.getByRole("main").getByRole("heading", { level: 2 }),
    ).toHaveText([
      /^\d{1,2} \w+ \d{4}$/,
      "Worth a closer look",
      "Changes since yesterday",
      "Risks to this reading",
      "Set aside, and why",
      "Web sources",
      "Inputs",
    ]);
    await expect(page.getByText("No brief yesterday.")).toBeVisible();
    await expect(
      page.locator("#set-aside").getByText("Nothing."),
    ).toBeVisible();
    const source = page
      .locator("#web-sources")
      .getByRole("link", { name: "Example exchange notice" });
    await expect(source).toHaveAttribute("href", "https://example.test/notice");
    await expect(source).toHaveAttribute("rel", /noopener/);
    await today.locator("summary").click();
    await expect(today.locator(".src-body")).toContainText("Written");
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
    await expect(page.locator(".br-headline")).toHaveCount(1);
    // A fresh brief is not marked stale.
    await expect(page.getByText(/^Stale:/)).toHaveCount(0);
  });

  test("lists what went into it, saying which inputs were absent and why", async ({
    page,
  }) => {
    await page.goto("/brief");
    const inputs = page.locator("#inputs");
    await inputs.locator("summary").click();
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

  test("the index explains what a thesis is, labels its example, and keeps the notice", async ({
    page,
  }) => {
    await page.goto("/theses");
    await expect(notAdvice(page)).toBeVisible();
    await expect(page.getByText("No thesis is published yet.")).toBeVisible();
    await expect(page.locator("#held table")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 2, name: "What a thesis is on Sigi" }),
    ).toBeVisible();
    // The example is marked as one, and sits in its own section.
    const example = page.locator("#example");
    await expect(example).toContainText("Example, not a published view");
    await expect(example.locator("tbody tr")).toHaveCount(5);
    await expect(example).toContainText("macro bi-rate above 6.25");
    await expect(page.locator("#states .pill")).toHaveText([
      "Holding",
      "Hit",
      "Check by hand",
      "Unknown",
    ]);
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
