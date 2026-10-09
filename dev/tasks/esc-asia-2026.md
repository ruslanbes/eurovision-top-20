# Eurovision Song Contest Asia 2026

- **Task ID:** `esc-asia-2026`
- **Status:** done
- **Parent / blocked by:** —

## Problem

September 2026 Top 20 includes a clip from **Eurovision Song Contest Asia 2026**, not the European ESC:

```text
CARMELLE - Sobra-Sobra | The Philippines 🇵🇭 | Eurovision Song Contest Asia 2026 | #EurovisionAsia
youtube_video_id: LZQg6YKsvJ8
(rank 5 in data/raw/episodes/2026-09.json)
```

The pipeline and site assume **European ESC** title shapes, country set, year tokens, and `esc_final_place` from EurovisionAPI. This entry already packages with **null** enrichment and will keep breaking filters, schemes, song roll-up, and ESC semantics until we decide how Asia fits.

## Goal (this task)

1. Map **what breaks** today (pipeline + site) with evidence.
2. Propose **integration options** (product + data model) so we can lock a direction before coding a full Asia feature set.

Implementation of the chosen option can be a follow-up or the same task after lock — v1 of this doc is analysis + options.

## Evidence (current corpus)

`parse_video_title(...)` → **`None`** for the Asia title.

Packaged video row (`data/packaged/per-video/alltime/…-latest.json`):

| Field | Value |
|-------|--------|
| `chart_points` / tiers | OK (from processed ranks) |
| `artist`, `song`, `country`, `flag`, `year`, `performance_category` | **`null`** |
| `metadata_extractor` | **`null`** |
| `esc_final_place` | **`null`** |

Same nulls in `query/video-meta.json` and episodes `browser.json` (rank 5, 2026-09).

### Why parse fails

| Check | Result |
|-------|--------|
| Country `Philippines` / `The Philippines` / 🇵🇭 | **Not** in `title_parse/countries.py` (only Asian-adjacent corpus country today: Australia) |
| Year from `Eurovision Song Contest Asia 2026` | **`extract_year` → None** — patterns expect `Eurovision [Song Contest] YYYY`, not `… Contest Asia YYYY`; `#EurovisionAsia` has no year |
| Pipe 4-segment shape | Segment 3 is contest branding, not a performance type (`Grand Final` / `Official Music Video` / …) |

So this is not a single missing alias — title grammar + country set + year regex all assume European ESC uploads.

## What breaks

### Pipeline

| Area | Effect |
|------|--------|
| `package` / title parse | Unparsed → empty metadata; counted in “unparsed titles” warning |
| Song roll-up | Unparsed videos **excluded** from song stats (`package` skips null `artist`) |
| ESC join | Never reached; even a forced parse of PH + 2026 would **not** match European vendor `esc-results` |
| `manual-video-metadata` / overrides | Possible escape hatch today, unused for this id |
| Validate / process | Rank counts still work (raw → processed independent of parse) |

### Site

| Surface | Effect |
|---------|--------|
| Videos table | Row shows title + chart points; country / year / place empty or `—`; sorts/filters on those fields miss or dump the row oddly |
| Songs table | Song **absent** (no roll-up member) |
| Country / year filters | Cannot select Philippines / 2026 Asia for this clip |
| Episodes schemes (country, year, ESC winner, …) | Null country/year/flag → missing / ungrouped styling; not a true “missing rank” slot |
| Insights | Any insight needing artist/song/country/year/ESC place ignores or mis-buckets the row |
| Search | Title string still searchable if haystack uses `video_title`; song-key search won’t |

### Product / docs assumptions

- FAQ `esc_final_place` = **European** Grand Final result.
- Country map = ESC entrants in this corpus.
- “Eurovision 20XX” in titles = European contest year.

Asia is a **sibling contest brand**, not `NON_ENTRY` entertainment filler and not a European GF entry.

## Open questions

Do not implement a full Asia product until these are locked.

