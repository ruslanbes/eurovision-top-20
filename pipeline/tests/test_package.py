from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.package import (
    PackageError,
    augment_stats_row,
    package_alltime_payload,
    package_recent_payload,
    run_package,
)
from evtop20.paths import (
    packaged_per_video_alltime_stats_latest_path,
    packaged_per_video_recent_stats_latest_path,
    processed_alltime_dir,
    processed_recent_dir,
)


def _processed_row(**overrides: object) -> dict:
    row = {
        "video_title": (
            "Tommy Cash - Espresso Macchiato | Estonia 🇪🇪 | "
            "Official Music Video | #Eurovision2025"
        ),
        "top1": 1,
        "top3": 2,
        "top5": 3,
        "top10": 4,
        "top20": 5,
        "chart_points": 10,
        "youtube_video_id": "abc123xyz01",
    }
    row.update(overrides)
    return row


def _processed_payload(*rows: dict) -> dict:
    return {
        "generated_at": "2026-06-15",
        "rows": list(rows),
    }


def test_augment_stats_row_adds_metadata_and_watch_url() -> None:
    row = _processed_row()
    packaged = augment_stats_row(row)

    assert packaged["artist"] == "Tommy Cash"
    assert packaged["song"] == "Espresso Macchiato"
    assert packaged["flag"] == "🇪🇪"
    assert packaged["country"] == "Estonia"
    assert packaged["performance_type"] == "Official Music Video"
    assert packaged["year"] == 2025
    assert packaged["metadata_extractor"] == "pipe_four_segment_v1"
    assert packaged["youtube_watch_url"] == "https://www.youtube.com/watch?v=abc123xyz01"
    assert packaged["top1"] == 1
    assert packaged["chart_points"] == 10


def test_augment_stats_row_leaves_null_metadata_when_unparsed() -> None:
    row = _processed_row(
        video_title="Käärijä & Baby Lasagna - #eurodab | #UnitedByMusic 🇨🇭",
        youtube_video_id="",
    )
    packaged = augment_stats_row(row)

    assert packaged["artist"] is None
    assert packaged["song"] is None
    assert packaged["flag"] is None
    assert packaged["country"] is None
    assert packaged["performance_type"] is None
    assert packaged["year"] is None
    assert packaged["metadata_extractor"] is None
    assert packaged["youtube_watch_url"] is None


def test_package_alltime_payload_preserves_generated_at() -> None:
    payload, parsed_count, unparsed_titles = package_alltime_payload(
        _processed_payload(_processed_row())
    )

    assert payload["generated_at"] == "2026-06-15"
    assert payload["source"] == "processed/alltime"
    assert len(payload["rows"]) == 1
    assert parsed_count == 1
    assert unparsed_titles == set()


def test_package_recent_payload_preserves_window() -> None:
    payload, parsed_count, unparsed_titles = package_recent_payload(
        {
            "generated_at": "2026-06-15",
            "window": {
                "years": 5,
                "anchor_period": "2026-05",
                "episode_count": 59,
                "first_period": "2021-06",
                "last_period": "2026-05",
            },
            "rows": [_processed_row()],
        }
    )

    assert payload["source"] == "processed/recent"
    assert payload["window"]["anchor_period"] == "2026-05"
    assert parsed_count == 1
    assert unparsed_titles == set()


@pytest.fixture
def repo_root(tmp_path: Path) -> Path:
    schema_src = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "schemas"
        / "episode.schema.json"
    )
    schema_dst = tmp_path / "data" / "schemas" / "episode.schema.json"
    schema_dst.parent.mkdir(parents=True)
    schema_dst.write_text(schema_src.read_text(encoding="utf-8"), encoding="utf-8")
    return tmp_path


def _write_processed_snapshot(
    repo_root: Path, name: str, payload: dict, *, variant: str = "alltime"
) -> Path:
    processed_dir = (
        processed_alltime_dir(repo_root)
        if variant == "alltime"
        else processed_recent_dir(repo_root)
    )
    path = processed_dir / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def test_run_package_writes_alltime_snapshots(repo_root: Path) -> None:
    row = _processed_row()
    _write_processed_snapshot(
        repo_root,
        "eurovision-top-20-alltime-2026-05.json",
        _processed_payload(row),
    )
    _write_processed_snapshot(
        repo_root,
        "eurovision-top-20-alltime-latest.json",
        _processed_payload(row),
    )
    stale_path = packaged_per_video_alltime_stats_latest_path(repo_root)
    stale_path.parent.mkdir(parents=True, exist_ok=True)
    stale_path.write_text('{"rows": []}\n', encoding="utf-8")
    stale_period = stale_path.with_name("eurovision-top-20-alltime-2025-12.json")
    stale_period.write_text('{"rows": []}\n', encoding="utf-8")

    message = run_package(repo_root)

    latest = json.loads(stale_path.read_text(encoding="utf-8"))
    period = json.loads(
        (
            packaged_per_video_alltime_stats_latest_path(repo_root).with_name(
                "eurovision-top-20-alltime-2026-05.json"
            )
        ).read_text(encoding="utf-8")
    )

    assert latest["rows"][0]["artist"] == "Tommy Cash"
    assert period["rows"][0]["performance_type"] == "Official Music Video"
    assert not stale_period.exists()
    assert "Title metadata (alltime latest): 1/1 rows parsed" in message


def test_run_package_writes_recent_snapshots(repo_root: Path) -> None:
    row = _processed_row()
    window = {
        "years": 5,
        "anchor_period": "2026-05",
        "episode_count": 1,
        "first_period": "2026-05",
        "last_period": "2026-05",
    }
    recent_payload = {"generated_at": "2026-06-15", "window": window, "rows": [row]}
    _write_processed_snapshot(
        repo_root,
        "eurovision-top-20-alltime-latest.json",
        _processed_payload(row),
    )
    _write_processed_snapshot(
        repo_root,
        "eurovision-top-20-recent-latest.json",
        recent_payload,
        variant="recent",
    )

    message = run_package(repo_root)

    recent_latest = json.loads(
        packaged_per_video_recent_stats_latest_path(repo_root).read_text(
            encoding="utf-8"
        )
    )

    assert recent_latest["source"] == "processed/recent"
    assert recent_latest["window"] == window
    assert recent_latest["rows"][0]["artist"] == "Tommy Cash"
    assert "recent snapshots" in message


def test_run_package_requires_processed_alltime(repo_root: Path) -> None:
    with pytest.raises(PackageError, match="run process first"):
        run_package(repo_root)
