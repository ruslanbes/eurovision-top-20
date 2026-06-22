# insight-year-composition-tooltips

**Year composition per-slot tooltips** — each ● shows episode month + one `video_title` on hover (not a multi-title list per segment).

Parent: shipped year composition page (`/insights/year-composition/`)  
Depends on: `data/raw/episodes/`, `evtop20.insights_composition`, [`insight-country-composition-bars.md`](insight-country-composition-bars.md) (removed; year composition is the live chart)  
Related: [`stats-inline-explainers.md`](stats-inline-explainers.md), [`insight-presence-heatmap.md`](insight-presence-heatmap.md), [ADR-003](../adr/adr-003-data-layers.md)

**Status:** Done

---

## Problem

Year composition tooltips today summarize **aggregates**:

```text
Jan 2025: 2025 8/20 contest year slots
Jan 2025: 3 missing slots
```

Users want **which video** a ● represents. The packaged composition file only stores `{ year, count }` per segment.

**Segment-level title lists are not viable:** a year band with count 7 would produce a 7-line tooltip — too large. Tooltips must be **per ●** (one slot, one title).

---

## Goal

On hover of a single **●** (one nominal Top 20 slot):

| Slot kind | Tooltip |
|-----------|---------|
| **Parsed contest year** (colored ●) | `formatPeriodLabel(period):` + newline + full `video_title` |
| **Missing** (unfilled gray ●) | `formatPeriodLabel(period):` + newline + `Missing` |
| **Unknown** (filled gray ●, year unparseable) | `formatPeriodLabel(period):` + newline + `Missing` |

Legend and copy use the single label **Missing** for both unfilled slots and the unknown-year bucket (same `--chart-missing` color; no separate “Unknown” legend entry).

**Interaction scope:**

| Hover target | v1 |
|--------------|-----|
| Single ● | ✓ tooltip |
| Whole year band (segment span) | ✗ no tooltip |

Slot order within a year band is **not** semantically meaningful on the chart; assignment of titles to ● positions within a band only needs to be **one-to-one** (each title appears on exactly one ● in that band).

---

## Data model analysis

### What exists today

| Source | Per-slot `video_title`? | Contest year per slot? | Site may read? |
|--------|-------------------------|------------------------|----------------|
| `data/raw/episodes/YYYY-MM.json` | ✓ (`entries[]`) | Via `parse_video_title` | ✗ |
| `data/processed/episode-index/YYYY-MM.json` | ✓ (sorted by title) | ✗ | ✗ |
| `data/packaged/insights/episode-year-composition.json` | ✗ | ✓ (`segments[].year`, `count`) | ✓ |

### Options considered

| Option | Description | Verdict |
|--------|-------------|---------|
| **A. `titles[]` on each segment** | Parallel to `count`; i-th ● in band uses `titles[i]` | **Approved** — minimal change to chart layout; segments stay for width/color |
| **B. Flat `slots[]` on episode** | Length 20; `{ year, video_title }` or `{ missing: true }` in render order | Deferred — larger refactor |
| **C. Sidecar keyed by `period\|index`** | Sparse lookup | ✗ |
| **D. Client parse / raw / episode-index** | Reconstruct in site | ✗ — ADR-003; no parser in site |

### Decision (approved)

**Option A** — extend `segments[]` with `titles: string[]` in `build_episode_year_composition()`. While counting per year, append each `video_title` to a list. Before emit, sort each list **ascending** (`localeCompare`, `"en"`). The chart maps the *i*-th ● in a year band to `titles[i]`.

- Duplicates allowed (same title twice → two entries in `titles`, two ● in band).
- **`Unknown` segment:** still emit `titles[]` in packaged JSON (pipeline fidelity); site tooltip body is always `Missing`, not the title string.
- **Unfilled `missing` band:** no `titles`; each gray ● tooltip = `Missing`.
- No reuse of `episode-index` as build input — raw episodes are already walked.

### Packaged shape (v2)

Bump `version` to `2`. Segment fields (alphabetical): `count`, `titles`, `year`.

