# Status

Last updated: 2026-10-14

## Current focus

_None._ Await push/merge so Pages deploy confirms green.

## Active task

_None._

## Blockers

_None_ locally (`npm ci` / test / build green). Live deploy still red until this lands on `main`.

## Next action

Commit/push the Astro 7 + Tailwind 4 migration; confirm GitHub Pages deploy. Then lock OQs on **`site-ci-dependabot-guard`**.

## Session notes

- **`astro7-tailwind4-migrate` done:** `@tailwindcss/vite`, CSS `@theme inline`, deleted `tailwind.config.mjs`; TanStack Table v9 (`useTable` + sorting features); Vitest 5 / TS 7 OK as-is; CHANGELOG + ADR-000/002 + `site/README.md`.
- **Style fix:** first `@theme` used v3 `<alpha-value>` → 49 invalid colours in CSS (white page, black text, no accent links). Channel vars renamed (`--surface`, …); map with `rgb(var(--surface))` only.
- **`site-ci-dependabot-guard`** still draft (OQs open).
- Backlog: guard, **`stale-stats-cache`** (deferred), **`the-other-top-20`**, **`april-prank`**; done docs kept: migrate, `dependabot`, `esc-asia-2026`.
