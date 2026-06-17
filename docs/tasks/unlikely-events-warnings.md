# unlikely-events-warnings

Structured pipeline warnings for **rare but valid** domain situations that should not block `package` but deserve explicit handling.

Parent: `generate-song-stats`  
Blocked by: `generate-song-stats` (song roll-up must exist first)

**Status:** Backlog — v1 uses **generic warning text** only.

---

## Problem

Some data conditions are unexpected in the normal Eurovision Top 20 corpus but possible in theory or after parser/manual-entry mistakes. Today `package` warns with free-form strings. We want a **warning taxonomy** so operators and tests can recognize specific cases.

**Canonical example:** same `(artist, song)` song key with **different `country` or `year`** across video rows in one snapshot (`song_stats.py`). Unlikely for a single contest entry; could indicate bad manual metadata or a returning act edge case.

---

## Goal

1. Define a small set of **warning codes** (e.g. `song_merge_country_mismatch`, `song_merge_year_mismatch`).
2. Emit structured warnings from `package` (shape TBD — e.g. `{ "code": "…", "message": "…", "context": { … } }` on stderr or a sidecar JSON).
3. Replace generic merge-conflict strings in song roll-up with coded warnings.

---

## v1 (generate-song-stats)

**Generic warning only** — human-readable line in CLI output, no codes yet. Example:

```text
Warning: song roll-up country mismatch for "Artist — Song" (Norway vs Sweden); using Norway
```

Same for `year`. Roll-up continues; exit 0.

---

## Done when (this task)

- [ ] Warning code enum / constants documented
- [ ] Song merge conflicts use coded warnings (country, year)
- [ ] Tests assert code + context payload
- [ ] Optional: `data/packaged/.warnings/` sidecar per run — **only if** we need machine-readable audit; otherwise stderr is enough

---

## Out of scope

- Failing `package` on unlikely events
- Site/UI surfacing of warnings
- Normalization to auto-resolve conflicts
