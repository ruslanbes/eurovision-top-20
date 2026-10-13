# Development

How we run this project: ground rules, setup, cleanup, release, and current work tracking.

## Local setup

Requires [uv](https://docs.astral.sh/uv/) (Python 3.14+) and Node.js 22+.

```sh
make install
# or:
#   cd pipeline && uv sync --all-groups
#   cd site && npm install
```

## Run the site locally

```sh
make serve
# or: cd site && npm run dev
```

Open the URL shown in the terminal. `npm run dev` delivers `data/packaged/` into the site before starting (see `site/scripts/deliver-packaged.mjs`).

Production build: `make build` (output in `site/dist/`).

## Add new episode

**Source of truth:** `data/raw/episodes/` — one JSON file per month, named `YYYY-MM.json`. Do not edit `data/processed/` or `data/packaged/` by hand.

Typical monthly workflow:

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
# or from repo root: make data
```

Then rebuild or refresh the site: `make serve` or `make build`.

If all looks good, push to `main`. If you are on a fork, create a Pull Request to the main repository.

| Step | What it does |
|------|----------------|
| `validate` | Check episodes against schema and identity rules |
| `process` | Write video stats to `data/processed/alltime/` |
| `package` | Write UI-ready JSON to `data/packaged/` (what the site reads) |

Manual title overrides for odd videos: `data/metadata/manual-video-metadata.json`.

Episode format and field rules: [`data/README.md`](../data/README.md). Full CLI reference: [`docs/faq/commands.md`](../docs/faq/commands.md).

Pushes to `main` run the same validate → process → package → build pipeline and deploy to GitHub Pages.

## Dependency updates

[Dependabot](https://docs.github.com/en/code-security/dependabot) runs **monthly** for npm (`site/`), uv (`pipeline/`), and GitHub Actions. Updates are **grouped** into at most one open PR per ecosystem (label `dependencies`). Merge by hand after CI is green — no auto-merge. Config: [`.github/dependabot.yml`](../.github/dependabot.yml).

## Ground rules

- Track work here in `dev/` — flat backlog, status, optional task detail files under `tasks/`.
- Work one task at a time unless directed otherwise.
- Before implementing, check for open questions; lock them in the task doc (or an ADR) instead of guessing.
- Use [Mermaid](https://mermaid.js.org/) diagrams when creating documentation.
- Do not invent a tech stack until it is recorded (usually `docs/adr/` + this file’s reference list).
- Breaking API changes are acceptable; do not optimize for backwards compatibility.
- For the static site UI, design the data model first. Before UI work, confirm the data model exists and samples are generated.
- When designing data models, prefer sorting fields alphabetically unless there is a specific reason not to.
- When cleaning finished or cancelled work, follow [`CLEANUP.md`](CLEANUP.md). When cutting a version, follow [`RELEASE.md`](RELEASE.md).

## What's in this folder

| Doc | Role | Lifetime |
|-----|------|----------|
| [`README.md`](README.md) (this file) | Setup, ground rules, doc index | Durable |
| [`CLEANUP.md`](CLEANUP.md) | Promote durable content; remove finished tasks | Durable |
| [`RELEASE.md`](RELEASE.md) | Version changelog, tag | Durable |
| [`BACKLOG.md`](BACKLOG.md) | Flat task index | Living — cleaned via CLEANUP.md |
| [`STATUS.md`](STATUS.md) | Current focus / blockers / session notes | Living — refreshed each session |
| [`tasks/`](tasks/) | Optional detail for a backlog item | Temporary — deleted when the task ships or is cancelled |

## Reference docs

| Doc | Role |
|-----|------|
| [`docs/adr/adr-000-tech-stack.md`](../docs/adr/adr-000-tech-stack.md) | Tech stack |
| [`docs/adr/adr-002-site-visualization.md`](../docs/adr/adr-002-site-visualization.md) | Site interactivity libraries |
| [`docs/adr/adr-003-data-layers.md`](../docs/adr/adr-003-data-layers.md) | raw / processed / packaged principles |
| [`data/README.md`](../data/README.md) | Paths and shapes |
| [`site/README.md`](../site/README.md) | Site routes and data wiring |
| [`docs/faq/chart_points.md`](../docs/faq/chart_points.md) | `chart_points` formula |
| [`docs/faq/esc_final_place.md`](../docs/faq/esc_final_place.md) | `esc_final_place` codes and join |
| [`docs/faq/commands.md`](../docs/faq/commands.md) | CLI commands |
| [`CHANGELOG.md`](../CHANGELOG.md) | Shipped user-facing history |
| [`Makefile`](../Makefile) | Common `make` targets (`serve`, `test`, `data`, …) |
