# contest-season-waves

Sketch how to model and **visualize “waves”** of Eurovision contest-year uploads on the Most Watched chart — the seasonal lifecycle from first teasers through the May peak to slow dissipation.

Parent: `scaffold-project` (site)  
Depends on: raw episodes, partial stats snapshots, contest-year parsing (TBD)  
Related: [ADR-002](../adr/adr-002-site-visualization.md) (stack), [`site/README.md`](../../site/README.md), [`video-insights.md`](video-insights.md) (April/May/legacy insights)

**Status:** Idea / sketch only — no pipeline or site implementation yet. Do later

---

## Problem

Each Eurovision **contest year** C (Grand Final ~May C) produces a **pulse** of new channel uploads that enter the monthly Top 20, dominate for a while, then fade — except for a few strong entries that linger.

We want to **see that pulse** on the site: not just a table of totals, but the **shape of a season over calendar time**.

Per-**video** grain for v1 (same `video_title` rows as today). Song roll-up may come later.

---

## Informal model (what we are trying to capture)

For contest year **C**, calendar time roughly follows this pattern:

| Phase | Typical months | What happens |
|-------|----------------|--------------|
| **Tease** | Dec **C−1** | First official uploads for ESC C start appearing on the chart |
| **Build** | Jan–Apr **C** | National finals, more official videos — steady influx |
| **Peak** | May **C** | Grand Final week — large flood (LIVE, winner, re-uploads) |
| **Dissipation** | Jun **C** → ~May **C+1** | Few or no new C-videos; chart share of year C shrinks |
| **Legacy tail** | From Jun **C+1** onward | Only the strongest C entries still show in top 20 (see [`video-insights.md`](video-insights.md#year-post-contest-legacy)) |

This is a **wave**: rise → crest → fall, with a long tail for hits.

```text
Chart presence (qualitative)

  ▲
  │         ╭── Peak (May C)
  │        ╱  ╲
  │      ╱     ╲___ Dissipation
  │   ╱ Tease      ╲___________ Legacy tail
  └──────────────────────────────────► time
    Dec C-1    Jan–Apr C    May C    Jun C …
```

Not every year looks identical (COVID years, missing episodes, etc.) — the viz should show **actual data**, not an idealized curve.

---

## Data we need (conceptual)

All derived from **`data/raw/episodes/`** (rank 1–20 per month) plus **contest year C** parsed from each `video_title`.

| Building block | Meaning |
|----------------|---------|
| **Contest year C** | Which ESC edition the upload belongs to (parse rule TBD) |
| **First seen** | Earliest episode month where this `video_title` appears in top 20 |
| **Presence in month M** | Video from year C appears in that month’s episode (any rank ≤ 20) |
| **Cohort in month M** | Count (or set) of distinct C-videos in top 20 that month |
| **New entries in month M** | C-videos whose **first seen** == M |

Optional later: rank-weighted presence (rank 1 counts more than rank 20) using existing tier weights / `chart_points`.

**Episode gaps:** only months with an episode exist — x-axis is **episode timeline**, not every calendar month.

---

## Metrics per contest year C (for charts)

Rough aggregates to drive visuals:

| Metric | Sketch |
|--------|--------|
| `presence_by_month` | For each episode month t: # of C-videos in top 20 |
| `new_by_month` | For each t: # of C-videos with first_seen == t |
| `peak_month` | Month with max `presence_by_month` (often May C) |
| `half_life` (optional) | First month after peak where presence ≤ 50% of peak |

Cross-year comparison: same metrics for C=2022, 2023, … overlaid or small multiples.

---

## Visualization ideas (site)

Pick one primary view for v1; others as tabs or follow-ups. Stack: [ADR-002](../adr/adr-002-site-visualization.md) (React island + optional Motion / Plot / RacingBars). Layout and controls: [`site/README.md`](../../site/README.md). **All chart colors** use theme viz tokens from [`site-theming.md`](site-theming.md) — heatmaps and stacks must work in light and dark.

### A. Season river (recommended sketch)

**Stacked area chart** — x = episode months, y = count of top-20 slots filled by each contest year C (stacked colors = C).

- Shows **how much of the chart** each edition owns over time.
- Peak May C reads as a **bulge** in that year’s band.
- Dissipation = band narrows after May C.
- **Interaction:** hover month → list top videos from selected C; brush to zoom one ESC season.

Good default: one glance answers “when did 2024 dominate?”

### B. Contest-year small multiples

One **mini chart per contest year C** (x = months from Dec C−1 to ~May C+1, y = presence count).

- Same wave shape, **aligned by season phase** rather than calendar.
- Compare whether 2023 had a sharper May spike than 2022.

### C. Heatmap

Rows = contest year C, columns = calendar month (or “months since tease”), color = `presence_by_month` or `new_by_month`.

- Compact overview of all years.
- Weak for exact video detail; strong for patterns (“May always hot”).
- **Country variant:** same layout with rows = country K — see [`video-insights.md`](video-insights.md#country-presence-heatmap) (Country insights).

### D. Hook into existing timeline player

Reuse **`PeriodControls`** from `site/` (`PeriodControls.tsx`): scrub months, table rows **highlight/fade** by contest year C (opacity or chip color).

- Wave felt through **motion**, not a separate chart.
- Complement A or B — not a replacement.

### E. New-entry sparklines

Per year C, sparkline of `new_by_month` only — emphasizes **inflow** (Dec tease, Jan–Apr build, May spike).

- Pairs well with A (inflow vs on-chart presence).

---

## Suggested v1 scope (when we implement)

1. **Pipeline (light):** emit `contest-season-waves.json` — array of `{ contest_year, months: [{ period, presence, new_entries, top_videos[] }] }` built from raw episodes.
2. **Site:** one **Season river** (A) + contest-year **selector** (focus one C or compare two).
3. **Parse contest year** once, shared with [`video-insights.md`](video-insights.md).

Defer: song grain, rank-weighted stacks, automatic phase labels on chart.

---

## Open questions

| Topic | Question |
|-------|----------|
| Contest year parse | `#Eurovision2025`, “Eurovision 2020”, NF year in title — one rule, test fixtures |
| LIVE vs Official | Same C, two rows — both count toward wave (video grain) |
| Missing months | Gap in x-axis vs interpolate — prefer **gaps** (honest episode timeline) |
| Pre-December tease | Any C videos before Dec C−1? Show as “early” bucket or ignore |
| Overlap years | May C episode often mixes C and older entries — stack chart handles naturally |
| Site placement | New tab “Seasons” vs section on main stats page |

---

## Done when (future)

- `contest-season-waves.json` (or equivalent) generated from corpus
- Site shows at least one wave visualization (sketch **A** or **C**)
- One contest year demonstrably shows tease → build → peak → dissipation in real data
- Docs link from [`site/README.md`](../../site/README.md)

## Out of scope (this task)

- Full implementation spec, CLI commands, tests
- Song-level waves
- Replacing the main stats table
