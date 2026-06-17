# Eurovision Top 20

Stats explorer for the [Eurovision Song Contest YouTube channel](https://www.youtube.com/@Eurovision) “Most Watched” Top 20 — cumulative chart performance by video (and song roll-ups in packaged data).

**Live site:** https://ruslanbes.github.io/eurovision-top-20/

## Local setup

Requires [uv](https://docs.astral.sh/uv/) (Python 3.12+) and Node.js.

```bash
cd pipeline && uv sync --all-groups
cd ../site && npm install
```

## Run the site locally

```bash
cd site
npm run dev
```

Open the URL shown in the terminal. `npm run dev` copies `data/packaged/` into the site before starting (see `site/scripts/copy-packaged.mjs`).

Production build: `npm run build` (output in `site/dist/`).

## Edit and regenerate data

**Source of truth:** `data/raw/episodes/` — one JSON file per month, named `YYYY-MM.json`. Do not edit `data/processed/` or `data/packaged/` by hand.

Typical monthly workflow:

```bash
cd pipeline

# 1. New month (or edit an existing file by hand)
uv run evtop20 new-episode 2026-06

# 2. Fill ranks — copy from previous month or search the stats corpus
uv run evtop20 add 2026-06 1 +1          # rank 1 ← previous month rank 2
uv run evtop20 add 2026-06 3 netta toy   # fuzzy search (needs process first for corpus)

# 3. Regenerate downstream layers
uv run evtop20 validate
uv run evtop20 process
uv run evtop20 package
```

Then rebuild or refresh the site (`cd site && npm run dev` or `npm run build`).

## Further reading

| Step | What it does |
|------|----------------|
| `validate` | Check episodes against schema and identity rules |
| `process` | Write video stats to `data/processed/alltime/` and `data/processed/recent/` |
| `package` | Write UI-ready JSON to `data/packaged/` (what the site reads) |

Manual title overrides for odd videos: `data/metadata/manual-video-metadata.json`.

Episode format and field rules: [`data/README.md`](data/README.md). Full CLI reference: [`docs/faq/commands.md`](docs/faq/commands.md).

Pushes to `main` run the same validate → process → package → build pipeline and deploy to GitHub Pages.
