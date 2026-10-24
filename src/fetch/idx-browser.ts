import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import type { Logger } from "pino";
import type { Browser, CDPSession, Page, Protocol } from "puppeteer-core";
import puppeteerCore from "puppeteer-core";
import { addExtra } from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import {
  COLLECT_LISTED_FILES,
  type ListedFile,
  S1_PAGE_URL,
} from "./idx-listing";
import { isCompleteZip } from "./zip";

/**
 * idx.co.id sits behind Cloudflare, which refuses plain HTTP clients and
 * headless browsers. A real Chrome with a display (Xvfb on the server) and
 * the stealth evasions gets through, clicking the challenge's checkbox when
 * one shows. The file store (/Media/) is challenged separately and answers an
 * in-page fetch with a challenge or a cut-off body, so each file is opened in
 * a tab, as a reader clicking the link would, and taken from Chrome's
 * downloads. The exchange's terms ask that the site not be scraped; Sigi
 * does this by the owner's decision, once a day (DECISIONS D-021).
 */

const CHALLENGE_TIMEOUT_MS = 90_000;
const NAVIGATION_TIMEOUT_MS = 60_000;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export interface IdxSession {
  listFiles(): Promise<ListedFile[]>;
  download(url: string): Promise<Uint8Array>;
  close(): Promise<void>;
}

/** Starts Xvfb when on Linux without a display; returns the DISPLAY to use. */
async function startDisplay(
  logger: Logger,
): Promise<{ display: string | undefined; xvfb: ChildProcess | null }> {
  if (process.platform !== "linux" || process.env.DISPLAY) {
    return { display: process.env.DISPLAY, xvfb: null };
  }
  const number = 90 + Math.floor(Math.random() * 400);
  const xvfb = spawn(
    "Xvfb",
    [`:${number}`, "-screen", "0", "1366x768x24", "-nolisten", "tcp"],
    { stdio: "ignore" },
  );
  const socket = `/tmp/.X11-unix/X${number}`;
  for (let waited = 0; waited < 10_000; waited += 100) {
    if (existsSync(socket)) return { display: `:${number}`, xvfb };
    if (xvfb.exitCode !== null) break;
    await sleep(100);
  }
  xvfb.kill("SIGKILL");
  logger.error({ display: number }, "Xvfb did not start");
  throw new Error("Xvfb did not start");
}

async function onChallenge(page: Page): Promise<boolean> {
  const title = await page.title().catch(() => "");
  return /just a moment|tunggu sebentar|attention required/i.test(title);
}

/**
 * Waits until `done` holds. Most challenges pass on their own; when the
 * Turnstile frame shows, its checkbox (left edge, vertically centred) is
 * clicked, at most once every fifteen seconds.
 */
async function passChallenge(
  page: Page,
  done: () => Promise<boolean>,
  what: string,
  logger: Logger,
): Promise<void> {
  const started = Date.now();
  let lastClick = 0;
  while (!(await done())) {
    if (Date.now() - started > CHALLENGE_TIMEOUT_MS) {
      throw new Error(
        `${what}: not through after ${CHALLENGE_TIMEOUT_MS / 1000}s${(await onChallenge(page)) ? " (still on the Cloudflare challenge)" : ""}`,
      );
    }
    if (Date.now() - lastClick > 15_000) {
      const frame = page
        .frames()
        .find((candidate) =>
          candidate.url().includes("challenges.cloudflare.com"),
        );
      const box = frame
        ? await (await frame.frameElement())?.boundingBox()
        : null;
      if (box && box.width > 0) {
        await page.mouse.click(
          box.x + Math.min(30, box.width / 2),
          box.y + box.height / 2,
          { delay: 80 },
        );
        lastClick = Date.now();
        logger.info(
          { what, afterMs: lastClick - started },
          "clicked the challenge checkbox",
        );
      }
    }
    await sleep(500);
  }
  logger.debug({ what, afterMs: Date.now() - started }, "through");
}

