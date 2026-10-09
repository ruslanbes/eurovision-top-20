# Status

Last updated: 2026-10-09

## Current focus

Release **0.8.0** prepared (not committed / tagged).

## Active task

_None._

## Blockers

_None._

## Next action

Commit, tag `v0.8.0`, push (see `dev/RELEASE.md` → Execute the release). No task picked after that.

## Session notes

- **0.8.0:** Eurovision Song Contest Asia support (`region`, Region column + filter, Contest Place), 2026-09 episode. `make data` / `make test` / `make build` green.
- `esc-asia-2026` task doc and its `done` backlog row kept on request; remove in a later cleanup.
- `site-stats-explainer` task doc removed; explainer contract now in `site/README.md`.
- `stale-stats-cache`: incident 2 after 0.8.0 deploy (fresh HTML + cached `video-hits.json` → 0 videos). OQ2 fix strategy reopened. Self-healed within 10 min; deferred, no fix for now.
- Backlog: **`stale-stats-cache`** (backlog, deferred), **`the-other-top-20`**, **`april-prank`**.
