# Release runbook

Related: [BACKLOG.md](BACKLOG.md), [STATUS.md](STATUS.md), [tasks/README.md](tasks/README.md)

## When to release

Cut a release when:

- One or more backlog items are `done` (all `done_when` criteria met).
- [CHANGELOG.md](../CHANGELOG.md) `[Unreleased]` contains significant work chunk.
- Pipeline and site tests pass locally (or CI on `main` is green).

Ad-hoc changelog updates without a version tag are fine anytime; this runbook is for **promoting `[Unreleased]` → `[X.Y.Z]`** and cleaning planning artifacts.

## Pre-release checklist

- [ ] `uv run pytest` (from `pipeline/`) green.
- [ ] `npm test` and `npm run build` (from `site/`) green.
- [ ] `uv run evtop20 validate && uv run evtop20 process && uv run evtop20 package` succeeds on current raw data.

## Prepare the release

### 1. Clean the backlog

In [BACKLOG.md](BACKLOG.md):

- **Remove** entries whose work is fully captured in the new changelog section.
- Create missing CHANGELOG entries in the `[Unreleased]` section.
- Keep `backlog` / `ready` / `in_progress` / `blocked` items.
- Remove cancelled tasks and their detail files.
- Do **not** leave stale `done` rows after a release — the changelog is the archive of shipped work.

### 2. Analyze and cleanup task detail files

Per [tasks/README.md](tasks/README.md): delete `docs/tasks/<task-id>.md` for tasks shipped in this release or cancelled.

Keep the `docs/tasks/` folder and `tasks/README.md`. Behavior should live in CHANGELOG, ADRs, FAQ, and layer READMEs — not in deleted specs.

#### 2.1 Handling detailed task docs

- Task docs are temporary artifacts. On release we clean them up.
- Read each detailed task doc.
- Check if any stable docs (FAQ, README) reference the task doc.
- Extract important architectural decisions and contracts, extract summary of diagrams and tables, user-facing behavior.
- Check if the extracted info is covered in stable documentation files: FAQ, `data/README.md`, `site/README.md`, or ADRs.
- If the stable docs has gaps, move the extracted data there. Create new stable docs if needed, they will be reviewed before commit.

### 3. Refresh session status

Update [STATUS.md](STATUS.md):

- Set **Current focus** / **Active task** to what’s next.
- Clear or shorten **Session notes** for the released work (one line “Released X.Y.Z” is enough).
- Confirm **Blockers** is accurate.

### 4. Finalize the changelog

Edit [CHANGELOG.md](../CHANGELOG.md):

1. Review `[Unreleased]` — group under **Added** / **Changed** / **Removed** / **Fixed** (Keep a Changelog).
2. Add a new dated section, e.g. `## [0.2.0] - YYYY-MM-DD`.
3. Move items from `[Unreleased]` into that section.
4. Leave `[Unreleased]` empty (or with a placeholder comment) for the next cycle.
5. Rephrase the changes to omit techical details and focus on the user-facing behavior. Write for **readers and users of the repo**, not for internal contributors. Link ADRs or FAQ where needed.
6. Do NOT add "Completed task specs" line to the "Removed" section in CHANGELOG.md.
7. Do NOT stage the changes as part of the release preparation.

## Execute the release 

1. Stage the changes.
2. Publish the changes:

```sh
git commit -m "Release 0.3.2"
git tag -a v0.3.2 -m "Release 0.3.2"
git push origin main --tags
```

Push to `main` runs [.github/workflows/deploy.yml](../.github/workflows/deploy.yml): validate → process → package → build → GitHub Pages.

Verify the live site after deploy if the release includes site or packaged-data changes.

