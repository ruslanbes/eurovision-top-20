# song-stats-youtube-link

Link each **song** row on `/songs/` to a YouTube watch URL, chosen from that song’s member video with the **highest alltime `chart_points`**.

Parent: `scaffold-project`  
Depends on: shipped song/video query index (`queryWindow`, `song-meta.json`, `video-meta.json`)  
Related: [`stats-table-filters.md`](stats-table-filters.md), [ADR-003](../adr/adr-003-data-layers.md), [`site/README.md`](../../site/README.md), [`chart_points.md`](../faq/chart_points.md)

**Status:** Done

---

## Problem

On `/songs/`, the **Song** column shows plain text (`Artist — Song`). On `/`, the **Video** column already links to YouTube when `youtube_watch_url` is present.

Users expect the song title to open a representative clip. The simplest rule: link to whichever member video performed best on the Top-20 chart.

---

## Goal

Make the song label a link (`target="_blank"`, same styling as video table links) when the top-scoring member has a YouTube URL.

When no member has a URL, keep plain text (same as video rows without `youtube_watch_url`).

---

## Link selection (product)

Among all **eligible song roll-up member videos** for `(artist, song)`, pick the member with the highest alltime **`chart_points`**.

**Tie-break** (same member already used for song canonical metadata): `top1` → `top3` → `top5` → `top10` → `top20` → `video_title` (case-insensitive). Same as `_member_precedence_key` / `_canonical_member` in `song_stats.py`.

No clip-type ranking (grand final vs OMV vs semi-final). Chart performance only.

---

## Current architecture

```text
latest per-video alltime rows
       ↓
build_video_meta → video-meta.json (has youtube_watch_url, chart_points, artist, song)
       ↓
build_song_meta  → song-meta.json (artist, song, flag, country, year, esc_final_place, fire)
       ↓
querySongWindow  → SongStatsRow (no youtube fields today)
       ↓
StatsTable       → Song column: plain text only
```

Song roll-up already groups member videos by `(artist, song)` in `build_song_meta`. Canonical member selection already uses chart-points precedence — link pick can reuse that member’s `youtube_watch_url`.

---

## Recommended approach

**Compute link at package/index time** in `build_song_meta` and emit on `song-meta.json`.

### Why package-time

- Song table stays thin — read one URL field like video rows.
- Reuses existing canonical-member logic; one pytest surface.
- No client join over full `video-meta.json` on every window query.

### Fields to add

On `song-meta.json` rows (alphabetical):

| Field | Type | Notes |
|-------|------|-------|
| `youtube_video_id` | string or omit | Canonical member id; omit when no link |
| `youtube_watch_url` | string or null | Same shape as video-meta |

Regenerate: `uv run evtop20 package` → site prebuild copies `packaged/query/`.

### Alternative (not recommended v1)

Site-side join in `querySongWindow`: load `video-meta.json`, group by `(artist, song)`, pick max `chart_points` in TypeScript. Duplicates logic already in pipeline.

---

## Site touchpoints

| Area | Change |
|------|--------|
| `pipeline/.../query_index.py` | Set link from canonical member in `build_song_meta`; extend `SONG_META_FIELDS` |
| `pipeline/.../song_stats.py` | Reuse `_canonical_member` (or thin wrapper) for link source |
| `site/.../queryWindow.ts` | Pass through `youtube_watch_url` / `youtube_video_id` on `WindowSongRow` |
| `site/.../types.ts` | Add youtube fields to `SongStatsRow` |
| `site/.../StatsTable.tsx` | Song column: link when `youtube_watch_url` set (mirror video column) |

Link choice is **static per song** from latest alltime member stats — **not** recomputed from the episode window. Window only affects displayed tier counts on the song row.

---

## UX

- Link text: `{artist} — {song}` (unchanged label).
- Same `<a>` classes as video table (`text-accent hover:underline`, `rel="noopener noreferrer"`).
- No chip, tooltip, or “which clip” indicator in v1.

---

## Decisions

| Topic | Decision |
|-------|----------|
| Scope | `/songs/` song table only |
| URL source | `youtube_watch_url` of canonical member (highest `chart_points`) |
| Selection rule | Max `chart_points`; tie-break = existing `_member_precedence_key` |
| Window interaction | Link independent of selected episode range |
| Packaged field | `youtube_watch_url` (+ `youtube_video_id`) on `song-meta.json` |

---

## Open questions

_None blocking v1._ Optional later:

- Show which clip was linked (icon / subtitle).
- Manual override keyed by `(artist, song)` for edge cases.

---

## Done when

- [x] `build_song_meta` sets link from canonical member; pytest covers pick + tie-break
- [x] `song-meta.json` includes `youtube_watch_url` (and `youtube_video_id` when linked)
- [x] `querySongWindow` + `SongStatsRow` expose the URL
- [x] `/songs/` **Song** column links when URL present; plain text otherwise
- [x] Spot-check: multi-clip song links to member with highest alltime chart points
- [x] `uv run pytest` + `npm test` + `npm run build` green
- [x] `data/README.md` or `site/README.md` note on song link field

## Out of scope (v1)

- Linking on video table (already shipped)
- Clip-type preference (grand final / OMV / semi)
- User-configurable clip preference
- Deep-linking to timestamp within a video
- Song grain filter for “has YouTube link”
