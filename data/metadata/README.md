# Manual video metadata

Hand-maintained metadata for videos whose **YouTube titles** cannot be parsed automatically.

Used by `lookup_table_v1` in the title-parse extractor chain (after all title-pattern extractors).

## File

`manual-video-metadata.json`

## Key

**`youtube_video_id`** — must match `youtube_video_id` on raw episode rows and processed/packaged stats.

## Entry fields

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
