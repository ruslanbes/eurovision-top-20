# Status

Last updated: 2026-06-21

## Current focus

`site-theming` in progress (chart token migration open).

## Active task

[`site-theming`](docs/tasks/site-theming.md)

## Blockers

_None._

## Next action

Finish site-theming chart tokens or pick next backlog item (`stats-inline-explainers` is ready).

## Session notes

- **Released 0.2.0** — filters, fire toggle, song YouTube links, performance category, sort tie-breakers. See [`CHANGELOG.md`](../CHANGELOG.md).
- **`ui-filter-fulltext` done** — shared search input on `/` and `/songs/`; substring match on video title or `artist — song`; case/diacritic-insensitive; URL `q` (debounced ~200 ms); AND with other filters. 45 site tests green.
- Drafted **`ui-sort-url-persist`** — URL `sort`/`order`; shared column ids; `title` alias for video/song label; survives `/` ↔ `/songs/`.
- **`ui-sort-url-persist` done** — `sort` + `order` in URL (`order` required); internal title column id `title`; 57 site tests green.
- Empty **Insights** page + nav link (`/insights/`).
- Drafted **`insight-country-composition-bars`** — per-episode stacked country bars; fixed 20-slot width; gray missing rightmost; flag-based colors + overrides.
- Drafted **`insight-presence-heatmap`** — country/year × episode matrix; presence vs new-entries toggle; sequential theme scale.
