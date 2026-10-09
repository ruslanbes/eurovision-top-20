# Stale Videos page after deploy (browser cache)

- **Task ID:** `stale-stats-cache`
- **Status:** backlog (deferred 2026-10-09)
- **Parent / blocked by:** —

## Problem

After a new episode shipped to the live site, a **Firefox normal** profile kept showing **pre-update** stats on the **root page** (`/` · Videos). Hard refresh did not fix it. **Firefox private** and **Chrome** showed the new data. Other routes (Episodes, Insights; possibly Songs) looked fine.

Risk: returning visitors (especially Firefox) keep a stale full-corpus table after deploys that only add episode months.

Clarify: observed on **`/` Videos** only; Songs not reported stale but shares the same code path.

## Goal

After deploy, the Videos (and Songs) default view reflects the latest packaged periods without requiring cache-clear or private windows. Prefer a small, reliable fix over a large SEO rethink.

## Exploration (code)

### How `/` loads data

1. **SSG:** `index.astro` bakes `initialRows` / `initialPeriods` into the HTML via `buildDefaultStatsRows("video")` (~large document).
2. **Client:** `StatsExplorer` still `fetch`es `video-hits.json` + `video-meta.json` (no cache-busting query).
3. **Window:** `useStatsUiState` hydrates **once** from the URL + current `periods`, then **ignores later `periods` updates**:

```53:61:site/src/components/stats/useStatsUiState.ts
  useEffect(() => {
    if (periods.length === 0) {
      return;
    }
    if (!hydratedRef.current) {
      setState(parseStatsUiState(window.location.search, periods));
      hydratedRef.current = true;
    }
  }, [periods]);
```

4. **Row source:** if fetch succeeded, rows come from `queryVideoWindow(…, begin, end)`. If `end` stayed on the **previous** latest month, the new episode is excluded even when JSON is fresh.

### Likely failure mode (fits Firefox + “refresh doesn’t help”)

| Layer | What goes wrong |
|-------|------------------|
| **A. Cached `index.html`** | First paint uses old `initialPeriods` / `initialRows`. Firefox disk-caches the large homepage more aggressively than cold routes. Private window = empty cache → OK. |
| **B. Window not extended** | First hydrate locks `end` to old last period. When fetch returns **new** `periods`, effect does not re-default `end` → table stays one month behind. |
| **C. Cached query JSON** | `fetch(video-hits.json)` without revalidation can return old index; same stale end-state. Soft refresh often reuses HTTP cache. |

A + B alone explain “JSON might be new but UI still old.” C alone explains fully stale data. No service worker in this repo; theme/explainer `localStorage` unrelated.

### Why other pages seemed fine

| Page | Why less exposed |
|------|------------------|
| Episodes | Grid is CSR from `browser.json`; small SEO index only in HTML |
| Insights | Smaller HTML; different load path |
| Songs | Same architecture as Videos — **same bug class**; may not have been warm in that Firefox profile |

### GitHub Pages

No custom `Cache-Control` in-repo. Asset/HTML caching is whatever Pages + the browser do. Cache-busting must be in **URLs** or **stop relying on baked rows**.

### Incident 2 (0.8.0 deploy, 2026-10-09) — fresh HTML, stale JSON

Firefox on `/` right after deploy (Pages `last-modified` 20:30:36 UTC; report ~20:41 UTC):

- Label **Sep 2016 – Sep 2026**, slider max **Aug 2026**, **0 videos**, slider range bar empty (looks greyed). Songs fine.
- Saved page = new HTML (336 videos, Region column) → **HTML fresh**.
- Live JSON at the time = new (`video-hits.json` periods end `2026-09`). Every Pages file: `cache-control: max-age=600`, ETag.

Mechanism (layer C, inverse of incident 1):

1. HTML `initialPeriods` ends `2026-09` → `useStatsUiState` hydrates `end = 2026-09`, locks `hydratedRef`.
2. `fetch(video-hits.json)` served from Firefox HTTP cache (copy loaded < 10 min **before** deploy, still "fresh" under `max-age=600`, no revalidation) → `periods` end `2026-08`.
3. `setPeriods(stale)`; window not re-reconciled → `end = 2026-09` not in `periods`.
4. `queryWindow` `indexOf(end) = -1` → empty window → **0 rows**. `PeriodControls` clamps both thumbs to index 0 → empty range bar. Label shows state, slider ticks show `periods` → mismatch.

