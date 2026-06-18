# flexible-period-window

Replace the fixed **all-time / recent (5y)** split with **one stats table per grain** and a **fully flexible two-edge period slider** (begin + end episode months). Default range = full corpus (today’s all-time). Arbitrary sub-ranges are queried from a new site-oriented artifact instead of pre-built `recent` snapshots.

Parent: `scaffold-project`  
Related: [ADR-003](../adr/adr-003-data-layers.md), [`data/README.md`](../../data/README.md), [`chart_points.md`](../faq/chart_points.md), [`site/README.md`](../../site/README.md)

**Status:** Epic — backlog (step 0 first, then design + spike)

---

## Problem

Today the site ships **four** table snapshot trees (`per-{video,song} × {alltime,recent}`) plus two period manifests. The **recent** variant is a fixed **5-year calendar window** anchored at one episode month — not an arbitrary range.

The UI now has a dual-thumb range slider on recent pages, but it only **selects among precomputed anchors** (`windowsByPeriod` in `periods-recent.json`). Users cannot pick an arbitrary `[begin, end]` pair, and we still duplicate ~114 snapshot files per grain per variant.

We want:

- **One** videos page and **one** songs page (no all-time / recent switch).
- Range slider with **independent begin and end** on the episode-month axis.
- **Default** = full history (equivalent to today’s all-time latest).
- **No** packaged `recent` snapshots if a queryable structure covers all ranges.

---

## Implementation phases

### Step 0 — Remove `recent` variant (do first)

Delete the fixed 5-year **recent** path from pipeline, packaged data, and site **before** building the flexible query layer. Acceptable interim: site shows **all-time stats only** (single episode-month slider, cumulative through selected month) — same as pre-recent site behavior.

| Area | Remove / revert |
|------|-----------------|
| **processed** | `data/processed/recent/`; `build_recent_period_snapshots` and related wiring in `aggregate.py` / `process.py` |
| **packaged** | `per-video/recent/`, `per-song/recent/` |
| **site** | `/recent/`, `/songs/recent/`; All-time \| Recent sub-nav; `periods-recent.json`; recent range slider / `windowsByPeriod` logic |
| **site (keep)** | `/` + `/songs/` loading `per-*/alltime/` snapshots only |
| **tests & docs** | Recent-specific tests; `data/README.md`, `CHANGELOG.md`, `site/README.md`, `copy-packaged.mjs` |

**Step 0 done when:**

- [ ] `evtop20 process` writes only `processed/alltime/`
- [ ] `evtop20 package` writes only `per-{video,song}/alltime/` (no recent trees)
- [ ] Site builds with two routes; all-time period slider only
- [ ] CI green; no references to `processed/recent` or `packaged/*/recent` in pipeline/site

No replacement for the 5-year view until later steps ship the flexible range.

### Steps 1–5 — Flexible window (after step 0)

