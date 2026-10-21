# Sigi

A research site for Indonesian listed companies. It covers who owns each company and what changed this month, how much of it really floats against the new 15% rule, how macro conditions move each sector, investment theses with explicit invalidation conditions, and a daily AI brief that cites its evidence. It uses only free, legally reusable data, and every figure shows its source.

*Sigi* is a torch; *menyigi* means "to light up" and "to investigate carefully" (KBBI).

**Status:** phase P1, started 2026-10-22. Milestone M1 is built:

- the monthly >1% holders import, with validation gates and fail-closed publishing (PRD F1);
- a data health and sources page (F10);
- an ownership section per company (F2);
- a container image.

It is not deployed yet.

| Doc | Purpose |
|---|---|
| [docs/PRD.md](docs/PRD.md) | What we build, for whom, under which constraints; features with acceptance criteria; phases; risks |
| [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md) | Register of every data source: terms, quotes, status, attribution, known issues |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decisions and their consequences |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System shape, import pipeline, the copy manifest and log from Sunrise, the daily brief pipeline, pages, tests |

## Run it locally

Node 24 and pnpm 10.

```sh
pnpm install
cp .env.example .env            # then set SIGI_PASSCODE_HASH and SIGI_SESSION_SECRET
pnpm passcode:hash              # prints the hash for the passcode you type
node --env-file=.env --import tsx scripts/migrate.ts
pnpm dev                        # http://127.0.0.1:3220
```

Sign in at `/login`. Then, at `/admin`, upload the monthly file *Data Kepemilikan Saham Perusahaan Terbuka di atas 1%*, downloaded by hand from the IDX announcements page. Sigi never fetches it; the IDX terms forbid scraping. Each upload gets one of four outcomes:

- **published**, when every check passes;
- **held**, waiting for the owner's decision and reason;
- **rejected**, with the reasons shown on `/data`;
- **no-op**, when the same file was imported before.

`pnpm verify` runs format, lint, types, tests and a production build. The tests include the rebuild check on synthetic files. To also test against the real file, set `SIGI_S1_REAL_PDF=/path/to/file.pdf`. The real file is never committed, because it names individuals.

`pnpm rebuild:check` re-derives every published month from its stored source file and compares content hashes.

## Deploy

`docker build -t sigi .` then run with a volume on `/opt/sigi/data` and an env file setting `SIGI_PUBLIC_ORIGIN` (https), `SIGI_TRUSTED_PROXY=true`, `SIGI_PASSCODE_HASH` and `SIGI_SESSION_SECRET`. Publish port 3220 on loopback only, behind the host's TLS reverse proxy. The container migrates the database before it serves.

Not investment advice.
