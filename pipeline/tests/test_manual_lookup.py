from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.title_parse import ParsedVideoTitle, parse_video_title
from evtop20.title_parse.extractors_lookup import LOOKUP_TABLE_EXTRACTOR
from evtop20.title_parse.manual_lookup import ManualLookupError, load_manual_video_metadata


def test_load_manual_video_metadata_returns_empty_when_file_missing(
    tmp_path: Path,
) -> None:
    assert load_manual_video_metadata(tmp_path / "missing.json") == {}


def test_load_manual_video_metadata_parses_entry(tmp_path: Path) -> None:
    path = tmp_path / "manual-video-metadata.json"
    path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "entries": [
                    {
                        "youtube_video_id": "abc123xyz01",
                        "artist": "Example Artist",
                        "song": "Example Song",
                        "flag": "🇫🇮",
                        "country": "Finland",
                        "performance_category": "final_live",
                        "year": 2024,
                    }
                ],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    lookup = load_manual_video_metadata(path)

    assert lookup["abc123xyz01"] == ParsedVideoTitle(
        artist="Example Artist",
        song="Example Song",
        flag="🇫🇮",
        country="Finland",
        performance_category="final_live",
        year=2024,
        extractor="lookup_table_v1",
    )


def test_load_manual_video_metadata_rejects_duplicate_ids(tmp_path: Path) -> None:
    path = tmp_path / "manual-video-metadata.json"
    path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "entries": [
                    {
                        "youtube_video_id": "dup00000001",
                        "artist": "A",
                        "song": "S",
                        "flag": "🇫🇮",
                        "country": "Finland",
                        "performance_category": "final_live",
                        "year": 2024,
                    },
                    {
                        "youtube_video_id": "dup00000001",
                        "artist": "B",
                        "song": "T",
                        "flag": "🇪🇪",
                        "country": "Estonia",
                        "performance_category": "final_live",
                        "year": 2025,
                    },
                ],
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(ManualLookupError, match="duplicate youtube_video_id"):
        load_manual_video_metadata(path)


def test_lookup_table_extractor_matches_youtube_video_id(tmp_path: Path) -> None:
    path = tmp_path / "manual-video-metadata.json"
    path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "entries": [
                    {
                        "youtube_video_id": "abc123xyz01",
                        "artist": "Example Artist",
                        "song": "Example Song",
                        "flag": "🇫🇮",
                        "country": "Finland",
                        "performance_category": "final_live",
                        "year": 2024,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    LOOKUP_TABLE_EXTRACTOR.configure(path)
    try:
        result = LOOKUP_TABLE_EXTRACTOR.try_parse(
            "unparseable title that should be ignored",
            "abc123xyz01",
        )
        assert result is not None
        assert result.extractor == "lookup_table_v1"
        assert parse_video_title("unparseable title", "abc123xyz01") == result
        assert LOOKUP_TABLE_EXTRACTOR.try_parse("title", "") is None
    finally:
        LOOKUP_TABLE_EXTRACTOR.configure(None)
