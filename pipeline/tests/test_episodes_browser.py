from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.episodes_browser import (
    ENTRY_CAPACITY,
    EpisodesBrowserError,
    build_episode_browser_rows,
    build_episodes_browser,
    missing_entry,
    project_filled_entry,
    run_episodes_browser,
)
from evtop20.package import augment_stats_row, run_package
from evtop20.paths import (
    packaged_episodes_browser_path,
    packaged_episodes_year_colors_path,
    raw_episodes_dir,
)
from conftest import write_episode_index_snapshot, write_vendored_esc_results, write_year_colors


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


def _write_raw_episode(repo_root: Path, name: str, payload: dict) -> Path:
    path = raw_episodes_dir(repo_root) / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def _minimal_episode(
    *,
    year: int,
    month: int,
    entries: list[dict],
) -> dict:
    return {
        "episode_title": f"Episode {year}-{month:02d}",
        "period": {"year": year, "month": month},
        "youtube_video_id": "episode-id",
        "entries": entries,
    }


def _entries_for_ranks(filled: dict[int, dict]) -> list[dict]:
    entries: list[dict] = []
    for rank in range(1, ENTRY_CAPACITY + 1):
        if rank in filled:
            entry = {"rank": rank, **filled[rank]}
        else:
            entry = {"rank": rank, "video_title": "", "youtube_video_id": ""}
        entries.append(entry)
    return entries


def test_missing_entry_shape() -> None:
    assert missing_entry(11) == {"missing": True, "rank": 11}


def test_project_filled_entry_keeps_allowlisted_fields() -> None:
    row = {
        "video_title": (
            "Tommy Cash - Espresso Macchiato | Estonia 🇪🇪 | "
            "Official Music Video | #Eurovision2025"
        ),
        "youtube_video_id": "abc123xyz01",
    }
    augmented = augment_stats_row(row)
    entry = project_filled_entry(
        augmented,
        rank=1,
        video_title=row["video_title"],
        youtube_video_id="abc123xyz01",
    )

    assert entry["rank"] == 1
    assert entry["artist"] == "Tommy Cash"
    assert entry["country"] == "Estonia"
    assert entry["year"] == 2025
    assert entry["fire"] is False
    assert "youtube_watch_url" not in entry
    assert "metadata_extractor" not in entry


def test_build_episode_browser_rows_pads_missing_ranks(repo_root: Path) -> None:
    path = _write_raw_episode(
        repo_root,
        "2026-01.json",
        _minimal_episode(
            year=2026,
            month=1,
            entries=_entries_for_ranks(
                {
                    1: {
                        "video_title": (
                            "Tommy Cash - Espresso Macchiato | Estonia 🇪🇪 | "
                            "Official Music Video | #Eurovision2025"
                        ),
                        "youtube_video_id": "abc123xyz01",
                    },
                    20: {
                        "video_title": (
                            "Loreen - Tattoo (LIVE) | Sweden 🇸🇪 | Grand Final | "
                            "Eurovision 2023"
                        ),
                        "youtube_video_id": "vid00000020",
                    },
                }
            ),
        ),
    )

    episode = build_episode_browser_rows(path, json.loads(path.read_text(encoding="utf-8")))

    assert episode["period"] == "2026-01"
    assert episode["youtube_video_id"] == "episode-id"
    assert episode["missing"] == 18
    assert len(episode["entries"]) == ENTRY_CAPACITY
    assert episode["entries"][0]["rank"] == 1
    assert episode["entries"][0]["country"] == "Estonia"
    assert episode["entries"][19]["rank"] == 20
    assert episode["entries"][19]["country"] == "Sweden"
    assert episode["entries"][10] == missing_entry(11)


def test_build_episode_browser_rows_blank_title_is_missing(repo_root: Path) -> None:
    path = _write_raw_episode(
        repo_root,
        "2026-02.json",
        _minimal_episode(
            year=2026,
            month=2,
            entries=_entries_for_ranks(
                {
                    5: {"video_title": "   ", "youtube_video_id": ""},
                }
            ),
        ),
    )

    episode = build_episode_browser_rows(path, json.loads(path.read_text(encoding="utf-8")))

    assert episode["missing"] == 20
    assert all(entry == missing_entry(rank) for rank, entry in enumerate(episode["entries"], start=1))