```json
{
  "episodes": [
    {
      "filled": 20,
      "missing": 0,
      "period": "2025-03",
      "segments": [
        {
          "count": 2,
          "titles": [
            "Abor & Tynna - Baller | Germany 🇩🇪 | Official Music Video | #Eurovision2025",
            "KAJ - Bara Bada Bastu | Sweden 🇸🇪 | Official Music Video | #Eurovision2025"
          ],
          "year": "2025"
        }
      ]
    }
  ],
  "periods": ["2016-09", "…"],
  "slot_capacity": 20,
  "version": 2
}
```

| Field | Notes |
|-------|--------|
| `segments[].titles` | `len(titles) === count`; sorted ascending; index maps to ● index within band |
| `segments[].year` | `"Unknown"` when year parse fails; tooltip still shows `Missing` |
| `missing` on episode | Implied gray ● band; no `titles`; per-● tooltip = `Missing` |

---

## Pipeline

`evtop20.insights_composition.build_episode_year_composition`:

1. For each raw entry with non-empty `video_title`, resolve year (`year_for_entry`), append title to `titles_by_year[year]`.
2. Build segments (counts, year sort descending) as today.
3. Attach `sorted(titles)` to each segment (including `Unknown`).
4. Assert `len(titles) == count`; `sum(counts) + missing == slot_capacity`.

**Command:** `uv run evtop20 package` (unchanged).

**Tests:**

- `len(titles) == count` per segment
- Titles sorted ascending within segment
- Duplicate titles preserved
- Unknown bucket populated
- `version === 2`

---

## Site

### Types

`episodeComposition.ts`:

- `YearCompositionSegment`: add `titles: string[]`
- `CompositionSegment` / `CompositionBarSegment`: carry `titles?: string[]` through `yearEpisodesAsComposition` and `buildBarSegments`

### Tooltip UI

Per-slot content is **short**. Native `title` attribute is **acceptable for v1** (header + one line).

**Parsed year slot:**

```text
Jan 2025:
KAJ - Bara Bada Bastu | Sweden 🇸🇪 | …
```

**Missing or Unknown slot:**

```text
Jan 2025:
Missing
```

Shared helper e.g. `slotTooltipLabel(period, segment, index)` — returns formatted string.

### Chart component

`EpisodeCompositionChart` / `SegmentSlots`:

- Move hover/`title` from **outer segment span** to **each inner ● span**
- Parsed year: `titles[index]` as body
- `isMissing` or `country === Unknown`: body `Missing`
- Outer segment span: no tooltip

### Legend

Single muted entry: **Missing** (covers unfilled slots + unknown year bucket). Shipped in legend component; keep in sync.

### Loader

`data.ts` — same URL; richer segment objects.

---

## Tests

| Layer | Case |
|-------|------|
| Pipeline | `titles` length, sort order, duplicates |
| Site | `buildBarSegments` preserves `titles` on segments |
| Site | Tooltip: parsed year → period + title |
| Site | Tooltip: missing or unknown ● → period + `Missing` |
| Site | ● at index *i* uses `titles[i]` when parsed year |

---

## Done when

- [x] `episode-year-composition.json` v2 with `titles[]` per segment
- [x] Pipeline tests green
- [x] Each parsed-year ● shows period + one title
- [x] Each missing/unknown ● shows period + `Missing`
- [x] Legend label **Missing** only (no “Unknown” / “Missing or unknown”)
- [x] No segment-wide multi-title tooltip
- [x] Site unit tests updated; `npm run build` green
- [x] `site/README.md` notes v2 segment shape

---

## Out of scope (v1)

- Segment-level tooltip listing all titles in a band
- Showing `video_title` on unknown-year ● tooltips
- Rank order preserved in data or tooltip
- YouTube links in tooltip
- Flat `slots[]` episode shape (option B)
- Separate sidecar JSON
- Country composition (removed)

---

## Open questions

_None blocking v1._

Optional later:

- Flat `slots[]` if segments are removed from the chart model
- Truncate very long `video_title` in tooltip with ellipsis + full text on click
- Shared tooltip primitive with presence heatmap
