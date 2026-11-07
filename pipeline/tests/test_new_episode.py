from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.new_episode import (
    NewEpisodeError,
    next_episode_stem,
    parse_episode_stem,
    resolve_episode_stem,
    run_new_episode,
)
from evtop20.validate import validate_episode_file, load_schema


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


def test_parse_episode_stem_accepts_yyyy_mm() -> None:
    assert parse_episode_stem("2026-01") == (2026, 1)
    assert parse_episode_stem("2022-04") == (2022, 4)


def test_parse_episode_stem_rejects_invalid() -> None:
    with pytest.raises(NewEpisodeError, match="expected YYYY-MM"):
        parse_episode_stem("2026-1")
    with pytest.raises(NewEpisodeError, match="invalid month"):
        parse_episode_stem("2026-13")


def test_run_new_episode_writes_empty_template(repo_root: Path) -> None:
    path = run_new_episode(repo_root, "2022-05")
    data = json.loads(path.read_text(encoding="utf-8"))

    assert path.name == "2022-05.json"
    assert data["period"] == {"year": 2022, "month": 5}
    assert data["episode_title"] == "Eurovision Top 20 Most Watched: May 2022"
    assert data["youtube_video_id"] == ""
    assert len(data["entries"]) == 20
    assert all(entry["video_title"] == "" for entry in data["entries"])

    schema = load_schema(repo_root)
    assert validate_episode_file(path, schema) == []


def test_run_new_episode_errors_when_file_exists(repo_root: Path) -> None:
    run_new_episode(repo_root, "2022-05")
    with pytest.raises(NewEpisodeError, match="already exists"):
        run_new_episode(repo_root, "2022-05")


def test_run_new_episode_force_overwrites(repo_root: Path) -> None:
    path = run_new_episode(repo_root, "2022-05")
    path.write_text("{}", encoding="utf-8")
    run_new_episode(repo_root, "2022-05", force=True)
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["period"]["month"] == 5


def test_next_episode_stem_rolls_year() -> None:
    assert next_episode_stem(2022, 5) == "2022-06"
    assert next_episode_stem(2025, 12) == "2026-01"


def test_resolve_episode_stem_defaults_to_month_after_latest(repo_root: Path) -> None:
    run_new_episode(repo_root, "2025-11")
    run_new_episode(repo_root, "2025-12")
    assert resolve_episode_stem(repo_root, None) == "2026-01"
    assert resolve_episode_stem(repo_root, "") == "2026-01"


def test_run_new_episode_without_stem_uses_next_month(repo_root: Path) -> None:
    run_new_episode(repo_root, "2026-09")
    path = run_new_episode(repo_root)
    assert path.name == "2026-10.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["period"] == {"year": 2026, "month": 10}


def test_resolve_episode_stem_errors_when_no_raw_episodes(repo_root: Path) -> None:
    with pytest.raises(NewEpisodeError, match="pass YYYY-MM explicitly"):
        resolve_episode_stem(repo_root, None)

    raw = repo_root / "data" / "raw" / "episodes"
    raw.mkdir(parents=True)
    with pytest.raises(NewEpisodeError, match="no raw episode files"):
        resolve_episode_stem(repo_root, None)
