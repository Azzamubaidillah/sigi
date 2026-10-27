import fs from "node:fs";
import path from "node:path";

/**
 * Tells the IndexNow search engines (Bing, Yandex, Naver, Seznam) which pages
 * exist: one POST with every URL of the site's own sitemap. It needs no
 * account. The key is the name and content of the one `public/<key>.txt`
 * file, which the site serves at its root so the engines can check that the
 * submitter controls the host. Google does not take part in IndexNow; it reads
 * the sitemap named in robots.txt.
 *
 * Run by hand after a change worth announcing, never on a schedule:
 *   pnpm indexnow https://sigi.ubaidillah.id
 */
const ENDPOINT = "https://api.indexnow.org/IndexNow";
const LIMIT = 10_000;

function keyFile(): string {
  const directory = path.join(process.cwd(), "public");
  const files = fs
    .readdirSync(directory)
    .filter((name) => /^[0-9a-f]{32}\.txt$/.test(name));
  if (files.length !== 1) {
    throw new Error(
      `expected one <key>.txt in public/, found ${files.length}: ${files.join(", ")}`,
    );
  }
  const key = files[0].slice(0, -".txt".length);
  const content = fs.readFileSync(path.join(directory, files[0]), "utf8");
  if (content !== key) {
    throw new Error(`public/${files[0]} must contain exactly its own name`);
  }
  return key;
}

async function main(): Promise<void> {
  const origin = process.argv[2];
  if (!origin || !/^https:\/\/[a-z0-9.-]+$/.test(origin)) {
    throw new Error("usage: pnpm indexnow https://<host>");
  }
  const key = keyFile();
  const keyLocation = `${origin}/${key}.txt`;
  const served = await fetch(keyLocation);
  if (!served.ok || (await served.text()) !== key) {
    throw new Error(
      `${keyLocation} does not serve the key (HTTP ${served.status}); deploy first`,
    );
  }
  const sitemap = await fetch(`${origin}/sitemap.xml`);
  if (!sitemap.ok) throw new Error(`sitemap: HTTP ${sitemap.status}`);
  const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  if (urls.length === 0 || urls.length > LIMIT) {
    throw new Error(
      `sitemap lists ${urls.length} URLs; IndexNow takes 1 to ${LIMIT}`,
    );
  }
  if (urls.some((url) => !url.startsWith(`${origin}/`))) {
    throw new Error("the sitemap names a URL outside the host");
  }
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(origin).host,
      key,
      keyLocation,
      urlList: urls,
    }),
  });
  // 200: accepted. 202: accepted, key validation still pending.
  console.log(`${urls.length} URLs submitted: HTTP ${response.status}`);
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(
      `IndexNow refused the submission: ${await response.text()}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
