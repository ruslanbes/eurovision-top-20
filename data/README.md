# Data

Implementation detail for [ADR-003](../docs/adr/adr-003-data-layers.md): paths, pipeline wiring, layer contracts, and example shapes. **Paths and field names here may change** — ADR-003 states principles only.

Related: [ADR-000](../docs/adr/adr-000-tech-stack.md), [AGENTS.md](../AGENTS.md), `[site/README.md](../site/README.md)`, `[commands.md](../docs/faq/commands.md)`

## Layout & pipeline

```mermaid
flowchart TB
  raw["data/raw/episodes<br/>golden source · hand-edited"]

  subgraph processed["data/processed · raw-derived analytics"]
    alltime["alltime/<br/>cumulative -latest.json only"]
    episode_index["episode-index/<br/>per-episode rank contributions"]
  end

  package["package<br/>processed · raw · parsers · external"]

  subgraph packaged["data/packaged · UI-supporting artifacts"]
    direction LR
    query["query/<br/>sparse window index + meta"]
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
  package --> packaged
  packaged --> prebuild --> site
```




| Path                                        | Role                                                                              | Command                              | Produced by       | Consumed by                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ | ----------------- | -------------------------------------------------------- |
| `raw/episodes/`                             | **Source of truth.** One JSON file per Top 20 episode. Edit by hand.              | `uv run evtop20 new-episode YYYY-MM` | Editors           | Pipeline                                                 |
| `processed/alltime/`                        | Generated stats (do not edit). Cumulative **`-latest.json`** only.            | `uv run evtop20 process`             | `evtop20 process` | `add` (search corpus), **input to packaged** |
| `processed/episode-index/`                  | Per-episode Top 20 rank contributions (not cumulative). One file per episode month. | `uv run evtop20 process`             | `evtop20 process` | `package` (window query index)                           |
| `packaged/per-video/`, `packaged/per-song/` | UI-ready JSON (not hand-edited). `per-{video,song}/alltime/*-latest.json` only. | `uv run evtop20 package`             | `evtop20 package` | Site insights (`-latest`); reference for tools              |
| `packaged/query/`                           | Sparse window query index + static row metadata for flexible period ranges.       | `uv run evtop20 package`             | `evtop20 package` | Site (flexible range UI)                                 |
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

Name episode files `YYYY-MM.json` (e.g. `2026-01.json`). The stem is the file id; `period` inside JSON is the canonical calendar month and must match the filename (`year`, `month`).

Always set `period.year` and `period.month` for the month the episode covers.

### Filling a raw episode

