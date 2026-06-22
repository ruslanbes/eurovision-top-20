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

## stats-inline-explainers
- status: ready
- parent: scaffold-project
- goal: Add reusable on-demand explainers in stats UI, starting with `chart_points`, without permanent layout clutter
- done_when: Per `docs/tasks/stats-inline-explainers.md` — trigger + popover pattern, `chart_points` explainer, a11y behavior, tests/build green
- notes: Follow-up on shipped 0.2.0 filter/table UI; prefer click/tap popover over tooltip for multi-line content

## insight-year-bar-gradients
- status: cancelled
- parent: scaffold-project
- goal: Smooth horizontal color blends between contest-year segments in year composition rows; keep per-year tooltips
- done_when: Per `docs/tasks/insight-year-bar-gradients.md` — gradient paint layer + overlay hit targets, tests/build green, no packaged JSON change
- notes: Shipped then reverted — solid bars read clearer than gradient blends at any tested width

## insight-presence-heatmap
- status: ready
- parent: scaffold-project
- goal: Insights matrix heatmap — country or contest year × episode month; presence or new-entries metric; sequential theme scale
- done_when: Per `docs/tasks/insight-presence-heatmap.md` — packaged matrices, PresenceHeatmap, Country + Year tabs, tests/build green
- notes: Distinct videos per cell (not slots); complements year composition bars

## insight-episode-slot-schemes
- status: backlog
- parent: scaffold-project
- goal: Epic — scheme-driven episode slot matrix (● rows); color/sort/glyph per metadata dimension; **Group** toggle + chart rank order; generalize year-composition PoC
- done_when: Per `docs/tasks/insight-episode-slot-schemes.md` — packaged episode slots, SlotMatrixChart + registry, scheme UI, ≥2 new schemes, extensibility proven
- notes: Start with `insight-episode-slots-data` spike; year scheme migrates into registry

## insight-year-composition-tooltips
- status: done
- parent: scaffold-project
- goal: Year composition per-● tooltips — episode month + one video title per slot (not multi-title segment tooltips)
- done_when: Per `docs/tasks/insight-year-composition-tooltips.md` — packaged v2 `titles[]` per segment, per-slot hover, pipeline + site tests green
- notes: Option A approved; per-● tooltips; missing/unknown ● → `Missing`; legend **Missing** only

## ui-filter-fulltext
- status: done
- parent: scaffold-project
- goal: Full-text search filter — substring on video title or artist — song; case- and diacritic-insensitive; one query; filter on typing
- done_when: Per `docs/tasks/ui-filter-fulltext.md` — search input, match helper tests, URL `q`, AND with other filters, build green
- notes: Client-side only; shared scope on `/` and `/songs/`

## ui-sort-url-persist
- status: done
- parent: scaffold-project
- goal: Persist table sort in URL and keep it across `/` and `/songs/` — shared column ids; `title` for video/song label column
- done_when: Per `docs/tasks/ui-sort-url-persist.md` — `sort`/`order` params, grain mapping, nav round-trip, tests/build green
- notes: Follow-up on filter URL persistence; `#` rank sort unchanged
