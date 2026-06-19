# remove-recent-variant

Remove the fixed **5-year `recent` stat variant** from pipeline, packaged data, and site. Interim UX: **all-time stats only** on `/` and `/songs/` (single episode-month slider). Replaced later by [`flexible-period-window`](flexible-period-window.md) (arbitrary begin/end range).

Parent: [`flexible-period-window`](flexible-period-window.md) (step 0)  
Related: [ADR-003](../adr/adr-003-data-layers.md), [`data/README.md`](../../data/README.md), [`site/README.md`](../../site/README.md), [`commands.md`](../faq/commands.md)

**Status:** Done (2026-06-18)

---

## Problem

The **recent** variant duplicates ~114 snapshots per grain (`per-video`, `per-song`) for a fixed sliding 5-year window. The site exposes it via All-time | Recent sub-nav and `/recent/` routes. That complexity is being retired **before** the flexible range query ships; users temporarily lose the 5-year view until the epic delivers arbitrary windows.

---

## Scope

### In scope

Full removal of the `recent` **stat variant** (processed + packaged + site + tests + living docs). Regenerate `data/processed/` and `data/packaged/` after pipeline changes.

### Out of scope

- Flexible begin/end range slider ([`flexible-period-window`](flexible-period-window.md) steps 1–5)
- Renaming `alltime` → default/unified paths (keep `alltime/` folder names for now)
- Changing all-time aggregation semantics or `chart_points` formula

### Keep as history (do not delete or rewrite)

| Location | Why |
|----------|-----|
| [`CHANGELOG.md`](../../CHANGELOG.md) | Past release notes documenting when `recent` shipped |
| [`flexible-period-window.md`](flexible-period-window.md) | Epic context describing what existed |
| **This file** | Record of the removal task |
| Git history | — |

**Do update** living docs (`data/README.md`, `commands.md`, `chart_points.md`, root `README.md`, `site/README.md`, `video-insights.md` open question, `STATUS.md`, `BACKLOG.md` notes). **Add** a new `CHANGELOG.md` entry for the removal; do not erase older bullets.

---

## Interim site behavior

| | After this task |
|--|-----------------|
| **Routes** | `/` (videos), `/songs/` only |
| **Nav** | Videos \| Songs — no All-time \| Recent sub-nav |
| **Slider** | Single thumb — cumulative stats through selected episode month |
| **Data** | `per-video/alltime/`, `per-song/alltime/` only |

---

## Data — delete from repo

After last `process` / `package` without recent (or delete outright):

```text
data/processed/recent/                    # entire tree (~114 + latest)
data/packaged/per-video/recent/           # entire tree
data/packaged/per-song/recent/            # entire tree
```

Site prebuild must stop writing `public/data/periods-recent.json`.

---

## Pipeline — remove or simplify

### `pipeline/src/evtop20/aggregate.py`

| Remove / change |
|-----------------|
| `RECENT_WINDOW_YEARS`, `RECENT_STATS_BASENAME` import usage |
| `_RECENT_PERIOD_RE`, `recent_window_cutoff`, `build_recent_period_snapshots` |
| `_period_from_recent_filename`, `_remove_stale_recent_period_snapshots` |
| `StatsAccumulator.to_recent_payload` (and recent-only helpers) |
| `run_aggregate` branch writing recent snapshots |
| `AggregateResult.recent_window_episode_count` |

Keep cumulative **alltime** path unchanged.

### `pipeline/src/evtop20/process.py`

- Remove recent path reporting from CLI output.
- Message should describe alltime snapshots only.

### `pipeline/src/evtop20/package.py`

| Remove / change |
|-----------------|
| `package_recent_payload` |
| `_package_variant` call for `label="recent"` |
| `RECENT_STATS_BASENAME` / `processed_recent_dir` imports and branches |
| Recent paths in `package` return message |

### `pipeline/src/evtop20/paths.py`

Remove:

- `RECENT_STATS_BASENAME`
- `processed_recent_dir`, `processed_recent_stats_*`
- `packaged_per_video_recent_*`, `packaged_per_song_recent_*`

### `pipeline/src/evtop20/song_stats.py`

- `video_stats_basename_to_song_stats_basename`: drop `RECENT_STATS_BASENAME` branch (alltime only).

---

## Pipeline — tests

### Delete or rewrite

| File | Tests |
|------|-------|
| `pipeline/tests/test_aggregate.py` | `test_recent_cutoff_*`, `test_recent_window_*`, `test_recent_youtube_id_refresh_*`, `test_recent_writes_matching_snapshot_count` |
| `pipeline/tests/test_package.py` | `test_package_recent_payload_preserves_window`, `test_run_package_writes_recent_snapshots`; recent branches in shared helpers |
| `pipeline/tests/test_song_stats.py` | `test_video_stats_basename_to_song_stats_basename_accepts_recent` |

