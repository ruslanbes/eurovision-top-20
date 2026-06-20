# Backlog

Flat task list. Status values: `backlog` | `ready` | `in_progress` | `blocked` | `cancelled`.

On release, move shipped work to [`CHANGELOG.md`](../CHANGELOG.md) and clean the backlog — see [`docs/RELEASE.md`](RELEASE.md).

Reorder freely. Cancel by setting status to `cancelled`. Unexpected work becomes a new task with its own ID.

## Format

Each task:

```markdown
## <task-id>
- status: backlog
- parent: <optional-related-task-id>
- blocked_by: <optional-task-id>
- goal: One sentence
- done_when: Observable acceptance criteria
- notes: Optional one-liner
```

Detail lives in `docs/tasks/<task-id>.md` when needed.

---

## performance-category
- status: done
- parent: stats-table-filters
- goal: Package-time four-bucket performance category (final live, national final, official video, special) — pattern rules + per-video overrides; replace raw performance_type filter
- done_when: Per `docs/tasks/performance-category.md` — field on video-meta, pipeline tests, site filter on four labels
- notes: Packaged `performance_type` dropped in follow-up `drop-packaged-performance-type`

## drop-packaged-performance-type
- status: done
- parent: performance-category
- goal: Remove performance_type from packaged video JSON; keep parse-time string for category derivation only
- done_when: Per `docs/tasks/drop-packaged-performance-type.md`
- notes: Superseded by `parse-performance-category` (no performance_type anywhere)

## parse-performance-category
- status: done
- parent: drop-packaged-performance-type
- goal: Title parse emits performance_category directly; remove performance_type from pipeline
- done_when: Per `docs/tasks/parse-performance-category.md`
- notes: manual-video-metadata uses enum; category_from_segment in title parse

## stats-table-filters
- status: done
- parent: scaffold-project
- goal: Extensible client-side table filters — v1 country (searchable combobox) + year (select); AND across filters, OR within filter
- done_when: Per `docs/tasks/stats-table-filters.md` — framework + both filters on `/` and `/songs/`; chips; build green
- notes: Facets from window rows; no new packaged artifact for v1

## unlikely-events-warnings
- status: ready
- parent: generate-song-stats
- goal: Typed warning codes for rare domain cases (e.g. song merge country/year mismatch)
- done_when: Per `docs/tasks/unlikely-events-warnings.md` — coded warnings replace generic merge messages
- notes: v1 ships generic warnings only; this task adds structure

## song-key-normalization-audit
- status: ready
- parent: generate-song-stats
- goal: Measure near-duplicate `(artist, song)` pairs before any normalization rules
- done_when: Per `docs/tasks/song-key-normalization-audit.md` — audit report on latest packaged alltime
- notes: Follow-up only; exact keys ship first

## site-theming
- status: in_progress
- parent: scaffold-project
- goal: Light/dark theme — CSS tokens, toggle, theme-aware palettes for tables and charts (heatmaps, stacks)
- done_when: Per `docs/tasks/site-theming.md` — toggle, tokens, table + one viz path verified in both modes
- notes: Stack in ADR-002; Slice 1 uses minimal system theming only

## stats-global-filter-state
- status: done
- parent: stats-table-filters
- goal: Persist episode range + filters across / and /songs/ — shared filters synced, grain-specific preserved, URL query params
- done_when: Per `docs/tasks/stats-global-filter-state.md` — round-trip navigation, nav preserves query, tests green
- notes: Approved — URL-only, replaceState; table sort is a later task; range is window state not FilterState

## video-insights
- status: backlog
- parent: generate-stats-table
- goal: Formalize per-video analytics for four site sections (Year, Country, ESC winner, Other) — formulas + open questions only for now
- done_when: Per `docs/tasks/video-insights.md` — each insight has id, section, formula + open questions; optional CLI/site still out of scope until a follow-up
- notes: List-only for now; per-video grain; song variants later; includes `other-never-top1-leader`

## contest-season-waves
- status: backlog
- parent: scaffold-project
- goal: Model and visualize per-contest-year “waves” (tease → build → May peak → dissipation) on the site
- done_when: Per `docs/tasks/contest-season-waves.md` — wave data artifact + at least one chart view live
- notes: Sketch only; separate from `video-insights`; period player in `site/`; colors per `site-theming`

## ui-filter-fire-titles
- status: backlog
- parent: scaffold-project
- goal: Stats table UI filter — rows whose title/song matches “fire” in any language (multilingual keyword list)
- done_when: Per `docs/tasks/ui-filter-fire-titles.md` — packaged flag + table toggle on site
- notes: Small feature; precompute `matches_fire_filter` in `package`; plug into `stats-table-filters` as toggle type
