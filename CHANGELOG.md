# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [0.4.2] - 2026-07-05

Stats UI semantic tokens and chart-color policy cleanup.

### Changed

- **Stats table and period slider** — semantic theme tokens (`surface`, `text`, `border`) replace hard-coded `zinc-*` pairs.
- **Error banners** — `--color-danger-*` tokens (stats and episodes).
- **Chart tokens** — removed unused `--chart-cat-*` and `--chart-seq-*` from `theme.css`.
- **`site/README.md`** — documents theme token locations and year-scheme hex exception.

## [0.4.1] - 2026-07-04

Episodes grid polish, theme-aware “Other” gray, and official ESC 2026 vendor data.

### Added

- `/episodes/` row month labels.

### Changed

- **Episode scheme “Other” gray** — shared `--chart-other` token.
- **EurovisionAPI/dataset** — vendored ESC results pinned to official release `2026.5`.

## [0.4.0] - 2026-07-04

Episode browser at `/episodes/`, replacing the year-composition insight; four encoding schemes, *Group* toggle.

### Added

- `/episodes/` — The browser of all top-20 episodes.
  - **Color schemes**: Country, Contest year, ESC winners, Fire.
  - **Group** toggle — cluster entries by active scheme.
- **Eurovision Top 20: Most Watched – June 2026**

### Changed

- **Site nav** — Videos | Songs | Episodes (Insights section removed).

## [0.3.2] - 2026-06-24

Year composition focus, search diacritics, manual-metadata cleanup, and data fixes.

### Added

- **Year composition click-to-focus** — on `/insights/year-composition/`, click ● to focus a contest year.

### Changed

- **Manual metadata** `flag` — derived from `country`.
- **Year color palette** — slot 17 → `#3949ab` to distinguish 2009 from 2017 on the year composition chart.
- Raw episode **2016-09** title corrected to match YouTube.
- **Molitva (2020 Europe Shine A Light)** — changed from **World** → **Serbia**.

### Fixed

- **Søren Torpegaard Lund fix** — fold ø/æ/œ/ß/ł etc. in full-text search so ASCII queries match (e.g. `soren` → `Søren`).

## [0.3.1] - 2026-06-22

Song roll-up fixes, duplicate-entry guards, and packaged data cleanup since 0.3.0.

### Added

- `evtop20 audit-song-keys` — report on near-duplicate `(artist, song)` pairs on latest packaged alltime video snapshot (markdown or JSON). See `[commands.md](docs/faq/commands.md)`.
- **Song-stats validation in** `package` — hard error when two song rows share the same `(year, country)` unless `esc_final_place` is `NON_ENTRY` or country is `World`.

### Changed

- **Song roll-up keys** — normalize `(artist, song)` before merge (casefold, apostrophe map, `&`/`and`, punctuation strip; duet artist order via `normalize_join_artist`). Display strings unchanged (canonical member). `song_key_normalize.py`; `song-hits` labels aligned with `song-meta`.
- **Title parse** — strip `(LIVE…)` performance suffixes from the song field after artist/song split (e.g. `Hey Mamma (LIVE feat. …)` → `Hey Mamma`).
- **Repackaged alltime song stats** — **218** song rows (226 before normalization; 222 after first pass; further merges from LIVE suffix parse, Malta/Serving manual metadata, and duet artist keys).

### Fixed

- **Song table YouTube links** after key normalization — site joins `song-meta` with the same normalized key as the pipeline (`songMetaLookupKey.ts`, including duet artist normalization).
- **Duplicate ESC entries in song roll-up** — merged split rows for Moldova 2017 Hey Mamma (LIVE suffix), Malta 2025 Serving/MESC (`manual-video-metadata.json`; dropped `esc-join-overrides` entry), Spain 2018 Amaia y Alfred / Alfred and Amaia (duet artist key).

## [0.3.0] - 2026-06-22

Insights year composition, stats search/sort URL persistence, and Chart Points explainer since 0.2.0.

### Added

- **Insights** — `/insights/` index; **Year composition** at `/insights/year-composition/` — 20-slot ● matrix per episode showing contest-year mix over time; hand-maintained `year-colors.json` + packaged `episode-year-composition.json`.
- **Per-slot year composition tooltips** — hover a ● for episode month + one `video_title`; missing or unparseable year → `Missing`; packaged v2 adds sorted `titles[]` per segment.
- **Full-text search** on `/` and `/songs/` — substring on video title or `artist — song`; case- and diacritic-insensitive; URL param `q` (debounced); AND with other filters.
- **URL-persisted table sort** — `sort` + `order` query params; shared column ids (`title` alias for video/song label column); survives navigation between `/` and `/songs/`.
- **Chart Points explainer** — `?` popover on the Chart Points column header (formula + link to `chart_points` [FAQ](docs/faq/chart_points.md)).

### Changed

- Year composition chart — pointer cursor on ●; labeled calendar-year gap separators; unified **Missing** legend for unfilled and unknown-year slots; wider chart layout.

## [0.2.0] - 2026-06-21

Filters, fire-themed songs, song YouTube links, and sort tie-breakers since 0.1.0.

### Added

- **Table filters** on `/` and `/songs/` — country (searchable combobox), year (select), ESC placement segment (All / Winners / Not winners / Non-entries), performance category toggles on videos only; AND across filters, OR within a filter; filter chips.
- **URL-persisted stats UI** — episode range + filters sync across `/` and `/songs/` via query params (`replaceState`, debounced range slider).
- **Fire songs filter** — manual `data/metadata/fire.json` allowlist → packaged `fire` boolean; 🔥 emoji toggle with URL param `fire=1`.
- **Song table YouTube links** — `song-meta.json` `youtube_watch_url` from highest alltime `chart_points` member; `/songs/` Song column links when present.
- Packaged `performance_category` on video rows — `final_live`, `national_final`, `official_video`, `special` from title parse (pattern rules or `manual-video-metadata.json`).

### Changed

- Default stats sort tie-breakers — after tier counts: `esc_final_place` ascending, contest year descending, then name (`sort_keys.py`, `queryWindow.ts`, `sort.ts`).
- **ESC Place** column moved after **Top 20** in the stats table.
- Replaced `performance_type` with `performance_category` (no granular type strings in packaged JSON).

### Removed

- `data/metadata/performance-category-overrides.json` and package-time category override loader; `performance_category` is set only at title parse.

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
- Virtual `World` country (`🌍`) for non-national ESC clips; five manual-metadata rows updated.
- Vendored ESC results include **2026** from [EurovisionAPI/dataset PR #1](https://github.com/EurovisionAPI/dataset/pull/1) (`release_tag` `2026.4+pr1` until upstream merge); `last_completed_contest_year` **2026**.
- Pipeline requires **Python 3.14** (`pipeline/.python-version`, CI test job on push/PR).
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

