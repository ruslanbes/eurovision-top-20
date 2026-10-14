# Finish Astro 7 + Tailwind 4 migration

- **Task ID:** `astro7-tailwind4-migrate`
- **Status:** done
- **Parent / blocked by:** Related: `site-ci-dependabot-guard` (process; independent).

## Problem

Dependabot’s grouped `site-npm` PR (#2) bumped majors in one shot and left `@astrojs/tailwind@6` against Astro 7 / Tailwind 4 — `npm ci` failed (`ERESOLVE`). Deploy on `main` was red.

## Goal

Site installs and builds on the Dependabot-landed stack the supported way: `@tailwindcss/vite`, no `@astrojs/tailwind`, CSS `@theme` for design tokens, dark mode and look preserved, related majors verified, tests/build/deploy green.

## Open questions

| # | Topic | Status | Decision |
|---|--------|--------|----------|
| 1 | Unblock deploy | locked | **Migrate in place** |
| 2 | Scope of other majors | locked | **Verify all** — TanStack Table 9, TypeScript 7, Vitest 5 |
| 3 | Theme config | locked | **CSS `@theme`**; remove JS Tailwind config |
| 4 | Base styles | locked | **Preserve** prior look (`applyBaseStyles: false` = no double base inject; keep Tailwind preflight via `@import "tailwindcss"` as before via `@tailwind base`) |
| 5 | Changelog | locked | **User-visible** `[Unreleased]` Changed |
| 6 | ADR / README | locked | Update ADR-000 / ADR-002 / `site/README.md` **without version pins** in ADRs |

## Implementation (shipped)

1. Removed `@astrojs/tailwind`; added `@tailwindcss/vite`.
2. `astro.config.mjs`: Vite plugin; no Tailwind integration.
3. `global.css`: `@import "tailwindcss"`, `@custom-variant dark` (class), `@theme inline` colour map from `theme.css` channel vars (`--surface`, … — not `--color-*`, and **no** `<alpha-value>`; that placeholder is left literal in v4 and broke all colours).
4. Deleted `tailwind.config.mjs`.
5. TanStack Table **v9**: `useTable` + `tableFeatures` / `rowSortingFeature` / `createSortedRowModel`; `row.getAllCells()` (visibility feature not needed).
6. `npm ci`, `npm test` (189), `npm run build` green.
7. Docs: CHANGELOG, ADR-000, ADR-002, `site/README.md`.

## Done when

- [x] Open questions locked.
- [x] `npm ci` succeeds without force/legacy flags.
- [x] `npm test` and `npm run build` green; Table / TS / Vitest majors verified.
- [x] No `@astrojs/tailwind`; Tailwind via `@tailwindcss/vite`; tokens in CSS `@theme`.
- [x] Look preserved (preflight + class dark); light/dark wiring unchanged in `theme.css`.
- [x] `CHANGELOG.md` `[Unreleased]` updated; ADRs + `site/README.md` updated (ADR version-agnostic).
- [x] `BACKLOG.md` / `STATUS.md` updated.
- [ ] Deploy to Pages succeeds after merge (verify on push).

## Notes

- Related process task: `site-ci-dependabot-guard`.
