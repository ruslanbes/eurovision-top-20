from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.aggregate import chart_points_from_tiers
from evtop20.package import run_package
from evtop20.paths import (
    packaged_per_song_alltime_stats_latest_path,
    processed_alltime_dir,
)
from evtop20.query_index import build_song_meta
from evtop20.song_stats import (
    is_eligible_song_rollup_row,
    package_song_stats_payload,
    song_group_key,
    video_stats_basename_to_song_stats_basename,
)
from conftest import (
    write_episode_index_snapshot,
    write_vendored_esc_results,
    write_year_colors,
)


def _video_row(**overrides: object) -> dict:
    row = {
        "video_title": "Artist A - Song One | Norway 🇳🇴 | Grand Final | Eurovision 2020",
        "top1": 1,
        "top3": 2,
        "top5": 3,
        "top10": 4,
        "top20": 5,
        "chart_points": 50,
        "youtube_video_id": "vid000000001",
        "youtube_watch_url": "https://www.youtube.com/watch?v=vid000000001",
        "artist": "Artist A",
        "song": "Song One",
        "flag": "🇳🇴",
        "country": "Norway",
        "performance_category": "final_live",
        "year": 2020,
        "metadata_extractor": "test",
    }
    row.update(overrides)
    return row


def _packaged_payload(*rows: dict) -> dict:
    return {
        "source": "processed/alltime",
        "rows": list(rows),
    }


def test_video_stats_basename_to_song_stats_basename_accepts_alltime() -> None:
    assert (
        video_stats_basename_to_song_stats_basename(
            "eurovision-top-20-alltime-2026-05.json"
        )
        == "eurovision-top-20-song-stats-2026-05.json"
    )


def test_is_eligible_requires_all_metadata_fields() -> None:
    assert is_eligible_song_rollup_row(_video_row())
    assert not is_eligible_song_rollup_row(_video_row(year=None))
    assert not is_eligible_song_rollup_row(_video_row(performance_category=""))


def test_package_song_stats_sums_tiers_for_shared_key() -> None:
    live = _video_row(
        video_title="Artist A - Song One (LIVE) | Norway 🇳🇴 | Grand Final | Eurovision 2020",
        top1=2,
        top3=4,
        top5=6,
        top10=8,
        top20=10,
        chart_points=100,
        performance_category="final_live",
    )
    official = _video_row(
        video_title="Artist A - Song One | Norway 🇳🇴 | Official Music Video | Eurovision 2020",
        top1=1,
        top3=1,
        top5=1,
        top10=1,
        top20=1,
        chart_points=20,
        youtube_video_id="vid000000002",
        performance_category="official_video",
    )

    payload, warnings = package_song_stats_payload(
        _packaged_payload(live, official),
        source="packaged/per-video/alltime",
    )

    assert warnings == []
    assert len(payload["rows"]) == 1
    song = payload["rows"][0]
    assert song["artist"] == "Artist A"
    assert song["song"] == "Song One"
    assert song["top1"] == 3
    assert song["top20"] == 11
    assert song["chart_points"] == 85
    assert payload["source"] == "packaged/per-video/alltime"


def test_package_song_stats_merges_case_insensitive_artist_and_song() -> None:
    lower = _video_row(
        artist="artist a",
        song="song one",
        chart_points=20,
        top1=1,
        top3=1,
        top5=1,
        top10=1,
        top20=1,
    )
    upper = _video_row(
        video_title="Artist A - Song One | Norway 🇳🇴 | Grand Final | Eurovision 2020",
        artist="Artist A",
        song="Song One",
        chart_points=100,
        top1=5,
        top3=5,
        top5=5,
        top10=5,
        top20=5,
        youtube_video_id="vid000000004",
    )

    payload, warnings = package_song_stats_payload(
        _packaged_payload(lower, upper),
        source="packaged/per-video/alltime",
    )

    assert warnings == []
    assert len(payload["rows"]) == 1
    song = payload["rows"][0]
    assert song["artist"] == "Artist A"
    assert song["song"] == "Song One"
    assert song["top1"] == 6
    assert song["chart_points"] == chart_points_from_tiers(song)