def test_build_episode_browser_rows_rejects_duplicate_rank(repo_root: Path) -> None:
    path = _write_raw_episode(
        repo_root,
        "2026-03.json",
        _minimal_episode(
            year=2026,
            month=3,
            entries=[
                {
                    "rank": 3,
                    "video_title": "First at rank 3",
                    "youtube_video_id": "",
                },
                {
                    "rank": 3,
                    "video_title": "Duplicate at rank 3",
                    "youtube_video_id": "",
                },
                *[
                    {"rank": rank, "video_title": "", "youtube_video_id": ""}
                    for rank in range(1, 21)
                    if rank != 3
                ],
            ],
        ),
    )

    with pytest.raises(EpisodesBrowserError, match="duplicate rank 3"):
        build_episode_browser_rows(path, json.loads(path.read_text(encoding="utf-8")))


def test_build_episode_browser_rows_rejects_period_filename_mismatch(repo_root: Path) -> None:
    path = _write_raw_episode(
        repo_root,
        "2026-04.json",
        _minimal_episode(
            year=2026,
            month=5,
            entries=_entries_for_ranks({}),
        ),
    )

    with pytest.raises(EpisodesBrowserError, match="does not match period"):
        build_episode_browser_rows(path, json.loads(path.read_text(encoding="utf-8")))


def test_build_episodes_browser_full_grid(repo_root: Path) -> None:
    title = (
        "Tommy Cash - Espresso Macchiato | Estonia 🇪🇪 | "
        "Official Music Video | #Eurovision2025"
    )
    filled = {
        rank: {
            "video_title": f"{title} #{rank}",
            "youtube_video_id": f"vid{rank:08d}"[:11],
        }
        for rank in range(1, ENTRY_CAPACITY + 1)
    }
    _write_raw_episode(
        repo_root,
        "2026-05.json",
        _minimal_episode(
            year=2026,
            month=5,
            entries=_entries_for_ranks(filled),
        ),
    )

    payload = build_episodes_browser(repo_root)

    assert payload["version"] == 1
    assert payload["entry_capacity"] == ENTRY_CAPACITY
    assert payload["periods"] == ["2026-05"]
    episode = payload["episodes"][0]
    assert episode["missing"] == 0
    assert len(episode["entries"]) == ENTRY_CAPACITY
    assert all(entry.get("missing") is not True for entry in episode["entries"])


def _write_processed_snapshot(repo_root: Path, name: str, payload: dict) -> None:
    from evtop20.paths import processed_alltime_dir

    path = processed_alltime_dir(repo_root) / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def test_run_package_writes_episodes_browser(repo_root: Path) -> None:
    write_vendored_esc_results(repo_root)
    write_year_colors(repo_root)
    row = {
        "video_title": (
            "Tommy Cash - Espresso Macchiato | Estonia 🇪🇪 | "
            "Official Music Video | #Eurovision2025"
        ),
        "top1": 1,
        "top3": 1,
        "top5": 1,
        "top10": 1,
        "top20": 1,
        "chart_points": 10,
        "youtube_video_id": "abc123xyz01",
    }
    payload = {"rows": [row]}
    _write_processed_snapshot(repo_root, "eurovision-top-20-alltime-2026-05.json", payload)
    _write_processed_snapshot(repo_root, "eurovision-top-20-alltime-latest.json", payload)
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
    _write_raw_episode(
        repo_root,
        "2026-05.json",
        _minimal_episode(
            year=2026,
            month=5,
            entries=_entries_for_ranks(
                {
                    1: {
                        "video_title": row["video_title"],
                        "youtube_video_id": row["youtube_video_id"],
                    },
                }
            ),
        ),
    )

    message = run_package(repo_root)

    browser_path = packaged_episodes_browser_path(repo_root)
    assert browser_path.is_file()
    browser = json.loads(browser_path.read_text(encoding="utf-8"))
    assert browser["episodes"][-1]["period"] == "2026-05"
    assert browser["episodes"][-1]["missing"] == 19
    assert browser["episodes"][-1]["entries"][0]["country"] == "Estonia"
    assert browser["episodes"][-1]["entries"][1] == missing_entry(2)
    assert "episodes/browser.json" in message
    assert "episodes/year-colors.json" in message
    assert "bytes" in message


def test_run_episodes_browser_empty_raw_dir(repo_root: Path) -> None:
    message = run_episodes_browser(repo_root)
    browser_path = packaged_episodes_browser_path(repo_root)
    year_colors_path = packaged_episodes_year_colors_path(repo_root)
    assert browser_path.is_file()
    assert year_colors_path.is_file()
    browser = json.loads(browser_path.read_text(encoding="utf-8"))
    assert browser["episodes"] == []
    assert "0 episodes" in message
    assert "episodes/year-colors.json" in message
