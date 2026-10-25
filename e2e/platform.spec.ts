import http from "node:http";

import { expect, test } from "./fixture";
import { COMPANIES, ORIGIN, PORT, THESES } from "./world";

/** The request boundary, headers, the language route, the plain routes and keyboard use. */
test.describe("request boundary", () => {
  const PATHS = [
    "/",
    "/macro",
    "/lang",
    `/t/${COMPANIES.steady.code}`,
    "/nowhere",
  ];

  for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
    test(`${method} is refused with 405 and the methods the site answers`, async ({
      request,
    }) => {
      for (const path of PATHS) {
        const response = await request.fetch(path, {
          method,
          // The origin is the site's own, so only the method can be what refuses it.
          headers: { Origin: ORIGIN },
          data: "x=1",
          maxRedirects: 0,
        });
        expect(response.status(), `${method} ${path}`).toBe(405);
        expect(response.headers().allow).toBe("GET, HEAD");
        expect(await response.json()).toEqual({ error: "Read-only" });
      }
    });
  }

  test("HEAD answers like GET without a body", async ({ request }) => {
    const response = await request.head("/macro");
    expect(response.status()).toBe(200);
    expect(await response.body()).toHaveLength(0);
  });

  test("a Host other than the site's own is refused with 421", async () => {
    const status = await new Promise<number>((resolve, reject) => {
      const request = http.request(
        {
          host: "127.0.0.1",
          port: PORT,
          path: "/",
          headers: { Host: "evil.example" },
        },
        (response) => {
          response.resume();
          resolve(response.statusCode ?? 0);
        },
      );
      request.on("error", reject);
      request.end();
    });
    expect(status).toBe(421);
  });

  test("every page carries the security headers and a nonce-based CSP", async ({
    request,
  }) => {
    for (const path of ["/", "/brief", "/lang?set=en", "/robots.txt"]) {
      const headers = (await request.get(path, { maxRedirects: 0 })).headers();
      expect(headers["x-frame-options"], path).toBe("DENY");
      expect(headers["x-content-type-options"], path).toBe("nosniff");
      expect(headers["referrer-policy"], path).toBe("no-referrer");
      expect(headers["cross-origin-opener-policy"], path).toBe("same-origin");
      const csp = headers["content-security-policy"] ?? "";
      expect(csp, path).toContain("default-src 'self'");
      expect(csp, path).toMatch(/script-src 'self' 'nonce-[0-9a-f]{32}'/);
      expect(csp, path).toContain("frame-ancestors 'none'");
      expect(csp, path).toContain("object-src 'none'");
    }
  });

  test("the CSP nonce differs on every request", async ({ request }) => {
    const nonce = async () =>
      /'nonce-([0-9a-f]{32})'/.exec(
        (await request.get("/")).headers()["content-security-policy"] ?? "",
      )?.[1];
    expect(await nonce()).not.toBe(await nonce());
  });
});

