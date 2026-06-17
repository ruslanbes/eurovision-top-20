from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.aggregate import (
    aggregate_video_stats,
    chart_points_from_tiers,
    recent_window_cutoff,
    run_aggregate,
    tiers_for_rank,
    validate_stats_payload,
)
from evtop20.process import ProcessError, run_process
from evtop20.paths import (
    processed_alltime_stats_latest_path,
    processed_alltime_stats_period_path,
    processed_recent_stats_latest_path,
    processed_recent_stats_period_path,
)


def _episode(
    *,
    year: int,
    month: int,
    entries_by_rank: dict[int, dict] | None = None,
) -> dict:
    entries = []
    for rank in range(1, 21):
        if entries_by_rank and rank in entries_by_rank:
            entry = entries_by_rank[rank]
        else:
            entry = {"video_title": "", "youtube_video_id": ""}
        entries.append({"rank": rank, **entry})
    return {
        "episode_title": f"Eurovision Top 20 {year}-{month:02d}",
        "period": {"year": year, "month": month},
        "youtube_video_id": "",
        "entries": entries,
    }


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


def _write_episode(repo_root: Path, name: str, data: dict) -> Path:
    episodes_dir = repo_root / "data" / "raw" / "episodes"
    episodes_dir.mkdir(parents=True, exist_ok=True)
    path = episodes_dir / name
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return path


def _aggregate_rows(repo_root: Path) -> list[dict]:
    payload, _ = aggregate_video_stats(repo_root)
    return payload["rows"]


def _row_by_title(rows: list[dict], title: str) -> dict:
    return next(row for row in rows if row["video_title"] == title)


def test_tiers_for_rank() -> None:
    assert tiers_for_rank(1) == ["top1", "top3", "top5", "top10", "top20"]
    assert tiers_for_rank(10) == ["top10", "top20"]
    assert tiers_for_rank(20) == ["top20"]


def test_rank_1_increments_all_tiers(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={
                1: {
                    "video_title": "Song A",
                    "youtube_video_id": "aaaaaaaaaaa",
                },
            },
        ),
    )
    row = _row_by_title(_aggregate_rows(repo_root), "Song A")
    assert row == {
        "video_title": "Song A",
        "top1": 1,
        "top3": 1,
        "top5": 1,
        "top10": 1,
        "top20": 1,
        "chart_points": 15,
        "youtube_video_id": "aaaaaaaaaaa",
    }


def test_rank_10_increments_top10_and_top20_only(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={10: {"video_title": "Song B", "youtube_video_id": ""}},
        ),
    )
    row = _row_by_title(_aggregate_rows(repo_root), "Song B")
    assert row["top1"] == 0
    assert row["top3"] == 0
    assert row["top5"] == 0
    assert row["top10"] == 1
    assert row["top20"] == 1
    assert row["chart_points"] == 3


def test_rank_3_chart_points(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={3: {"video_title": "Song rank 3", "youtube_video_id": ""}},
        ),
    )
    row = _row_by_title(_aggregate_rows(repo_root), "Song rank 3")
    assert row["chart_points"] == 10


def test_same_title_across_episodes_accumulates(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode(
            year=2025,
            month=12,
            entries_by_rank={1: {"video_title": "Song C", "youtube_video_id": ""}},
        ),
    )
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={5: {"video_title": "Song C", "youtube_video_id": ""}},
        ),
    )
    row = _row_by_title(_aggregate_rows(repo_root), "Song C")
    assert row["top1"] == 1
    assert row["top5"] == 2
    assert row["top20"] == 2
    assert row["chart_points"] == chart_points_from_tiers(row)


def test_different_titles_stay_separate_rows(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={
                1: {"video_title": "Artist - Song (LIVE)", "youtube_video_id": ""},
                2: {
                    "video_title": "Artist - Song (Official Video)",
                    "youtube_video_id": "",
                },
            },
        ),
    )
    rows = _aggregate_rows(repo_root)
    assert len(rows) == 2


def test_empty_entry_slots_are_ignored(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={1: {"video_title": "Only one", "youtube_video_id": ""}},
        ),
    )
    rows = _aggregate_rows(repo_root)
    assert len(rows) == 1


