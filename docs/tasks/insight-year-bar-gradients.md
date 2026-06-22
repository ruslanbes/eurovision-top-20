# insight-year-bar-gradients

Smooth **color blending** between contest-year segments inside each episode row on the year composition chart. Replaces flat `<span>` fills with a continuous horizontal gradient per row while preserving **per-year tooltips**.

Parent: year composition (shipped — `/insights/year-composition/`)  
Depends on: [`episode-year-composition.json`](../../data/packaged/insights/episode-year-composition.json), [`year-colors.json`](../../data/metadata/year-colors.json), [`site-theming.md`](site-theming.md)  
Related: [`insight-presence-heatmap.md`](insight-presence-heatmap.md), [ADR-003](../adr/adr-003-data-layers.md), [ADR-002](../adr/adr-002-site-visualization.md)

**Status:** Cancelled (reverted to solid segment bars)

---

## Problem

Year composition rows are a **mosaic of solid rectangles** — one `<span>` per segment (`EpisodeCompositionChart`). Adjacent years read as hard cuts. The overall “multicolored rectangle” timeline looks good, but year-to-year boundaries feel mechanical.

Users want **smoother transitions** between year colors within a row so the strip reads more like a continuous spectrum while still knowing **which slice is which year** on hover.

---

## Goal

On `/insights/year-composition/`, each episode row renders as **one continuous horizontal gradient** across filled year segments. Segment **widths and order** unchanged (newest year leftmost; gray missing rightmost). **Tooltips** still identify the year (and slot count) for the hovered sub-range.

| Property | Value |
|----------|--------|
| **Scope** | Year composition page only (v1) |
| **Pipeline / packaged data** | No change |
| **Gradient** | Between adjacent **year** segment colors only |
| **Missing slots** | Hard edge at year ↔ gray boundary (v1) |
| **Unknown** | Uses `year-colors.json` entry; blends like any other year |

---

## Feasibility

**Yes — site-only change.** Packaged segments already provide ordered `{ year, count }` and `missing`; widths are `count / 20`.

Native `title` on a single gradient element cannot expose per-segment tooltips. **Two-layer row** solves it:

```
┌─ interaction layer (transparent hit targets, one per segment, title/tooltip) ─┐
├─ paint layer (one gradient: CSS linear-gradient or SVG linearGradient) ─────┤
└─────────────────────────────────────────────────────────────────────────────┘
```

| Approach | Paint | Tooltips | Verdict |
|----------|-------|----------|---------|
| **A. CSS `linear-gradient` + overlay divs** | One `div` with computed `background-image` stops | Sibling overlay `<span>`s, same widths as today | **Recommended v1** — no new deps; matches current layout |
| **B. SVG `<linearGradient>` + transparent `<rect>`** | One `<svg>` per row | `<rect fill="transparent">` + `<title>` or `title` on rects | Good alternative; sharper control over stop math |
| **C. Canvas** | `fillRect` + manual gradient | `mousemove` hit-test by cumulative width | Overkill at ~114 rows |
| **D. Gradient on each segment** (`linear-gradient` per span) | Each span fades to neighbor | Keep current structure | Weaker — double gradients at interior stops; seams possible |

**ADR-002:** Prefer CSS or inline SVG. No D3 / Plot required.

---

## Gradient semantics

### Stop placement

For one episode row, segments left → right (already packaged order: years desc, then missing appended in UI).

Let cumulative width fractions be \(s_0 = 0, s_1, \ldots, s_n = 1\) at segment boundaries (missing included as final segment if `missing > 0`).

**Hard boundary (not desired):** color jumps at each \(s_i\).

**Smooth boundary (v1):** at each internal boundary between year segments \(i\) and \(i+1\), blend across a small interval:

\[
\text{blendWidth} = \min(\text{BLEND\_CAP}, \frac{w_i + w_{i+1}}{2} \cdot \text{BLEND\_FRACTION})
\]

Stops (conceptually):

- hold color \(C_i\) from \(s_i\) to \(s_{i+1} - \text{blendWidth}/2\)
- linear ramp \(C_i \rightarrow C_{i+1}\) across \(\text{blendWidth}\)
- hold color \(C_{i+1}\) until next boundary

Constants to tune in implementation (not packaged):

