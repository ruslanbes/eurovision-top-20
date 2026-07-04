# insight-presence-heatmap

**Matrix heatmap** on `/insights/` — episode presence over time for **country** or **contest year**. Complements the episode **entry** browser at **`/episodes/`**; either or both may ship.

Parent: empty Insights page (shipped scaffold)  
Depends on: `data/raw/episodes/`, title parser ([`title_parse/`](../../pipeline/src/evtop20/title_parse/) in `package`), [`site-theming.md`](site-theming.md)  
Related: [`video-insights.md`](video-insights.md#country-presence-heatmap), [`contest-season-waves.md`](contest-season-waves.md) §C, [ADR-003](../adr/adr-003-data-layers.md), [ADR-002](../adr/adr-002-site-visualization.md)

**Status:** Ready

---

## Problem

Stacked composition bars show **one episode’s national mix** at a glance. A different question is **long-horizon patterns**: when was Sweden consistently on the chart? Which months lit up for Ukraine? When did uploads from ESC 2024 peak across the whole timeline?

A **heatmap** (row entity × episode month, color = intensity) gives a compact overview of ~100+ months × dozens of rows — patterns like “May spikes”, “winner hangover”, or “always-on catalogue countries” read as horizontal bands and bright columns.

---

## Goal

On `/insights/`, one reusable **`PresenceHeatmap`** component, two tabs (or sub-pages):

| Mode | Rows | Question |
|------|------|----------|
| **Country** | Participating country K | When was country K on the chart? |
| **Contest year** | Contest edition C (parsed from title) | When did ESC C uploads dominate? |

Shared encoding:

| Axis | Value |
|------|--------|
| **Rows** | Country K or contest year C |
| **Columns** | Episode month `YYYY-MM` (only months with a raw episode file) |
| **Cell color** | Count from selected metric (see below) |
| **Scale** | Sequential: `--chart-seq-low` → `--chart-seq-high` ([`site-theming.md`](site-theming.md)) |

User can toggle metric:

| Metric | Definition | Default |
|--------|------------|---------|
| **Presence** | Distinct `video_title` with dimension K in top 20 in episode M | ✓ |
| **New entries** | Distinct K-videos whose **first appearance** in top 20 is M | |

**Important:** Heatmap counts **distinct videos** per cell, not entry occupancy. The episodes browser counts **entries** (same video at two ranks = 2). Document in UI subtitle so users are not confused.

---

## Viz semantics

### Presence

For each episode file `YYYY-MM.json`, for each non-empty `video_title` with rank ≤ 20:

1. Parse dimension value **K** (country or contest year C).
2. Add `video_title` to set `present[K][M]`.
3. Cell value = `|present[K][M]|`.

### New entries

Single forward pass in period order:

1. Track `first_seen[video_title]` = earliest episode month where title appears in top 20.
2. When processing episode M, if `first_seen[video_title] === M`, increment `new[K][M]` for that title’s K.

### Row inclusion

Include row K if `total_presence[K] > 0` where:

\[
\text{total\_presence}[K] = \sum_M \text{presence}[K, M]
\]

**Unknown** parse bucket: include row `"Unknown"` (do not drop unparseable titles).

### Row sort

1. `total_presence` **descending**
2. Tie-break: `label` ascending (`localeCompare`, `"en"`)

Top rows = most chart-active entities; scroll for long tail.

### Column order

Episode `periods` sorted ascending. **No gap-fill** for calendar months without an episode file — x-axis is the **episode timeline**, not a continuous calendar ([`contest-season-waves.md`](contest-season-waves.md)).

### Cell value 0

Rendered as lowest scale color (same as `--chart-seq-low`), not transparent — row visibility is continuous.

### Color scale

- **Sequential** magnitude scale shared across the whole matrix for the active metric.
- Scale domain: `[0, max_cell_value]` where max is global max over all visible cells (v1: full corpus).
- **Log scale:** out of scope v1 (many zeros); optional later if contrast is poor.

Light/dark: read CSS variables at runtime; do not hardcode hex in component.

### Layout

| Element | Sketch |
|---------|--------|
| Row label | Country name or `"ESC {C}"` / `C` |
| Column label | `formatPeriodLabel` every Nth month (e.g. every 6th) to avoid overlap |
| Cell size | Fixed square or 4:3 px (e.g. 8×8 min); matrix scrolls horizontally + vertically inside viewport |
| Legend | Horizontal gradient bar + “0” / max label |
| Metric toggle | Segmented control: **Presence** \| **New entries** |

### Interaction (v1)

- Hover cell → tooltip: row label, episode month, metric value, optional top 3 `video_title` strings that contributed (from packaged detail).
- Click row label → optional highlight row (nice-to-have).

---

## Country vs contest year

| | Country | Contest year |
|---|---------|--------------|
| **Parse field** | `country` from title_parse | Contest year C from title (same rules as [`contest-season-waves.md`](contest-season-waves.md)) |
| **Row label** | `Sweden` | `2024` or `ESC 2024` (pick one format; use `2024` in data) |
| **Typical pattern** | Horizontal bands for catalogue countries | Diagonal-ish “season” stripes around May C |

Same component, same JSON envelope, different packaged file + tab.

---

## Data model

Site reads **packaged** only (ADR-003).

### Packaged files

```text
data/packaged/insights/
  presence-heatmap-country.json
  presence-heatmap-year.json
```

Shared envelope:

```json
{
  "version": 1,
  "dimension": "country",
  "metric_keys": ["presence", "new_entries"],
  "periods": ["2019-01", "2019-02"],
  "max_presence": 12,
  "max_new_entries": 5,
  "rows": [
    {
      "key": "Sweden",
      "label": "Sweden",
      "peak_period": "2023-05",
      "total_presence": 240,
      "presence": [0, 2, 3],
      "new_entries": [0, 1, 0]
    }
  ]
}
```

| Field | Notes |
|-------|--------|
| `dimension` | `"country"` \| `"year"` |
| `periods` | Sorted `YYYY-MM`; defines column index for arrays |
| `rows[].key` | Stable id (country name or year integer as string) |
| `rows[].label` | Display |
| `rows[].presence` | `number[]`, length = `periods.length`, aligned by index |
| `rows[].new_entries` | same |
| `rows[].total_presence` | Sum of `presence`; row sort key |
| `rows[].peak_period` | Argmax of `presence`; optional UI badge |
| `max_*` | Global max for scale legend (precomputed) |

Fields alphabetically sorted within objects where order is not semantic (`rows` sorted by `total_presence` desc before emit).

### Optional cell detail (v1 nice-to-have)

Separate sparse file or embedded only on demand — defer full list to v2 if size matters:

```json
"cell_detail": {
  "Sweden|2023-05": ["Loreen - Tattoo (LIVE) | …", "…"]
}
```

Pipeline may cap at top 5 titles per cell for tooltip.

### Pipeline

Add to `evtop20 package` (can share walk with composition bars task):

1. Load raw episodes in period order.
2. Build `first_seen` map.
3. Accumulate presence + new per dimension.
4. Emit dense row arrays + max values.
5. Sort rows for output.

**Reuse:** same raw-episode walk as the `/episodes/` browser builder where possible; different aggregation (distinct titles vs entry counts).

---

## Site component

### `PresenceHeatmap`

`site/src/components/insights/PresenceHeatmap.tsx`

| Prop | Type |
|------|------|
| `data` | packaged envelope |
| `metric` | `"presence"` \| `"new_entries"` |
| `onMetricChange` | optional callback |

Implementation options (pick at build time):

1. **CSS grid** — div cells with `background-color` from interpolated CSS variables (lightweight, full theme control).
2. **Observable Plot** — `cell` mark ([ADR-002](../adr/adr-002-site-visualization.md)); verify dark mode + bundle size.

Recommendation: **CSS grid v1** — matrix size is modest (~50×120); avoids Plot scale theming friction.

### Insights page layout

`/insights/` sections:

- **Composition bars** (bars task) — optional sibling
- **Presence heatmap** — tabs **Country** \| **Contest year**

Or sub-routes `/insights/heatmap/` later if page grows.

---

## Comparison to composition bars

| | Composition bars | Presence heatmap |
|---|------------------|------------------|
| **Unit** | Entries (20 per episode) | Distinct videos |
| **Primary axis** | Episode (rows) | Entity (rows) |
| **Secondary axis** | Country share (segments) | Episode month (columns) |
| **Color** | Categorical per country | Sequential magnitude |
| **Best for** | “What was this month made of?” | “When was X hot?” |

---

## Tests

| Layer | Case |
|-------|------|
| Package | `first_seen` correct across two episodes |
| Package | Same video two ranks in one month → presence +1 (distinct) |
| Package | Row arrays align with `periods.length` |
| Package | `total_presence` matches sum of row vector |
| Site | Metric toggle swaps colors without reload |
| Site | Zero cells use seq-low |
| Site | Row order matches `total_presence` desc |

---

## Done when

- [ ] `presence-heatmap-country.json` + `presence-heatmap-year.json` emitted by `package`
- [ ] `PresenceHeatmap` on `/insights/` with Country and Contest year modes
- [ ] Presence / New entries toggle
- [ ] Sequential scale uses theme tokens; readable in light and dark
- [ ] Tooltips on hover
- [ ] Pipeline + site tests green; `npm run build` green
- [ ] `site/README.md` documents heatmap artifacts

---

## Out of scope (v1)

- Rank-weighted cells (`chart_points` sum per cell)
- Brush / zoom / episode range filter
- Calendar-month gap columns (only episode months)
- Song grain
- Side-by-side heatmap + bars linked selection
- Log color scale

---

## Open questions

_None blocking v1._

Optional later:

- Filter rows (e.g. top 20 countries by `total_presence`)
- Column clustering (reorder months for season alignment like contest-season-waves §B)
- Share row color accents with composition charts where useful (heatmap cells stay sequential)
