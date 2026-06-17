# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed

- Removed `generated_at` from processed and packaged snapshot JSON (was pipeline run date on every file, causing noisy git diffs on no-op reruns). Site footer uses the selected period instead.

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
