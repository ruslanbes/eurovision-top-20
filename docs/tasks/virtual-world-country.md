# virtual-world-country

Virtual **`World`** country for non-national ESC videos (interval acts, full-show streams, multi-artist specials) that are not a single country's competing entry.

Parent: [`eurovision-final-place`](eurovision-final-place.md)  
Related: [`data/metadata/README.md`](../../data/metadata/README.md), [ADR-003](../adr/adr-003-data-layers.md)

**Status:** Done

## Problem

`NON_ENTRY` clips in `manual-video-metadata.json` used **host nation** as a stand-in (`Switzerland` for #eurodab, `Ukraine` for 2017 Grand Final live, etc.). That mislabels the Country column and could confuse future country-based filters.

## Decision

| Item | Choice |
|------|--------|
| Display name | `World` |
| Flag | `🌍` |
| Title-parse map | Yes — `title_parse/countries.py` `COUNTRY_TO_FLAG` |
| ESC vendor join map | **No** — omit from `esc_results/countries.py` `country_to_code()` |
| Assignment | Manual metadata (+ `esc-placement-overrides.json` for placement); not auto by `performance_type` |
| Join guard | `join.py` returns `null` early when `country == "World"` (no vendor lookup) |

EurovisionAPI televote `WLD` is unrelated; do not add `World` to vendored `entries.json`.

## Corpus rows (v1)

| `youtube_video_id` | Notes |
|--------------------|-------|
| `DGsL8hA-1rE` | #eurodab mashup (Basel 2025) |
| `ehH0_UXtQlY` | 2017 Grand Final live stream |
| `k5x086J5umo` | ESL Molitva performance |
| `R_xmJcg1iBU` | ESL Love Shine A Light group act |
| `M1cjEuT_uvg` | Switch Song interval (2019) |

## Done when

- [x] `World` / `🌍` in `title_parse/countries.py`
- [x] Five manual-metadata rows updated; `esc_final_place` unchanged via placement overrides
- [x] `join.py` skips vendor join for `World`
- [x] `data/metadata/README.md` documents virtual country
- [x] Repackaged snapshots show `country: "World"` on those rows; tests pass

## Out of scope

- Auto-assign `World` from `performance_type: Special`
- Site filter UX for World-only rows
- Adding `World` to EurovisionAPI vendor data
