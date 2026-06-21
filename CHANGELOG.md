# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- URL-persisted stats UI state — episode range + table filters sync across `/` and `/songs/` via query params.
- Fire songs filter — manual `data/metadata/fire.json` allowlist → packaged `fire` boolean; 🔥 emoji toggle with URL param `fire=1`.
- Song table YouTube links — `song-meta.json` `youtube_watch_url` from highest alltime `chart_points` member; `/songs/` Song column links when present.

### Changed

- Default stats sort tie-breakers — after tier counts: `esc_final_place` ascending, contest year descending, then name.
- Replaced `performance_type` with `performance_category`.

### Removed

- `data/metadata/performance-category-overrides.json` and package-time category override loader; `performance_category` is set only at title parse (pattern rules or `manual-video-metadata.json`).

## [0.1.0] - 2026-06-18

Flexible period windows, ESC placement, and site query index. Replaces the fixed 5-year **recent** variant.

### Added

- Flexible episode-month range on stats tables — `processed/episode-index/`, `packaged/query/` sparse hit index, client aggregation via `queryWindow.ts`; dual-thumb range slider defaults to full corpus.
- ESC final placement on packaged rows — vendored [EurovisionAPI/dataset](https://github.com/EurovisionAPI/dataset) release `2026.4`, join in `package`, `evtop20 vendor-esc flatten` CLI.
- **Place** column on per-video stats table (`esc_final_place` labels + custom sort; tooltip distinguishes from chart points).
- ESC join artist normalization — `and`/`y`/`x`/`feat.`/`ft.` equivalents, sorted duet parts for alias matching.
- `data/metadata/esc-join-overrides.json` — map `youtube_video_id` → contest edition when title parse cannot match vendor (e.g. MESC NF titles).
- `data/metadata/esc-placement-overrides.json` — direct `youtube_video_id` → `esc_final_place` for non-entry clips, withdrawn entries, and other cases vendor join cannot resolve.

### Changed

- Removed fixed **5-year recent** stat variant from pipeline, packaged data, and site; replaced by flexible `[begin, end]` episode-month windows on a single route per grain.
- ADR-003 site contract — client may aggregate tiers and `chart_points` from packaged payloads (e.g. `queryWindow.ts` over `packaged/query/`).
- ESC placement overrides moved out of `manual-video-metadata.json` into `esc-placement-overrides.json` (title-parse file is parse fields only).
- Virtual **`World`** country (`🌍`) for non-national ESC clips; five manual-metadata rows updated.
- Vendored ESC results include **2026** from [EurovisionAPI/dataset PR #1](https://github.com/EurovisionAPI/dataset/pull/1) (`release_tag` `2026.4+pr1` until upstream merge); `last_completed_contest_year` **2026**.
- Pipeline requires **Python 3.14** (`pipeline/.python-version`, CI test job on push/PR).
- Removed `generated_at` from processed and packaged snapshot JSON (was pipeline run date on every file, causing noisy git diffs on no-op reruns). Site footer uses the selected period instead.

### Removed

- Completed task specs for shipped features (behavior in ADRs, FAQ, and `data/README.md`).

## [0.0.1] - 2026-06-15

First pre-release. Pipeline, packaged data layer, and site Slice 1.

### Added

**Planning & layout**

- Requirements and stack captured in ADRs (000–003).
- Raw episode JSON schema and hand-edited episode files under `data/raw/episodes/`.
- Repo root auto-detection via `data/schemas/episode.schema.json`.

**Pipeline CLI**

- `validate` — schema checks, whitespace normalization, three-pass identity validation.
- `process` — cumulative alltime and 5-year recent video stats with per-episode-month snapshots.
- `package` — UI-ready JSON: per-video and per-song × alltime/recent.
- `new-episode` — empty `YYYY-MM` episode template.
- `add` — fill a rank via month delta (`+1` … `-19`) or fuzzy search against latest alltime stats.

**Validation**

- Per-episode checks: duplicate titles/ids, self-contamination.
- Corpus checks: cross-episode id↔title consistency, unique episode roundup ids.
- Filename stem + `period` as episode identity (`episode_id` removed).

**Processed stats**

- Tier counts (top1 … top20) and `chart_points` with default sort.
- `youtube_video_id` on stats rows (replaces `youtube_url`).
- Layout: `data/processed/alltime/` and `data/processed/recent/` with `eurovision-top-20-{alltime,recent}-*` basenames.

**Packaged layer**

- Title parsing (`title_parse/`) with manual metadata overrides.
- Augmented video rows (URLs, parsed artist/song/country/year).
- Song roll-up by `(artist, song)` with generic merge warnings.

**Site (Slice 1)**

- Astro + React stats explorer: video grain, alltime variant, period scrubber, TanStack Table.
- Prebuild copies packaged data; GitHub Actions deploy to GitHub Pages.

**Docs**

- Completed task specs removed; ADRs, FAQ, and `data/README.md` cover shipped behavior.
