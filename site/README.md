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

1. Copies `../data/packaged/` → `public/data/packaged/` (includes `query/` index)
2. Writes `public/data/periods-alltime.json` from `query/video-hits.json` periods (fallback: alltime snapshot filenames)

## Stack

- Astro + React islands (`StatsExplorer`)
- Tailwind CSS + CSS theme tokens (light / dark / system)
- TanStack Table v8
- Radix Slider (dual-thumb episode range)

Videos (`/`) and songs (`/songs/`) each load the sparse query index (`video-hits` + `video-meta` or `song-hits` + `song-meta`) and aggregate stats client-side for the selected `[begin, end]` episode-month window. Default range = full corpus. Default row order matches [`chart_points`](../docs/faq/chart_points.md#default-sort) (tier counts → ESC place → year → name).

Theme: **light**, **dark**, or **system** via the toggle (top-right). Choice persists in `localStorage`. Inline script in the layout avoids a flash of wrong theme on load.

**Table filters:** client-side AND/OR filters on window-aggregated rows — full-text search, country (searchable), year, ESC (dropdown: All / Winners / Not winners / Non-entries), and on videos only Category (four toggle buttons). Filter, episode-range, and table-sort state persist in the **URL query string** and survive navigation between `/` and `/songs/` (shared filters + range + sort synced; video-only Category preserved in the URL but hidden on the song page). Bare path = full corpus, no filters, default sort (`chart_points` desc).

### URL query params

| Param | Example | Notes |
|-------|---------|-------|
| `begin` | `begin=2022-01` | Episode-month range start (`YYYY-MM`) |
| `end` | `end=2024-12` | Episode-month range end |
| `country` | `country=Sweden,Norway` | Comma-separated |
| `year` | `year=2024,2023` | Comma-separated contest years |
| `esc` | `esc=winners` | `winners`, `not_winners`, or `non_entries`; omit = All |
| `fire` | `fire=1` | 🔥 emoji toggle — fire-themed songs only; omit = off |
| `q` | `q=dum+tek+tek` | Full-text search on titles (video title or `artist — song`); case- and diacritic-insensitive |
| `sort` | `sort=year` | Primary sort column — requires `order`; shared ids: `title`, `chart_points`, `top1`…`top20`, `esc_final_place`, `country`, `year` |
| `order` | `order=asc` | `asc` or `desc` — required whenever `sort` is set |
| `performance_category` | `performance_category=final_live` | Video-only control; kept in URL on song page |

Omitted params use defaults (full range, no filter, `chart_points` desc). Filter edits update the URL via `history.replaceState` (range slider and search debounced ~200 ms; sort updates immediately).

## Deploy

GitHub Pages at `https://ruslanbes.github.io/eurovision-top-20/` (`base: '/eurovision-top-20/'`).

CI: `.github/workflows/deploy.yml` — validate → process → package → build → deploy.

**One-time repo setup:** In GitHub → **Settings** → **Pages** → **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”). The site is Astro, not Jekyll; branch deploy runs `jekyll-build-pages` on the repo root and fails on `site/src/pages/index.astro`. After switching source, run the **Deploy site** workflow (or push to `main`).
