from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.validate import has_validation_errors, validate_raw_episodes


def _episode(
    label: str,
    *,
    year: int,
    month: int,
    entries: list[dict],
    episode_youtube_id: str | None = None,
) -> dict:
    return {
        "episode_title": f"Eurovision Top 20: Most Watched – {label}",
        "period": {"year": year, "month": month},
        "youtube_video_id": episode_youtube_id,
        "entries": entries,
    }


def _entry(rank: int, title: str, youtube_id: str | None) -> dict:
    return {"rank": rank, "video_title": title, "youtube_video_id": youtube_id}


def _entries_from_pairs(pairs: list[tuple[str, str]]) -> list[dict]:
    return [
        _entry(rank, title, youtube_id)
        for rank, (title, youtube_id) in enumerate(pairs, start=1)
    ] + [
        _entry(rank, "", None)
        for rank in range(len(pairs) + 1, 21)
    ]


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


def _id(rank: int) -> str:
    return f"vid{rank:08d}"


def _write_episode(repo_root: Path, name: str, data: dict) -> None:
    episodes_dir = repo_root / "data" / "raw" / "episodes"
    episodes_dir.mkdir(parents=True, exist_ok=True)
    path = episodes_dir / name
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def test_same_pair_in_two_episodes_passes(repo_root: Path) -> None:
    pair = ("Song A", "aaaaaaaaaaa")
    pairs = [pair] + [(f"Song {i}", _id(i)) for i in range(2, 21)]
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode("2025-12", year=2025, month=12, entries=_entries_from_pairs(pairs)),
    )
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode("2026-01", year=2026, month=1, entries=_entries_from_pairs(pairs)),
    )

    issues = validate_raw_episodes(repo_root)
    assert not has_validation_errors(issues)
    assert not any("mismatch" in issue.message for issue in issues)


def test_same_id_different_titles_is_error(repo_root: Path) -> None:
    pairs_a = [("Title A", "sameid00001")] + [
        (f"Song {i}", _id(i)) for i in range(2, 21)
    ]
    pairs_b = [("Title B", "sameid00001")] + [
        (f"Song {i}", _id(100 + i)) for i in range(2, 21)
    ]
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode(
            "2025-12",
            year=2025,
            month=12,
            entries=_entries_from_pairs(pairs_a),
        ),
    )
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            "2026-01",
            year=2026,
            month=1,
            entries=_entries_from_pairs(pairs_b),
        ),
    )

    issues = validate_raw_episodes(repo_root)
    assert has_validation_errors(issues)
    assert any("title mismatch" in issue.message for issue in issues)
    assert any("first:" in issue.message and "then:" in issue.message for issue in issues)


def test_same_title_different_ids_is_error(repo_root: Path) -> None:
    pairs_a = [("Shared Title", "firstid0001")] + [
        (f"Song {i}", _id(i)) for i in range(2, 21)
    ]
    pairs_b = [("Shared Title", "secondid001")] + [
        (f"Song {i}", _id(100 + i)) for i in range(2, 21)
    ]
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode(
            "2025-12",
            year=2025,
            month=12,
            entries=_entries_from_pairs(pairs_a),
        ),
    )
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            "2026-01",
            year=2026,
            month=1,
            entries=_entries_from_pairs(pairs_b),
        ),
    )

    issues = validate_raw_episodes(repo_root)
    assert has_validation_errors(issues)
    assert any("youtube_video_id mismatch" in issue.message for issue in issues)


def test_null_id_rows_excluded_from_corpus(repo_root: Path) -> None:
    pairs = [("Song 1", None)] + [(f"Song {i}", _id(i)) for i in range(2, 21)]
    entries = _entries_from_pairs([(p[0], p[1] or "") for p in pairs])
    entries[0]["youtube_video_id"] = None
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode("2025-12", year=2025, month=12, entries=entries),
    )
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode("2026-01", year=2026, month=1, entries=entries),
    )

    issues = validate_raw_episodes(repo_root)
    assert not has_validation_errors(issues)
    assert not any("mismatch" in issue.message for issue in issues)


def test_duplicate_episode_roundup_id_across_episodes_is_error(repo_root: Path) -> None:
    pairs = [(f"Song {i}", _id(i)) for i in range(1, 21)]
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode(
            "2025-12",
            year=2025,
            month=12,
            entries=_entries_from_pairs(pairs),
            episode_youtube_id="roundup0001",
        ),
    )
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            "2026-01",
            year=2026,
            month=1,
            entries=_entries_from_pairs(pairs),
            episode_youtube_id="roundup0001",
        ),
    )

    issues = validate_raw_episodes(repo_root)
    assert has_validation_errors(issues)
    assert any(
        "episode youtube_video_id" in issue.message
        and "duplicate across episodes" in issue.message
        for issue in issues
    )
    assert any("first:" in issue.message and "then:" in issue.message for issue in issues)


def test_distinct_episode_roundup_ids_pass(repo_root: Path) -> None:
    pairs = [(f"Song {i}", _id(i)) for i in range(1, 21)]
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode(
            "2025-12",
            year=2025,
            month=12,
            entries=_entries_from_pairs(pairs),
            episode_youtube_id="roundup0001",
        ),
    )
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            "2026-01",
            year=2026,
            month=1,
            entries=_entries_from_pairs(pairs),
            episode_youtube_id="roundup0002",
        ),
    )

    issues = validate_raw_episodes(repo_root)
    assert not has_validation_errors(issues)
    assert not any("duplicate across episodes" in issue.message for issue in issues)


def test_empty_episode_roundup_id_skips_uniqueness_check(repo_root: Path) -> None:
    pairs = [(f"Song {i}", _id(i)) for i in range(1, 21)]
    _write_episode(
        repo_root,
        "2025-12.json",
        _episode(
            "2025-12",
            year=2025,
            month=12,
            entries=_entries_from_pairs(pairs),
            episode_youtube_id="",
        ),
    )
    _write_episode(
        repo_root,
        "2026-01.json",
        _episode(
            "2026-01",
            year=2026,
            month=1,
            entries=_entries_from_pairs(pairs),
            episode_youtube_id="",
        ),
    )

    issues = validate_raw_episodes(repo_root)
    assert not has_validation_errors(issues)
    assert not any("duplicate across episodes" in issue.message for issue in issues)
