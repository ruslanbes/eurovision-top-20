# parse-performance-category

Emit `performance_category` directly from title parse. Remove the intermediate `performance_type` string from the pipeline entirely.

Parent: `drop-packaged-performance-type`  
Depends on: `performance-category` (four-bucket enum + pattern rules)  
Related: [`data/metadata/README.md`](../../data/metadata/README.md), [`performance-category.md`](performance-category.md)

**Status:** Done

---

## Problem

Title parse produces a granular `performance_type` string (e.g. `Grand Final (LIVE)`); package immediately maps it to `performance_category` and discards the string. The intermediate vocabulary is unused anywhere — extra step and mental overhead.

## Decision

- **`ParsedVideoTitle.performance_category`** — enum or `null`; no `performance_type` field
- **Pattern rules** — single module (`category_from_segment()`), called from extractors when reading title segments
- **`manual-video-metadata.json`** — `performance_category` enum instead of `performance_type`
- **Package** — passthrough parsed category; `performance-category-overrides.json` still wins on `youtube_video_id`
- **Parse completeness** — row may parse with `performance_category: null` (same as today when mapping fails); song roll-up still requires non-null category

## Out of scope

- Changing the four enum values or filter UI
- Processed-layer fields
- Merging `performance-category-overrides.json` into manual metadata

## Done when

- [x] No `performance_type` in codebase outside git history / task docs
- [x] Title parse + manual metadata emit `performance_category`
- [x] Package + site unchanged behavior on current corpus (334/334 categorized)
- [x] Tests green; `package` regenerated
