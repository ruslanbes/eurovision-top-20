# song-key-normalization-audit

Measure how often the corpus would benefit from **song key normalization** before implementing any rules.

Parent: `generate-song-stats`  
Blocked by: `generate-song-stats` (done)

---

## Problem

Song roll-up groups by **case-insensitive** `(artist, song)` (`song_stats.py`). This audit measures remaining discrepancy (punctuation, aliases, country name variants, etc.).

We suspect some compositions appear under slightly different parse strings (accents, `&` vs `and`, dash variants, trailing whitespace). We need data on **how much** discrepancy exists before designing normalization.

---

## Goal

Produce a repeatable audit (script or `package` diagnostic mode) that reports:

1. Groups of video rows that merge under case-insensitive `(artist, song)` today.
2. **Near-duplicate** candidate pairs/clusters that share the same `year` + `country` but differ only in artist/song string shape (heuristic TBD — e.g. lowercased fold, strip punctuation).
3. Count and examples of **`year` / `country` conflicts** if we naïvely merged near-duplicates.

Output: markdown or JSON summary committed under `docs/` or printed by CLI — not a new production artifact.

---

## Done when

- Audit run on latest packaged alltime snapshot
- Summary lists candidate normalization buckets with counts
- Recommendation: proceed with exact keys only, or spec normalization rules in a follow-up task

---

## Out of scope

- Implementing normalization in song aggregation
- Changing `parse_video_title()` extractors
- Song stats row shape changes
