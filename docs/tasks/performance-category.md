# performance-category

Canonical **performance category** for video rows — four user-facing buckets derived at **package** time from parsed `performance_type` (pattern rules) plus optional per-video overrides. Replaces the interim stats-table filter that multi-selects raw `performance_type` strings (~15 distinct values).

Parent: `stats-table-filters`  
Depends on: title parse (`performance_type` on packaged rows), `evtop20 package`  
Related: `[data/metadata/README.md](../../data/metadata/README.md)`, [ADR-003](../adr/adr-003-data-layers.md), `[stats-table-filters.md](stats-table-filters.md)`

**Status:** Done

---

## Problem

Users filter videos by **kind of performance**, not by the exact string title parsers emit. Raw `performance_type` mixes stage (Grand Final, First Semi-Final), format (Official Music Video), and editorial labels (Winner of Eurovision, LIVE at the Eurovision Song Contest) — too granular and inconsistent for a filter.

**What people care about:**


| Category           | Meaning                                                                                             | Always live?                           |
| ------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Final (live)**   | Semi-finals and grand final ESC performances                                                        | Yes — even when the title omits “LIVE” |
| **National final** | NF selections (Sanremo, Melodifestivalen, Melfest-style titles, …)                                  | Yes                                    |
| **Official video** | MV, lyric video, preview, studio/arena promo clips                                                  | Mostly non-live                        |
| **Special**        | Interval acts, multi-artist specials, non-entry show clips (`performance_type === "Special"` today) | No                                     |


The site filter should expose **four stable options**, not ~15 raw parser strings.

---

## Scope


| In scope                                         | Out of scope                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| New packaged field on **video** rows             | Song-grain category (songs can have mixed video types)               |
| Pattern rules in pipeline (`package`)            | Changing title-parse extractors or raw `performance_type` vocabulary |
| Manual override file for edge cases              | Client-side inference from title                                     |
| `video-meta.json` + `per-video/alltime` rows     | Processed-layer fields                                               |
| Update video stats-table filter to use new field | Renaming or removing raw `performance_type` from packaged output     |


Raw `performance_type` is used **at package time only** (title parse → category rules); it is **not** written to packaged JSON ([`drop-packaged-performance-type.md`](drop-packaged-performance-type.md)).

---

## Packaged field


| Property       | Value                                                            |
| -------------- | ---------------------------------------------------------------- |
| **Field name** | `performance_category`                                           |
| **Type**       | enum string or `null` when `performance_type` is null            |
| **Emitted on** | `packaged/per-video/alltime/`*, `packaged/query/video-meta.json` |
| **Not on**     | `song-meta.json`, processed snapshots                            |


### Enum values (machine) → UI labels

Alphabetical storage in code; display order in filter can differ.


| `performance_category` | Filter label   |
| ---------------------- | -------------- |
| `final_live`           | Final (live)   |
| `national_final`       | National final |
| `official_video`       | Official video |
| `special`              | Special        |


---

## Derivation (package only)

```text
parse_video_title → performance_type (unchanged)
       ↓
manual override? (youtube_video_id) → performance_category
       ↓ else
pattern rules on performance_type (+ optional title hints) → performance_category
       ↓
null if performance_type is null
```

**Order:** overrides win over patterns (same precedence model as `esc-placement-overrides` before vendor join).

Wire in `augment_stats_row` (or a sibling helper called from it) after title parse and ESC join — analogous to how `esc_final_place` is attached, but category logic is independent of ESC.

Add `performance_category` to `VIDEO_META_FIELDS` in `query_index.py`.

---

## Pattern rules (v1)

Rules match on **normalized** `performance_type` (case-insensitive; strip redundant `(LIVE)` suffix for matching only — do not rewrite stored `performance_type`).

Apply **first match wins** in this priority order:

1. `**special`** — exact `Special`
2. `**national_final**` — contains `national final`, or known NF markers (`sanremo`, `melfest`, `melodifestivalen`, … — keep list in code, extend as corpus grows)
3. `**final_live**` — any of:
  - `grand final`, `semi-final`, `semi final`
  - `winner of eurovision`
  - `live at the eurovision song contest`
  - `first semi-final`, `second semi-final`
4. `**official_video**` — any of:
  - `official music video`, `official video`, `official lyric video`, `official preview video`
  - `music video`
  - `performance in arena` (arena promo / studio-style clips — see Diodato example)
   - `showcase performance` → `official_video`
5. **Fallback** — `null` + package warning listing `youtube_video_id`, `video_title`, `performance_type` for triage

### Seed examples (should resolve via patterns, not overrides)


