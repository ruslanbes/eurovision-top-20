# Backlog

Flat task list. Status values: `backlog` | `ready` | `in_progress` | `blocked` | `done` | `cancelled`.

On cleanup, move shipped work to [`CHANGELOG.md`](../CHANGELOG.md) and clean the backlog — see [`CLEANUP.md`](CLEANUP.md).

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

Detail lives in `dev/tasks/<task-id>.md` when needed.

---

## esc-asia-2026
- status: done
- goal: Map breakage from Eurovision Asia 2026 chart entries and lock how to integrate them into pipeline/site.
- done_when: See `dev/tasks/esc-asia-2026.md`.
- notes: Shipped in [Unreleased] — `region` (europe/asia) from title markers, Asia title extractor, Philippines, Asia = `PENDING`, Region column + filter, “Contest Place”, insights by (region, year). Task file kept until cleanup.

## stale-stats-cache
- status: backlog
- goal: Fix Firefox (and similar) showing stale Videos stats after a new episode deploy.
- done_when: See `dev/tasks/stale-stats-cache.md`.
- notes: Deferred 2026-10-09 — incident 2 (fresh HTML + cached JSON, 0 videos) self-healed within the 10-minute `max-age`; no fix for now. OQ2 reopened (option 1 alone is insufficient).

## the-other-top-20
- status: backlog
- goal: Insight table “The other Top 20” — top 20 songs by chart points among DNQ or GF place 21+ ESC entries.
- done_when: See `dev/tasks/the-other-top-20.md`.
- notes: Song-grain; approved lead + 4-column table; snapshot in task doc.

## april-prank
- status: backlog
- goal: April Fools’ emoji titles on Videos/Songs tables — song-keyed manual map, click-to-reveal, Apr 1 auto or query override.
- done_when: See `dev/tasks/april-prank.md`.
- notes: Isolated metadata + module; no changes to packaged stats or insights.

## dependabot
- status: done
- goal: Enable Dependabot for npm (site), Python/uv (pipeline), and GitHub Actions.
- done_when: See `dev/tasks/dependabot.md`.
- notes: `.github/dependabot.yml` — monthly; grouped; `uv` ecosystem for pipeline; process note in `dev/README.md`. Site npm group majors broke deploy — see migrate + guard tasks.

## astro7-tailwind4-migrate
- status: done
- goal: Finish Astro 7 + Tailwind 4 the supported way (`@tailwindcss/vite`); restore `npm ci` / build / deploy.
- done_when: See `dev/tasks/astro7-tailwind4-migrate.md`.
- notes: Shipped — `@tailwindcss/vite` + `@theme`; Table v9 `useTable`; CHANGELOG + ADR-000/002 + site README. Verify deploy after push.

## site-ci-dependabot-guard
- status: backlog
- goal: Run site npm ci/test(/build) on PRs; tighten Dependabot so majors are not buried in one catch-all group.
- done_when: See `dev/tasks/site-ci-dependabot-guard.md`.
- notes: Draft — OQs open (CI vs Dependabot vs both; grouping option A–D).
