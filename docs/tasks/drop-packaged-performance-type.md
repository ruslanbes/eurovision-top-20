# drop-packaged-performance-type

Remove `performance_type` from **packaged** video artifacts. Title parse and `performance_category` derivation still use the parsed string internally at package time — it is not written to JSON.

Parent: `performance-category`  
Related: [`performance-category.md`](performance-category.md), [`data/README.md`](../../data/README.md)

**Status:** Done

---

## Problem

Packaged rows carry both `performance_type` (raw parser string) and `performance_category` (four-bucket enum). The site and filters use only `performance_category`. Keeping both bloats JSON and confuses the packaged contract.

## Scope

| In scope | Out of scope |
|----------|--------------|
| Stop emitting `performance_type` on `per-video/alltime/*` and `video-meta.json` | Title-parse `performance_type` field |
| Remove from site TS types / `queryWindow` passthrough | `manual-video-metadata.json` |
| Song roll-up eligibility: `performance_category` instead of `performance_type` | Processed layer |
| Regenerate packaged data | Changing category rules |

## Implementation

In `augment_stats_row`: parse → ESC join → category lookup (reads in-memory `performance_type`) → **`pop("performance_type")`** before return.

## Done when

- [x] No `performance_type` key on packaged video rows after `package`
- [x] `performance_category` unchanged; song roll-up still works
- [x] Site build + pipeline tests green
- [x] Docs updated
