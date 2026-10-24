# Sigi

A research site for Indonesian listed companies. It covers who owns each company and what changed this month, how much of it really floats against the new 15% rule, how macro conditions move each sector, investment theses with explicit invalidation conditions, and a daily AI brief that cites its evidence. It uses only free data, and every figure shows its source.

*Sigi* is a torch; *menyigi* means "to light up" and "to investigate carefully" (KBBI).

**Status:** phase P1, started 2026-10-22, live (not yet indexed by search engines) at https://sigi.ubaidillah.id.

- **M1** (deployed 2026-10-23): the monthly >1% holders import with validation gates and fail-closed publishing (PRD F1), data health and sources (F10), ownership per company (F2), and the Dokploy deployment.
- **M2** (deployed 2026-10-23): the investability tracker against the 15% free-float rule (F3), the holder explorer for institutions (F4), and the market page with the ownership screen and TradingView widgets (F9).
- **Automation** (2026-10-24): a worker fetches the monthly files from the exchange's site and imports them; there is no admin, upload or sign-in (D-021).
- **M3** (deployed 2026-10-24): the macro dashboard (F6) at `/macro`, fed daily from Bank Indonesia, the World Bank Pink Sheet and FRED (D-023).

| Doc | Purpose |
|---|---|
| [docs/PRD.md](docs/PRD.md) | What we build, for whom, under which constraints; features with acceptance criteria; phases; risks |
| [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md) | Register of every data source: terms, quotes, status, attribution, known issues |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decisions and their consequences |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System shape, import pipeline, the copy manifest and log from Sunrise, the daily brief pipeline, pages, tests |

## Run it locally

Node 24, pnpm 10, and Google Chrome for the worker.

```sh
pnpm install
cp .env.example .env            # on macOS, set SIGI_CHROME_PATH to Chrome's binary
node --env-file=.env --import tsx scripts/migrate.ts
node --env-file=.env --import tsx scripts/worker.ts --once   # check every feed once; or name feeds, e.g. --once fred-DGS10
pnpm dev                        # http://127.0.0.1:3220
```

The worker opens the exchange's [share-ownership data page](https://www.idx.co.id/id/perusahaan-tercatat/data-kepemilikan-saham/) in a real Chrome, lists the monthly files *Pemegang Saham di Atas 1%*, and downloads and imports each one it has not imported yet, oldest first. It also checks the macro feeds over plain HTTP: four Bank Indonesia tables, the World Bank's monthly commodity workbook and three FRED series (D-023). Without `--once` it repeats every `SIGI_FETCH_INTERVAL_HOURS` (24 by default) per feed. Each file gets one of three outcomes, all shown on `/data`:

- **published**, when no check fails; warnings (a few source rows whose shares do not add up, an unrecognised investor type, a big move in an issuer's holder count) are published with the file and listed;
- **rejected**, with the reasons; the previous month stays live;
- **no-op**, when the same file, or the same figures in new bytes, were imported before.

The exchange's terms ask that its site not be scraped, and Bank Indonesia publishes no terms. Sigi fetches from both automatically anyway, by the owner's decision; DECISIONS D-021 and D-023 record the risk.

`pnpm verify` runs format, lint, types, tests and a production build. The tests include the rebuild check on synthetic files. To also test against the real files, set `SIGI_S1_REAL_DIR` to a directory holding `one-YYYY-MM-DD.xlsx` files. Real files are never committed, because they name individuals.

`pnpm rebuild:check` re-derives every published S1 month and macro series from its stored source file and compares content hashes.

## Deploy

Production is two Dokploy applications built from the one `Dockerfile` on the host: `sigi-web` (the default `web` stage) and `sigi-worker` (build stage `worker`, with Google Chrome and Xvfb). `scripts/deploy.sh` runs `pnpm verify`, uploads the committed `HEAD` once, deploys the web and then the worker, waits for each build and checks the public pages. Host details come from a git-ignored `.env.deploy`; the Dokploy API key comes from the macOS Keychain. Production setup:

- **Network:** the web uses the host's network. It listens on `127.0.0.1:3220` (`SIGI_BIND_HOST=127.0.0.1`), and nginx terminates TLS in front of it with rate limits. The site is read-only: anything but GET and HEAD gets 405.
- **Data:** the host's data directory and its `.env` (owner `1000`, mode `600`) are bind-mounted into both containers. That `.env` sets `SIGI_PUBLIC_ORIGIN` and `SIGI_LOG_LEVEL`; Sigi holds no secrets.
- **Start-up:** the web container migrates the database before it serves. The worker waits until the database is current, so only one process ever migrates.

Not investment advice.
