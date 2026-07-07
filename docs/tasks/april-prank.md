# April prank (emoji titles on Videos / Songs)

- **Task ID:** `april-prank`
- **Status:** backlog

## Problem

A light April Fools’ easter egg for the stats explorer: on **Videos** and **Songs** only, replace visible title cells with a short emoji string (hand-picked per song). Clicking reveals the real title; clicking again follows the normal YouTube link behaviour.

The feature must be **optional**, **testable year-round**, and **removable** without touching packaged stats metadata or insight modules.

## Goal

On `/` and `/songs/`, when prank mode is active, table **Video** / **Song** cells show **1–3 emojis** instead of the title. First click swaps emojis → real label (still in-table); second click on the label opens YouTube as today. Refresh restores emojis. Episodes and Insights stay unchanged.

## Decisions (proposed)

| # | Topic | Decision |
|---|--------|----------|
| 1 | Pages | **`/` (Videos)** and **`/songs/`** only — not Episodes, Insights, nav, filters, or footers |
| 2 | Column scope | **Title column** in `StatsTable` only (video title or `artist — song`) |
| 3 | Identity key | **Song-based** — `songMetaLookupKey(artist, song)`; all videos sharing that song use the same emoji string |
| 4 | Video-only rows | Resolve song via packaged `artist` + `song` on the video row; unparseable titles → no prank (show real title) |
| 5 | Mapping source | New hand-edited file `data/metadata/april-prank-emojis.json` — **do not** modify `insight-row-footnotes.json`, `fire.json`, or packaged query JSON |
| 6 | Emoji count | **1–3** per entry; validate at build/test time |
| 7 | Unmapped songs | **Passthrough** — show real title (no generic fallback emoji in v1) |
| 8 | Click state | **Per cell, in-memory** — `emoji` → `revealed label` → link navigation; **not** persisted in URL or `localStorage` |
| 9 | Reset | Full **page refresh** restores all cells to emoji view |
| 10 | Search / filters | Operate on **real** row data (unchanged); only display is masked |
| 11 | Sort / rank | Unchanged — prank is presentation-only |
| 12 | Cleanup strategy | Self-contained module + metadata file; delete folder + JSON + registry hook to remove |

### Activation (testing vs production)