| Title (abbrev.)                                               | Parsed `performance_type` today              | Expected category |
| ------------------------------------------------------------- | -------------------------------------------- | ----------------- |
| Ilinca … Yodel It! … LIVE at the 2017 Eurovision Song Contest | `LIVE at the Eurovision Song Contest (LIVE)` | `final_live`      |
| Diodato … Performance in Arena di Verona … Eurovision 2020    | `Performance in Arena di Verona`             | `official_video`  |
| Sertab … Winner of Eurovision 2003                            | `Winner of Eurovision`                       | `final_live`      |
| Nemo … The Code (LIVE) … Winner of Eurovision 2024            | `Winner of Eurovision (LIVE)`                | `final_live`      |


---

## Manual mapping file — reuse or new?

### Recommendation: **new file**, do not extend existing mappings


| File                           | Role today                                                                                                    | Why not reuse for category                                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `manual-video-metadata.json`   | Title-parse **lookup_table_v1** — full row override (`artist`, `song`, `country`, `performance_type`, `year`) | Runs at **parse** time, not package-only; every entry requires the full metadata shape; `performance_type` there fixes the **parser string**, not the four-bucket filter |
| `esc-placement-overrides.json` | `youtube_video_id` → `esc_final_place`                                                                        | Unrelated domain                                                                                                                                                         |
| `esc-join-overrides.json`      | Edition join when vendor match fails                                                                          | Unrelated domain                                                                                                                                                         |


Follow the **ESC override split**: package-only concern → dedicated small JSON keyed by `youtube_video_id`.

### New file: `data/metadata/performance-category-overrides.json`

```json
{
  "schema_version": 1,
  "entries": [
    {
      "youtube_video_id": "abc123",
      "performance_category": "final_live",
      "video_title": "…",
      "notes": "why pattern rules miss this"
    }
  ]
}
```


| Field                  | Required | Notes                          |
| ---------------------- | -------- | ------------------------------ |
| `youtube_video_id`     | yes      | Lookup key                     |
| `performance_category` | yes      | One of the four enum values    |
| `video_title`          | no       | Human context when editing     |
| `notes`                | no       | Not emitted to packaged output |


**Format rules** (same as other metadata files): sort `entries` by `youtube_video_id`; one row per ID; duplicates are a load error.

**When to add an override vs fix parse:**

1. If the wrong **bucket** comes from a systematic parser string → add/adjust a **pattern rule** first.
2. If `performance_type` is wrong but would map correctly once fixed → prefer `manual-video-metadata.json` (parse fix).
3. If `performance_type` is correct-ish but bucket should differ → `performance-category-overrides.json`.
4. Keep overrides small; remove when a pattern rule subsumes the row.

---

## Site follow-up (same task)

Replace interim filter in `site/src/components/stats/filters/defs.ts`:


| Before                                                      | After                                           |
| ----------------------------------------------------------- | ----------------------------------------------- |
| `id: "performance_type"`, options from distinct raw strings | `id: "performance_category"`, four fixed labels |
| `row.performance_type`                                      | `row.performance_category`                      |


Update `VideoFilterableRow` in `types.ts`, `queryWindow.ts` passthrough, filter tests. Filter stays **video grain only**.

Option labels use the human table above; values are enum strings.

---

## Tests


| Layer                                         | What                                                                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pipeline/tests/test_performance_category.py` | Pattern table (parametrize known `performance_type` → category); override precedence; seed examples by title/id; null when `performance_type` null |
| Golden / package smoke                        | After `uv run evtop20 package`, spot-check `video-meta.json` counts: expect ~4 distinct non-null categories (+ nulls)                              |
| `site/.../applyFilters.test.ts`               | Filter on `performance_category`                                                                                                                   |


---

## Documentation updates (implementation)

- `data/metadata/README.md` — document new file
- `data/README.md` — mention `performance_category` on video meta
- Optional one-liner in `site/README.md` or stats FAQ

---

## Open questions


| Topic                                           | Default if unanswered                           |
| ----------------------------------------------- | ----------------------------------------------- |
| `Showcase Performance` (3 rows)                 | `official_video` until overridden               |
| Package warning on unmatched `performance_type` | Warn in `package` summary; do not fail build    |
| Promote enum to ADR                             | Defer until a second packaged enum filter ships |


---

## Done when

- [x] `performance_category` on latest `per-video/alltime` and `video-meta.json` rows
- [x] Pattern rules cover seed examples without overrides
- [x] `performance-category-overrides.json` scaffolded (can start empty)
- [x] Pipeline tests green; `uv run evtop20 package` succeeds
- [x] Video stats filter uses `performance_category` (four options); `npm test` + build green
- [x] Metadata README updated

## Out of scope

- Changing title-parse `performance_type` strings
- Song-table performance filter
- URL-persisted filter state

