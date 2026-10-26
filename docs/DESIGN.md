# Sigi: Design

**Version:** 1.0, 2026-10-26 (D-027). This is the brief every page is built against: the identity, the tokens, the layout rules and the parts. A page that needs something this file does not offer adds it to a page file under `@layer sections`; it does not restyle the shared parts.

## 1. Subject, audience, job

Sigi is a public research site on Indonesian listed companies: who owns each one, how much of it floats against the 15% rule, what the macro picture is, which theses are held, and what a daily brief says is worth a look. Its readers are Indonesian and foreign investors and analysts reading in either language, and reviewers who judge it as a piece of work. The job is to **answer one question per page in the first screen, with the evidence one level down**.

| Page | The one question | First screen |
|---|---|---|
| `/` Market | Who owns Indonesia's listed companies, and where should I look? | Search; the count certainly below the line; the register with a bar per company |
| `/t/<code>` | Who controls this company, and does it float enough? | The verdict, then one ownership bar |
| `/investability` | How many companies are below 15%, and by when must they act? | The count and the distribution |
| `/holders` | Which institutions hold what? | The list, searchable |
| `/macro` | What are the rates and prices that move the sectors? | The latest value of each series |
| `/theses` | What do I hold a view on, and what would prove it wrong? | The theses, or what a thesis is |
| `/brief` | What changed, and what is worth a look today? | The stance and headline |
| `/data` | Can I trust these figures? | Freshness of every feed |

## 2. Identity

**The name.** Sigi is a torch; *menyigi* is to light up and to investigate carefully (KBBI, D-009). The whole identity is that sentence: what the site lights is the part of a company that is open to the public.

**The wordmark.** `sigi`, lowercase, in Plus Jakarta Sans ExtraBold drawn as outlines, with a flame where each *i* is dotted. The flame is the torch colour of the theme. Files: `docs/brand/wordmark-light.svg`, `wordmark-dark.svg`; in the app `app/_components/Wordmark.tsx`. Keep clear space of one flame height; never below 20 px tall; never recolour the flames.

**The symbol.** A torch: flame, bowl, handle. White on a nila tile for the favicon, the Apple icon and the share image (`app/icon.svg`, `app/apple-icon.png`, `app/opengraph-image.png`); `docs/brand/symbol-*.svg` for other uses.

**Two colours carry it.**

- **Nila**, the indigo of batik. Ink, links, the primary action, the holders in a bar. Light: `#2b3790`, text ink `#151a3e`. Dark: canvas `#0d112c`, links `#a9b4ff`.
- **Obor**, the torch. The only warm colour, and it means *lit*: the free float in an ownership bar, the flames, and a thing to look at (a warning). Light fill `#f59a12`, text on light `#8a4b00`; dark `#ffc247`. It never decorates. A page with no float, no flame and no warning has none of it.
- Signals are green and red, always beside a word or an icon. There is no third status colour: attention is obor.

