from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.validate import (
    has_validation_errors,
    validate_episode_file,
    validate_raw_episodes,
)


def _minimal_episode(*, year: int = 2026, month: int = 1) -> dict:
    return {
        "episode_title": "Eurovision Top 20: Most Watched – January 2026",
        "period": {"year": year, "month": month},
        "youtube_video_id": None,
        "entries": [
            {"rank": rank, "video_title": f"Song {rank}", "youtube_video_id": None}
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
    episodes_dir.mkdir(parents=True, exist_ok=True)
    path = episodes_dir / name
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return path


def test_validate_episode_file_accepts_minimal_episode(repo_root: Path) -> None:
    path = _write_episode(repo_root, "2026-01.json", _minimal_episode())
    schema = json.loads(
        (repo_root / "data" / "schemas" / "episode.schema.json").read_text(
            encoding="utf-8"
        )
    )
    assert validate_episode_file(path, schema) == []


def test_validate_episode_file_rejects_period_filename_mismatch(
    repo_root: Path,
) -> None:
    data = _minimal_episode(year=2025, month=12)
    path = _write_episode(repo_root, "2026-01.json", data)
    schema = json.loads(
        (repo_root / "data" / "schemas" / "episode.schema.json").read_text(
            encoding="utf-8"
        )
    )
    issues = validate_episode_file(path, schema)
    assert any("does not match filename" in issue for issue in issues)


def test_validate_episode_file_rejects_duplicate_ranks(repo_root: Path) -> None:
    data = _minimal_episode()
    data["entries"][1]["rank"] = 1
    path = _write_episode(repo_root, "2026-01.json", data)
    schema = json.loads(
        (repo_root / "data" / "schemas" / "episode.schema.json").read_text(
            encoding="utf-8"
        )
    )
    issues = validate_episode_file(path, schema)
    assert any("ranks 1–20 exactly once" in issue for issue in issues)


def test_validate_raw_episodes_reports_schema_violation(repo_root: Path) -> None:
    data = _minimal_episode()
    data["youtube_video_id"] = "not-a-valid-id"
    _write_episode(repo_root, "2026-01.json", data)
    issues = validate_raw_episodes(repo_root)
    assert len(issues) >= 1


def test_validate_raw_episodes_passes_clean_repo(repo_root: Path) -> None:
    _write_episode(repo_root, "2026-01.json", _minimal_episode())
    issues = validate_raw_episodes(repo_root)
    assert not has_validation_errors(issues)
