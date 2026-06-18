# Backlog

Flat task list. Status values: `backlog` | `ready` | `in_progress` | `blocked` | `cancelled`.

Move shipped work to the [`CHANGELOG.md`](../CHANGELOG.md) on request or when there is a new release.

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

## virtual-world-country
- status: done
- parent: eurovision-final-place
- goal: Virtual `World` country for non-national ESC videos (interval acts, live streams) instead of host-nation placeholders
- done_when: Per `docs/tasks/virtual-world-country.md` — `World`/`🌍` in title-parse map, manual rows updated, join guard, repackaged
- notes: Display-only; not in ESC vendor `country_to_code`

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

## eurovision-final-place
- status: done
- parent: package
- goal: ESC **final placement** on packaged rows and per-video site table
- done_when: Per `docs/tasks/eurovision-final-place.md` — vendored data, package join, Place column on site
- notes: Per-song site table deferred to Beta

## site-theming
- status: ready
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

## ui-filter-fire-titles
- status: backlog
- parent: scaffold-project
- goal: Stats table UI filter — rows whose title/song matches “fire” in any language (multilingual keyword list)
- done_when: Per `docs/tasks/ui-filter-fire-titles.md` — packaged flag + table toggle on site
- notes: Small feature; precompute `matches_fire_filter` in `package`; extend word list as needed
