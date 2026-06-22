# insight-country-composition-bars

First **Insights** viz: per-episode **stacked composition bar** — share of Top 20 slots by country. Reusable component; **year** (contest edition) is the next dimension with the same bar logic.

Parent: empty Insights page (shipped scaffold)  
Depends on: `data/raw/episodes/`, title parser country ([`title_parse/`](../../pipeline/src/evtop20/title_parse/) in `package`), [`site-theming.md`](site-theming.md)  
Related: [`video-insights.md`](video-insights.md#country-presence-heatmap) (matrix heatmap — [`insight-presence-heatmap.md`](insight-presence-heatmap.md)), [`contest-season-waves.md`](contest-season-waves.md), [ADR-003](../adr/adr-003-data-layers.md), [ADR-002](../adr/adr-002-site-visualization.md)

**Status:** Ready

---

## Problem

The stats tables show **who** is on the chart in a chosen window, but not **how the national mix of the Top 20 evolved episode by episode**. Editors and fans want a compact timeline: for each monthly episode, what fraction of the 20 slots belonged to Sweden, Ukraine, Italy, etc.?

The [`country-presence-heatmap`](video-insights.md#country-presence-heatmap) matrix design is specified in [`insight-presence-heatmap.md`](insight-presence-heatmap.md). **v1 bars** use horizontal stacked bars per episode — a complementary view (slot mix vs entity×time patterns).

---

## Goal

On `/insights/`, show a scrollable chart:

| Property | Value |
|----------|--------|
| **Rows** | One per episode month (`YYYY-MM`), oldest → newest (top → bottom) |
| **Bar** | Fixed pixel width per row; full width = **20 nominal slots** |
| **Segments** | Continuous horizontal bar; each color = one country’s slot count in that episode |
| **Segment width** | `count / 20` of bar width (not `count / sum(filled)`) |
| **Missing slots** | Gray segment, always **rightmost** |
| **Segment order** | Countries sorted **ascending by display name** (e.g. Albania leftmost); gray last |
| **Colors** | Stable per country across all episodes and pages |

Follow-up (separate task): same component with **contest year C** instead of country — rows unchanged, color map keyed by year.

---

## Viz semantics

### Fixed denominator (20 slots)

Every episode bar represents **20 nominal Top 20 positions**, even when the raw episode lists fewer than 20 filled entries (legacy / incomplete months).

\[
\text{filled} = \#\{ \text{entries with non-empty } \texttt{video\_title} \}
\]
\[
\text{missing} = 20 - \text{filled}
\]

**Example:** 10 filled entries, all from Sweden → Sweden segment = \(10/20 = 50\%\) of bar width; gray **missing** = remaining 50%. (Proportional to **slot capacity**, not to filled count only.)

Modern episodes with 20 filled entries and 15 countries: each country segment = `count_k / 20`; segments sum to 1.0 when every slot has a parsed country (see unknown bucket below).

### Per-episode country counts

For episode month `M`, walk `entries` in `data/raw/episodes/YYYY-MM.json` (ranks 1–20):

1. Skip empty `video_title` slots (do not count toward country; they increase `missing`).
2. Parse **country K** from title (same rules as packaged video meta / [`title_parse/`](../../pipeline/src/evtop20/title_parse/)).
3. Increment `count[M][K]`.

**Grain:** one slot = one row in the episode list (same video in two ranks counts twice).

### Segment ordering within a bar

Sort country keys **ascending by `label`** (Unicode `localeCompare`, `"en"`).

- Albania before Sweden before Ukraine.
- Order is **independent of segment width** — narrow countries still appear in alphabetical position (may be hard to see when count = 1; hover/tooltip required).
- **`missing`** segment: no label in sort key; always appended **after** all country segments.
- **`unknown`** (unparsed country): treat as a normal segment with label `"Unknown"`, sorted among countries by `"Unknown"` (before countries starting with V…). Not gray — gray is **only** unfilled slots.

### Row label

Episode month formatted like stats UI (`Jan 2023` via existing `formatPeriodLabel`).

### Interaction (v1)

- Hover segment → tooltip: country, count, share (`count/20`), episode month.
- Optional: click country → highlight that country’s segments across all rows (nice-to-have; not blocking v1).

### Layout

- Chart area: fixed bar width (e.g. `min(100%, 48rem)`), constant row height (~8–12px bar + label).
- Y-axis: episode labels; X-axis: implicit 0–100% (no numeric ticks required v1).
- Legend: scrollable country list with color swatch (only countries that appear in corpus).

---

## Color scheme

Each country **K** must map to a **stable** display color for the life of the site.

### Options considered

| Approach | Pros | Cons |
|----------|------|------|
| **A. Manual curated map** | Best contrast control; flag-recognizable choices | Maintenance when new countries appear; ~50+ entries |
| **B. Flag-averaged color (precomputed file)** | Feels “on brand” per country; stable once generated | Needs flag source + pipeline step; averages can be muddy/similar |
| **C. Hash of country name → HSL** | Zero maintenance; deterministic | Collisions and ugly neighbors; not flag-intuitive |

### Decision (v1)

**B + overrides:** generate `data/packaged/insights/country-colors.json` at `package` time:

1. For each distinct country in corpus, derive a base color from **flag emoji** in title_parse / flag lookup (dominant or averaged RGB → sRGB hex).
2. Apply **manual overrides** in `data/metadata/country-color-overrides.json` for pairs that collide or fail WCAG contrast on `--color-surface`.
3. Ship hex in packaged JSON; site does not compute colors at runtime.

**Fallback** when no flag: hash-based hue (option C) for that country only.

**`missing`:** fixed theme token — `gray` using `--chart-grid` or dedicated `--chart-missing` in [`site-theming.md`](site-theming.md) (light + dark).

**`unknown`:** fixed neutral (e.g. `--chart-cat-5` muted) — distinct from missing gray.

Year follow-up: separate `year-colors.json` with same override pattern; contest years 1956–2026 need distinguishable hues (hash on year integer acceptable for year dimension).

---

## Data model

Per ADR-003: **design packaged artifact before UI**. Site reads packaged only.

### Packaged files

```text
data/packaged/insights/
  country-colors.json          # stable K → hex (+ label)
  episode-country-composition.json
```

### `country-colors.json`

```json
{
  "version": 1,
  "colors": {
    "Albania": { "hex": "#e41b17", "source": "flag" },
    "Sweden": { "hex": "#006aa7", "source": "override" }
  }
}
```

Fields alphabetically sorted in file.

### `episode-country-composition.json`

```json
{
  "version": 1,
  "slot_capacity": 20,
  "periods": ["2019-01", "2019-02"],
  "episodes": [
    {
      "period": "2019-01",
      "filled": 20,
      "missing": 0,
      "segments": [
        { "country": "Albania", "count": 1 },
        { "country": "Sweden", "count": 4 }
      ]
    }
  ]
}
```

| Field | Type | Notes |
|-------|------|-------|
| `slot_capacity` | `20` | Constant v1; bar denominator |
| `periods` | `string[]` | Sorted ascending; episode months present |
| `episodes[].period` | `YYYY-MM` | |
| `episodes[].filled` | int | Non-empty titles |
| `episodes[].missing` | int | `slot_capacity - filled` |
| `episodes[].segments` | array | Sorted by country name ascending; excludes missing |
| `segments[].country` | string | Canonical country label from parser |
| `segments[].count` | int | Slots in this episode |

**Validation:** `sum(segments[].count) + missing === slot_capacity`; `sum(segments[].count) + unknown_slots === filled` when unknown is a named segment.

### Pipeline

New `package` step (or subcommand):

1. Load all raw episodes in period order.
2. Parse country per entry; aggregate counts per episode.
3. Build `episode-country-composition.json`.
4. Build / refresh `country-colors.json` + apply overrides.

CLI tests: golden episode fixture → expected segments; missing slots; unknown title.

---

## Site component

### Reusable: `EpisodeCompositionChart`

Location: `site/src/components/insights/EpisodeCompositionChart.tsx`

| Prop | Type | Notes |
|------|------|-------|
| `episodes` | packaged episode array | |
| `colorMap` | `Record<string, string>` | hex per key |
| `dimensionLabel` | string | `"Country"` or `"Contest year"` |
| `missingColor` | string | theme token resolved to CSS color |
| `unknownColor` | string | optional |

Renders SVG or div-based stacked bars (no chart library required v1; D3/Plot only if needed). Accessible: each segment `role="img"` + `aria-label` or keyboard-focusable tooltip trigger.

### Page: Country composition (v1)

`site/src/pages/insights/index.astro` → `CountryCompositionInsight` island:

- Fetch `episode-country-composition.json` + `country-colors.json` at build copy (same as `copy-packaged.mjs` pattern).
- Legend beside or below chart.

### Year reuse (follow-up task)

Same `EpisodeCompositionChart`; packaged `episode-year-composition.json`; `year-colors.json`; contest year C from title parser instead of country. Insights page tab or section toggle **Country | Contest year**.

---

## Fit with existing docs

| Doc | Relationship |
|-----|----------------|
| `video-insights.md` § country-presence-heatmap | Matrix heatmap deferred; link to this task as v1 country insight |
| `contest-season-waves.md` § C | Year matrix heatmap deferred; year **bars** share this component |
| `site-theming.md` | `--chart-missing`, legend text tokens, contrast check for country colors |

---

## Tests

| Layer | Case |
|-------|------|
| Package | 20 filled, 5 countries → segment counts sum to 20 |
| Package | 10 filled → `missing: 10`, one gray segment worth 50% width |
| Package | Unparsed title → `unknown` segment, not missing |
| Package | Segments sorted A→Z by country |
| Package | Colors stable across two package runs |
| Site | Bar widths proportional to `count/20` |
| Site | Gray segment rightmost |
| Site | Legend lists all countries from color map |

---

## Done when

- [ ] Packaged `episode-country-composition.json` + `country-colors.json` generated by `evtop20 package`
- [ ] `country-color-overrides.json` metadata path documented
- [ ] `EpisodeCompositionChart` renders on `/insights/` with real data
- [ ] Segment order: countries A→Z, gray missing rightmost
- [ ] Colors stable per country; missing = gray
- [ ] Pipeline + site tests green; `npm run build` green
- [ ] `site/README.md` notes Insights data paths

---

## Out of scope (v1)

- Classic country × month **heatmap** matrix
- Rank-weighted segments (by `chart_points` or inverse rank)
- Side-by-side video vs song grain
- Brush / zoom / episode range filter (use full corpus)
- Animated playback scrubber

---

## Open questions

_None blocking v1._

Optional later:

- Minimum segment width (1px) so single-slot countries remain visible
- Merge micro-countries into `"Other"` bucket
- Dual citizenship / artist vs participating country
