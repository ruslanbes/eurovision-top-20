from __future__ import annotations

import json
from pathlib import Path

from evtop20.normalize import normalize_strings
from evtop20.validate import has_validation_errors, validate_raw_episodes


def test_normalize_strings_strips_recursively() -> None:
    data = {
        "episode_title": " Title ",
        "entries": [{"video_title": " Song ", "youtube_video_id": " abc123xyz01 "}],
        "period": {"year": 2026, "month": 1},
    }
    normalized = normalize_strings(data)
    assert normalized["episode_title"] == "Title"
    assert normalized["entries"][0]["video_title"] == "Song"
    assert normalized["entries"][0]["youtube_video_id"] == "abc123xyz01"
    assert normalized["period"]["year"] == 2026


def test_validate_normalizes_whitespace_in_file(tmp_path: Path) -> None:
    repo_root = tmp_path
    schema_src = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "schemas"
        / "episode.schema.json"
    )
    repo_root.mkdir(parents=True, exist_ok=True)
    schema_dst = repo_root / "data" / "schemas" / "episode.schema.json"
    schema_dst.parent.mkdir(parents=True, exist_ok=True)
    schema_dst.write_text(schema_src.read_text(encoding="utf-8"), encoding="utf-8")

    episodes_dir = repo_root / "data" / "raw" / "episodes"
    episodes_dir.mkdir(parents=True)
    path = episodes_dir / "2026-01.json"
    data = {
        "episode_title": " Eurovision Top 20: Most Watched – January 2026 ",
        "period": {"year": 2026, "month": 1},
        "youtube_video_id": None,
        "entries": [
            {
                "rank": rank,
                "video_title": f" Song {rank} ",
                "youtube_video_id": None,
            }
            for rank in range(1, 21)
        ],
    }
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    issues = validate_raw_episodes(repo_root)
    assert not has_validation_errors(issues)
    assert any(issue.severity == "info" for issue in issues)

    saved = json.loads(path.read_text(encoding="utf-8"))
    assert saved["episode_title"].startswith("Eurovision")
    assert saved["episode_title"] == saved["episode_title"].strip()
    assert saved["entries"][0]["video_title"] == "Song 1"
