from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.insights_composition import (
    SLOT_CAPACITY,
    UNKNOWN_YEAR,
    build_episode_year_composition,
    year_for_entry,
)
from evtop20.package import run_package
from evtop20.paths import (
    metadata_year_colors_path,
    packaged_episode_year_composition_path,
    packaged_insights_dir,
    raw_episodes_dir,
)
from conftest import write_episode_index_snapshot, write_vendored_esc_results


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


def test_year_for_entry_parses_contest_year() -> None:
    title = (
        "Loreen - Tattoo (LIVE) | Sweden 🇸🇪 | Grand Final | "
        "Winner of Eurovision 2023"
    )
    assert year_for_entry(title, "vid123") == "2023"


def test_year_for_entry_returns_unknown_when_unparsed() -> None:
    assert year_for_entry("Not a eurovision title", "") == UNKNOWN_YEAR


def test_build_episode_year_composition_sorts_years_descending(repo_root: Path) -> None:
    _write_raw_episode(
        repo_root,
        "2023-07.json",
        _minimal_episode(
            year=2023,
            month=7,
            entries=[
                {
                    "rank": 1,
                    "video_title": (
                        "Loreen - Tattoo (LIVE) | Sweden 🇸🇪 | Grand Final | "
                        "Eurovision 2023"
                    ),
                    "youtube_video_id": "a",
                },
                {
                    "rank": 2,
                    "video_title": (
                        "Käärijä - Cha Cha Cha (LIVE) | Finland 🇫🇮 | "
                        "Grand Final | Eurovision 2023"
                    ),
                    "youtube_video_id": "b",
                },
                {
                    "rank": 3,
                    "video_title": (
                        "Salvador Sobral - Amar Pelos Dois (LIVE) | Portugal 🇵🇹 | "
                        "Grand Final | Eurovision 2017"
                    ),
                    "youtube_video_id": "c",
                },
            ],
        ),
    )

    episode = build_episode_year_composition(repo_root)["episodes"][0]
    assert episode["filled"] == 3
    assert episode["missing"] == 17
    assert episode["segments"] == [
        {
            "count": 2,
            "titles": sorted(
                [
                    (
                        "Käärijä - Cha Cha Cha (LIVE) | Finland 🇫🇮 | "
                        "Grand Final | Eurovision 2023"
                    ),
                    (
                        "Loreen - Tattoo (LIVE) | Sweden 🇸🇪 | Grand Final | "
                        "Eurovision 2023"
                    ),
                ],
                key=str.casefold,
            ),
            "year": "2023",
        },
        {
            "count": 1,
            "titles": [
                (
                    "Salvador Sobral - Amar Pelos Dois (LIVE) | Portugal 🇵🇹 | "
                    "Grand Final | Eurovision 2017"
                ),
            ],
            "year": "2017",
        },
    ]


def test_build_episode_year_composition_version_is_two(repo_root: Path) -> None:
    _write_raw_episode(
        repo_root,
        "2023-07.json",
        _minimal_episode(
            year=2023,
            month=7,
            entries=[
                {
                    "rank": 1,
                    "video_title": (
                        "Loreen - Tattoo (LIVE) | Sweden 🇸🇪 | Grand Final | "
                        "Eurovision 2023"
                    ),
                    "youtube_video_id": "a",
                },
            ],
        ),
    )

    payload = build_episode_year_composition(repo_root)
    assert payload["version"] == 2
    segment = payload["episodes"][0]["segments"][0]
    assert len(segment["titles"]) == segment["count"]


def test_build_episode_year_composition_collects_unknown_titles(
    repo_root: Path,
) -> None:
    _write_raw_episode(
        repo_root,
        "2023-07.json",
        _minimal_episode(
            year=2023,
            month=7,
            entries=[
                {
                    "rank": 1,
                    "video_title": "Not a eurovision title",
                    "youtube_video_id": "",
                },
            ],
        ),
    )

    segment = build_episode_year_composition(repo_root)["episodes"][0]["segments"][0]
    assert segment["year"] == UNKNOWN_YEAR
    assert segment["titles"] == ["Not a eurovision title"]


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
    year_colors_src = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "metadata"
        / "year-colors.json"
    )
    year_colors_dst = metadata_year_colors_path(tmp_path)
    year_colors_dst.parent.mkdir(parents=True, exist_ok=True)
    year_colors_dst.write_text(year_colors_src.read_text(encoding="utf-8"), encoding="utf-8")
    return tmp_path


def _write_processed_snapshot(repo_root: Path, name: str, payload: dict) -> Path:
    from evtop20.paths import processed_alltime_dir

    path = processed_alltime_dir(repo_root) / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def _processed_row() -> dict:
    return {
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


def test_run_package_writes_insights_composition(repo_root: Path) -> None:
    row = _processed_row()
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
            entries=[
                {
                    "rank": 1,
                    "video_title": row["video_title"],
                    "youtube_video_id": row["youtube_video_id"],
                },
            ],
        ),
    )

    message = run_package(repo_root)

    year_composition_path = packaged_episode_year_composition_path(repo_root)
    assert year_composition_path.is_file()
    composition = json.loads(year_composition_path.read_text(encoding="utf-8"))
    assert composition["episodes"][-1]["period"] == "2026-05"
    assert (packaged_insights_dir(repo_root) / "year-colors.json").is_file()
    assert "episode-year-composition.json" in message
