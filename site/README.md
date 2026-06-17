# Eurovision Top 20 site

Static Astro site for packaged chart statistics.

## Commands

From `site/` — full reference: [`docs/faq/commands.md`](../docs/faq/commands.md).

```bash
npm install
npm run dev      # prebuild copies data/packaged → public/data/
npm run build    # production build to dist/
npm run preview  # preview production build
```

`predev` / `prebuild` run `scripts/copy-packaged.mjs`, which:

1. Copies `../data/packaged/` → `public/data/packaged/`
2. Writes `public/data/periods-alltime.json` from alltime snapshot filenames

## Stack

- Astro + React islands (`StatsExplorer`)
- Tailwind CSS (minimal system light/dark)
- TanStack Table v8
- Radix Slider (period scrubber)

Slice 1: video grain, alltime variant only. Site follow-ups in [`BACKLOG.md`](../docs/BACKLOG.md).

## Deploy

GitHub Pages at `https://ruslanbes.github.io/eurovision-top-20/` (`base: '/eurovision-top-20/'`).

CI: `.github/workflows/deploy.yml` — validate → process → package → build → deploy.

**One-time repo setup:** In GitHub → **Settings** → **Pages** → **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”). The site is Astro, not Jekyll; branch deploy runs `jekyll-build-pages` on the repo root and fails on `site/src/pages/index.astro`. After switching source, run the **Deploy site** workflow (or push to `main`).