/** Opens `url` in a tab and returns the file Chrome downloads from it. */
async function downloadThroughTab(
  browser: Browser,
  cdp: CDPSession,
  directory: string,
  url: string,
  logger: Logger,
): Promise<Uint8Array> {
  let guid: string | null = null;
  let state: "completed" | "canceled" | null = null;
  const onBegin = (event: Protocol.Browser.DownloadWillBeginEvent): void => {
    guid ??= event.guid;
  };
  const onProgress = (event: Protocol.Browser.DownloadProgressEvent): void => {
    if (event.guid !== guid) return;
    if (event.receivedBytes > MAX_FILE_BYTES) {
      void cdp.send("Browser.cancelDownload", { guid: event.guid });
    }
    if (event.state !== "inProgress") state = event.state;
  };
  cdp.on("Browser.downloadWillBegin", onBegin);
  cdp.on("Browser.downloadProgress", onProgress);
  const tab = await browser.newPage();
  try {
    // A file navigation ends as a download, which aborts the navigation.
    await tab
      .goto(url, { waitUntil: "domcontentloaded" })
      .catch(() => undefined);
    await passChallenge(tab, async () => state !== null, url, logger);
    if (state !== "completed" || guid === null) {
      throw new Error(`${url}: download ${state ?? "did not start"}`);
    }
    const file = path.join(directory, guid);
    const bytes = new Uint8Array(await readFile(file));
    await rm(file, { force: true });
    if (bytes.length > MAX_FILE_BYTES) {
      throw new Error(`${url}: over the ${MAX_FILE_BYTES}-byte limit`);
    }
    // An XLSX is a ZIP; anything else is an error page, or a cut-off file.
    if (!isCompleteZip(bytes)) {
      throw new Error(
        `${url}: not a complete workbook (${bytes.length} bytes)`,
      );
    }
    return bytes;
  } finally {
    cdp.off("Browser.downloadWillBegin", onBegin);
    cdp.off("Browser.downloadProgress", onProgress);
    await tab.close().catch(() => undefined);
  }
}

/** Opens the ownership-data page in a real Chrome and passes the challenge. */
export async function openIdxSession(
  chromePath: string,
  logger: Logger,
): Promise<IdxSession> {
  const { display, xvfb } = await startDisplay(logger);
  const directory = await mkdtemp(path.join(os.tmpdir(), "sigi-idx-"));
  let browser: Browser | null = null;
  const close = async (): Promise<void> => {
    await browser?.close().catch(() => undefined);
    xvfb?.kill("SIGTERM");
    await rm(directory, { recursive: true, force: true });
  };
  try {
    const puppeteer = addExtra(puppeteerCore);
    puppeteer.use(StealthPlugin());
    const launched: Browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: false,
      pipe: true,
      defaultViewport: null,
      env: { ...process.env, ...(display ? { DISPLAY: display } : {}) },
      args: [
        "--window-size=1366,768",
        "--lang=id-ID",
        "--no-first-run",
        "--no-default-browser-check",
        // The container's /dev/shm is 64 MB; Chrome otherwise crashes in it.
        "--disable-dev-shm-usage",
        // No user namespaces in the container; the browser only ever visits
        // idx.co.id (ARCHITECTURE: worker).
        ...(process.platform === "linux" ? ["--no-sandbox"] : []),
      ],
    });
    browser = launched;
    // Downloads land, under Chrome's own names (GUIDs), in a private
    // directory that is removed when the session closes.
    const cdp = await launched.target().createCDPSession();
    await cdp.send("Browser.setDownloadBehavior", {
      behavior: "allowAndName",
      downloadPath: directory,
      eventsEnabled: true,
    });
    const page = (await launched.pages())[0] ?? (await launched.newPage());
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    await page.goto(S1_PAGE_URL, { waitUntil: "domcontentloaded" });
    await passChallenge(
      page,
      async () => !(await onChallenge(page)),
      S1_PAGE_URL,
      logger,
    );
    await page.waitForFunction(
      "typeof window.__NUXT__ === 'object' && window.__NUXT__ !== null",
      { timeout: NAVIGATION_TIMEOUT_MS },
    );
    return {
      listFiles: async () =>
        (await page.evaluate(COLLECT_LISTED_FILES)) as ListedFile[],
      download: (url) =>
        downloadThroughTab(launched, cdp, directory, url, logger),
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