def test_youtube_video_id_uses_most_recent(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode(
            year=2025,
            month=12,
            entries_by_rank={
                1: {
                    "video_title": "Song D",
                    "youtube_video_id": "oldidoldold",
                },
            },
        ),
    )
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={
                2: {
                    "video_title": "Song D",
                    "youtube_video_id": "newidnewnew",
                },
            },
        ),
    )
    row = _row_by_title(_aggregate_rows(repo_root), "Song D")
    assert row["youtube_video_id"] == "newidnewnew"


def test_output_sort_order_is_stable(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={
                1: {"video_title": "Rank 1 song", "youtube_video_id": ""},
                5: {"video_title": "Rank 5 song", "youtube_video_id": ""},
                10: {"video_title": "Rank 10 song", "youtube_video_id": ""},
            },
        ),
    )
    rows = _aggregate_rows(repo_root)
    assert [row["video_title"] for row in rows] == [
        "Rank 1 song",
        "Rank 5 song",
        "Rank 10 song",
    ]


def test_output_sort_primary_is_chart_points(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode(
            year=2025,
            month=12,
            entries_by_rank={3: {"video_title": "Twice third", "youtube_video_id": ""}},
        ),
    )
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={
                3: {"video_title": "Twice third", "youtube_video_id": ""},
                1: {"video_title": "Once first", "youtube_video_id": ""},
            },
        ),
    )
    rows = _aggregate_rows(repo_root)
    twice = _row_by_title(rows, "Twice third")
    once = _row_by_title(rows, "Once first")
    assert twice["top1"] == 0
    assert once["top1"] == 1
    assert twice["chart_points"] == 20
    assert once["chart_points"] == 15
    assert rows[0]["video_title"] == "Twice third"


def test_output_sort_uses_title_as_final_tiebreaker(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={
                20: {"video_title": "Zebra", "youtube_video_id": ""},
                19: {"video_title": "Alpha", "youtube_video_id": ""},
                18: {"video_title": "Beta", "youtube_video_id": ""},
            },
        ),
    )
    rows = _aggregate_rows(repo_root)
    assert [row["video_title"] for row in rows] == ["Alpha", "Beta", "Zebra"]


def test_aggregate_writes_json_snapshot(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={1: {"video_title": "Song E", "youtube_video_id": ""}},
        ),
    )
    run_aggregate(repo_root)
    path = processed_alltime_stats_latest_path(repo_root)
    data = json.loads(path.read_text(encoding="utf-8"))
    assert "generated_at" not in data
    assert data["rows"][0]["video_title"] == "Song E"


def test_process_with_invalid_data_does_not_write_processed_file(
    repo_root: Path,
) -> None:
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={1: {"video_title": "Song F", "youtube_video_id": ""}},
        ),
    )
    path = repo_root / "data" / "raw" / "episodes" / "2026-01.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data["entries"] = data["entries"][:5]
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    with pytest.raises(ProcessError):
        run_process(repo_root)

    assert not processed_alltime_stats_latest_path(repo_root).exists()


def test_process_writes_stats_after_validation(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={3: {"video_title": "Song G", "youtube_video_id": ""}},
        ),
    )
    message = run_process(repo_root)
    assert "eurovision-top-20-alltime-latest.json" in message
    assert "1 snapshots" in message
    assert "1 videos from 1 episodes" in message
    assert processed_alltime_stats_latest_path(repo_root).is_file()


def _read_snapshot(repo_root: Path, year: int, month: int) -> dict:
    path = processed_alltime_stats_period_path(repo_root, year, month)
    return json.loads(path.read_text(encoding="utf-8"))


def test_partial_snapshots_grow_with_each_episode(repo_root: Path) -> None:
    for month, title in [(1, "Jan"), (2, "Feb"), (3, "Mar")]:
        _write_episode(
            repo_root,
            f"2022-0{month}.json",
            _episode(
                year=2022,
                month=month,
                entries_by_rank={
                    1: {"video_title": f"Song {title}", "youtube_video_id": ""},
                },
            ),
        )
    run_aggregate(repo_root)

    assert len(_read_snapshot(repo_root, 2022, 1)["rows"]) == 1
    assert len(_read_snapshot(repo_root, 2022, 2)["rows"]) == 2
    assert len(_read_snapshot(repo_root, 2022, 3)["rows"]) == 3
    assert processed_alltime_stats_period_path(repo_root, 2022, 1).is_file()
    assert processed_alltime_stats_period_path(repo_root, 2022, 2).is_file()


