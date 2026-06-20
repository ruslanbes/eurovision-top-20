from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.episode_index import build_episode_contributions, run_episode_index
from evtop20.paths import packaged_per_video_alltime_stats_latest_path
from evtop20.periods import ordered_period_labels
from evtop20.query_index import (
    build_video_hits,
    load_query_payloads,
    run_query_index,
)
from evtop20.song_stats import is_eligible_song_rollup_row
from evtop20.window import (
    aggregate_song_hits,
    aggregate_video_hits,
    window_stats,
    window_stats_from_cumulative,
    window_stats_from_episodes,
)


def _real_repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _require_real_corpus() -> Path:
    repo_root = _real_repo_root()
    if not (repo_root / "data" / "raw" / "episodes").is_dir():
        pytest.skip("real corpus not available")
    if not (repo_root / "data" / "processed" / "alltime").is_dir():
        pytest.skip("processed alltime not available")
    if not (repo_root / "data" / "packaged" / "query" / "video-hits.json").is_file():
        pytest.skip("packaged query index not available")
    if not packaged_per_video_alltime_stats_latest_path(repo_root).is_file():
        pytest.skip("packaged alltime not available")
    return repo_root


def _row_map(rows: list[dict], *, grain: str) -> dict[str, dict]:
    if grain == "video":
        return {row["video_title"]: row for row in rows}
    return {f'{row["artist"]}\0{row["song"]}': row for row in rows}


def _assert_window_rows_match(
    left: list[dict],
    right: list[dict],
    *,
    grain: str,
) -> None:
    left_map = _row_map(left, grain=grain)
    right_map = _row_map(right, grain=grain)
    assert left_map.keys() == right_map.keys()
    tier_fields = ("top1", "top3", "top5", "top10", "top20", "chart_points")
    for key in left_map:
        for field in tier_fields:
            assert left_map[key][field] == right_map[key][field], (
                f"{key} {field}: {left_map[key][field]} != {right_map[key][field]}"
            )


@pytest.fixture(scope="module")
def repo_root() -> Path:
    return _require_real_corpus()


@pytest.fixture(scope="module")
def periods(repo_root: Path) -> list[str]:
    return ordered_period_labels(repo_root)


@pytest.fixture(scope="module")
def query_payloads(repo_root: Path) -> dict[str, dict]:
    run_episode_index(repo_root)
    run_query_index(repo_root)
    return load_query_payloads(repo_root)


@pytest.mark.parametrize(
    ("begin", "end"),
    [
        ("2016-09", "2026-05"),
        ("2024-01", "2024-01"),
        ("2017-01", "2018-06"),
        ("2020-03", "2023-12"),
        ("2019-06", "2025-04"),
    ],
)
def test_window_sources_match(
    repo_root: Path,
    periods: list[str],
    query_payloads: dict[str, dict],
    begin: str,
    end: str,
) -> None:
    from_episodes = window_stats_from_episodes(
        repo_root, begin=begin, end=end, periods=periods
    )
    from_cumulative = window_stats_from_cumulative(
        repo_root, begin=begin, end=end, periods=periods
    )
    from_query = aggregate_video_hits(
        query_payloads["video_hits"],
        query_payloads["video_meta"],
        begin=begin,
        end=end,
    )

    _assert_window_rows_match(from_episodes, from_cumulative, grain="video")
    _assert_window_rows_match(from_episodes, from_query, grain="video")


def test_full_window_matches_alltime_latest(
    repo_root: Path,
    periods: list[str],
    query_payloads: dict[str, dict],
) -> None:
    begin, end = periods[0], periods[-1]
    window_rows = aggregate_video_hits(
        query_payloads["video_hits"],
        query_payloads["video_meta"],
        begin=begin,
        end=end,
    )
    latest_payload = json.loads(
        packaged_per_video_alltime_stats_latest_path(repo_root).read_text(
            encoding="utf-8"
        )
    )
    latest_by_title = {
        row["video_title"]: row for row in latest_payload["rows"]
    }
    window_by_title = {row["video_title"]: row for row in window_rows}
    assert set(latest_by_title) == set(window_by_title)
    tier_fields = ("top1", "top3", "top5", "top10", "top20", "chart_points")
    for title in latest_by_title:
        for field in tier_fields:
            assert window_by_title[title][field] == latest_by_title[title][field]


def test_song_hits_match_video_rollup(
    repo_root: Path,
    periods: list[str],
    query_payloads: dict[str, dict],
) -> None:
    begin, end = "2019-01", "2024-06"
    video_rows = aggregate_video_hits(
        query_payloads["video_hits"],
        query_payloads["video_meta"],
        begin=begin,
        end=end,
    )
    song_rows = aggregate_song_hits(
        query_payloads["song_hits"],
        query_payloads["song_meta"],
        begin=begin,
        end=end,
    )

    eligible_videos = [
        row for row in video_rows if is_eligible_song_rollup_row(row)
    ]
    grouped: dict[tuple[str, str], dict[str, int]] = {}
    tier_fields = ("top1", "top3", "top5", "top10", "top20")
    for row in eligible_videos:
        key = (row["artist"].casefold(), row["song"].casefold())
        if key not in grouped:
            grouped[key] = {field: 0 for field in tier_fields}
        for field in tier_fields:
            grouped[key][field] += row[field]

    song_map = {
        (row["artist"].casefold(), row["song"].casefold()): row for row in song_rows
    }
    assert set(grouped) == set(song_map)
    for key, tiers in grouped.items():
        for field in tier_fields:
            assert song_map[key][field] == tiers[field]


def test_song_hit_entries_use_ranks_array(query_payloads: dict[str, dict]) -> None:
    hits = query_payloads["song_hits"]["hits"]
    assert hits
    entry = hits[0]["entries"][0]
    assert "ranks" in entry
    assert isinstance(entry["ranks"], list)
    assert all(isinstance(rank, int) and 1 <= rank <= 20 for rank in entry["ranks"])
    assert "top1" not in entry


def test_episode_contributions_have_ranks_1_to_20(repo_root: Path) -> None:
    contributions = build_episode_contributions(repo_root)
    assert len(contributions) >= 100
    for contribution in contributions[:5]:
        rows = contribution["rows"]
        assert rows
        assert all(1 <= row["rank"] <= 20 for row in rows)
        assert rows == sorted(rows, key=lambda row: row["video_title"].casefold())


def test_video_hits_entry_count_matches_contributions(repo_root: Path) -> None:
    contributions = build_episode_contributions(repo_root)
    video_hits = build_video_hits(contributions)
    contribution_entries = sum(len(c["rows"]) for c in contributions)
    hit_entries = sum(len(hit["entries"]) for hit in video_hits["hits"])
    assert contribution_entries == hit_entries


def test_window_stats_query_shape(repo_root: Path, periods: list[str]) -> None:
    rows = window_stats(
        repo_root,
        begin=periods[0],
        end=periods[-1],
        grain="video",
        source="query",
    )
    assert rows
    assert {"video_title", "chart_points", "top1", "top20"} <= set(rows[0])
