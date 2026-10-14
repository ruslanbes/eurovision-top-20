# Site CI + Dependabot major-bump guard

- **Task ID:** `site-ci-dependabot-guard`
- **Status:** done
- **Parent / blocked by:** Related to `astro7-tailwind4-migrate` (done) and `dependabot` (done).

## Problem

CI only ran pipeline pytest, so Dependabot’s broken site npm majors looked green until deploy. Grouped npm majors made review easy to rubber-stamp.

## Goal

PRs run site `npm ci` + `npm test` in parallel with pipeline tests. Dependabot stays one monthly group per ecosystem (option C); CI catches install/test breaks before merge.

## Open questions

| # | Topic | Status | Decision |
|---|--------|--------|----------|
| 1 | Scope | locked | **Both** (CI + Dependabot policy); Dependabot = keep C |
| 2 | CI site steps | locked | **`npm ci` + `npm test` only** |
| 3 | CI job shape | locked | **Parallel `site` job** |
| 4 | Node setup | locked | Mirror deploy (Node 22, npm cache) |
| 5 | npm groups | locked | **C — keep one group** |
| 6 | Actions / uv | locked | Leave single monthly groups |
| 7 | Branch protection | locked | Workflow-only for v1 |
| 8 | Docs | locked | `dev/README.md` only; no CHANGELOG |

## Implementation (shipped)

- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml): jobs `pipeline` + `site`
- Dependabot: unchanged
- [`dev/README.md`](../README.md): CI section

## Done when

- [x] Open questions locked.
- [x] Parallel `site` job: `npm ci` + `npm test`.
- [x] Dependabot: no grouping change (C).
- [x] `dev/README.md` updated; no CHANGELOG.
- [x] `BACKLOG.md` / `STATUS.md` updated.

## Notes

- Incident: npm PR #2 broke `npm ci`; CI never installed the site.