**Do not remove** `test_youtube_video_id_uses_most_recent` — unrelated (recency of id within window, not the recent variant).

### Keep green

```bash
cd pipeline && uv run pytest
```

---

## Site — remove or simplify

### Delete pages

```text
site/src/pages/recent/index.astro
site/src/pages/songs/recent/index.astro
```

### `site/src/layouts/BaseLayout.astro`

- Remove `variant` prop and All-time \| Recent sub-nav.
- Top nav: Videos \| Songs only (links to `/` and `/songs/`).

### `site/src/pages/index.astro` / `songs/index.astro`

- Drop `variant="alltime"` from layout and `StatsExplorer` (or remove prop entirely).

### `site/src/components/stats/`

| File | Change |
|------|--------|
| `types.ts` | Remove `StatsVariant`, `RecentWindow`, `windows` on `PeriodManifest`, `window?` on snapshots |
| `data.ts` | Alltime URLs only; `loadPeriodManifest()` without variant param |
| `StatsExplorer.tsx` | Remove `variant`, `windowsByPeriod`, `window` state; always load alltime |
| `PeriodControls.tsx` | Single-thumb slider only; remove range/window UI, `findAnchorForWindowStart` usage |
| `sort.ts` | Remove `findAnchorForWindowStart`, `formatPeriodRange` if unused |

### `site/scripts/copy-packaged.mjs`

- Alltime period manifest only (`periods-alltime.json`).
- Remove recent directory scan, `recentWindows`, `periods-recent.json`.

### Verify

```bash
cd site && npm run build
```

Build output: **2 pages** (`/`, `/songs/`), not 4.

---

## Documentation — update (living docs)

| File | Update |
|------|--------|
| [`data/README.md`](../../data/README.md) | Diagram + tables: processed/packaged **alltime only**; remove recent rows and `RECENT_WINDOW_YEARS` |
| [`docs/faq/commands.md`](../faq/commands.md) | `process` writes alltime only |
| [`docs/faq/chart_points.md`](../faq/chart_points.md) | Cumulative over alltime snapshots (drop “or recent variant”) |
| [`README.md`](../../README.md) | Process row |
| [`site/README.md`](../../site/README.md) | Routes, copy-packaged behavior |
| [`docs/tasks/video-insights.md`](video-insights.md) | Open question: point to `flexible-period-window` instead of `processed/recent/` |
| [`docs/STATUS.md`](../STATUS.md) | Session note when done |
| [`docs/BACKLOG.md`](../BACKLOG.md) | Mark `remove-recent-variant` done |
| [`CHANGELOG.md`](../../CHANGELOG.md) | **Add** removal entry under Unreleased/changelog section |

ADR-003 “processed may include multiple stat variants” remains valid in principle; note in `data/README.md` that only **alltime** ships today (flexible window epic follows).

---

## Regeneration checklist

```bash
cd pipeline
uv run evtop20 validate
uv run evtop20 process
uv run evtop20 package

cd ../site
npm run build
```

Confirm:

- No `data/processed/recent/`
- No `data/packaged/per-*/recent/`
- `site/public/data/periods-alltime.json` exists; no `periods-recent.json`

---

## Verification

Repo-wide (exclude `docs/tasks/flexible-period-window.md`, `docs/tasks/remove-recent-variant.md`, `CHANGELOG.md` historical sections):

```bash
rg -i 'processed/recent|packaged/.*/recent|periods-recent|RECENT_STATS|RECENT_WINDOW|StatsVariant|RecentWindow|windowsByPeriod|variant="recent"' \
  --glob '!data/packaged/**' --glob '!data/processed/**' --glob '!CHANGELOG.md' \
  --glob '!docs/tasks/flexible-period-window.md' --glob '!docs/tasks/remove-recent-variant.md'
```

Expect **no matches** in `pipeline/`, `site/`, `data/README.md`, `docs/faq/`, root `README.md`.

---

## Done when

- [x] `data/processed/recent/` and `data/packaged/per-*/recent/` absent; alltime trees regenerated
- [x] `evtop20 process` / `package` have no recent code paths; `paths.py` cleaned
- [x] Recent tests removed or rewritten; `uv run pytest` passes
- [x] Site: 2 routes, no variant prop, single-thumb `PeriodControls`; `npm run build` passes
- [x] `copy-packaged.mjs` writes only `periods-alltime.json`
- [x] Living docs updated; `CHANGELOG.md` has new removal note
- [x] Verification `rg` clean per above

---

## References (pre-removal)

| Path | Role |
|------|------|
| `pipeline/src/evtop20/aggregate.py` | `build_recent_period_snapshots`, `RECENT_WINDOW_YEARS = 5` |
| `pipeline/src/evtop20/package.py` | `_package_variant(..., label="recent")` |
| `site/src/pages/recent/`, `site/src/pages/songs/recent/` | Recent routes |
| `site/scripts/copy-packaged.mjs` | `periods-recent.json` + `windows` extraction |
