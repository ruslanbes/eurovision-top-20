# ADR-002: Site interactivity stack

- **Status:** Accepted
- **Date:** 2026-06-11
- **Related:** [ADR-000](adr-000-tech-stack.md), [`site/README.md`](../../site/README.md)

## Context

[ADR-000](adr-000-tech-stack.md) picks **Astro**, **TanStack Table**, and **GitHub Pages** for a static stats site. That covers sortable tables but not:

- animated rank changes when the user scrubs through months
- a timeline scrubber with play / pause
- an optional bar-chart-race timelapse view
- accessible tabs and sliders without building primitives from scratch

Corpus scale is small (dozens of episode-month snapshots, low hundreds of rows). Client-side fetch, animation, and lazy hydration are viable without a backend.

Implementation layout and data wiring live in [`site/README.md`](../../site/README.md) and [`data/README.md`](../../data/README.md) — not in this ADR.

## Decision

Use a **layered** front-end stack inside Astro **React islands**. One library per concern; no duplicate table implementations.

| Concern | Choice |
|---------|--------|
| Site shell | **Astro** (static) — already in ADR-000 |
| Island hydration | **`@astrojs/react`** + `client:visible` (or `client:load` if above the fold) |
| Sortable tables | **TanStack Table v8** — already in ADR-000 |
| Tabs, slider, switch, and other accessible controls | **Radix UI** — add `@radix-ui/react-*` packages as needed (e.g. `@radix-ui/react-slider`, `@radix-ui/react-switch`); style with Tailwind |
| Styling | **Tailwind CSS** — already in ADR-000 |
| Table rank motion between snapshots | **Motion** (`motion` package) |
| Bar-chart-race timelapse (Beta) | **RacingBars** |
| Non-animated summary charts (if needed) | **Observable Plot** |
| Escape hatch | **D3** only if RacingBars or Plot cannot express a required chart — not for table sorting or grid behaviour |

**Theming:** light and dark modes required; semantic CSS custom properties in [`theme.css`](../../site/src/styles/theme.css) mapped via Tailwind — see [`site/README.md`](../../site/README.md).

**Accessibility:** respect `prefers-reduced-motion` for layout animations.

## Alternatives considered

| Alternative | Why not (for now) |
|-------------|-------------------|
| Observable Plot for timelapse table motion | Re-renders on scrub; poor fit for ranked row transitions |
| D3 only | High cost for table + player + race in one codebase |
| @formkit/auto-animate on `<tbody>` | Unreliable for ranked row enter/leave |
| @dnd-kit + TanStack | Built for drag-reorder, not snapshot playback |
| Recharts / Nivo / Visx | No first-class bar-chart-race or rank-slide story |
| AG Grid / MUI Data Grid | Heavy; unused enterprise features |
| Observable Framework as whole site | Chart-first; ADR-000 rejected for this project |
| Flourish / Visme | SaaS; not git-native |
| Fixed hex colors in chart components | Breaks dark mode |

## Consequences

- TanStack owns grid behaviour; Motion owns rank transitions; RacingBars owns race timelapse — boundaries stay clear.
- Islands defer JS until the stats block is needed (`client:visible` by default).
- RacingBars adds non-trivial bundle weight — acceptable with lazy hydration.
- Feature structure, default sorts, and packaged JSON loading are task-owned and can evolve without revising this ADR.

## Follow-up

- [`site/README.md`](../../site/README.md) — site shell, stats explorer, theme tokens, CI publish