test.describe("language route", () => {
  test("sets the cookie and sends the visitor back, with 303", async ({
    request,
  }) => {
    const response = await request.get("/lang?set=id&next=/macro", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(303);
    expect(response.headers().location).toBe("/macro");
    const cookie = response.headers()["set-cookie"] ?? "";
    expect(cookie).toMatch(/^sigi-lang=id;/);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Max-Age=31536000/);
  });

  test("keeps a query string in the page it returns to", async ({
    request,
  }) => {
    const response = await request.get(
      `/lang?set=en&next=${encodeURIComponent(`/theses/${THESES.valid.slug}?version=${THESES.valid.versions[1]}`)}`,
      { maxRedirects: 0 },
    );
    expect(response.headers().location).toBe(
      `/theses/${THESES.valid.slug}?version=${THESES.valid.versions[1]}`,
    );
  });

  test("refuses a next that leaves the site", async ({ request }) => {
    for (const next of [
      "https://evil.example/",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "evil.example",
      "/\r\nSet-Cookie: x=1",
    ]) {
      const response = await request.get(
        `/lang?set=id&next=${encodeURIComponent(next)}`,
        { maxRedirects: 0 },
      );
      expect(response.status(), next).toBe(303);
      expect(response.headers().location, next).toBe("/");
    }
  });

  test("sets no cookie for a language the site does not have", async ({
    request,
  }) => {
    for (const set of ["fr", "", "ID", "id;x=1"]) {
      const response = await request.get(
        `/lang?set=${encodeURIComponent(set)}&next=/macro`,
        { maxRedirects: 0 },
      );
      expect(response.status(), set).toBe(303);
      expect(response.headers().location).toBe("/macro");
      expect(response.headers()["set-cookie"], set).toBeUndefined();
    }
    const missing = await request.get("/lang", { maxRedirects: 0 });
    expect(missing.status()).toBe(303);
    expect(missing.headers().location).toBe("/");
    expect(missing.headers()["set-cookie"]).toBeUndefined();
  });

  test("the language links switch the page and come back to it", async ({
    page,
    context,
  }) => {
    await page.goto("/macro");
    const language = page.getByRole("navigation", { name: "Language" });
    await expect(language.getByRole("link")).toHaveCount(2);
    await expect(language.locator('[aria-current="true"]')).toHaveText(/EN/);

    await language.getByRole("link", { name: /^ID/ }).click();
    await expect(page).toHaveURL(/\/macro$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const cookies = await context.cookies(ORIGIN);
    expect(cookies.find((c) => c.name === "sigi-lang")).toMatchObject({
      value: "id",
      httpOnly: true,
      sameSite: "Lax",
    });

    // The choice sticks across pages, and a link back switches again.
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await page
      .getByRole("navigation", { name: /./ })
      .last()
      .getByRole("link", { name: /^EN/ })
      .click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("the language link keeps the query string of the current page", async ({
    page,
  }) => {
    await page.goto("/?floatMax=15&sort=float-asc");
    await page
      .getByRole("navigation", { name: "Language" })
      .getByRole("link", { name: /^ID/ })
      .click();
    await expect(page).toHaveURL(/\/\?floatMax=15&sort=float-asc$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
  });

  test("language links are plain links that no crawler or prefetch will follow", async ({
    page,
  }) => {
    await page.goto("/");
    const links = page
      .getByRole("navigation", { name: "Language" })
      .getByRole("link");
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("rel", /nofollow/);
      await expect(link).toHaveAttribute("href", /^\/lang\?set=(en|id)&next=/);
    }
  });
});

test.describe("language by browser setting", () => {
  test.describe("Indonesian browser", () => {
    test.use({ locale: "id-ID" });

    test("an Indonesian browser gets Indonesian until a choice is made", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("lang", "id");
      await page.goto("/lang?set=en&next=/");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
  });

  test.describe("another language", () => {
    test.use({ locale: "fr-FR" });

    test("a browser in a language the site lacks gets English", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
  });
});

test.describe("plain routes", () => {
  test("robots.txt keeps crawlers off /lang and names the sitemap", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Disallow: /lang");
    expect(body).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  test("the sitemap lists the sections, each company and each thesis once", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const urls = [
      ...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g),
    ].map((match) => match[1]);
    for (const path of [
      "/",
      "/investability",
      "/holders",
      "/macro",
      "/theses",
      "/brief",
      "/data",
      "/privacy",
    ])
      expect(urls).toContain(`${ORIGIN}${path}`);
    for (const company of Object.values(COMPANIES))
      expect(urls).toContain(`${ORIGIN}/t/${company.code}`);
    expect(urls).toContain(`${ORIGIN}/theses/${THESES.valid.slug}`);
    expect(urls).toContain(`${ORIGIN}/theses/${THESES.unreadable.slug}`);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

test.describe("unknown routes", () => {
  test.use({ allowedStatuses: [404] });

  for (const path of [
    "/nowhere",
    "/theses/a/b",
    "/holders/a/b",
    "/t",
    "/data/extra",
  ]) {
    test(`${path} is a 404 page`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.locator("html")).toHaveAttribute("lang", /^(en|id)$/);
    });
  }

  test("a 404 page still has the masthead and the way home", async ({
    page,
  }) => {
    await page.goto("/holders/no-such-holder");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Sigi" }),
    ).toHaveAttribute("href", "/");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });
});

test.describe("keyboard", () => {
  for (const path of ["/", "/macro", `/theses/${THESES.valid.slug}`]) {
    test(`the skip link is first on ${path} and moves focus to the content`, async ({
      page,
    }) => {
      await page.goto(path);
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "Skip to content" });
      await expect(skip).toBeFocused();
      // It is visible once focused, and points at the main region.
      await expect(skip).toBeInViewport();
      await expect(skip).toHaveAttribute("href", "#content");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#content$/);
      await expect(page.getByRole("main")).toBeFocused();
      // The next Tab lands inside the content, past the whole masthead.
      await page.keyboard.press("Tab");
      const insideMain = await page.evaluate(
        () =>
          document.querySelector("main")?.contains(document.activeElement) ??
          false,
      );
      expect(insideMain).toBe(true);
    });
  }

  test("every control in the masthead is reachable in order with a visible focus ring", async ({
    page,
  }) => {
    await page.goto("/");
    const order: string[] = [];
    for (let step = 0; step < 11; step++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        const style = element ? getComputedStyle(element) : null;
        return {
          text: (element?.textContent ?? "").replace(/\s+/g, " ").trim(),
          outline: style ? `${style.outlineStyle} ${style.outlineWidth}` : "",
          inHeader: element?.closest("header") !== null,
        };
      });
      order.push(focused.text);
      if (focused.inHeader) {
        expect(focused.outline, focused.text).not.toMatch(/^none /);
        expect(focused.outline, focused.text).not.toMatch(/ 0px$/);
      }
    }
    expect(order.slice(0, 11)).toEqual([
      "Skip to content",
      "Sigi",
      "Market",
      "Brief",
      "Investability",
      "Holders",
      "Macro",
      "Theses",
      "Data & sources",
      expect.stringMatching(/^EN/),
      expect.stringMatching(/^ID/),
    ]);
  });

  test("the screen form is operable by keyboard alone", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Code or name").focus();
    await page.keyboard.type("dharma");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/q=dharma/);
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(1);
  });

  test("a details disclosure opens with the keyboard", async ({ page }) => {
    await page.goto("/macro");
    const summary = page.getByText("Why it matters for IDX sectors").first();
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(summary.locator("xpath=..")).toHaveAttribute("open", "");
  });
});
