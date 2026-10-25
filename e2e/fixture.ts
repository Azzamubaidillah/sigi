import { expect, test as base } from "@playwright/test";

import { EMPTY_ORIGIN, ORIGIN } from "./world";

/**
 * TradingView's embeds load in the visitor's browser from its own hosts. The
 * suite never reaches them: its loader script is answered with an empty
 * script, so the page behaves as if the widget had nothing to draw, and any
 * other request that leaves the site fails the test.
 */
const TRADINGVIEW =
  /^https:\/\/([a-z0-9-]+\.)*(tradingview\.com|tradingview-widget\.com)\//;

const ownOrigin = (url: string): boolean =>
  url.startsWith(ORIGIN) || url.startsWith(EMPTY_ORIGIN);

interface Options {
  /** HTTP statuses a same-origin response may have without failing the test (a 404 page test lists 404). */
  allowedStatuses: number[];
}

/**
 * Every test drives a page that fails if the page logs a console error,
 * throws, fails a same-origin request, or receives a same-origin response with
 * an error status.
 */
export const test = base.extend<Options>({
  allowedStatuses: [[], { option: true }],
  page: async ({ page, allowedStatuses }, provide) => {
    const problems: string[] = [];
    await page.route(
      (url) => !ownOrigin(url.href) && !url.protocol.startsWith("data"),
      (route) => {
        const request = route.request();
        if (TRADINGVIEW.test(request.url())) {
          return route.fulfill({
            status: 200,
            contentType:
              request.resourceType() === "script"
                ? "application/javascript"
                : "text/html",
            body: "",
          });
        }
        problems.push(`request left the site: ${request.url()}`);
        return route.abort();
      },
    );
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      // The browser also logs every error status it was told to expect.
      const status = /responded with a status of (\d+)/.exec(message.text());
      if (status && allowedStatuses.includes(Number(status[1]))) return;
      problems.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) =>
      problems.push(`page error: ${error.message}`),
    );
    page.on("requestfailed", (request) => {
      const reason = request.failure()?.errorText;
      // Leaving a page cancels the prefetches it started; that is not a failure.
      const cancelledPrefetch =
        reason === "net::ERR_ABORTED" && request.url().includes("_rsc=");
      if (ownOrigin(request.url()) && !cancelledPrefetch)
        problems.push(`request failed: ${request.url()} ${reason}`);
    });
    page.on("response", (response) => {
      if (
        ownOrigin(response.url()) &&
        response.status() >= 400 &&
        !allowedStatuses.includes(response.status())
      )
        problems.push(`${response.status()}: ${response.url()}`);
    });
    await provide(page);
    expect(
      problems,
      "console errors, failed requests and error responses",
    ).toEqual([]);
  },
});

export { expect };
export type { Page } from "@playwright/test";