| Constant | Starting point | Notes |
|----------|----------------|-------|
| `BLEND_FRACTION` | `0.35` | Share of the **smaller** adjacent segment used for blend |
| `BLEND_CAP` | `4%` of row width | Prevents 1-slot slivers from turning into pure neighbor color |
| `MIN_BLEND_PX` | `2` | Floor in pixels when row is wide |

### Missing / unknown edges

| Boundary | v1 behavior |
|----------|-------------|
| Year ↔ year | Smooth blend |
| Last year ↔ missing gray | **Hard** stop (no fade into gray) |
| Single segment row | Solid fill (no blend) |
| Adjacent segments, same hex | No visible blend (degenerate) |

### Dark mode

Gradient uses the same hex from `year-colors.json` in both themes. Revisit only if contrast fails on `--chart-missing` adjacency.

---

## Component design

### Split `EpisodeCompositionChart` concerns

| Piece | Responsibility |
|-------|----------------|
| `buildBarSegments` | Unchanged — widths, colors, order |
| **`buildRowGradientStops(segments)`** (new) | From segments + blend rules → CSS or SVG stop list |
| **`CompositionRow`** (new) | Paint layer + interaction layer |
| `EpisodeCompositionChart` | Stack rows in the bordered container (unchanged shell) |

Year page passes `gradientMode: "smooth"` (or use a dedicated `YearCompositionChart` wrapper to avoid scope creep on a future non-year chart).

### Tooltip retention

v1: keep native **`title`** on transparent overlay segments (same strings as today via `segmentLabel`).

Optional follow-up: Radix Tooltip for keyboard focus / mobile — not blocking.

Overlay requirements:

- `position: absolute; inset: 0` on interaction layer; paint layer behind
- Each hit target: `width: segment.widthPercent%`, `height: 100%`, `background: transparent`, `title={...}`
- `pointer-events: auto` on overlays only

### Accessibility

- Outer container keeps `role="img"` + summary `aria-label`
- Overlays: `aria-hidden="true"` (detail in tooltip only) **or** one `aria-label` per segment on focusable overlays — pick in implementation; document choice in PR

---

## Data model

**No packaged schema change.** Continue reading `episode-year-composition.json` + `year-colors.json`.

---

## Tests

| Layer | Case |
|-------|------|
| Unit | `buildRowGradientStops` — two equal segments → stops include blend band between colors |
| Unit | Single segment → one color, no ramp |
| Unit | Year + missing → hard stop before gray |
| Unit | Narrow segment (< blend cap) → blend width clamped |
| Site | Overlay count and widths match `buildBarSegments` |
| Site | Tooltip string unchanged for a fixture episode |

Visual check: `/insights/year-composition/` — no seams at row height; hover still shows `Jan 2024: 2023 4/20 contest year slots` (example).

---

## Out of scope (v1)

- Gradient across **episode row** boundaries (vertical blending between months)
- Animating gradient on data load
- Reintroducing country composition
- Packaging per-slot colors (slot-level grain would need new JSON)

---

## Done when

- [x] Each year-composition row uses a continuous horizontal gradient between year segment colors
- [x] Segment widths and order unchanged (newest year left; gray missing right)
- [x] Hover tooltips still identify year + count + episode month per sub-range
- [x] Missing segment: hard edge at year/gray boundary
- [x] Unit tests for stop builder; site tests green; `npm run build` green
- [x] No pipeline / packaged JSON changes

---

## Implementation notes

1. Add `buildRowGradientStops` in `episodeComposition.ts` (pure function, easy to test).
2. Refactor `CompositionRow` in `EpisodeCompositionChart.tsx` (or `YearCompositionRow.tsx`) to absolute paint + overlay layout.
3. Wire from `YearCompositionInsight` only.
4. Tune `BLEND_FRACTION` / `BLEND_CAP` by eye on real corpus; constants live in one file.

**CSS sketch:**

```css
background: linear-gradient(
  to right,
  #e6194b 0%,
  #e6194b 38%,
  #3cb44b 42%,
  #3cb44b 100%
);
```

**HTML sketch:**

```html
<div class="relative h-3 w-full">
  <div class="absolute inset-0" style="background: …gradient…" />
  <div class="absolute inset-0 flex">
    <span style="width: 40%" title="…2023…" />
    <span style="width: 60%" title="…2017…" />
  </div>
</div>
```
