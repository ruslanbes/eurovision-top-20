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

## the-other-top-20
- status: backlog
- goal: Insight table “The other Top 20” — top 20 songs by chart points among DNQ or GF place 21+ ESC entries.
- done_when: See `docs/tasks/the-other-top-20.md`.
- notes: Song-grain; approved lead + 4-column table; snapshot in task doc.

## april-prank
- status: backlog
- goal: April Fools’ emoji titles on Videos/Songs tables — song-keyed manual map, click-to-reveal, Apr 1 auto or query override.
- done_when: See `docs/tasks/april-prank.md`.
- notes: Isolated metadata + module; no changes to packaged stats or insights.
