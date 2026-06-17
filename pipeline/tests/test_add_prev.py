from __future__ import annotations

import json
from pathlib import Path

import pytest

from typer.testing import CliRunner

from evtop20.add_prev import (
    AddPrevError,
    is_delta_token,
    parse_delta,
    parse_delta_in_range,
    run_add_prev,
)
from evtop20.cli import app
from evtop20.validate import load_episode_file

runner = CliRunner()


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


def _setup_pair(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode(
            year=2025,
            month=12,
            entries_by_rank={
                3: {
                    "video_title": "Song at rank 3",
                    "youtube_video_id": "aaaaaaaaaaa",
                },
                4: {
                    "video_title": "Song at rank 4",
                    "youtube_video_id": "bbbbbbbbbbb",
                },
            },
        ),
    )
    _write_episode(repo_root, "2026-01.json", _episode(year=2026, month=1))


def test_parse_delta_accepts_signed_forms() -> None:
    assert parse_delta("+1") == 1
    assert parse_delta("1") == 1
    assert parse_delta("-1") == -1
    assert parse_delta("0") == 0
    assert parse_delta("+0") == 0
    assert parse_delta("-0") == 0


def test_parse_delta_rejects_invalid_syntax() -> None:
    with pytest.raises(AddPrevError, match="invalid delta syntax"):
        parse_delta("up1")


def test_is_delta_token_accepts_in_range_integers() -> None:
    assert is_delta_token("+1")
    assert is_delta_token("-19")
    assert is_delta_token("19")
    assert is_delta_token("0")


def test_is_delta_token_rejects_out_of_range_or_non_delta() -> None:
    assert not is_delta_token("1944")
    assert not is_delta_token("20")
    assert not is_delta_token("-20")
    assert not is_delta_token("netta")


def test_parse_delta_in_range_rejects_out_of_range() -> None:
    with pytest.raises(AddPrevError, match="delta must be between"):
        parse_delta_in_range("1944")


def test_add_prev_plus_one(repo_root: Path) -> None:
    _setup_pair(repo_root)
    result = run_add_prev(
        repo_root, episode_stem="2026-01", rank=3, delta=1
    )
    assert "rank 3 ← 2025-12.json rank 4 (+1)" in result.summary
    data, _ = load_episode_file(repo_root / "data/raw/episodes/2026-01.json")
    assert data is not None
    entry = next(e for e in data["entries"] if e["rank"] == 3)
    assert entry["video_title"] == "Song at rank 4"
    assert entry["youtube_video_id"] == "bbbbbbbbbbb"


def test_add_prev_explicit_plus_same_as_bare_positive(repo_root: Path) -> None:
    _setup_pair(repo_root)
    run_add_prev(repo_root, episode_stem="2026-01", rank=3, delta=parse_delta("+1"))
    data, _ = load_episode_file(repo_root / "data/raw/episodes/2026-01.json")
    assert data is not None
    entry = next(e for e in data["entries"] if e["rank"] == 3)
    assert entry["video_title"] == "Song at rank 4"


@pytest.mark.parametrize("delta", [0, parse_delta("+0"), parse_delta("-0")])
def test_add_prev_zero_copies_same_rank(
    repo_root: Path, delta: int
) -> None:
    _setup_pair(repo_root)
    run_add_prev(repo_root, episode_stem="2026-01", rank=3, delta=delta)
    data, _ = load_episode_file(repo_root / "data/raw/episodes/2026-01.json")
    assert data is not None
    entry = next(e for e in data["entries"] if e["rank"] == 3)
    assert entry["video_title"] == "Song at rank 3"
    assert entry["youtube_video_id"] == "aaaaaaaaaaa"


def test_add_prev_negative_copies_from_lower_previous_rank(
    repo_root: Path,
) -> None:
    _setup_pair(repo_root)
    run_add_prev(repo_root, episode_stem="2026-01", rank=5, delta=-2)
    data, _ = load_episode_file(repo_root / "data/raw/episodes/2026-01.json")
    assert data is not None
    entry = next(e for e in data["entries"] if e["rank"] == 5)
    assert entry["video_title"] == "Song at rank 3"


def test_add_prev_missing_previous_episode(repo_root: Path) -> None:
    _write_episode(repo_root, "2026-01.json", _episode(year=2026, month=1))
    with pytest.raises(AddPrevError, match="no previous episode found"):
        run_add_prev(repo_root, episode_stem="2026-01", rank=1, delta=0)


