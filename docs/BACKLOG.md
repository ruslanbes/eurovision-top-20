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

## unlikely-events-warnings
- status: cancelled
- parent: generate-song-stats
- goal: Typed warning codes for rare domain cases (e.g. song merge country/year mismatch)
- done_when: Per `docs/tasks/unlikely-events-warnings.md` — coded warnings replace generic merge messages
- notes: Cancelled — keep generic `Warning:` strings in `song_stats` / ESC join; no global warning collector

## site-theming
- status: in_progress
- parent: scaffold-project
- goal: Light/dark theme — CSS tokens, toggle, theme-aware palettes for tables and charts (heatmaps, stacks)
- done_when: Per `docs/tasks/site-theming.md` — toggle, tokens, table + one viz path verified in both modes
- notes: Stack in ADR-002; Slice 1 uses minimal system theming only

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

## insight-presence-heatmap
- status: ready
- parent: scaffold-project
- goal: Insights matrix heatmap — country or contest year × episode month; presence or new-entries metric; sequential theme scale
- done_when: Per `docs/tasks/insight-presence-heatmap.md` — packaged matrices, PresenceHeatmap, Country + Year tabs, tests/build green
- notes: Distinct videos per cell (not entries); complements **`/episodes/`** entry browser
