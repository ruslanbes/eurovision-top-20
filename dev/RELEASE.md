# Release runbook

Related: [CHANGELOG.md](../CHANGELOG.md), [CLEANUP.md](CLEANUP.md)

## When to release

Cut a release when:

- [CHANGELOG.md](../CHANGELOG.md) `[Unreleased]` contains a significant work chunk.
- Project tests / build (and CI on `main`, if any) are green.

Ad-hoc changelog updates without a version tag are fine anytime; this runbook is for **promoting `[Unreleased]` → `[X.Y.Z]`** and tagging. Promote and delete finished task artifacts with [CLEANUP.md](CLEANUP.md) first if needed.

## Pre-release checklist

- [ ] `make test` (or `cd pipeline && uv run pytest` and `cd site && npm test`) green.
- [ ] `make build` (or `cd site && npm run build`) green.
- [ ] `make data` (validate → process → package) succeeds on current raw data.
- [ ] Manual smoke checks for user-facing changes (if applicable).
- [ ] Finished / cancelled task docs cleaned via [CLEANUP.md](CLEANUP.md) if any remain.

## Finalize the changelog

Edit [CHANGELOG.md](../CHANGELOG.md):

1. Review `[Unreleased]` — group under **Added** / **Changed** / **Removed** / **Fixed** (Keep a Changelog).
2. Add a new dated section, e.g. `## [0.2.0] - YYYY-MM-DD`.
3. Move items from `[Unreleased]` into that section.
4. Leave `[Unreleased]` empty (or with a placeholder comment) for the next cycle.
5. Rephrase for **readers of the repo** — user-facing behavior, not internal implementation trivia. Link ADRs or FAQ where useful.
6. Do **not** add a “Completed task specs” line under Removed.
7. Do **not** stage changes as part of release *preparation* unless you intend to commit immediately after.

## Execute the release

1. Stage the changes.
2. Publish:

```sh
git commit -m "Release X.Y.Z"
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin main --tags
```

Push to `main` runs [.github/workflows/deploy.yml](../.github/workflows/deploy.yml): validate → process → package → build → GitHub Pages.

Verify the live site after deploy if the release includes site or packaged-data changes.