def test_partial_gap_month_writes_no_snapshot(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2022-01.json",
        _episode(
            year=2022,
            month=1,
            entries_by_rank={1: {"video_title": "Song Jan", "youtube_video_id": ""}},
        ),
    )
    _write_episode(
        repo_root,
        "2022-03.json",
        _episode(
            year=2022,
            month=3,
            entries_by_rank={1: {"video_title": "Song Mar", "youtube_video_id": ""}},
        ),
    )
    # Stale gap-month file from an older generate run.
    gap_path = processed_alltime_stats_period_path(repo_root, 2022, 2)
    gap_path.parent.mkdir(parents=True, exist_ok=True)
    gap_path.write_text('{"rows": []}\n', encoding="utf-8")

    run_aggregate(repo_root)

    assert processed_alltime_stats_period_path(repo_root, 2022, 2).is_file() is False
    assert len(_read_snapshot(repo_root, 2022, 3)["rows"]) == 2


def test_latest_matches_final_period_snapshot(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2022-01.json",
        _episode(
            year=2022,
            month=1,
            entries_by_rank={1: {"video_title": "Song", "youtube_video_id": ""}},
        ),
    )
    _write_episode(
        repo_root,
        "2022-03.json",
        _episode(
            year=2022,
            month=3,
            entries_by_rank={2: {"video_title": "Other", "youtube_video_id": ""}},
        ),
    )
    run_aggregate(repo_root)

    final = _read_snapshot(repo_root, 2022, 3)
    latest = json.loads(
        processed_alltime_stats_latest_path(repo_root).read_text(encoding="utf-8")
    )
    assert latest == final


def test_partial_snapshots_only_for_episode_months(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2022-01.json",
        _episode(
            year=2022,
            month=1,
            entries_by_rank={1: {"video_title": "Song", "youtube_video_id": ""}},
        ),
    )
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={2: {"video_title": "Other", "youtube_video_id": ""}},
        ),
    )
    result = run_aggregate(repo_root)
    assert result.snapshot_count == 2
    assert processed_alltime_stats_period_path(repo_root, 2022, 1).is_file()
    assert processed_alltime_stats_period_path(repo_root, 2026, 1).is_file()
    assert processed_alltime_stats_period_path(repo_root, 2022, 2).is_file() is False
    assert processed_alltime_stats_period_path(repo_root, 2025, 12).is_file() is False


def test_validate_stats_payload_accepts_monotonic_tiers() -> None:
    payload = {
        "rows": [
            {
                "video_title": "Song",
                "top1": 1,
                "top3": 2,
                "top5": 2,
                "top10": 3,
                "top20": 5,
                "youtube_video_id": "",
            }
        ],
    }
    assert validate_stats_payload(payload) == []


def test_validate_stats_payload_rejects_inverted_tiers() -> None:
    payload = {
        "rows": [
            {
                "video_title": "Broken",
                "top1": 3,
                "top3": 1,
                "top5": 1,
                "top10": 1,
                "top20": 1,
                "youtube_video_id": "",
            }
        ],
    }
    issues = validate_stats_payload(payload, context="2022-01")
    assert len(issues) == 1
    assert "Broken" in issues[0]
    assert "top1 <= top3" in issues[0]


