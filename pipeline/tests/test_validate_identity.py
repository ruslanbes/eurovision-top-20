from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.models import LoadedEpisode
from evtop20.validate import has_validation_errors, validate_raw_episodes
from evtop20.validate_identity import (
    TOP20_CHART_START_PERIOD,
    suppress_empty_entry_warnings,
    validate_episode_identity,
)


def _episode_with_ids(
    *,
    episode_youtube_id: str | None = "ep000000001",
    entry_youtube_ids: list[str | None] | None = None,
) -> dict:
    if entry_youtube_ids is None:
        entry_youtube_ids = [f"v{id_:010d}" for id_ in range(1, 21)]

    return {
        "episode_title": "Eurovision Top 20: Most Watched – January 2026",
        "period": {"year": 2026, "month": 1},
        "youtube_video_id": episode_youtube_id,
        "entries": [
            {
                "rank": rank,
                "video_title": f"Song {rank}",
                "youtube_video_id": entry_youtube_ids[rank - 1],
            }
            for rank in range(1, 21)
        ],
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
    episodes_dir.mkdir(parents=True)
    path = episodes_dir / name
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return path


def test_duplicate_id_in_episode_is_error() -> None:
    data = _episode_with_ids()
    data["entries"][1]["youtube_video_id"] = data["entries"][0]["youtube_video_id"]
    episode = LoadedEpisode(path=Path("2026-01.json"), data=data)

    findings = validate_episode_identity(episode)
    assert any(
        finding.severity == "error" and "duplicate youtube_video_id" in finding.message
        for finding in findings
    )


def test_episode_youtube_id_in_entry_is_error() -> None:
    data = _episode_with_ids(episode_youtube_id="roundupvid1")
    data["entries"][4]["youtube_video_id"] = "roundupvid1"
    episode = LoadedEpisode(path=Path("2026-01.json"), data=data)

    findings = validate_episode_identity(episode)
    assert any(
        finding.severity == "error"
        and "matches episode roundup video" in finding.message
        for finding in findings
    )


def test_episode_title_in_entry_is_error() -> None:
    data = _episode_with_ids()
    data["entries"][2]["video_title"] = data["episode_title"]
    episode = LoadedEpisode(path=Path("2026-01.json"), data=data)

    findings = validate_episode_identity(episode)
    assert any(
        finding.severity == "error" and "matches episode title" in finding.message
        for finding in findings
    )


def test_null_entry_id_is_warning_not_error() -> None:
    data = _episode_with_ids()
    data["entries"][0]["youtube_video_id"] = None
    episode = LoadedEpisode(path=Path("2026-01.json"), data=data)

    findings = validate_episode_identity(episode)
    assert any(
        finding.severity == "warning" and "youtube_video_id is empty" in finding.message
        for finding in findings
    )
    assert not any(finding.severity == "error" for finding in findings)


def test_empty_entry_title_is_warning_not_error() -> None:
    data = _episode_with_ids()
    data["entries"][0]["video_title"] = ""
    episode = LoadedEpisode(path=Path("2026-01.json"), data=data)

    findings = validate_episode_identity(episode)
    assert any(
        finding.severity == "warning" and "video_title is empty" in finding.message
        for finding in findings
    )
    assert not any(finding.severity == "error" for finding in findings)


def test_null_episode_youtube_id_warns_and_skips_self_id_check(repo_root: Path) -> None:
    data = _episode_with_ids(episode_youtube_id=None)
    _write_episode(repo_root, "2026-01.json", data)

    issues = validate_raw_episodes(repo_root)
    assert not has_validation_errors(issues)
    assert any(
        issue.severity == "warning" and "skipped roundup id self-contamination" in issue.message
        for issue in issues
    )


def test_fully_filled_episode_passes_without_errors(repo_root: Path) -> None:
    _write_episode(repo_root, "2026-01.json", _episode_with_ids())
    issues = validate_raw_episodes(repo_root)
    assert not has_validation_errors(issues)


def _top10_only_episode(*, year: int, month: int) -> dict:
    entries = [
        {
            "rank": rank,
            "video_title": f"Song {rank}" if rank <= 10 else "",
            "youtube_video_id": f"v{rank:010d}" if rank <= 10 else "",
        }
        for rank in range(1, 21)
    ]
    return {
        "episode_title": f"Eurovision Top 10 Most Watched: {month:02d} {year}",
        "period": {"year": year, "month": month},
        "youtube_video_id": "roundup00001",
        "entries": entries,
    }


def test_suppress_empty_entry_warnings_before_top20_chart_start() -> None:
    data = _top10_only_episode(year=2021, month=12)
    assert suppress_empty_entry_warnings(data, 11) is True
    assert suppress_empty_entry_warnings(data, 20) is True
    assert suppress_empty_entry_warnings(data, 10) is False
    assert suppress_empty_entry_warnings(data, 1) is False


def test_suppress_empty_entry_warnings_from_top20_chart_start() -> None:
    year, month = TOP20_CHART_START_PERIOD
    data = _top10_only_episode(year=year, month=month)
    assert suppress_empty_entry_warnings(data, 11) is False


def test_pre_top20_empty_ranks_11_to_20_suppress_empty_warnings() -> None:
    data = _top10_only_episode(year=2021, month=6)
    episode = LoadedEpisode(path=Path("2021-06.json"), data=data)

    findings = validate_episode_identity(episode)
    empty_warnings = [
        finding
        for finding in findings
        if finding.severity == "warning"
        and (
            "youtube_video_id is empty" in finding.message
            or "video_title is empty" in finding.message
        )
    ]
    assert not any(
        finding.rank is not None and finding.rank >= 11 for finding in empty_warnings
    )


def test_pre_top20_empty_rank_in_top10_still_warns() -> None:
    data = _top10_only_episode(year=2021, month=6)
    data["entries"][4]["youtube_video_id"] = ""
    episode = LoadedEpisode(path=Path("2021-06.json"), data=data)

    findings = validate_episode_identity(episode)
    assert any(
        finding.severity == "warning"
        and finding.rank == 5
        and "youtube_video_id is empty" in finding.message
        for finding in findings
    )


def test_top20_era_empty_ranks_11_to_20_still_warn() -> None:
    data = _top10_only_episode(year=2022, month=1)
    episode = LoadedEpisode(path=Path("2022-01.json"), data=data)

    findings = validate_episode_identity(episode)
    empty_warnings = [
        finding
        for finding in findings
        if finding.severity == "warning"
        and (
            "youtube_video_id is empty" in finding.message
            or "video_title is empty" in finding.message
        )
    ]
    assert len(empty_warnings) == 20
    assert all(finding.rank is not None and finding.rank >= 11 for finding in empty_warnings)
