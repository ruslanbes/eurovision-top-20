# Add Dependabot

- **Task ID:** `dependabot`
- **Status:** done
- **Parent / blocked by:** —

## Problem

Dependencies are updated by hand (or not at all). The repo has three update surfaces:

| Ecosystem | Manifest / lockfile | Today |
|-----------|---------------------|--------|
| npm | `site/package.json` + `site/package-lock.json` | Manual `npm update` / bump |
| Python (uv) | `pipeline/pyproject.toml` + `pipeline/uv.lock` | Manual `uv lock --upgrade` |
| GitHub Actions | `.github/workflows/*.yml` | Pinned tags (`actions/checkout@v5`, …) updated by hand |

Missed bumps mean security advisories linger and CI action majors drift until someone notices.

## Goal

Enable [Dependabot](https://docs.github.com/en/code-security/dependabot) so GitHub opens a **small, predictable** set of PRs (at most a few per month). Solo maintainer reviews when convenient; Dependabot only proposes. Stay roughly current — not bleeding-edge.

## Open questions

| # | Topic | Status | Decision |
|---|--------|--------|----------|
| 1 | Config file | locked | **In-repo** `.github/dependabot.yml` (version 2) |
| 2 | Ecosystems in v1 | locked | **All three**: npm `/site`, **uv** `/pipeline`, `github-actions` `/` |
| 3 | Schedule | locked | **`interval: monthly`** |
| 4 | PR noise | locked | See [Noise policy](#noise-policy) — one grouped PR per ecosystem; limit 3; include majors |
| 5 | Labels / reviewers | locked | See [Solo review](#solo-review) — label `dependencies` only; **no** assignees / reviewers |
| 6 | Changelog / docs | locked | **Process-only** — note in `dev/README.md`; **no** `CHANGELOG` entry |
| 7 | Auto-merge | locked | **Off** — merge by hand on the monthly pass |

## Noise policy

| Knob | Choice |
|------|--------|
| Schedule | `monthly` |
| Grouping | One `groups:` entry with `patterns: ["*"]` per ecosystem |
| Majors | Included in the same group |
| `open-pull-requests-limit` | **3** |

## Solo review

- Label `dependencies` only; no assignees/reviewers.
- Once a month: merge green PRs, investigate red CI.

## Auto-merge (why off)

≤3 PRs/month expected. Manual merge after CI avoids landing a breaking major unattended.

## Non-goals

- Renovate; auto-merge; user-facing CHANGELOG; changing install/CI install paths.
- Dependabot security-alerts product toggles (separate GitHub setting).

## Implementation

Shipped: [`.github/dependabot.yml`](../../.github/dependabot.yml). Pipeline uses `package-ecosystem: "uv"` (not `pip`) per [Astral’s Dependabot guide](https://docs.astral.sh/uv/guides/integration/dependabot/). Process note in `dev/README.md`.

## Done when

- [x] Open questions locked.
- [x] `.github/dependabot.yml` committed (ecosystems: npm, uv, github-actions).
- [x] `dev/README.md` mentions Dependabot (process-only).
- [x] No `CHANGELOG` entry.
- [ ] GitHub shows the three ecosystems monitored **or** at least one Dependabot PR has appeared — verify after push to `main`.
- [x] `BACKLOG.md` / `STATUS.md` reflect completion or handoff.

## Notes

- First Dependabot run starts after the config lands on the default branch.
- Create label `dependencies` on GitHub if PRs appear unlabeled.
