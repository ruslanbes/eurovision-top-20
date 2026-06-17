# Status

Last updated: 2026-06-17

## Current focus

Removed `generated_at` from processed/packaged snapshots; site uses period for footer.

## Active task

_None — pick next from backlog (`site-theming`, pipeline follow-ups, site Beta slices)._

## Blockers

_None._

## Next action

1. Commit `generated_at` removal + regenerated data when ready.
2. Or pick a backlog item: `site-theming`, song grain on site, etc.

## Session notes

- Dropped `generated_at` from aggregate/package/song payloads; regenerated ~690 JSON files; site footer shows selected period.
- `cleanup-task-docs` done — 17 completed task specs removed from `docs/tasks/`.
- Durable docs: ADRs, `AGENTS.md`, `data/README.md`, `site/README.md`, `docs/faq/`, [`CHANGELOG.md`](../CHANGELOG.md).