def test_run_aggregate_rejects_invalid_tier_order(
    repo_root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from evtop20.aggregate import StatsAccumulator

    bad_payload = {
        "rows": [
            {
                "video_title": "Song",
                "top1": 2,
                "top3": 1,
                "top5": 1,
                "top10": 1,
                "top20": 1,
                "youtube_video_id": "",
            }
        ],
    }

    def fake_snapshots(
        episodes: list,
    ) -> tuple[list, StatsAccumulator]:
        return [((2022, 1), bad_payload)], StatsAccumulator()

    monkeypatch.setattr(
        "evtop20.aggregate.build_period_snapshots", fake_snapshots
    )
    _write_episode(
        repo_root,
        "2022-01.json",
        _episode(
            year=2022,
            month=1,
            entries_by_rank={1: {"video_title": "Song", "youtube_video_id": ""}},
        ),
    )

    with pytest.raises(ValueError, match="stats validation failed"):
        run_aggregate(repo_root)


def test_recent_cutoff_is_strict_after_five_years() -> None:
    assert recent_window_cutoff((2026, 5)) == (2021, 5)


def test_recent_window_excludes_episode_at_cutoff_month(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2021-05.json",
        _episode(
            year=2021,
            month=5,
            entries_by_rank={
                1: {"video_title": "At cutoff", "youtube_video_id": ""},
            },
        ),
    )
    _write_episode(
        repo_root,
        "2021-06.json",
        _episode(
            year=2021,
            month=6,
            entries_by_rank={
                1: {"video_title": "Inside window", "youtube_video_id": ""},
            },
        ),
    )
    _write_episode(
        repo_root,
        "2026-05.json",
        _episode(
            year=2026,
            month=5,
            entries_by_rank={
                1: {"video_title": "Anchor month", "youtube_video_id": ""},
            },
        ),
    )
    run_aggregate(repo_root)
    recent = json.loads(
        processed_recent_stats_period_path(repo_root, 2026, 5).read_text(
            encoding="utf-8"
        )
    )
    titles = {row["video_title"] for row in recent["rows"]}
    assert titles == {"Inside window", "Anchor month"}
    assert recent["window"] == {
        "years": 5,
        "anchor_period": "2026-05",
        "episode_count": 2,
        "first_period": "2021-06",
        "last_period": "2026-05",
    }


def test_recent_youtube_id_refresh_after_eviction(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2021-06.json",
        _episode(
            year=2021,
            month=6,
            entries_by_rank={
                1: {
                    "video_title": "Song X",
                    "youtube_video_id": "olderidvid1",
                },
            },
        ),
    )
    _write_episode(
        repo_root,
        "2024-06.json",
        _episode(
            year=2024,
            month=6,
            entries_by_rank={
                2: {"video_title": "Filler", "youtube_video_id": ""},
            },
        ),
    )
    _write_episode(
        repo_root,
        "2026-06.json",
        _episode(
            year=2026,
            month=6,
            entries_by_rank={
                1: {
                    "video_title": "Song X",
                    "youtube_video_id": "neweridvid2",
                },
            },
        ),
    )
    run_aggregate(repo_root)

    before = json.loads(
        processed_recent_stats_period_path(repo_root, 2024, 6).read_text(
            encoding="utf-8"
        )
    )
    assert _row_by_title(before["rows"], "Song X")["youtube_video_id"] == "olderidvid1"

    after = json.loads(
        processed_recent_stats_period_path(repo_root, 2026, 6).read_text(
            encoding="utf-8"
        )
    )
    assert _row_by_title(after["rows"], "Song X")["youtube_video_id"] == "neweridvid2"


def test_recent_writes_matching_snapshot_count(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2022-01.json",
        _episode(
            year=2022,
            month=1,
            entries_by_rank={1: {"video_title": "A", "youtube_video_id": ""}},
        ),
    )
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            year=2026,
            month=1,
            entries_by_rank={1: {"video_title": "B", "youtube_video_id": ""}},
        ),
    )
    result = run_aggregate(repo_root)
    assert result.snapshot_count == 2
    assert processed_recent_stats_period_path(repo_root, 2022, 1).is_file()
    assert processed_recent_stats_period_path(repo_root, 2026, 1).is_file()
    assert processed_recent_stats_latest_path(repo_root).is_file()


def test_run_process_wraps_stats_validation_error(
    repo_root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "evtop20.process.validate_raw_episodes",
        lambda _root: [],
    )
    monkeypatch.setattr(
        "evtop20.process.run_aggregate",
        lambda _root: (_ for _ in ()).throw(ValueError("stats validation failed")),
    )

    with pytest.raises(ProcessError, match="stats validation failed"):
        run_process(repo_root)