**Type.** **Plus Jakarta Sans** (Gumpita Rahayu, Tokotype, drawn for the Jakarta provincial government's identity in 2020; OFL) for the interface, headings and every figure, with tabular figures in tables. **Newsreader** (Production Type; OFL) for long reading only: ledes, the brief, a thesis. Both are self-hosted, subset to Latin (`app/fonts/`, with their licences) and loaded in `layout.tsx`. The sans has no italic: emphasis there is weight (`em`, `cite` are 600). Scale: h1 `clamp(1.875rem, 1.45rem + 1.9vw, 2.75rem)` 800; h2 1.375rem 700; h3 1.0625rem 700; body 1rem/1.55; prose 1.1875rem/1.62; table 0.9375rem; notes 0.8125rem. Sentence case everywhere. No all-caps labels, no tracked eyebrows, no mono for data.

**The motif: the lit bar.** Who holds a company is one bar of 100%: holders of 5% or more first, darkest to lightest, then the free float, lit; an upright line marks the 15% minimum. In a table row the bar is ten pixels high and a column of them reads like a ruler: the lit tips that do not reach the line are the companies below the rule. On a company page it is the focal figure, 3rem high, and its float is lit once when the page opens. This is the site's one non-user-triggered motion.

**The layout language: a ledger, not cards.** Sections are flat on the canvas. Each opens on a strong 2px rule with its title on it and its source or date opposite. Tables are ruled rows, figures align on their digits. Wells and boxes are used only where a thing must stand apart (a notice, a filter, a third party's embed). There are no shadows. Radius follows the part: hairline for data, 6px for controls, a pill for a status, none for sections.

**Voice.** Plain, specific, active. Say what happened and what to do; errors do not apologise; empty states say what will fill them. Figures are written for reading (`31 Mar 2027`, not `2027-03-31`).

## 3. Tokens

All in `app/styles/tokens.css`; a page never writes a hex value.

| Group | Tokens |
|---|---|
| Surface | `--canvas` page, `--paper` fields, `--wash` quiet wells and row hover |
| Text | `--ink` headings and figures, `--text` running text, `--muted` secondary (at least 5.5:1 on every surface) |
| Line | `--rule` rows, `--rule-strong` section rule, `--field` control outlines (3:1) |
| Brand | `--brand`, `--brand-hover`, `--on-brand`, `--link`, `--focus` |
| Torch | `--obor`, `--obor-ink`, `--obor-wash`, `--on-obor` |
| Signal | `--positive`, `--positive-wash`, `--negative`, `--negative-wash` |
| Bar | `--holder-1` to `--holder-4` and `--on-holder-1` to `--on-holder-4` |
| Space | `--s-1` 0.25rem, `--s-2` 0.5, `--s-3` 0.75, `--s-4` 1, `--s-5` 1.5, `--s-6` 2, `--s-7` 3, `--s-8` 4.5 |
| Shape | `--r-sm` 3px, `--r-md` 6px, `--r-pill` |
| Layout | `--gutter`, `--page` 75rem, `--measure` 68ch |

Light and dark follow the system; there is no toggle (D-026 kept the cookie for language only). Both are designed, not inverted.

## 4. The parts

Markup in `app/_components/ui.tsx` and `OwnershipBar.tsx`; styles in `app/styles/primitives.css`.

| Part | Use |
|---|---|
| `PageHeader({title, lede, aside})` | The top of every page. One `h1`, one serif lede, an optional stamp or link at the right |
| `Section({id, title, stamp, note, children})` | A titled part: strong rule, `h2`, the stamp opposite, one plain sentence as `note`. `id` is the anchor |
| `Figures({items})` | Key figures: label over number; `lead: true` for the page's one focal number |
| `Pill({tone, children})` | A status as a word. Tones: `positive`, `negative`, `warn`, `info`, none |
| `Notice({tone, children})` | A note that changes how a figure is read; the tone is its left rule |
| `SourceNote({summary, children})` | A section's source folded to one line, the full citation inside. `S1Citation` is this for the ownership register |
| `OwnershipBar` | The lit bar, sizes `sm` (row) and `lg` (page) |
| `Icon({name})` | Line icons, decorative: `alert info search doc back up down flat external check` |
| `.tbl` | Table: `th scope="col"`, `.num` right-aligned, `.code` for a company code link, `.hide-md` and `.hide-sm` for columns that give way |
| `.filters`, `.field`, `.field--check`, `.btn`, `.btn--quiet`, `.form-actions` | Forms. Every control has a visible label |
| `.pager`, `.pager-links` | Paging a long list |
| `.prose` | Long reading in the serif |
| `.absent` | A figure that cannot be given says why. Never a zero |
| `.widget` | A third party's embed, framed and captioned as theirs |

Rules for using them:

1. A page is a `PageHeader`, then `Section`s. Nothing sits on the canvas outside one.
2. One focal element per page. Spend the boldness there and keep the rest quiet.
3. Five to nine items per glance group. A list of seven cards of prose becomes rows.
4. The first words of a row or point carry its meaning; bold them.
5. Fold detail one level (`<details>`), never two.
6. Provenance travels with every figure: the section stamp says *where from and when*; the `SourceNote` holds the full citation. Repeat nothing: if every cell in a column says the same, it moves to the heading.
7. A link among words is underlined; a cell that holds only a link may use `.code` or be plain.
8. Colour is never the only signal: red and green, the lit float and the bar segments always have a word or a number beside them.
9. Third-party content is text, links and TradingView's own widgets; nothing else is embedded (CSP).

## 5. Quality floor

- Contrast: text at least 4.5:1, controls and graphics at least 3:1, in both schemes (checked for the whole palette in D-027).
- Keyboard: every control reachable, a 3px focus ring in `--focus`, a skip link.
- Touch: controls at least 44px high on a phone.
- Motion: only the kindled float, and `prefers-reduced-motion` turns it off with all transitions.
- Layout: no sideways scroll at 390px (tables hide low-value columns or scroll inside `.table-wrap`), line length under 70ch for prose.
- Both languages, both schemes, 390 and 1440px, on real data.
- Lighthouse accessibility 100 on every page (`pnpm lighthouse`); the Playwright specs pass (`pnpm e2e`).

## 6. How it was made

Process (as for Sunrise D-161 and the `sunrise-ux` skill): research, a brief, a token plan reviewed against the defaults, a build, then a screenshot critique at 1440 and 390px in both schemes.

- **Skills used:** Anthropic's `frontend-design` (the process, and its list of what reads as a default: cream with a serif and terracotta, near-black with one acid accent, hairline broadsheet columns, identical rounded cards with soft shadows, tracked all-caps eyebrows); the `sunrise-ux` rules (answer in five seconds, fold one level, delete repetition, lines under 70 characters); `ui-ux-pro-max` as a calibration: its design-system search for this brief returned near-black OLED with a green accent and Fira, which is exactly the default to avoid, so it was used for its checklist (contrast, focus, 44px targets, reduced motion, 375/768/1024/1440) and not for its choices.
- **Research behind the choices:** a 100% stacked bar suits composition across holders and a shared baseline is lost for middle segments (ONS and Domo chart guidance), so the largest holder is first and every segment is labelled; tables put the most important column on the left, right-align figures under right-aligned headings and keep a neutral grid (Eleken, Halo Lab); Plus Jakarta Sans carries tabular figures since v2.600.
- **Rejected:** a candle-and-stack symbol (reads as a candlestick chart); cream paper and a serif display (a default); a dark-only theme (the owner keeps two); cards for every panel (the old UI).