Songs OK because `song-hits.json` was not in cache from that pre-deploy window. Self-heals after ≤ 10 min (confirmed by reporter: normal reload ~22:45 local showed Sep 2026), but the UI breaks instead of showing older data. Decision: no fix for now.

Implications:

- Option 1 alone (extend `end` when periods **grow**) does **not** fix this: periods **shrank** relative to the HTML.
- Need (a) reconcile window whenever `periods` change, incl. `begin`/`end` not in `periods`; and (b) keep HTML and JSON from the same build — option 2 (cache-bust token baked into HTML, or `fetch(…, { cache: "no-cache" })` → ETag 304 when unchanged).

## Open questions

Do not implement if any row is `open`. Flip to `locked` when the user accepts.

| # | Topic | Status | Decision |
|---|--------|--------|----------|
| 1 | Affected routes (observed) | locked | **`/` only** in the wild; Songs not reported |
| 2 | Fix strategy (v1) | open | Was **Option 1** only; incident 2 shows stale JSON + fresh HTML → revisit: window reconcile on any `periods` change **+** option 2 |
| 3 | Drop SSG default tables | locked | **No** for now — keep Videos/Songs baked `initialRows` |
| 4 | Code scope | locked | **Apply to Songs too** (same `StatsExplorer` / `useStatsUiState`) |
| 5 | Reproduce | locked | **Manual** only (Firefox after deploy); no automated repro in v1 |

Follow-ups if live still stale: option 2 (cache-bust JSON) and/or option 3 (drop SSG).

## Options

### 1. Fix window when `periods` grow (logic bug) — **recommended either way**

When `periods` gains a new latest month and the URL did **not** set an explicit `end` (or current `end` was the previous full-range end), bump `end` to `periods.at(-1)`.

- **Pros:** Small; fixes A→B even if HTML was briefly stale then JSON refreshed; good unit-test target.
- **Cons:** Does not fix fully cached old JSON by itself.

### 2. Cache-bust query JSON fetches

e.g. append build id / `periods-alltime.json` latest / content hash:  
`fetch(\`${url}?v=${latestPeriod}\`)` or hashed filenames from `deliver-packaged`.

- **Pros:** Addresses C; works with SSG kept.
- **Cons:** Need a stable bust token at runtime; still can show stale SSG until fetch returns.

### 3. Drop SSG `initialRows` / `initialPeriods` on Videos (and Songs)

CSR-only table again: Loading… → fetch. Meta descriptions stay.

- **Pros:** Removes multi‑hundred‑KB stale table from HTML; first paint no longer “lies”; easy if SEO tables are disposable.
- **Cons:** Brief Loading…; crawlers lose table body (meta + other pages remain). Does not fix stale JSON without (1) or (2).

### 4. Hybrid: drop SSG tables **and** (1) and/or (2)

Strongest for “always see new episode after deploy.”

### 5. Cache headers / `Clear-Site-Data`

Not practical on plain GitHub Pages for HTML/JSON.

### Lean (superseded by locked decisions)

v1 = **option 1** only. Options 2–3 deferred until live check.

## Non-goals

- Service worker / offline app.
- Changing Episodes SEO index or Insights SSG (unless same fetch bug appears).
- Custom domain / CDN header project.
- advanced Scaffold task folders.

## Done when

- [x] Open questions locked.
- [ ] Option 1 implemented: when `periods` grow and `end` was the previous full-range end (no intentional shorter `end`), bump `end` to the new latest — Videos and Songs.
- [ ] Manual check on live Firefox after deploy (reporter).
- [ ] `CHANGELOG.md` `[Unreleased]` updated.
- [ ] `BACKLOG.md` / `STATUS.md` updated.

## Notes

- Repro sketch: build with periods ending `N`; serve; then swap packaged query (+ optional HTML) to end `N+1` without hard-reload cache bust; observe whether `end` sticks at `N`.
- Related files: `StatsExplorer.tsx`, `useStatsUiState.ts`, `statsUiState.ts`, `data.ts`, `pages/index.astro`, `pages/songs/index.astro`, `buildDefaultStatsRows.ts`.
