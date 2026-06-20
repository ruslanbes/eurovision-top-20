# Status

Last updated: 2026-06-17

## Current focus

`site-theming` in progress (chart token migration open).

## Active task

[`site-theming`](docs/tasks/site-theming.md)

## Blockers

_None._

## Next action

Finish site-theming chart tokens or pick next backlog item.

## Session notes

- **`stats-global-filter-state` done** — URL query params for range + filters; `StatsNav` preserves search across pages; `replaceState` with debounced range.
- **Removed `performance-category-overrides.json`** — category comes only from title parse (or full manual row in `manual-video-metadata.json`).
- **`parse-performance-category` done** — title parse emits `performance_category`; `performance_type` removed from pipeline.
- **`drop-packaged-performance-type` done** — packaged JSON never had granular type strings.
- **`performance-category` shipped** — toggle Category filter; packaged `performance_category` field.
- **`stats-global-filter-state` approved** — URL-only persistence, replaceState, navigation round-trip Vitest required; table sort deferred to later task.
- **`stats-table-filters` done** — country combobox + year select; AND/OR algebra; chips; client-side on window rows.
- Theme toggle shipped earlier; semantic tokens partial.