def test_package_song_stats_excludes_incomplete_rows() -> None:
    complete = _video_row()
    incomplete = _video_row(
        video_title="Broken title",
        artist=None,
        song=None,
        flag=None,
        country=None,
        performance_category=None,
        year=None,
        metadata_extractor=None,
    )

    payload, warnings = package_song_stats_payload(
        _packaged_payload(complete, incomplete),
        source="packaged/per-video/alltime",
    )

    assert len(payload["rows"]) == 1
    assert any("excluded from song roll-up" in warning for warning in warnings)


def test_package_song_stats_warns_on_country_mismatch() -> None:
    row_a = _video_row(
        video_title="Artist A - Song One | Norway 🇳🇴 | Grand Final | Eurovision 2020",
        country="Norway",
        year=2020,
        chart_points=200,
        top1=10,
        top3=10,
        top5=10,
        top10=10,
        top20=10,
    )
    row_b = _video_row(
        video_title="Artist A - Song One | Sweden 🇸🇪 | Grand Final | Eurovision 2021",
        flag="🇸🇪",
        country="Sweden",
        year=2021,
        chart_points=10,
        top1=0,
        top3=0,
        top5=0,
        top10=0,
        top20=1,
        youtube_video_id="vid000000003",
    )

    payload, warnings = package_song_stats_payload(
        _packaged_payload(row_a, row_b),
        source="packaged/per-video/alltime",
    )

    assert len(payload["rows"]) == 1
    assert payload["rows"][0]["country"] == "Norway"
    assert payload["rows"][0]["year"] == 2020
    assert any("country mismatch" in warning for warning in warnings)
    assert any("year mismatch" in warning for warning in warnings)


def test_song_group_key_is_case_insensitive() -> None:
    row = _video_row(artist="ABBA", song="Waterloo")
    assert song_group_key(row) == ("abba", "waterloo")


def test_package_song_stats_empty_rows_when_all_ineligible() -> None:
    incomplete = _video_row(artist=None, song=None, flag=None, country=None, year=None)

    payload, warnings = package_song_stats_payload(
        _packaged_payload(incomplete),
        source="packaged/per-video/alltime",
    )

    assert payload["rows"] == []
    assert any("excluded from song roll-up" in warning for warning in warnings)
    assert any("produced no rows" in warning for warning in warnings)


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


def _write_processed_snapshot(repo_root: Path, name: str, payload: dict) -> None:
    path = processed_alltime_dir(repo_root) / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def test_run_package_writes_song_stats_snapshots(repo_root: Path) -> None:
    processed_row = {
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
    _write_processed_snapshot(
        repo_root,
        "eurovision-top-20-alltime-latest.json",
        {"rows": [processed_row]},
    )
    write_episode_index_snapshot(
        repo_root,
        "2026-05",
        [
            {
                "rank": 1,
                "video_title": processed_row["video_title"],
                "youtube_video_id": processed_row["youtube_video_id"],
            }
        ],
    )

    message = run_package(repo_root)

    song_latest = json.loads(
        packaged_per_song_alltime_stats_latest_path(repo_root).read_text(
            encoding="utf-8"
        )
    )

    assert len(song_latest["rows"]) == 1
    assert song_latest["rows"][0]["song"] == "Espresso Macchiato"
    assert "generated_at" not in song_latest
    assert "Wrote alltime song stats" in message


def test_build_song_meta_youtube_from_highest_chart_points_member() -> None:
    live = _video_row(
        chart_points=10,
        youtube_video_id="lowvid",
        youtube_watch_url="https://www.youtube.com/watch?v=lowvid",
        performance_category="final_live",
    )
    official = _video_row(
        video_title="Artist A - Song One | Norway 🇳🇴 | Official Music Video | Eurovision 2020",
        chart_points=100,
        youtube_video_id="highvid",
        youtube_watch_url="https://www.youtube.com/watch?v=highvid",
        performance_category="official_music_video",
    )
    payload = build_song_meta([live, official])
    assert len(payload["rows"]) == 1
    row = payload["rows"][0]
    assert row["youtube_video_id"] == "highvid"
    assert row["youtube_watch_url"] == "https://www.youtube.com/watch?v=highvid"


def test_build_song_meta_no_youtube_when_canonical_lacks_url() -> None:
    payload = build_song_meta(
        [
            _video_row(
                youtube_video_id="",
                youtube_watch_url=None,
            )
        ]
    )
    row = payload["rows"][0]
    assert row["youtube_video_id"] == ""
    assert row["youtube_watch_url"] is None
