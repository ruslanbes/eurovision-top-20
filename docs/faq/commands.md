# CLI commands

Run pipeline commands from `pipeline/`, or from repo root with `uv run --directory pipeline …`.

Repo root is auto-detected via `data/schemas/episode.schema.json`.

## Pipeline

| Action | Command |
|--------|---------|
| Install | `uv sync --all-groups` |
| Validate raw data | `uv run evtop20 validate` (strips string whitespace in episode files, then checks) |
| New empty episode template | `uv run evtop20 new-episode <YYYY-MM>` (e.g. `2022-05`) |
| Fill episode rank | `uv run evtop20 add <episode> <rank> <delta \| search…>` — see [`add`](#add) below |
| Process (validate + **video** stats + episode index) | `uv run evtop20 process` → `alltime/eurovision-top-20-alltime-YYYY-MM.json` per **episode** month + `-latest`; `episode-index/YYYY-MM.json` per episode month |
| Package (UI-ready JSON) | `uv run evtop20 package` → `data/packaged/` (`per-{video,song}/alltime/` + `query/` sparse window index) |
| Song key normalization audit | `uv run evtop20 audit-song-keys` — near-duplicate `(artist, song)` report on latest packaged alltime video snapshot |
| Vendor ESC results | Clone [EurovisionAPI/dataset](https://github.com/EurovisionAPI/dataset) (tag `2026.5`), then `uv run evtop20 vendor-esc flatten --dataset-dir ~/EurovisionAPI-dataset` |
| Unit tests | `uv run pytest` |

### add

`uv run evtop20 add <episode> <rank> <delta | search…>`

| Third argument | Behavior |
|----------------|----------|
| Delta `-19…19` | Copy from previous month (e.g. `2026-01 3 +1` copies rank 4 from `2025-12`) |
| Search text | Fuzzy search in latest processed alltime corpus (e.g. `2022-06 3 netta toy official`, `2022-06 1 1944`) |

- `--force` overwrites a rank that is already set.
- Search corpus = **latest processed alltime snapshot** only.

## Site

From `site/`:

| Action | Command |
|--------|---------|
| Install | `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |

`predev` / `prebuild` copy packaged data into static assets — see [`site/README.md`](../../site/README.md).

## Typical workflow

Raw edit → `validate` → `process` → `package` → `npm run build` (site).