See [Recommendation (phased)](#recommendation-phased) and [Suggested child tasks](#suggested-child-tasks).

---

## Goals

| # | Goal |
|---|------|
| G1 | Site queries stats for any valid episode-month range `[begin, end]` inclusive |
| G2 | Default range = first episode month → latest episode month |
| G3 | Single packaged path per grain (video, song) — no `alltime` / `recent` variant split for tables |
| G4 | Tier counts + `chart_points` for a window match pipeline semantics ([`chart_points.md`](../faq/chart_points.md)) |
| G5 | ESC placement and display metadata unchanged (still package-time joins; not window-dependent) |
| G6 | Static-site friendly (GitHub Pages): no server; acceptable load time on range change |

---

## Non-goals (v1 of epic)

- Sub-month or contest-year-only windows (episode month remains the unit)
- Live recomputation from `raw/` in the browser
- Changing `chart_points` formula or tier definitions
- Wave / insights charts (separate tasks)
- Persisting user’s last-selected range across sessions (optional later)

---

## Current state (2026-06)

| Layer | What exists |
|-------|-------------|
| **raw** | ~114 episode files (`YYYY-MM.json`) |
| **processed/alltime** | Cumulative snapshot per episode month (~114 files) |
| **processed/recent** | 5y sliding window per anchor (~114 files + `window` metadata) |
| **packaged** | `per-video` / `per-song` × `alltime` / `recent` — full table rows per period |
| **site** | 4 routes; dual-thumb slider on recent maps to anchor lookup, not free range |

**Scale anchors:**

- ~114 episode months → **~6 555** ordered pairs `(begin, end)` with `begin ≤ end` on the episode timeline
- ~334 video titles in latest alltime snapshot
- ~200 song roll-up rows (order of magnitude)

---

## Proposed UX

```text
[Videos] [Songs]                    ← top nav only (no All-time | Recent)

Episode range: Jan 2017 – May 2026
|====●━━━━━━━━━━━━━━●====|         ← begin thumb    end thumb
Jan 2017                              May 2026

{count} videos · window Jan 2019 – Jun 2024
[table sorted by chart_points …]
```

- **Begin / end** thumbs on the shared episode-month index (same points as today’s period scrubber).
- **Default:** left = earliest episode, right = latest.
- **Table** refreshes when either edge moves (debounced fetch or client aggregate).
- **Place / flag / country / year** columns: static per row (from package enrichment at latest or canonical snapshot — decision below).

---

## Core insight: windows are subtractive

All-time cumulative rows at month `M` count tier hits over episodes with `period ≤ M`.

For any window `[B, E]` on the episode-month axis:

```text
tiers_window(video, B, E) = tiers_cumulative(E) − tiers_cumulative(B−1)
```

where `B−1` is the episode month immediately before `B` (or zero baseline if `B` is first). `chart_points` is then derived from tier counts via the existing formula.

So **all-time processed snapshots already contain enough information** to derive arbitrary windows — the open question is **how the site accesses that efficiently** without shipping ~6k full table files.

---

## Data-structure options

### A. Precomputed JSON per `(begin, end)` window

`package` emits one file per valid window, e.g.  
`packaged/per-video/windows/eurovision-top-20-2019-01_2024-06.json`.

| Pros | Cons |
|------|------|
| Site stays dumb (fetch one file) | ~6 555 windows × full row payload → **hundreds of MB** if each file mirrors today’s ~300 KB snapshots |
| Matches current “packaged only” pattern | Git + Pages deploy size; long `package` runs |
| | Song roll-up × windows doubles work |

**Verdict:** Only viable if rows are **minimal** (ids + tier ints only) **and** we accept ~50–150 MB total — needs spike to measure. User noted ~10 k scale is OK for *small* payloads; full tables likely exceed that.

---

### B. Episode-level contribution index (sparse)

One artifact lists, per video (or per `video_title`), which episode months contributed and at what rank — or per-month tier **deltas** (0/1 per tier per episode).

```json
{
  "periods": ["2017-01", "…", "2026-05"],
  "videos": [
    {
      "video_title": "…",
      "youtube_video_id": "…",
      "hits": [
        { "period": "2019-03", "rank": 2 },
        { "period": "2019-04", "rank": 1 }
      ]
    }
  ]
}
```

Client (or a small in-browser module) sums hits with `B ≤ period ≤ E`, rebuilds tier counts, computes `chart_points`.

| Pros | Cons |
|------|------|
| **One** (or few) files per grain | **Tier math in browser** — today forbidden by [`data/README.md`](../../data/README.md) site contract; needs ADR amendment |
| Size ~ O(episodes × entries per episode) ≈ few MB | Song roll-up must be defined (client groups by `(artist, song)` or separate song index) |
| Any range in O(hits) | Must match pipeline golden tests exactly |

---

### C. SQLite (or DuckDB) in packaged

`package` writes `packaged/stats.db` with tables e.g. `video_hits(video_title, period, rank)` and `video_meta(…)`.

Site loads via **sql.js** (WASM) or prebuilt query bundles.

| Pros | Cons |
|------|------|
| Flexible SQL (`WHERE period BETWEEN ? AND ?`) | New runtime dep; WASM load on Pages |
| Compact storage | Build pipeline + test story more complex |
| Natural for future insights | Offline tooling differs from JSON git-diff workflow |

---

### D. Pairwise snapshot diff (keep alltime cumulative only)

Site keeps manifest of ~114 cumulative snapshot URLs. On range commit, **fetch two** packaged (or processed-derived) snapshots `B−1` and `E`, diff tier columns per row, recompute `chart_points`.

| Pros | Cons |
|------|------|
| No new aggregate format | **Two** large JSON fetches per range change (~600 KB+ each) |
| Reuses existing alltime pipeline output | Song table needs roll-up in browser or second diff path |
| Tier subtraction is simple | Metadata merge rules for rows only in one snapshot |

---

### E. Processed enrichment: per-episode incremental file + package roll-up index

`process` writes **`processed/episode-index/`** (or extends alltime) with one small file per episode month containing **only that month’s rank contributions** (not cumulative). `package` builds:

- `packaged/query/video-hits.json` (or binary) — sparse index
- `packaged/query/song-hits.json` — pre-grouped by `(artist, song)` if song roll-up in browser is undesirable
- Optional: keep **`processed/alltime`** for `add` CLI and git-diff ergonomics

| Pros | Cons |
|------|------|
| Clean separation: processed = facts, packaged = query-optimized | New processed shape + migration |
| Drop **`processed/recent`** entirely | Two sources of truth unless alltime is generated from index |
| Size predictable; one fetch for index + one for meta | Pipeline refactor |

---

## Recommendation (phased)

**Prefer E → B** for the site artifact: **sparse episode-hit index + enriched metadata**, with **`processed/alltime` retained** for CLI/tests until proven redundant.

0. **Remove `recent`** (`remove-recent-variant` — child): pipeline, package, site. Site = all-time only until step 5.
1. **Spike** (`flexible-period-window-spike` — child): implement window aggregation in Python from raw episodes; compare output to `cumulative(E) − cumulative(B−1)`; measure JSON sizes for options B and A (minimal rows).
2. **Decide** song grain: client roll-up vs packaged `song-hits` index (favor packaged index to keep one aggregation implementation).
3. **Pipeline**: add index builder (`flexible-period-window-process`).
4. **Package**: emit `packaged/query/…` + slim `periods.json` (`flexible-period-window-package`).
5. **Site**: unified range slider + query module; update ADR-003 / `data/README` site contract (`flexible-period-window-site`).
6. **Cleanup**: final docs, CHANGELOG (`flexible-period-window-cleanup`).

If spike shows hit index **> ~5 MB** gzipped or client aggregation **> ~100 ms**, re-evaluate **C (SQLite)**.

---

## Processed layer changes

| Action | Detail |
|--------|--------|
| **Keep (for now)** | `processed/alltime/` — cumulative snapshots; `add` CLI corpus |
| **Add** | Per-episode contribution export (name TBD) — canonical input for window queries |
| **Remove (step 0)** | `processed/recent/`, `build_recent_period_snapshots`, `RECENT_WINDOW_YEARS` path wiring |
| **Optional** | Generate alltime cumulative from contributions in one pass (single source of truth) |

---

## Packaged layer changes

| Action | Detail |
|--------|--------|
| **Add** | Query index artifact(s) under e.g. `packaged/query/` |
| **Add** | Row metadata file(s) — URLs, parsed artist/song/country, `esc_final_place` (window-independent) |
| **Remove (step 0)** | `per-video/recent/`, `per-song/recent/`, `periods-recent.json` |
| **Change** | `per-video/alltime/` — either **deprecated** in favor of query+meta, or kept only as `-latest` convenience for non-site tools |

**Open:** whether `-latest` alltime snapshot remains for backwards compatibility / `add` / notebooks.

---

## Site changes

| Area | Change |
|------|--------|
| **Routes (step 0)** | `/` + `/songs/` only; remove `/recent/`, `/songs/recent/` |
| **Nav (step 0)** | Drop All-time \| Recent sub-nav |
| **Slider (step 0)** | Single episode-month scrubber on all-time snapshots (interim) |
| **Slider (later)** | True range on episode index; default `[first, last]` |
| **Data loading (later)** | Replace per-period snapshot fetch with query over index (+ meta) |
| **Contract (later)** | Amend “no tier math in browser” → “tier math only via blessed `queryWindow()` module tested against pipeline” OR keep browser dumb with precomputed windows (option A subset) |

---

## Metadata & columns not tied to window

These should **not** recompute per range (v1):

- `esc_final_place`, `flag`, `country`, `year`, `artist`, `song` — from title parse + ESC join at package time
- `youtube_watch_url` — package time

**Open:** hide videos with zero tier hits in window vs show with zeros (today: only videos that appeared in window exist in recent rows).

---

## Suggested child tasks

| ID | Goal |
|----|------|
| `remove-recent-variant` | drop `recent` from process/package/site/docs; all-time-only site |
| `flexible-period-window-spike` | Prototype structures; size + correctness benchmarks; pick A/B/C/D/E |
| `flexible-period-window-process` | Episode contribution export |
| `flexible-period-window-package` | Query index + meta |
| `flexible-period-window-site` | Flexible range slider + query integration |
| `flexible-period-window-cleanup` | Final docs, ADR, CHANGELOG |

Implement children **in order**; epic closes when flexible range ships on top of the step-0 all-time-only baseline.

---

## Open questions

| # | Question | Notes |
|---|----------|-------|
| Q1 | Client aggregation vs serverless precompute? | Drives ADR site-contract change |
| Q2 | Song roll-up location — browser vs packaged index? | Prefer packaged for parity with `song_stats.py` |
| Q3 | Keep `per-video/alltime-YYYY-MM.json` for site at all? | Or only `query` + `meta` + `periods.json` |
| Q4 | Rows with zero hits in selected window — omit or show? | Recent variant omits; alltime includes zeros |
| Q5 | Max range fetch strategy — debounce ms, Web Worker? | UX on slow mobile |
| Q6 | SQLite acceptable on GitHub Pages? | sql.js ~1 MB WASM + DB file |
| Q7 | Version field on query artifact for cache busting? | |

---

## Done when (epic)

**Step 0 (`remove-recent-variant`):**

- [ ] `processed/recent` and `packaged/*/recent` gone; `evtop20 process` / `package` updated
- [ ] Site: `/` + `/songs/` only; all-time period slider; no `/recent/` routes
- [ ] CI green

**Epic complete (steps 1–5):**

- [ ] Spike doc with measured sizes, chosen option, and sample files in `data/packaged/query/` (or ADR addendum)
- [ ] Any valid `[begin, end]` on episode axis returns correct tier counts vs pipeline reference tests
- [ ] Site: flexible range slider defaults to full corpus
- [ ] `data/README.md`, ADR-003 (or ADR-004), `site/README.md`, `CHANGELOG.md` updated
- [ ] CI green; no regression on `chart_points` / sort order for full-range (= legacy alltime latest)

---

## References

- `pipeline/src/evtop20/aggregate.py` — `build_recent_period_snapshots`, cumulative alltime
- `site/src/components/stats/PeriodControls.tsx` — current dual-thumb UI
- `site/scripts/copy-packaged.mjs` — `periods-alltime.json` / `periods-recent.json`
