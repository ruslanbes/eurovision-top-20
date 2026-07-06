# Development

## Local setup

Requires [uv](https://docs.astral.sh/uv/) (Python 3.14+) and Node.js 22+.

```sh
cd pipeline && uv sync --all-groups
cd ../site && npm install
```

## Run the site locally

```sh
cd site
npm run dev
```

Open the URL shown in the terminal. `npm run dev` copies `data/packaged/` into the site before starting (see `site/scripts/copy-packaged.mjs`).

Production build: `npm run build` (output in `site/dist/`).

## Add new episode

**Source of truth:** `data/raw/episodes/` — one JSON file per month, named `YYYY-MM.json`. Do not edit `data/processed/` or `data/packaged/` by hand.

Typical monthly workflow to add a new episode:

```sh
cd pipeline

# 1. New month
uv run evtop20 new-episode 2026-06

# 2. Fill ranks — copy from previous month or search the stats corpus
uv run evtop20 add 2026-06 1 +1                     # rank 1 ← previous month rank 2
uv run evtop20 add 2026-06 3 netta toy grand final  # fuzzy search

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
| `process` | Write video stats to `data/processed/alltime/` |
| `package` | Write UI-ready JSON to `data/packaged/` (what the site reads) |

Manual title overrides for odd videos: `data/metadata/manual-video-metadata.json`.

Episode format and field rules: [`data/README.md`](data/README.md). Full CLI reference: [`docs/faq/commands.md`](docs/faq/commands.md).

Pushes to `main` run the same validate → process → package → build pipeline and deploy to GitHub Pages.

## Ground rules for development of new features and fixing bugs

- Breaking API changes are acceptable.
- Don't care about backwards compatibility.
- For the static site UI you must design the the data model first. Before implementing anything UI-related always check if the data model is already designed and the samples are generated. 
- When designing data model prefer sorting fields alphabetically unless there is a specific reason to do otherwise.
- Before starting to implement a task, check if there are missing decisions, clarify them first instead of doing the implementation.
- When cutting a version or cleaning shipped work, follow `docs/RELEASE.md` (changelog promotion, backlog + task-file cleanup).

## Reference docs

- `docs/adr/adr-000-tech-stack.md` (tech stack)
- `docs/adr/adr-002-site-visualization.md` (site interactivity libraries)
- `docs/adr/adr-003-data-layers.md` (raw / processed / packaged principles)
- `data/README.md` (paths and shapes)
- `docs/faq/chart_points.md` (`chart_points` formula)
- `docs/faq/esc_final_place.md` (`esc_final_place` codes and join)
- `docs/faq/commands.md` (CLI commands)
- `CHANGELOG.md` (shipped features)
- `docs/RELEASE.md` (release runbook)
