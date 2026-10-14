# Site CI + Dependabot major-bump guard

- **Task ID:** `site-ci-dependabot-guard`
- **Status:** backlog
- **Parent / blocked by:** Related to `astro7-tailwind4-migrate` (unblocks deploy) and `dependabot` (done). Can ship independently of the migration once `npm ci` works on the branch under test — or land CI first against a revert.

## Problem

Two process gaps let a broken site land on `main`:

1. **CI does not cover the site.** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) only runs pipeline `pytest`. Site `npm ci` / `npm test` / `npm run build` run only in [`deploy.yml`](../../.github/workflows/deploy.yml) on push to `main`. Dependabot’s `site-npm` PR (#2) was green while `npm ci` was already impossible.

2. **Dependabot groups every npm bump together**, including majors. One monthly PR jumped Astro 5→7, Tailwind 3→4, TanStack Table 8→9, TypeScript 5→7, Vitest 3→5, while leaving `@astrojs/tailwind@6` — an incompatible mix that a solo monthly review is easy to merge by “CI green + group looks fine.”

Goal of Dependabot was low noise, not silent major stack rewrites.

## Goal

PRs (including Dependabot) cannot merge / look “green” without a successful site install + test (and optionally build). Major dependency bumps are harder to sneak in via a single catch-all group — without returning to weekly PR spam.

## Open questions

Do not implement if any row is `open`. Flip to `locked` when the user accepts.

| # | Topic | Status | Decision |
|---|--------|--------|----------|
| 1 | Scope of this task | open | **Both** site CI + Dependabot grouping tweak vs **CI only** vs **Dependabot only**? |
| 2 | CI site steps | open | On every PR/push: `npm ci` + `npm test` only, or also `npm run build`? (Build is slower but matches deploy.) |
| 3 | CI job shape | open | **Same job** after pytest vs **parallel `site` job** (fail fast, clearer logs)? |
| 4 | Node setup in CI | open | Mirror deploy (`setup-node@v7`, Node 22, npm cache on `site/package-lock.json`)? |
| 5 | Dependabot npm groups | open | See [Grouping options](#grouping-options) — pick one |
| 6 | Actions / uv groups | open | Leave Actions + uv as single monthly groups (lower risk) vs apply same major split? |
| 7 | Branch protection | open | Require CI status check on `main` (GitHub settings — manual) vs workflow-only for v1? |
| 8 | Docs | open | Update `dev/README.md` Dependabot / CI blurb; no CHANGELOG (process-only)? |

### Grouping options

| Option | Behaviour | Noise | Safety |
|--------|-----------|-------|--------|
| **A. Split majors** | Two groups (or `dependency-type` / `update-types`): e.g. `site-npm-patch-minor` with `update-types: ["patch","minor"]`, and majors **ungrouped** or a separate `site-npm-major` group | Still ~monthly; majors may add 1–N extra PRs | High — majors reviewable alone |
| **B. Ignore majors** | `ignore` with `update-types: ["version-update:semver-major"]` for npm | Lowest | Majors never proposed — can drift for years |
| **C. Keep one group** | No Dependabot change; rely on CI only | Lowest | CI catches install/test break; still one huge PR to review |
| **D. Exclude known stack packages from the catch-all** | Group `*` but `exclude-patterns` for `astro`, `tailwindcss`, `@astrojs/*`, etc. | Medium | Stack majors solo; rest batched |

Recommendation for solo + “don’t fall far behind”: **A** (or **D**) + site CI. **C** alone would have caught this incident’s `npm ci` failure before merge; **A** reduces “approve the pile” risk.

## Non-goals

- Implementing the Astro 7 / Tailwind 4 code migration (`astro7-tailwind4-migrate`).
- Auto-merge of Dependabot PRs.
- Renovate.
- Full matrix (multiple Node versions) unless OQ says so.

## Implementation

### Site CI (if OQ1 includes CI)

Extend `.github/workflows/ci.yml` roughly:

```yaml
jobs:
  pipeline:
    # existing pytest steps…

  site:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: "22"
          cache: npm
          cache-dependency-path: site/package-lock.json
      - working-directory: site
        run: npm ci
      - working-directory: site
        run: npm test
      # optional per OQ2:
      # - working-directory: site
      #   run: npm run build
```

`npm run build` needs packaged data / pretest scripts — same as local `prebuild` (deliver from `data/packaged/`). Should work on a clean checkout if `data/packaged/` is in git (it is).

### Dependabot (if OQ1 includes grouping)

Edit `.github/dependabot.yml` npm block per locked option A–D. Keep `interval: monthly`, `open-pull-requests-limit` reconsidered if majors are ungrouped (may need a slightly higher limit).

### Docs

Short update under Dependency updates / CI in `dev/README.md` (OQ8).

## Done when

- [ ] Open questions locked.
- [ ] If CI in scope: PR that only breaks site install fails the site CI job; pipeline-only changes still covered.
- [ ] If Dependabot in scope: `.github/dependabot.yml` matches locked grouping; `dev/README.md` note updated.
- [ ] No user-facing CHANGELOG unless OQ says otherwise.
- [ ] `BACKLOG.md` / `STATUS.md` updated.
- [ ] If OQ7 requires it: note in STATUS that branch protection must be toggled in GitHub UI.

## Notes

- Incident timeline: uv PR → **npm PR #2** (broken peers) → Actions PR #1; deploy failed on `npm ci` with `@astrojs/tailwind` vs `astro@7`.
- `deploy.yml` already runs `npm ci` + `npm run build` on `main` only — too late to gate Dependabot merges.
- Pair with `astro7-tailwind4-migrate` for the actual dependency fix; this task only prevents the next silent break.