| Mode | Mechanism |
|------|-----------|
| **Force on** | `?april_prank=1` on Videos or Songs URL (shareable test link) |
| **Force off** | `?april_prank=0` overrides auto date (verify real UI on Apr 1) |
| **Dev switch** | Optional small toggle in `StatsExplorer` when `?april_prank_debug=1` **or** `import.meta.env.DEV` — not shown in production by default |
| **Auto (Apr 1)** | See [April 1 auto-enable](#april-1-auto-enable) below — **recommend hybrid** |

**Recommended `isAprilPrankActive()` precedence:**

1. URL `april_prank=0` → **off**
2. URL `april_prank=1` → **on**
3. Else if `APRIL_PRANK_AUTO !== false` (build-time default **true**) → **on** when `localDate()` is 1 April (user’s browser local calendar)
4. Else → **off**

Config constant in new module only, e.g. `site/src/components/stats/aprilPrank/config.ts` — not scattered across existing files.

## April 1 auto-enable

Two viable approaches for GitHub Pages (static site, no server):

### A — In-browser local date (recommended primary)

```ts
function isLocalAprilFirst(): boolean {
  const now = new Date();
  return now.getMonth() === 3 && now.getDate() === 1;
}
```

| Pros | Cons |
|------|------|
| No scheduled deploy or revert | User timezones: “April 1” varies vs UTC |
| Same build artifact all year | Someone can change system clock |
| Auto-off on Apr 2 without CI | |

Good fit for a joke feature. Pair with `?april_prank=0` for users who want the normal site on Apr 1.

### B — Scheduled parametrized deploy

- Add build env `PUBLIC_APRIL_PRANK=1` (or Astro `import.meta.env.PUBLIC_APRIL_PRANK`) in `deploy.yml`.
- **Apr 1:** cron / manual `workflow_dispatch` with prank flag → build → deploy.
- **Apr 2:** deploy again with flag off (or re-run default `main` push).

| Pros | Cons |
|------|------|
| Everyone sees same window (UTC of deploy) | Two deploys/year; easy to forget revert |
| Works even if client date wrong | Prank off until deploy completes on Apr 1 |
| Can enable before midnight in a chosen TZ via cron | More moving parts in CI |

### C — Hybrid (recommended)

- **Default:** local-date auto on Apr 1 (A).
- **Optional:** `PUBLIC_APRIL_PRANK=1` at build time forces prank for **all** visitors until next deploy (B) — useful for a staged photo or early QA on production URL.
- **Testing:** `?april_prank=1` anytime.

**Do not** rely on scheduled deploy alone unless product owner explicitly wants UTC-aligned global flip.

## Non-goals

- Emoji mapping for every song in corpus (curated subset is fine).
- Insights / Episodes / table headers / Chart Points column.
- Persisting reveal state across navigation or sessions.
- Pipeline `package` / `validate` awareness.
- i18n of emoji labels.
- Replacing search placeholder text or filter chip labels.

## Data file shape

`data/metadata/april-prank-emojis.json`:

```json
{
  "schema_version": 1,
  "entries": [
    {
      "id": "subwoolfer-give-that-wolf-a-banana",
      "artist": "Subwoolfer",
      "song": "Give That Wolf A Banana",
      "emojis": "🔉🐺🍌",
      "notes": "song title"
    }
  ]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Stable kebab-case |
| `artist` / `song` | yes | Must match `songMetaLookupKey` after normalization |
| `emojis` | yes | 1–3 Unicode emoji; no ZWJ sequences required but allowed if ≤3 visible graphemes |
| `notes` | no | Editor hint: song title, artist, lyrics, performance |

Build step (new): `site/scripts/read-april-prank.mjs` → `site/src/generated/aprilPrankEmojis.json` (map keyed by lookup key). Wire in `predev` / `prebuild` / `pretest` alongside insight footnotes.

Document in `data/metadata/README.md` — **new section only**.

### Seed examples (for editors — expand later)

| Artist — Song | Emojis | Source hint |
|---------------|--------|---------------|
| Subwoolfer — Give That Wolf A Banana | 🔉🐺🍌 | artist + song title |
| KAJ — Bara bada bastu | 🧖‍♂️🧖‍♂️🧖‍♂️ | 3 peformers in a sauna |
| Alexander Rybak — Fairytale | 🎣🧚‍♀️ | artist + song title |
| Tommy Cash — Espresso Macchiato | 💶☕ | artist + song title |
| Lordi — Hard Rock Hallelujah | 🫅🪨🙏 | artist + song title |
| Sunstroke Project & Olia Tira — Run Away | ☀️🎷🏃 | artist + song title + epic sax guy |

## Architecture

```
data/metadata/april-prank-emojis.json
        │
        ▼
read-april-prank.mjs → generated JSON (lookup key → emojis)
        │
        ▼
aprilPrank/
  config.ts           — APRIL_PRANK_AUTO, query param names
  mode.ts             — isAprilPrankActive(searchParams)
  map.ts              — getAprilPrankEmojis(artist, song)
  AprilPrankTitle.tsx — emoji / revealed / link cell
        │
        ▼
StatsTable.tsx        — title column cells only, when active
StatsExplorer.tsx     — optional debug toggle; pass active flag
```

**No edits** to `data/packaged/*`, `footnoteRules.ts`, or insight modules. `StatsTable` gets a minimal conditional render branch or wraps existing link cell.

### UI behaviour (`AprilPrankTitle`)

| State | Display | Click |
|-------|---------|-------|
| `hidden` | `emojis` (button, looks like text) | → `revealed` |
| `revealed` | Real title as link (same classes as today) | → `window.open(youtube)` |
| No mapping / prank off | Real title link immediately | → YouTube |

Use `useState` per row instance (keyed by `statsRowKey`). `aria-label` on emoji button: “Show title” / include song key for screen readers once revealed.

## Done when

- [ ] `data/metadata/april-prank-emojis.json` with schema + ≥6 seed entries (examples above).
- [ ] Build script + generated JSON; documented in `data/metadata/README.md`.
- [ ] `isAprilPrankActive()` supports `?april_prank=1|0` and local Apr 1 auto.
- [ ] Videos and Songs title columns use emoji swap when active; other pages unchanged.
- [ ] Song-based: two videos same `(artist, song)` show identical emojis.
- [ ] Click emoji → real title; click title → YouTube (unchanged URL).
- [ ] Refresh resets all cells to emoji.
- [ ] Optional debug toggle when `?april_prank_debug=1` or dev build.
- [ ] Unit tests: mode detection (URL overrides, date mock), map lookup, emoji validation.
- [ ] `npm test` and `npm run build` pass.
- [ ] Removal note in task doc: delete `aprilPrank/`, JSON, script, generated file, `StatsTable` hook (~1 PR revert).

## Test plan

- **mode.ts:** `april_prank=1` on; `april_prank=0` off; mocked Apr 1 on/off; Mar 31 off.
- **map.ts:** known key returns emojis; unknown returns `null`.
- **AprilPrankTitle:** click sequence emoji → label → href; refresh remount resets.
- **Integration:** Videos row with mapped song shows emojis; Insights page snapshot unchanged (manual or absent prank hook).

## Open questions (resolve before implementation)

| # | Question | Lean |
|---|----------|------|
| 1 | Map coverage target for v1 | ~20–40 famous entries, not full corpus |
| 2 | `PUBLIC_APRIL_PRANK` build flag | Add for hybrid; default unset |
| 3 | Search box while pranked | Keep searching real titles (recommended) |
| 4 | Apr 1 in `CHANGELOG` | User-facing one-liner under Added when shipped |

## References

- Title cells: `site/src/components/stats/StatsTable.tsx`
- Song key: `site/src/components/stats/songMetaLookupKey.ts`
- URL state: `site/src/components/stats/statsUiState.ts` (prank params should **not** sync to URL unless we add optional `april_prank` persistence — **default: do not persist**)
- Footnote build pattern: `site/scripts/read-insight-footnotes.mjs`
- Deploy: `.github/workflows/deploy.yml`
