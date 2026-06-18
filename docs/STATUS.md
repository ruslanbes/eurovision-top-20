# Status

Last updated: 2026-06-17

## Current focus

`eurovision-final-place` complete (pipeline + site Place column). Pick next from backlog.

## Active task

_None — pick next from backlog (`site-theming`, pipeline follow-ups, site Beta slices)._

## Blockers

_None._

## Next action

1. Commit `generated_at` removal + regenerated data when ready.
2. Or pick a backlog item: `site-theming`, song grain on site, etc.

## Session notes

- `esc-placement-overrides.json` — package-only placement overrides (`NON_ENTRY`, `WITHDRAWN`); title-parse file no longer carries `esc_final_place`.
- Shipped `esc_final_place` join: vendored `data/external/esc-results/` (EurovisionAPI `2026.4`), `vendor-esc flatten`, package + song roll-up, 180 tests.
- Dropped `generated_at` from aggregate/package/song payloads; regenerated ~690 JSON files; site footer shows selected period.
- `cleanup-task-docs` done — 17 completed task specs removed from `docs/tasks/`.
- Durable docs: ADRs, `AGENTS.md`, `data/README.md`, `site/README.md`, `docs/faq/`, [`CHANGELOG.md`](../CHANGELOG.md).