@pytest.mark.parametrize("delta", [20, -20])
def test_add_prev_previous_rank_out_of_range(
    repo_root: Path, delta: int
) -> None:
    _setup_pair(repo_root)
    with pytest.raises(AddPrevError, match="no entry at previous rank"):
        run_add_prev(repo_root, episode_stem="2026-01", rank=1, delta=delta)


def test_add_prev_dry_run_does_not_modify_file(repo_root: Path) -> None:
    _setup_pair(repo_root)
    path = repo_root / "data/raw/episodes/2026-01.json"
    before = path.read_text(encoding="utf-8")
    run_add_prev(
        repo_root,
        episode_stem="2026-01",
        rank=3,
        delta=1,
        dry_run=True,
    )
    assert path.read_text(encoding="utf-8") == before


def test_add_prev_january_finds_december_previous_year(
    repo_root: Path,
) -> None:
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode(
            year=2025,
            month=12,
            entries_by_rank={
                1: {
                    "video_title": "December #1",
                    "youtube_video_id": "ccccccccccc",
                },
            },
        ),
    )
    _write_episode(repo_root, "2026-01.json", _episode(year=2026, month=1))
    run_add_prev(repo_root, episode_stem="2026-01", rank=1, delta=0)
    data, _ = load_episode_file(repo_root / "data/raw/episodes/2026-01.json")
    assert data is not None
    entry = next(e for e in data["entries"] if e["rank"] == 1)
    assert entry["video_title"] == "December #1"


def test_add_prev_target_already_set_errors_without_write(
    repo_root: Path,
) -> None:
    _setup_pair(repo_root)
    path = repo_root / "data/raw/episodes/2026-01.json"
    data, _ = load_episode_file(path)
    assert data is not None
    for entry in data["entries"]:
        if entry["rank"] == 3:
            entry["video_title"] = "Already filled"
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    before = path.read_text(encoding="utf-8")

    with pytest.raises(AddPrevError, match="already set"):
        run_add_prev(repo_root, episode_stem="2026-01", rank=3, delta=1)

    assert path.read_text(encoding="utf-8") == before


def test_add_prev_force_overwrites_set_rank(repo_root: Path) -> None:
    _setup_pair(repo_root)
    path = repo_root / "data/raw/episodes/2026-01.json"
    data, _ = load_episode_file(path)
    assert data is not None
    for entry in data["entries"]:
        if entry["rank"] == 3:
            entry["video_title"] = "Wrong"
            entry["youtube_video_id"] = "wrongidwrong"
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    result = run_add_prev(
        repo_root, episode_stem="2026-01", rank=3, delta=1, force=True
    )
    assert "(overwritten)" in result.summary
    data, _ = load_episode_file(path)
    assert data is not None
    entry = next(e for e in data["entries"] if e["rank"] == 3)
    assert entry["video_title"] == "Song at rank 4"
    assert entry["youtube_video_id"] == "bbbbbbbbbbb"


@pytest.mark.parametrize(
    ("rank", "argv_suffix", "expected_previous_rank"),
    [
        (3, ["+1"], 4),
        (4, ["-1"], 3),
        (4, ["--delta=-1"], 3),
    ],
)
def test_add_cli_prev_mode_accepts_negative_positional_delta(
    repo_root: Path,
    rank: int,
    argv_suffix: list[str],
    expected_previous_rank: int,
) -> None:
    _setup_pair(repo_root)
    result = runner.invoke(
        app,
        [
            "add",
            "2026-01",
            str(rank),
            *argv_suffix,
            "--repo-root",
            str(repo_root),
            "--dry-run",
        ],
    )
    assert result.exit_code == 0, result.output
    assert (
        f"rank {rank} ← 2025-12.json rank {expected_previous_rank}" in result.output
    )


def test_add_prev_subcommand_removed() -> None:
    result = runner.invoke(app, ["add-prev", "2026-01", "3", "+1"])
    assert result.exit_code != 0
    assert "add-prev" in result.output.lower() or "no such command" in result.output.lower()


def test_add_prev_warns_when_previous_entry_incomplete(repo_root: Path) -> None:
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode(
            year=2025,
            month=12,
            entries_by_rank={4: {"video_title": "", "youtube_video_id": ""}},
        ),
    )
    _write_episode(repo_root, "2026-01.json", _episode(year=2026, month=1))
    result = run_add_prev(
        repo_root, episode_stem="2026-01", rank=3, delta=1
    )
    assert len(result.warnings) == 2
