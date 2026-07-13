# Insights

Client-computed analytics blocks for `/insights/`. Each insight is a small TypeScript plugin: load packaged JSON, run `compute`, render a block.

## Layout

| Path | Role |
|------|------|
| `types.ts` | `InsightDefinition`, `InsightContext`, `InsightResult`, section labels |
| `registry.ts` | Ordered list of registered insights |
| `context.ts` | Fetch union of declared `needs` from packaged paths |
| `InsightsPage.tsx` | Load context, run registry, group blocks by section |
| `insights/` | One module per insight (or insight family) |
| `blocks/` | Renderers for each `viewKind` |
| `formatters.ts` | Shared video links, number formatting |

## Plugin registry

Insights use the same plugin-registry pattern as episode schemes — see [`../episodes/README.md`](../episodes/README.md).

Each plugin implements `InsightDefinition<P>`:

| Field | Purpose |
|-------|---------|
| `id` | Stable kebab-case id (e.g. `year-classics-video`) |
| `section` | Page heading group: `year`, `esc_winner`, or `other` |
| `title` | Block heading |
| `grain` | `video` or `song` — documents which row type the insight uses |
| `needs` | Data dependencies (see below) |
| `defaultParams` | Typed thresholds and limits |
| `compute(ctx, params)` | Returns an `InsightResult`, or `null` to skip the block |

`registry.ts` holds `INSIGHT_ORDER` — the display order on the page. Export the definition from your module and append it there.

`InsightsPage` collects all `needs`, loads context once, runs each `compute` with `defaultParams`, and drops blocks that return `null`.

## Data

Site reads **packaged JSON only** ([ADR-003](../../../../docs/adr/adr-003-data-layers.md)). Declare what you need in `needs`:

| `DataNeed` | Loaded from |
|------------|-------------|
| `periodsManifest` | `data/periods-alltime.json` |
| `songHits` | `data/packaged/query/song-hits.json` |
| `videoLatest` | `data/packaged/per-video/alltime/eurovision-top-20-alltime-latest.json` |
| `songLatest` | `data/packaged/per-song/alltime/eurovision-top-20-song-stats-latest.json` |
| `videoHits` | `data/packaged/query/video-hits.json` |

`InsightContext` exposes the parsed payloads plus `latestPeriod` and `periods`.

## Block types (`InsightResult`)

| `viewKind` | Component | Use |
|------------|-----------|-----|
| `highlight` | `HighlightBlock` | Lead sentence + named items (optional links and meta) |
| `table` | `TableBlock` | Fixed columns (year, rank, hit symbol, video link — as configured) |
| `matrix` | `MatrixBlock` | Row × column grid with a color scale |

Pick the shape that matches the insight UI. `InsightBlock` dispatches on `viewKind`.

## ESC winner section (`esc_winner`)

| Insight | Id | Notes |
|---------|-----|-------|
| Build-up rank | `esc-build-up-rank` | Build-up window rank `n of m` per winner, linked to Songs (2022+) |
| Uncrowned | `esc-uncrowned` | Winners since 2017 who never hit #1 in any episode; best rank column |

Shared helpers: `escWinnerData.ts` (rank index, winner lookup, `bestRankForWinnerVideos`).

## Adding an insight

1. **Add a module** under `insights/` — export a pure compute helper if useful for tests, then an `InsightDefinition` (see `yearClassics.ts` or `dominantLeaders.ts` for single-grain vs dual-grain patterns).

2. **Register** the definition in `registry.ts` (`INSIGHT_ORDER`).

3. **Test** — Vitest beside the module or under `src/components/insights/`. Test `compute` with small fixtures; integration tests may read packaged JSON from `data/packaged/`.

4. **Verify** — `npm test` and `npm run build` in `site/`.

### Checklist

- [ ] Unique `id` and correct `section`
- [ ] Only the `needs` you actually use
- [ ] `compute` returns `null` when there is nothing to show
- [ ] Video links use `videoLinkFromVideo` / `songLinkFromSong` from `formatters.ts` when linking to YouTube
- [ ] Block copy (`title`, `lead`, `footnote`) lives in the insight module, not in the block components
- [ ] Row footnotes for insight tables live in `data/metadata/insight-row-footnotes.json` (`label_episodes` and `esc_winner`; applied in `InsightsPage` via `footnoteRules.ts`)

### Params

Thresholds and limits are typed fields on `defaultParams`. URL overrides are not implemented yet — change defaults in code.

## Out of scope (current)

- Precomputed `packaged/insights/` payloads
- Insight param persistence in the URL
- Country-over-time matrix on this page — see [`../episodes/README.md`](../episodes/README.md) (country scheme + Group + focus)