| # | Topic | Status | Decision |
|---|--------|--------|----------|
| 1 | Product stance | locked | Asia is a **first-class contest**, not `NON_ENTRY` and not chart-only |
| 2 | Integration option | locked | **Option D, data + site** — `region` field in pipeline / packaged data, shown on Videos / Songs (see #8). Replaces the earlier “data layer only” decision |
| 3 | Identity fields | locked | **One new metadata field** on video and song rows: is the entry from the **Europe** or the **Asia** contest |
| 4 | `esc_final_place` | locked | **Reuse `esc_final_place`.** Skip the European results lookup for `asia` rows and set them to **`PENDING`** (existing “upcoming contest” code, shown as `Pending`) |
| 5 | Countries | locked | Add **Philippines 🇵🇭** to the title-parse flag map (`title_parse/countries.py`), with alias **“The Philippines”**. Add other Asian countries the same way as they appear. No prefix in the country display — the Region column covers it |
| 6 | Year | locked | Same `year` field for both regions; `region` disambiguates (follows from #11) |
| 7 | Scope v1 | locked | **Parse + model groundwork** for future Asia clips, based on the sample title. Expected pattern: `Artist - Song \| Country 🏳 \| Eurovision Song Contest Asia YYYY \| #EurovisionAsia`. Region `asia` is detected from the title |
| 8 | Site display / filters | locked | Videos and Songs tables: new **Region** column **before** the place column; place column header **“ESC Place” → “Contest Place”** (also the filter label); new **Region** filter **before** the place filter |
| 9 | Field name and values | locked | **`region: "europe" \| "asia"`** on packaged video rows, query meta, song rows, episodes browser entries. **Backfill:** every existing entry is `europe` (including `World` / `NON_ENTRY` clips and unparsed titles), except `LZQg6YKsvJ8` (CARMELLE, Philippines) = `asia` |
| 10 | Insights | locked | **Build-up rank:** add Region column. **Uncrowned:** add Region column. Both support both regions. **After May debut:** `europe` songs only for now |
| 11 | Song stats uniqueness | locked | Competing-entry check keyed by **(region, year, country)** instead of (year, country) |
| 12 | Build-up rank pool | locked | Rank a winner among entries of the **same region** only (same `region` + `year`). No effect today (CARMELLE first charted 2026-09, outside the 2026 pre-contest window) |
| 13 | Asia `performance_category` | locked | Detect from the title when a type segment is recognised (same markers as Europe). Otherwise default to **`national_final`**. The sample title has no type segment → `national_final` |
| 14 | Region detection | locked | Any title containing **`Eurovision Song Contest Asia`** or **`#EurovisionAsia`** (case-insensitive) → `region: "asia"`, whatever extractor matched and even if the title is unparsed. All other titles → `europe` |

## Options

### A. Chart-only / soft ignore (minimal)

Keep ranks in Top 20; leave metadata null or force `NON_ENTRY` + optional `World`-like handling via manual metadata.

- **Pros:** Tiny change; European ESC semantics unchanged.
- **Cons:** Ugly UI; no song page; Philippines invisible; lies if labeled `NON_ENTRY` (it *is* a contest entry).

### B. Manual metadata for this video only

Hand entry in `manual-video-metadata.json` (+ placement override): artist, song, country, flag, year, place code.

- **Pros:** Fast; unblocks 2026-09; no parser redesign.
- **Cons:** Doesn’t scale; year/country still collide with European 2026 filters unless we add a contest discriminator.

### C. Parse as “Europe-shaped” row (Philippines + year 2026)

Extend countries + year patterns + extractor so parse succeeds; `esc_final_place` stays `null` or a new code (`ASIA` / `ASIA_ENTRY`).

- **Pros:** Fixes table enrichment and song roll-up.
- **Cons:** Mixes Asia into European year/country filters and insights unless filters learn contest type; vendor join still empty.

### D. First-class `contest` (or `contest_series`) on packaged rows — **matches locked #1 / #3** (site part deferred per #8)

Add something like `contest: "esc" | "esc_asia"` (names TBD). Parse Asia titles into artist/song/country/year + contest. ESC Europe place join only when `esc`. Site: optional contest filter; Europe-default insights exclude Asia; episodes schemes can color by contest or country.

- **Pros:** Honest model; scales to more Asia clips; keeps European ESC FAQ true.
- **Cons:** Broader change (package schema, query meta, filters, docs, tests).

### E. Parallel Asia stats grain / page

Separate Songs/Videos Asia views.

- **Pros:** Clean separation.
- **Cons:** Heavy for one clip; overkill until Asia volume grows.

### Lean (for discussion)

| Horizon | Suggestion |
|---------|------------|
| Immediate data quality | **B** or **C** so 2026-09 isn’t a null hole |
| Medium-term model | **D** if Asia will recur on the official Top 20 |
| Avoid | Treating Asia as European GF place, or silent `NON_ENTRY` without labeling |

## Implementation (draft)

Follows from the locked rows. Items marked *(choice)* still need a call.

### Pipeline

- `package` sets `region` on every video row from a title marker check, separate from the extractor chain (#14): `asia` if the title contains `Eurovision Song Contest Asia` or `#EurovisionAsia` (case-insensitive), else `europe`.
- New title extractor for the Asia pattern (#7): 4 pipe segments, segment 3 matches `Eurovision Song Contest Asia YYYY`. Yields artist, song, country, flag, year from that segment, and `performance_category` from `category_from_segment` on any type segment, falling back to `national_final` (#13). Register it before `pipe_four_segment_v1`.
- Year: extend the year patterns (or parse inside the extractor) so `Eurovision Song Contest Asia 2026` → 2026. Make sure the European pattern doesn't match Asia titles.
- *(choice)* Optional `region` field in `manual-video-metadata.json`, overriding the marker check, for Asia clips with no marker in the title.
- `asia` rows skip the European results lookup and get `esc_final_place: "PENDING"` (#4). Placement overrides still win, so a real Asia place can be set later without code changes.
- Song rows take `region` from their member videos. A song with videos from both regions is a validation error.
- Song stats competing-entry check keyed by (region, year, country) (#11).
- Add `region` to query meta and episodes browser entries.
- Add Philippines + “The Philippines” alias to `title_parse/countries.py` (#5). No European country code needed (`asia` skips the lookup).
- With the extractor + country, CARMELLE parses and appears in Songs (song roll-up needs non-null artist / song / country / flag / year / `performance_category`).
- Tests: extractor test with the sample title; region marker test (each marker alone, case variants, an unparsed Asia title → `asia`, a European title → `europe`); package test for region `asia` + `PENDING`; song stats uniqueness test with the same (year, country) in both regions.

### Site

- Videos and Songs tables: **Region** column before the place column, values `Europe` / `Asia`.
- Place column header and filter label: **ESC Place → Contest Place** (`StatsTable.tsx`, `filters/defs.ts`).
- **Region** filter (Europe / Asia) before the place filter; URL param e.g. `region=asia`.
- Build-up rank and Uncrowned tables: add a **Region** column. Winner lookup (`winnerVideosForYear`) must match on (region, year), not year alone, so an Asia winner and a European winner of the same year don't collide. Build-up rank ranks a winner only against entries with the same (region, year) (#12).
- After May debut: filter to `region === "europe"`.

### Docs

- `data/README.md`, `docs/faq/esc_final_place.md` (European lookup only for `europe`; `asia` = `PENDING` until results), FAQ/explainer copy if it says “ESC Place”.

## Non-goals (this analysis pass)

- Implementing the full chosen option (until OQs locked).
- Vendoring an Asia results dataset (unless option D/E explicitly needs places).
- Renaming the whole project away from European ESC framing.

## Done when

- [x] Breakage inventory reviewed (this doc or follow-up notes).
- [x] Integration options understood; open questions locked for v1 approach.
- [x] Follow-up implementation task created **or** this task expanded with locked implementation plan.
- [x] `BACKLOG.md` / `STATUS.md` updated.
- [x] Implemented (pipeline, site, docs, regenerated data). Manual `region` override in `manual-video-metadata.json` left out — title markers cover the locked case.

## Notes

- Sample title and id above; raw episode `data/raw/episodes/2026-09.json`.
- Year regex today: `Eurovision(?: Song Contest)?\s*(\d{4})` — fails on `Eurovision Song Contest Asia 2026`.
- Related: `pipeline/src/evtop20/title_parse/`, `package.py`, `docs/faq/esc_final_place.md`, `data/metadata/README.md`, episodes country/year schemes, stats ESC filters.
