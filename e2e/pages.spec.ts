import { expect, test } from "./fixture";
import { expectShell, headings } from "./support";
import { COMPANIES, HOLDERS, THESES, UNKNOWN_CODE } from "./world";

/**
 * Every public page of the seeded site renders: the shell every page shares,
 * its single h1, its main sections, the navigation entry that marks it, and
 * the not-advice line in the footer.
 */
interface Expected {
  path: string;
  h1: string;
  h2: string[];
  current: string;
}

const steady = COMPANIES.steady;

const PAGES: Expected[] = [
  {
    path: "/",
    h1: "Who owns Indonesia's listed companies",
    h2: ["The register", "Prices and charts"],
    current: "Market",
  },
  {
    path: `/t/${steady.code}`,
    h1: `${steady.code} ${steady.issuer}`,
    h2: [
      "Ownership and free float",
      "Holders above 1%",
      "Changes since the previous month",
      "Dates to watch",
      "Theses",
      "Data by TradingView",
    ],
    current: "Market",
  },
  {
    path: `/t/${COMPANIES.incomplete.code}`,
    h1: `${COMPANIES.incomplete.code} ${COMPANIES.incomplete.issuer}`,
    h2: [
      "Ownership and free float",
      "Holders above 1%",
      "Changes since the previous month",
      "Dates to watch",
      "Theses",
      "Data by TradingView",
    ],
    current: "Market",
  },
  {
    path: `/t/${UNKNOWN_CODE}`,
    h1: UNKNOWN_CODE,
    h2: [
      "Ownership and free float",
      "Dates to watch",
      "Theses",
      "Data by TradingView",
    ],
    current: "Market",
  },
  {
    path: "/brief",
    h1: "Daily brief",
    h2: [
      "Worth a closer look",
      "Changes since yesterday",
      "Risks to this reading",
      "Set aside, and why",
      "Web sources",
      "Inputs",
    ],
    current: "Brief",
  },
  {
    path: "/investability",
    h1: "Investability: the 15% free-float rule",
    h2: [
      "Below 15%: Sigi's count and the exchange's",
      "Companies by free-float bound",
      "Certainly below 15% (1)",
      "Timeline",
      "Methodology",
    ],
    current: "Investability",
  },
  {
    path: "/holders",
    h1: "Holders",
    h2: ["Institutional holders"],
    current: "Holders",
  },
  {
    path: `/holders/${HOLDERS.fund.slug}`,
    h1: HOLDERS.fund.name,
    h2: [
      "Holdings above 1% on 30 Sept 2026 (2)",
      "Changes since the previous month",
    ],
    current: "Holders",
  },
  {
    path: "/macro",
    h1: "Macro",
    h2: [
      "Indonesia: rates, prices and the rupiah",
      "Commodities Indonesia sells",
      "Global money",
    ],
    current: "Macro",
  },
  {
    path: "/theses",
    h1: "Theses",
    h2: ["Conditions hit", "Views held"],
    current: "Theses",
  },
  {
    path: `/theses/${THESES.valid.slug}`,
    h1: THESES.valid.title,
    h2: [
      "Where it stands",
      "Invalidation conditions",
      "Dates",
      "The thesis",
      "Version history",
    ],
    current: "Theses",
  },
  {
    path: `/theses/${THESES.unreadable.slug}`,
    h1: THESES.unreadable.title,
    // Conditions that cannot be read have no readings to summarise.
    h2: ["Invalidation conditions", "Dates", "The thesis", "Version history"],
    current: "Theses",
  },
  {
    path: "/data",
    h1: "Data & sources",
    h2: [
      "Holders above 1% (S1)",
      "Checks of each source",
      "Imports",
      "Sources and licences",
    ],
    current: "Data & sources",
  },
  { path: "/privacy", h1: "Privacy", h2: [], current: "Data & sources" },
];

for (const expected of PAGES) {
  test(`${expected.path} renders its sections`, async ({ page }) => {
    const response = await page.goto(expected.path);
    expect(response?.status()).toBe(200);
    await expectShell(page, "en");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      expected.h1,
    );
    const sections = await headings(page, 2);
    for (const wanted of expected.h2) {
      expect(sections.some((text) => text.endsWith(wanted))).toBe(true);
    }

    const current = page
      .getByRole("navigation", { name: "Main" })
      .locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText(expected.current);

    await expect(page.getByRole("contentinfo")).toContainText(
      "not investment advice",
    );
  });
}

test("the footer links to the sources and the privacy notice", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("link", { name: "Data & sources" }),
  ).toHaveAttribute("href", "/data");
  await expect(
    footer.getByRole("link", { name: "Privacy notice" }),
  ).toHaveAttribute("href", "/privacy");
});

test("every main navigation link reaches a page that renders", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  const hrefs = await nav
    .getByRole("link")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    );
  expect(hrefs).toEqual([
    "/",
    "/brief",
    "/investability",
    "/holders",
    "/macro",
    "/theses",
    "/data",
  ]);
  for (const href of hrefs) {
    await page.goto(href);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  }
});