1. Open or copy a file in `raw/episodes/` (name it e.g. `2026-01.json`).
2. Set `episode_title` to the full YouTube title.
3. Set `period` (`year`, `month`) for the episode month.
4. Set `youtube_video_id` for the episode video (`""` until known).
5. Fill all **20 `entries`** — each row is one **entry** (`rank`, `video_title`, `youtube_video_id`). Schema requires exactly 20 ranks per file. The packaged browser adds metadata and marks blank titles as missing entries — see [Episode browser](#episode-browser-packagedepisodes) below.

Schema: `schemas/episode.schema.json`.

---

## Processed layer

```text
data/processed/
  alltime/
    eurovision-top-20-alltime-latest.json
  episode-index/
    YYYY-MM.json
```

### Alltime latest

Cumulative stats through the latest episode month: one **`-latest.json`** file (no per-month files on disk). Tier aggregation still validates every episode month during `process`.

**Row shape (video grain):** `video_title`, `top1` … `top20`, `chart_points`, `youtube_video_id` — ids not URLs. See `[chart_points.md](../docs/faq/chart_points.md)` for formula and tier meaning.

### Episode index

One file per raw episode month. Non-cumulative: only videos that appeared in that episode’s Top 20.

**File shape:**

```json
{
  "period": "2026-01",
  "rows": [
    { "rank": 3, "video_title": "…", "youtube_video_id": "…" }
  ]
}
```

Rows sorted by `video_title`. Ranks 1–20 only; unfilled ranks omitted.


| Includes                                   | Does not include                       |
| ------------------------------------------ | -------------------------------------- |
| Tier counts, `chart_points`, canonical ids | Pre-built URLs                         |
|                                            | Song-level roll-ups                    |
|                                            | Parsed display labels, ESC final place |


`add` CLI: search corpus = latest processed alltime snapshot only. See `[commands.md](../docs/faq/commands.md)`.

---

## Packaged layer

May read **any source**: processed alltime, raw episodes, title parser (`title_parse/`), manual overrides (`data/metadata/`), external ESC datasets.


| Typical content                                               | Sources                                                                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Augmented alltime video rows (watch URLs, parsed metadata, …) | processed alltime + title parser                                                                                                                 |
| Song stats                                                    | per-video rows + roll-up by normalized `(artist, song)` key; `[chart_points](../docs/faq/chart_points.md)` from summed tiers (`song_stats.py`, `song_key_normalize.py`); `package` fails if two song rows share the same `(year, country)` unless `esc_final_place` is `NON_ENTRY` or country is `World` |
| Row order (video + song snapshots, query window)              | `[chart_points](../docs/faq/chart_points.md)` default sort via `sort_keys.py` / `queryWindow.ts`                                                 |
| Window query index (`query/`)                                 | `processed/episode-index/` + latest packaged video enrichment                                                                                    |
| Insight payloads (`insights/` — heatmaps, …)                | processed + raw + external                                                                                                                       |
| Episode browser (`episodes/browser.json`)                   | raw `entries[]` + title parse / ESC join / fire — [`episodes_browser.py`](../pipeline/src/evtop20/episodes_browser.py)                             |
| UI flags (e.g. fire filter)                                   | `metadata/fire.json` allowlist → packaged `fire` boolean                                                                                           |
| Period index for scrubber                                     | `query/video-hits.json` `periods` array (via copy script → `periods-alltime.json`)                                                             |


**Shipped:** `per-video/alltime/*-latest.json`, `per-song/alltime/*-song-stats-latest.json`, `query/` (`video-hits`, `video-meta`, `song-hits`, `song-meta`), and **`episodes/`** (`browser.json` + copied `year-colors.json` for the `/episodes` browser). Flexible period range UI on `/` and `/songs/` uses `query/`; **entry browser on `/episodes/`** — site plugin: [`site/src/components/episodes/README.md`](../site/src/components/episodes/README.md). Future insight payloads (e.g. heatmaps) will live under `packaged/insights/`.

`year-colors.json` lives under `metadata/` (hand-maintained; regenerate with `pipeline/scripts/refresh_year_colors.py`). Copied at `package` to `packaged/episodes/year-colors.json`.

### Episode browser (`packaged/episodes/`)

Built in `package` from raw `entries[]` + title parse / ESC join / fire allowlist (`episodes_browser.py`). Served on **`/episodes/`** — site plugin: [`site/src/components/episodes/README.md`](../site/src/components/episodes/README.md).

| File | Role |
| ---- | ---- |
| `browser.json` | Full timeline: each episode month has length-20 **`entries[]`** (rank 1 → 20) with joined metadata, or `{ "missing": true, "rank": N }` |
| `year-colors.json` | Copy of `metadata/year-colors.json` for contest-year scheme colors |

Top-level shape:

```json
{
  "entry_capacity": 20,
  "episodes": [
    {
      "entries": [ "…20 entry objects…" ],
      "missing": 0,
      "period": "2016-11"
    }
  ],
  "periods": ["2016-09", "…"],
  "version": 1
}
```

Filled entry fields (alphabetical): `artist`, `country`, `esc_final_place`, `fire`, `flag`, `performance_category`, `rank`, `song`, `video_title`, `year`, `youtube_video_id`. No processed-layer artifact — packaged only (ADR-003).

### Query index (`packaged/query/`)

Built from `processed/episode-index/` plus latest packaged video rows for enrichment metadata.

| File | Role |
| ---- | ---- |
| `video-hits.json` | Sparse hits per video: `{ periods, hits: [{ video_title, youtube_video_id, entries: [{ period, rank }] }] }` |
| `video-meta.json` | Window-independent display fields per video (from latest alltime enrichment), including `performance_category` |
| `song-hits.json` | Sparse hits per song: entries `{ period, ranks: […] }` (member-video ranks per episode) |
| `song-meta.json` | Window-independent display fields per song, including `youtube_watch_url` from the canonical member (highest alltime `chart_points`) |

Client aggregates a `[begin, end]` window from these files via `site/src/components/stats/queryWindow.ts` (golden-tested against pipeline).

Processed row shape remains unchanged. ESC final place is joined in `package` — [`esc_final_place.md`](../docs/faq/esc_final_place.md). Video `performance_category` (`final_live`, `national_final`, `official_video`, `special`) is set at title parse from YouTube title segments; unparseable titles use `metadata/manual-video-metadata.json`.

---

## External data (`external/`)

Third-party snapshots vendored in git for reproducible `package` runs — **no network fetch in CI**.

**ESC results:** `external/esc-results/` — `MANIFEST.json` (pinned EurovisionAPI release tag `2026.5`) + `entries.json` (1830 flat rows). Regenerate with `uv run evtop20 vendor-esc flatten`. `esc_final_place` on packaged rows comes from join in `package` (vendor + `metadata/esc-placement-overrides.json` + `metadata/esc-join-overrides.json`). Codes: numeric rank, `DNQ`, `DQ`, `CANCELLED`, `WITHDRAWN`, `PENDING`, `NON_ENTRY`, `null`. See [`esc_final_place.md`](../docs/faq/esc_final_place.md#placement-dictionary).

---

## Site contract

- Prebuild copies packaged JSON into static assets (`site/scripts/copy-packaged.mjs`).
- Islands read **packaged** data only. They may compute derived stats (tier counts, `chart_points`, window aggregation) from packaged payloads when a widget needs it—e.g. `queryWindow.ts` over `packaged/query/` (golden-tested against pipeline).
- Alltime table snapshots under `per-*/alltime/` remain packaged for reference/tools; the site table uses the query index.

Packaged alltime ships **`-latest.json` only** per grain (enriched video rows + song roll-up). Processed alltime also ships **`-latest` only**; flexible ranges use `query/` + client aggregation.

---

## Open questions


| Topic                                           | Notes                          |
| ----------------------------------------------- | ------------------------------ |
| Packaged subfolder and file names               | Per-widget tasks define shapes |
| Eurovision World URL rule                       | TBD                            |
| `null` vs omit optional fields in packaged JSON | TBD                            |
| Typegen for packaged (site)                     | Hand-written TS in `site/src/` |


