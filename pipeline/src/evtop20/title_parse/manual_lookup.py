from __future__ import annotations

import json
from pathlib import Path

from evtop20.title_parse.models import ParsedVideoTitle

LOOKUP_EXTRACTOR_NAME = "lookup_table_v1"
METADATA_FIELDS = (
    "artist",
    "song",
    "flag",
    "country",
    "performance_type",
    "year",
)


class ManualLookupError(Exception):
    pass


def load_manual_video_metadata(path: Path) -> dict[str, ParsedVideoTitle]:
    if not path.is_file():
        return {}

    payload = json.loads(path.read_text(encoding="utf-8"))
    entries = payload.get("entries")
    if not isinstance(entries, list):
        msg = f"{path}: entries must be a list"
        raise ManualLookupError(msg)

    lookup: dict[str, ParsedVideoTitle] = {}
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            msg = f"{path}: entries[{index}] must be an object"
            raise ManualLookupError(msg)

        video_id = entry.get("youtube_video_id")
        if not isinstance(video_id, str) or not video_id.strip():
            msg = f"{path}: entries[{index}].youtube_video_id must be a non-empty string"
            raise ManualLookupError(msg)

        video_id = video_id.strip()
        if video_id in lookup:
            msg = f"{path}: duplicate youtube_video_id {video_id!r}"
            raise ManualLookupError(msg)

        values: dict[str, object] = {}
        for field in METADATA_FIELDS:
            value = entry.get(field)
            if field == "year":
                if not isinstance(value, int):
                    msg = f"{path}: entries[{index}].year must be an integer"
                    raise ManualLookupError(msg)
                values[field] = value
                continue
            if not isinstance(value, str) or not value.strip():
                msg = f"{path}: entries[{index}].{field} must be a non-empty string"
                raise ManualLookupError(msg)
            values[field] = value.strip()

        parsed = ParsedVideoTitle(
            artist=str(values["artist"]),
            song=str(values["song"]),
            flag=str(values["flag"]),
            country=str(values["country"]),
            performance_type=str(values["performance_type"]),
            year=int(values["year"]),
            extractor=LOOKUP_EXTRACTOR_NAME,
        )
        if not parsed.is_complete():
            msg = f"{path}: entries[{index}] is incomplete"
            raise ManualLookupError(msg)
        lookup[video_id] = parsed

    return lookup
