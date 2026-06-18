# Metadata

Hand-maintained metadata for specific videos.

## `manual-video-metadata.json`

Used by `lookup_table_v1` in the title-parse extractor chain (after all title-pattern extractors).

### Key

**`youtube_video_id`** — must match `youtube_video_id` on raw episode rows and processed/packaged stats.

### Entry fields

| Field | Required | Notes |
|-------|----------|-------|
| `youtube_video_id` | yes | Lookup key |
| `video_title` | no | Copy from corpus; helps humans when editing |
| `artist` | yes | Same shape as packaged output |
| `song` | yes | |
| `flag` | yes | Emoji, e.g. `🇨🇭` |
| `country` | yes | Canonical name, e.g. `Switzerland` |
| `performance_type` | yes | Human-readable, e.g. `Special`, `Grand Final` |
| `year` | yes | Contest edition, integer |
| `notes` | no | Editor comment; not emitted to packaged output |

The extractor sets `metadata_extractor` to `lookup_table_v1` on match.

## Format rules

- **JSON** — one object with `schema_version` and an `entries` array.
- **Sort `entries` by `youtube_video_id`** — stable, readable diffs when adding rows.
- **One entry per video ID** — duplicates are a load error.
- Keep the file small; remove entries when a title-pattern extractor starts handling a row.

## Example entry

```json
{
  "youtube_video_id": "DGsL8hA-1rE",
  "video_title": "Käärijä & Baby Lasagna - #eurodab - …",
  "artist": "Käärijä & Baby Lasagna",
  "song": "#eurodab",
  "flag": "🇨🇭",
  "country": "Switzerland",
  "performance_type": "Special",
  "year": 2025
}
```

## Package-only ESC metadata

These files are read in `package` only — not during title parse.

### `esc-placement-overrides.json`

Direct `youtube_video_id` → `esc_final_place` when vendor join cannot apply (missing vendor row, non-entry clip, withdrawn entry).

| Field | Required | Notes |
|-------|----------|-------|
| `youtube_video_id` | yes | Lookup key |
| `esc_final_place` | yes | Numeric rank or special code (`NON_ENTRY`, `WITHDRAWN`, …) |
| `notes` | no | Editor comment |

### `esc-join-overrides.json`

Map a `youtube_video_id` to a **contest edition** when title/metadata artist or song cannot match the vendor row (e.g. MESC NF titles with producer name as artist).

| Field | Required | Notes |
|-------|----------|-------|
| `youtube_video_id` | yes | Lookup key |
| `contest_year` | yes | ESC edition year |
| `country_code` | yes | EurovisionAPI code (e.g. `MT`) — one entry per country per year |
| `notes` | no | Editor comment |

**Join order in `package`:** placement overrides → join overrides → vendor automatic join.


