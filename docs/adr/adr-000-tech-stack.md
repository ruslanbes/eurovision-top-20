# ADR-000: Tech stack

- **Status:** Accepted
- **Date:** 2026-06-09
- **Related:** [ADR-002](adr-002-site-visualization.md), [ADR-003](adr-003-data-layers.md)

## Context

Eurovision Top 20 is a personal hobby project that:

- Stores raw episode data as files in git, updated monthly
- Aggregates rankings into a statistics table (rows = video titles, columns = Top 1 / 3 / 5 / 10 / 20 counts)
- Publishes an interactive static **per-video** stats table on GitHub Pages; later adds a **second per-song** table — both remain available
- Publishes machine-readable derived data as JSON (site and git)
- Will later add **Eurovision final-place** joins (`[eurovision-final-place.md](../tasks/eurovision-final-place.md)`) and timelapse charts (Beta). Song-level stats and packaged paths: `[data/README.md](../../data/README.md)`.

Data volume is small (dozens of episodes, ~20 entries each). Priorities are git-diffable raw data, simple monthly recalculation, and low operational overhead — not big-data infrastructure.

## Decision

### Parser and aggregator


| Area              | Choice                                                        |
| ----------------- | ------------------------------------------------------------- |
| Language          | **Python 3.12**                                               |
| Package manager   | **uv**                                                        |
| Build backend     | **hatchling** (PEP 621 `pyproject.toml`)                      |
| CLI               | **typer** (or stdlib `argparse` if a single command suffices) |
| Data transforms   | **pandas**                                                    |
| Schema validation | **pydantic**                                                  |
| Tests             | **pytest**                                                    |


Python package lives in `pipeline/` with a CLI entry point (`validate`, `process`, `package`, `add`, …).

### Publishing and visualization


| Area               | Choice                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| Site generator     | **Astro** (static)                                                                                    |
| Interactive tables | **TanStack Table** in React islands — Alpha: per-video table; Beta: add per-song table (both on site) |
| Styling            | **Tailwind CSS** (or plain CSS if preferred during implementation)                                    |
| Build tool         | **Vite** (via Astro)                                                                                  |
| Hosting            | **GitHub Pages**                                                                                      |
| CI/CD              | **GitHub Actions** — aggregate, build site, deploy `dist/`                                            |


### Publishing workflow

1. Add or edit `data/raw/episodes/*.json`
2. Validate and generate files fr the site
3. Commit raw + generated artifacts
4. CI verifies aggregate, builds and deploys to GitHub Pages

