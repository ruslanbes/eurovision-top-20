# eurovision-final-place

Add **ESC final placement** (e.g. 1st, 2nd, NQ, DNQ) as a column on site table rows — joined from an external Eurovision results dataset, not derived from Top 20 tier counts.

Parent: `package`  
Depends on: `title_parse` / `package` (contest year + country/artist for join keys)  
Related: [ADR-000](../adr/adr-000-tech-stack.md), [ADR-003](../adr/adr-003-data-layers.md), [`data/README.md`](../../data/README.md), [`chart_points.md`](../faq/chart_points.md), [`video-insights.md`](video-insights.md)

**Status:** Backlog — spec only; no pipeline or site implementation yet.

---

## Problem

`chart_points` and tier columns measure **Eurovision YouTube channel** chart performance. They are unrelated to how a song placed in the ESC **Grand Final** (or semi-finals). See [`chart_points.md`](../faq/chart_points.md).

Beta scope (formerly `requirements.md`): enrich table rows with **final place** from a public Eurovision stats repository so users can compare channel popularity vs contest result.

---

## Data source (proposed)

| Source | Path | Notes |
|--------|------|-------|
| [spijkervet/eurovision-dataset](https://github.com/spijkervet/eurovision-dataset) | `contestants.csv` | Mentioned in ADR-000; pin version or vendor a snapshot under `data/external/` |

Vendoring a pinned CSV snapshot is preferred for reproducible `package` runs (no network fetch in CI).

---

## Layer

Per [ADR-003](../adr/adr-003-data-layers.md) / [`data/README.md`](../../data/README.md): **ESC final place lives in packaged**, not processed.

| Layer | `final_place` |
|-------|----------------|
| `processed/` | **No** — raw-derived tier stats only |
| `packaged/` | **Yes** — augmented table rows for the site |

Join runs in **`package`** (or a dedicated step it calls), after title metadata parse.

---

## Join sketch (v0)

1. Parse each video row → `contest_year`, `country` (and/or `artist`, `song`) via `title_parse` in `package`.
2. Match row to `contestants.csv` entry for that year.
3. Emit `esc_final_place` on packaged row (exact field name TBD).

**Open:** match key — country code vs name; artist fuzzy match; handle non-finalists (SF elimination, NQ).

Rows with no parse or no dataset match: `null` or omit field (TBD).

---

## Site

- Sortable column on per-video table (and per-song table when Beta ships).
- Distinct from `chart_points` — document in UI or column header.

---

## Out of scope

- Re-aggregating tier counts by final place
- Jury/televote breakdowns
- Semi-final-only placements unless dataset provides them clearly

---

## Done when

- [ ] Pinned external dataset (or documented fetch) under `data/external/`
- [ ] Join implemented in `package`; `esc_final_place` (or agreed name) on packaged table rows
- [ ] Tests: fixture rows match known contestants; unmatched rows handled
- [ ] Site column when a follow-on site task ships
