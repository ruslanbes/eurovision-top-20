from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.fire_allowlist import (
    FireAllowlistError,
    load_fire_allowlist_from_path,
    row_is_fire,
)


def test_load_fire_allowlist_returns_empty_when_file_missing(tmp_path: Path) -> None:
    assert load_fire_allowlist_from_path(tmp_path / "missing.json") == frozenset()


def test_load_fire_allowlist_parses_entries(tmp_path: Path) -> None:
    path = tmp_path / "fire.json"
    path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "entries": [
                    {"youtube_video_id": "abc123xyz01", "notes": "Example"},
                    {"youtube_video_id": "vyDTbJ4wenY"},
                ],
            }
        ),
        encoding="utf-8",
    )
    assert load_fire_allowlist_from_path(path) == frozenset(
        {"abc123xyz01", "vyDTbJ4wenY"}
    )


def test_load_fire_allowlist_rejects_duplicate_ids(tmp_path: Path) -> None:
    path = tmp_path / "fire.json"
    path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "entries": [
                    {"youtube_video_id": "abc123xyz01"},
                    {"youtube_video_id": "abc123xyz01"},
                ],
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(FireAllowlistError, match="duplicate"):
        load_fire_allowlist_from_path(path)


def test_row_is_fire() -> None:
    allowlist = frozenset({"KnKVUztvN3M"})
    assert row_is_fire("KnKVUztvN3M", allowlist) is True
    assert row_is_fire("other0000001", allowlist) is False
    assert row_is_fire("", allowlist) is False
    assert row_is_fire(None, allowlist) is False
