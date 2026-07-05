from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.package import (
    PackageError,
    augment_stats_row,
    package_alltime_payload,
    run_package,
)
from evtop20.paths import (
    packaged_per_video_alltime_stats_latest_path,
    packaged_query_dir,
    processed_alltime_dir,
)
from conftest import write_episode_index_snapshot, write_vendored_esc_results, write_year_colors


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
    return {"rows": list(rows)}


def test_augment_stats_row_adds_metadata_and_watch_url() -> None:
    row = _processed_row()
    packaged = augment_stats_row(row)

    assert packaged["artist"] == "Tommy Cash"
    assert packaged["song"] == "Espresso Macchiato"
    assert packaged["flag"] == "🇪🇪"
    assert packaged["country"] == "Estonia"
    assert "performance_type" not in packaged
    assert packaged["performance_category"] == "official_video"
    assert packaged["year"] == 2025
    assert packaged["metadata_extractor"] == "pipe_four_segment_v1"
    assert packaged["youtube_watch_url"] == "https://www.youtube.com/watch?v=abc123xyz01"
    assert packaged["fire"] is False
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
    assert "performance_type" not in packaged
    assert packaged["performance_category"] is None
    assert packaged["year"] is None
    assert packaged["metadata_extractor"] is None
    assert packaged["youtube_watch_url"] is None
    assert packaged["esc_final_place"] is None


def test_augment_stats_row_sets_fire_from_allowlist() -> None:
    row = _processed_row(youtube_video_id="KnKVUztvN3M")
    packaged = augment_stats_row(row, fire_allowlist=frozenset({"KnKVUztvN3M"}))
    assert packaged["fire"] is True


def test_package_alltime_payload_sets_source() -> None:
    payload, parsed_count, unparsed_titles = package_alltime_payload(
        _processed_payload(_processed_row())
    )

    assert "generated_at" not in payload
    assert payload["source"] == "processed/alltime"
    assert len(payload["rows"]) == 1
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
    write_vendored_esc_results(tmp_path)
    write_year_colors(tmp_path)
    return tmp_path


def _write_processed_snapshot(repo_root: Path, name: str, payload: dict) -> Path:
    path = processed_alltime_dir(repo_root) / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def test_run_package_writes_alltime_latest(repo_root: Path) -> None:
    row = _processed_row()
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
    write_episode_index_snapshot(
        repo_root,
        "2026-05",
        [
            {
                "rank": 1,
                "video_title": row["video_title"],
                "youtube_video_id": row["youtube_video_id"],
            }
        ],
    )

    message = run_package(repo_root)

    latest = json.loads(stale_path.read_text(encoding="utf-8"))

    assert latest["rows"][0]["artist"] == "Tommy Cash"
    assert latest["rows"][0]["performance_category"] == "official_video"
    assert "performance_type" not in latest["rows"][0]
    assert not stale_period.exists()
    assert "Title metadata (alltime latest): 1/1 rows parsed" in message
    assert "query/video-hits.json" in message


def test_run_package_writes_query_index(repo_root: Path) -> None:
    row = _processed_row()
    _write_processed_snapshot(
        repo_root,
        "eurovision-top-20-alltime-latest.json",
        _processed_payload(row),
    )
    write_episode_index_snapshot(
        repo_root,
        "2026-05",
        [
            {
                "rank": 1,
                "video_title": row["video_title"],
                "youtube_video_id": row["youtube_video_id"],
            }
        ],
    )

    message = run_package(repo_root)

    video_hits = json.loads(
        (packaged_query_dir(repo_root) / "video-hits.json").read_text(encoding="utf-8")
    )
    song_hits = json.loads(
        (packaged_query_dir(repo_root) / "song-hits.json").read_text(encoding="utf-8")
    )

    assert "query/song-meta.json" in message
    assert video_hits["periods"] == ["2026-05"]
    assert video_hits["hits"][0]["entries"] == [{"period": "2026-05", "rank": 1}]
    assert song_hits["hits"][0]["entries"] == [{"period": "2026-05", "ranks": [1]}]


def test_run_package_requires_processed_alltime(repo_root: Path) -> None:
    with pytest.raises(PackageError, match="run process first"):
        run_package(repo_root)
