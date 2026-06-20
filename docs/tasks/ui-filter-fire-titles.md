# ui-filter-fire-titles

Site UI filter: show only rows on a hand-maintained **fire-song allowlist** (`youtube_video_id` in `data/metadata/fire.json`).

Parent: [`stats-table-filters`](stats-table-filters.md)  
Depends on: shipped filter framework, `queryWindow`, URL filter state ([`stats-global-filter-state.md`](stats-global-filter-state.md))  
Related: [ADR-003](../adr/adr-003-data-layers.md), [`data/README.md`](../../data/README.md), [`site/README.md`](../../site/README.md)

**Status:** Done (2026-06-17).

---

## Problem

Eurovision titles use “fire” in many languages (and compounds like Finnish *Liekinheitin*). Keyword matching false-positives (*Paloma*) or misses non-obvious titles. Precompute a boolean in **`package`** from a **manual id allowlist** so the site stays a thin filter toggle ([`data/README.md`](../../data/README.md) — UI flags row).

Full ESC history has ~11 clearly fire-themed song titles (~0.6% of EurovisionAPI entries); the Top-20 chart corpus has **5 of those** as **7 video clips**.

---

## Goal

**Fire songs** filter on stats tables (`/` videos, `/songs/` songs): tap 🔥 to show only rows where packaged `fire` is true (grayscale/dim when off).

---

## Fit with current architecture

### Data layers (ADR-003)

| Layer | Role for this feature |
|-------|------------------------|
| **raw / processed** | Unchanged — tier stats only |
| **packaged** | **Add `fire: boolean`** during `package` (lookup against `data/metadata/fire.json`) |
| **site** | Read `fire` from query meta → window rows; **no client-side keyword list** |

Regeneration: edit allowlist → `uv run evtop20 package` → site prebuild copies `packaged/query/`.

### Where the field lives

**Site path:** `packaged/query/video-meta.json` and `packaged/query/song-meta.json` (via `VIDEO_META_FIELDS` / `SONG_META_FIELDS` in `query_index.py`).

**Also:** `fire` on **per-video alltime** snapshot rows from `augment_stats_row` (tools / parity with other enrichment fields).

The site table loads **`queryWindow`** output, not full alltime snapshots. Meta fields merge in `queryWindow.ts`.

**Not recommended:** separate `facets.json` or filter-index file.

### Pipeline touchpoints

```text
data/metadata/fire.json          ← hand-maintained youtube_video_id list
       ↓
package: id ∈ allowlist → fire = true
       ↓
augment_stats_row → fire
       ↓
run_query_index → video-meta.json (+ song-meta.json)
```

**Video meta:** `fire = true` when row `youtube_video_id` is on the allowlist.

**Song meta:** `fire = true` if **any** eligible member video id is on the allowlist (OR across clips/versions).

### Site touchpoints

| Area | Change |
|------|--------|
| `queryWindow.ts` | Pass through `fire` on window rows |
| `types.ts` | Add `fire: boolean` to row types |
| `filters/types.ts` | Extend `FilterableRow` (shared — both grains) |
| `filters/defs.ts` | New `type: "toggle"` def `id: "fire"` |
| `filters/FilterBar.tsx` | Render `toggle` type (stub exists; no UI yet) |
| `statsUiState.ts` | URL param `fire=1` when on (omit when off) |
| `FILTER_SCOPES` | **`shared`** — same toggle on `/` and `/songs/` |

Filter algebra unchanged: active toggle = constraint; AND with country/year/ESC winner. **On/off only, no chips** (`showChips: false`).

---

## Matching

**Manual allowlist** — no keyword matcher. `data/metadata/fire.json` with `schema_version` + `entries[]`. Each entry: **`youtube_video_id`** (required) + optional **`notes`** (editor comment; not emitted to packaged output). Sort entries by `youtube_video_id`.

### Initial allowlist (334-video corpus, 2026-05)

Five distinct songs, **seven videos**. Populate `notes` on implement (clip type / context):

| `youtube_video_id` | Artist | Song | Year | Notes (implement) |
|--------------------|--------|------|------|-------------------|
| `vyDTbJ4wenY` | Eleni Foureira | Fuego | 2018 | Grand Final (LIVE) |
| `blMwY8Jabyk` | Nutsa Buzaladze | Firefighter | 2024 | Official Music Video |
| `KnKVUztvN3M` | Sarah Engels | Fire | 2026 | Grand Final (LIVE) |
| `1EAUxuuu1w8` | The Roop | On Fire | 2020 | National Final |
| `FxPm-Wz8qpY` | The Roop | On Fire | 2020 | Official Music Video |
| `9bfwNIYb96Q` | Linda Lampenius x Pete Parkkonen | Liekinheitin | 2026 | Official Music Video |
| `CmPkrjTtrwE` | Linda Lampenius x Pete Parkkonen | Liekinheitin | 2026 | Grand Final (LIVE) |

### Adding rows later

When a new fire song enters the Top-20 corpus, add its `youtube_video_id`(s) to `fire.json` and re-run `package`.

---

## Decisions

| Topic | Decision |
|-------|----------|
| Allowlist file | **`data/metadata/fire.json`** |
| Packaged field | **`fire`** (boolean) on query meta + per-video alltime rows |
| Matcher | **`youtube_video_id` allowlist** only |
| Song roll-up | OR across member videos on allowlist |
| Filter scope | **shared** (videos + songs) |
| Filter UX | **🔥 emoji toggle** — tap on/off, no label or chips; dim/grayscale when off |
| URL param | **`fire=1`** when on; omitted when off |
| Allowlist entry shape | **`youtube_video_id` + optional `notes`** |

---

## Done when

- [x] `data/metadata/fire.json` with initial seven ids + notes; loader + pytest
- [x] `fire` on `video-meta.json`, `song-meta.json`, and per-video alltime after `uv run evtop20 package`
- [x] Field flows through `queryWindow.ts` to table rows
- [x] `FilterDefinition` `type: "toggle"` wired in `FilterBar`; on/off only; light/dark OK
- [x] URL param `fire=1` persists across `/` ↔ `/songs/`
- [x] `npm test` + `npm run build` green; pipeline tests for allowlist loader
- [x] Allowlist documented in `data/metadata/README.md`

## Out of scope

- Fuzzy match / translation API / keyword matcher
- `facets.json` or separate filter index artifact
- Insights/charts widgets

---

## Documentation updates (implementation)

- `data/README.md` — UI flag row references `fire` + `fire.json`
- `site/README.md` — URL param `fire=1`
