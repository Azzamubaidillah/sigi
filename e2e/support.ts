import { expect, type Page } from "./fixture";

/**
 * What every page of the site shares, in either language: the document
 * language, one h1, the landmarks, two navigations in the masthead (sections
 * and language), the footer's links and a title that ends with the site name
 * (the market page's is the name alone).
 */
export async function expectShell(
  page: Page,
  lang: "en" | "id",
): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
  await expect(page.getByRole("banner").getByRole("navigation")).toHaveCount(2);
  await expect(
    page.getByRole("contentinfo").getByRole("navigation"),
  ).toHaveCount(1);
  await expect(page).toHaveTitle(/^(.+ · )?Sigi$/);
}

/** The text of every heading of one level in the main region. */
export async function headings(
  page: Page,
  level: 1 | 2 | 3,
): Promise<string[]> {
  const texts = await page
    .getByRole("main")
    .getByRole("heading", { level })
    .allInnerTexts();
  return texts.map((text) => text.replace(/\s+/g, " ").trim());
}
