# Data

Implementation detail for [ADR-003](../docs/adr/adr-003-data-layers.md): paths, pipeline wiring, layer contracts, and example shapes. **Paths and field names here may change** — ADR-003 states principles only.

Related: [ADR-000](../docs/adr/adr-000-tech-stack.md), [AGENTS.md](../AGENTS.md), `[site/README.md](../site/README.md)`, `[commands.md](../docs/faq/commands.md)`

## Layout & pipeline

```mermaid
flowchart TB
  raw["data/raw/episodes<br/>golden source · hand-edited"]

  subgraph processed["data/processed · raw-derived analytics"]
    alltime["alltime/<br/>cumulative snapshots per episode month"]
  end

  package["package<br/>processed · raw · parsers · external"]

  subgraph packaged["data/packaged · UI-supporting artifacts"]
    direction LR
    subgraph per_video["per-video/"]
      pv_alltime["alltime"]
    end
    subgraph per_song["per-song/"]
      ps_alltime["alltime"]
    end
  end

  prebuild["site/scripts/copy-packaged.mjs"]
  site["site static assets<br/>reads packaged only"]

  raw -->|"validate → process"| processed
  processed --> package
  raw -.-> package
  package --> packaged
  packaged --> prebuild --> site
```




| Path                                        | Role                                                                              | Command                              | Produced by       | Consumed by                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ | ----------------- | -------------------------------------------------------- |
| `raw/episodes/`                             | **Source of truth.** One JSON file per Top 20 episode. Edit by hand.              | `uv run evtop20 new-episode YYYY-MM` | Editors           | Pipeline                                                 |
| `processed/alltime/`                        | Generated stats (do not edit). Cumulative snapshots per episode month.            | `uv run evtop20 process`             | `evtop20 process` | `add` (alltime corpus), notebooks, **input to packaged** |
| `packaged/per-video/`, `packaged/per-song/` | UI-ready JSON (not hand-edited). `per-{video,song}/alltime/`.                     | `uv run evtop20 package`             | `evtop20 package` | Astro / React islands only                               |
| `metadata/`                                 | Hand-maintained lookup tables (e.g. manual video metadata by `youtube_video_id`). | —                                    | Editors           | `package`                                                |
| `external/esc-results/`                     | Vendored ESC results join table (flattened from pinned [EurovisionAPI/dataset](https://github.com/EurovisionAPI/dataset) release). Not hand-edited. | — (flatten script TBD)               | Maintainers       | `package`                                                |
| `schemas/`                                  | JSON Schema for raw episode files.                                                | —                                    | Editors           | `validate`                                               |


**Regeneration:** raw change → validate → process → package.

**CI publish:** validate → process → package → `npm run build` (copy packaged → site static assets) → deploy.

---

## Raw episodes

Top 20 episodes are published monthly. YouTube titles follow:

`Eurovision Top 20: Most Watched – {Month} {Year}`

Example: `Eurovision Top 20: Most Watched – January 2026`

### Filename and period

Name episode files `**YYYY-MM.json`** (e.g. `2026-01.json`). The stem is the file id; `**period`** inside JSON is the canonical calendar month and must match the filename (`year`, `month`).

Always set `period.year` and `period.month` for the month the episode covers.

### Filling a raw episode

1. Open or copy a file in `raw/episodes/` (name it e.g. `2026-01.json`).
2. Set `episode_title` to the full YouTube title.
3. Set `period` (`year`, `month`) for the episode month.
4. Set `youtube_video_id` for the episode video (`""` until known).
5. Fill `video_title` for ranks 1–20 (exact video titles).
6. Set `youtube_video_id` on each ranked entry (`""` until known).

Schema: `schemas/episode.schema.json`.

---

## Processed layer

```text
data/processed/
  alltime/
    eurovision-top-20-alltime-YYYY-MM.json
    eurovision-top-20-alltime-latest.json
```

Cumulative stats: every episode with `period <=` snapshot month; one file per episode month plus `-latest` (no gap-month files).

**Row shape (video grain):** `video_title`, `top1` … `top20`, `chart_points`, `youtube_video_id` — ids not URLs. See `[chart_points.md](../docs/faq/chart_points.md)` for formula and tier meaning.


| Includes                                   | Does not include                       |
| ------------------------------------------ | -------------------------------------- |
| Tier counts, `chart_points`, canonical ids | Pre-built URLs                         |
|                                            | Song-level roll-ups                    |
|                                            | Parsed display labels, ESC final place |


`**add` CLI:** search corpus = latest processed alltime snapshot only. See `[commands.md](../docs/faq/commands.md)`.

---

## Packaged layer

May read **any source**: processed alltime, raw episodes, title parser (`title_parse/`), manual overrides (`data/metadata/`), external ESC datasets.

Layout: see diagram above. **Future (not shipped):** `insights/`, `charts/` under `packaged/`.


| Typical content                                               | Sources                                                                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Augmented alltime video rows (watch URLs, parsed metadata, …) | processed alltime + title parser                                                                                                                 |
| Song stats                                                    | per-video rows + roll-up by case-insensitive `(artist, song)`; `[chart_points](../docs/faq/chart_points.md)` from summed tiers (`song_stats.py`) |
| Insight payloads (heatmaps, winner tables, …)                 | processed + raw + external                                                                                                                       |
| UI flags (e.g. fire-title filter)                             | parser + keyword lists (`[ui-filter-fire-titles.md](../docs/tasks/ui-filter-fire-titles.md)`)                                                    |
| Period index for scrubber                                     | `periods-alltime.json` at site build                                                                                                             |


**Shipped:** `per-video/alltime` and `per-song/alltime` table snapshots. Flexible period windows — [`flexible-period-window.md`](../docs/tasks/flexible-period-window.md). Insights/charts folders still future.

Processed row shape remains unchanged. ESC final place is joined in `package` — `[eurovision-final-place.md](../docs/tasks/eurovision-final-place.md)`.

---

## External data (`external/`)

Third-party snapshots vendored in git for reproducible `package` runs — **no network fetch in CI**.

**ESC results:** `external/esc-results/` — `MANIFEST.json` (pinned EurovisionAPI release tag `2026.4`) + `entries.json` (1795 flat rows). Regenerate with `uv run evtop20 vendor-esc flatten`. `esc_final_place` on packaged rows comes from join in `package` (vendor + `metadata/esc-placement-overrides.json` + `metadata/esc-join-overrides.json`). Codes: numeric rank, `DNQ`, `DQ`, `CANCELLED`, `WITHDRAWN`, `PENDING`, `NON_ENTRY`, `null`. See `[eurovision-final-place.md](../docs/tasks/eurovision-final-place.md#placement-dictionary)`.

---

## Site contract

- Prebuild copies packaged JSON into static assets (`site/scripts/copy-packaged.mjs`).
- Islands fetch packaged snapshots per grain and period (`[site/README.md](../site/README.md)`).
- No id→URL, title→parse, tier math, or song roll-up in the browser.

---

## Open questions


| Topic                                           | Notes                          |
| ----------------------------------------------- | ------------------------------ |
| Packaged subfolder and file names               | Per-widget tasks define shapes |
| Eurovision World URL rule                       | TBD                            |
| `null` vs omit optional fields in packaged JSON | TBD                            |
| Typegen for packaged (site)                     | Hand-written TS in `site/src/` |


