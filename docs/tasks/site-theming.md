# site-theming

Light / dark theme for the static site — tokens, toggle, and **theme-aware chart colors**. Policy: light + dark required; semantic tokens only ([ADR-002](../adr/adr-002-site-visualization.md)).

Parent: site (shipped Slice 1)  
Depends on: site shell exists (`site/`)  
Related: [`site/README.md`](../../site/README.md)

**Status:** Draft — **Slice 1 uses minimal theming** (system `prefers-color-scheme` + Tailwind `dark:` only). Full tokens + toggle: Slice 5 / this task.

---

## Problem

Tables, heatmaps, stacked season charts, and highlights must remain readable in **light and dark** mode. Hardcoded chart colors will fail in one mode.

---

## Requirements

| Requirement | Notes |
|-------------|-------|
| Light + dark | Both fully supported |
| System default | `prefers-color-scheme` on first load |
| User override | Toggle; persist choice (`localStorage`) |
| Viz-aware | Heatmaps, categorical stacks, badges use theme palettes |
| No magic hex in components | Consume semantic tokens only |

---

## Architecture (sketch)

```text
<html class="dark?">           ← class or data-theme on root
  CSS variables (:root / .dark)  ← --surface, --chart-cat-1, --chart-seq-low, …
  Tailwind dark: variants        ← layout, table chrome
  React useTheme() (optional)    ← islands read mode for RacingBars / Plot opts
```

### Token groups

**UI tokens**

| Token | Use |
|-------|-----|
| `--color-surface` | Page / card background |
| `--color-surface-elevated` | Table, panel |
| `--color-text` | Primary text |
| `--color-text-muted` | Secondary labels |
| `--color-border` | Dividers, table lines |
| `--color-accent` | Links, active tab, focus |

**Viz tokens**

| Token | Use |
|-------|-----|
| `--chart-cat-1` … `--chart-cat-N` | Contest-year stacks, legend series (categorical) |
| `--chart-seq-low` / `--chart-seq-high` | Heatmap gradient ends (sequential) |
| `--chart-grid` | Axis / grid lines |
| `--chart-highlight` | Timeline scrubber emphasis, row highlight by year |

Define **paired values** for light and dark under `:root` and `.dark` (or `[data-theme="dark"]`).

### Theme resolution order

1. `localStorage` user choice (if set)
2. Else `prefers-color-scheme: dark`
3. Apply class on `<html>` before paint if possible (inline script in layout — avoids flash)

### Toggle

- Control in site header (sun/moon or similar)
- Updates `localStorage`, toggles root class, dispatches event so mounted islands can refresh chart options if needed

---

## Chart integration (sketch)

| Viz | Approach |
|-----|----------|
| **TanStack table** | Tailwind `dark:` on cells, headers; tier badges use `--color-text-muted` |
| **Heatmap** (season waves C) | Sequential scale: interpolate `--chart-seq-low` → `--chart-seq-high`; legend labels use `--color-text` |
| **Stacked area** (season river) | One `--chart-cat-*` per contest year; limit N or cycle palette |
| **RacingBars** | Pass theme-derived color array into library options |
| **Observable Plot** | Read CSS variables via `getComputedStyle` or precomputed theme object |
| **Motion highlights** | Opacity / border using UI tokens, not fixed gray |

**Rule:** adding a new colored viz → extend viz tokens or document reuse; no inline `#336699` in feature code.

---

## File layout (when implementing)

```text
site/src/
  styles/
    theme.css          # CSS variables light/dark
  lib/
    theme.ts           # read mode, subscribe, chart palette helpers
  components/
    ThemeToggle.tsx
```

Tailwind `tailwind.config` — map semantic colors to CSS variables if useful.

---

## Done when

- Root layout applies light/dark from system or saved preference
- **ThemeToggle** works and persists
- Stats table readable in both modes
- At least one **chart or heatmap** (or placeholder viz) uses categorical + sequential tokens correctly in both modes
- [`contest-season-waves.md`](contest-season-waves.md) (when built) imports shared palette — documented in that task
- No regression: `npm run build` succeeds

## Out of scope (v1)

- Per-user themes beyond light/dark
- High-contrast / forced-colors dedicated mode (optional later)
- Theming pipeline JSON or server-side
