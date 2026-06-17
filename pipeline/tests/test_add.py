from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from evtop20.add import (
    AddError,
    AddSuggestError,
    find_best_matches,
    normalize_for_match,
    run_add,
    score_query,
)
from evtop20.cli import app
from evtop20.paths import processed_alltime_stats_latest_path
from evtop20.validate import load_episode_file

runner = CliRunner()

NETTA_OFFICIAL = (
    "Netta - TOY - Israel - Official Music Video - Eurovision 2018"
)
NETTA_LIVE = (
    "Netta - Toy (LIVE) | Israel 🇮🇱 | Grand Final | Winner of Eurovision 2018"
)
MANESKIN_LIVE = (
    "Måneskin - Zitti E Buoni (LIVE) | Italy 🇮🇹 | Grand Final | Winner of Eurovision 2021"
)
RYBAK_LIVE = (
    "Alexander Rybak - Fairytale (LIVE) | Norway 🇳🇴 | Grand Final | "
    "Winner of Eurovision 2009"
)
WRS_NATIONAL = (
    "WRS - Llámame - Romania 🇷🇴 - National Final Performance - Eurovision 2022"
)
WRS_LIVE = (
    "WRS - Llámame - LIVE - Romania 🇷🇴 - Grand Final - Eurovision 2022"
)
GO_A_OFFICIAL = (
    "Go_A - SHUM - Ukraine 🇺🇦 Official Music Video - Eurovision 2021"
)
GO_A_LIVE = (
    "Go_A - Shum (LIVE) | Ukraine 🇺🇦 | Grand Final | Eurovision 2021"
)


def _episode(*, year: int, month: int) -> dict:
    return {
        "episode_title": f"Eurovision Top 20 Most Watched: {month:02d} {year}",
        "period": {"year": year, "month": month},
        "youtube_video_id": "",
        "entries": [
            {"rank": rank, "video_title": "", "youtube_video_id": ""}
            for rank in range(1, 21)
        ],
    }


def _corpus_rows() -> list[dict]:
    return [
        {
            "video_title": NETTA_OFFICIAL,
            "youtube_video_id": "CziHrYYSyPc",
        },
        {
            "video_title": NETTA_LIVE,
            "youtube_video_id": "84LBjXaeKk4",
        },
        {
            "video_title": MANESKIN_LIVE,
            "youtube_video_id": "RVH5dn1cxAQ",
        },
        {
            "video_title": RYBAK_LIVE,
            "youtube_video_id": "WXwgZL4zx9o",
        },
        {
            "video_title": WRS_NATIONAL,
            "youtube_video_id": "s9gLcsT6L3I",
        },
        {
            "video_title": WRS_LIVE,
            "youtube_video_id": "example11id",
        },
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


def _write_corpus(repo_root: Path) -> None:
    path = processed_alltime_stats_latest_path(repo_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"generated_at": "2026-06-10", "rows": _corpus_rows()}, indent=2)
        + "\n",
        encoding="utf-8",
    )


def _write_episode(repo_root: Path, name: str, data: dict) -> Path:
    episodes_dir = repo_root / "data" / "raw" / "episodes"
    episodes_dir.mkdir(parents=True, exist_ok=True)
    path = episodes_dir / name
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return path


def _setup_prev_pair(repo_root: Path) -> None:
    prev = _episode(year=2025, month=12)
    for entry in prev["entries"]:
        if entry["rank"] == 4:
            entry["video_title"] = "Song at rank 4"
            entry["youtube_video_id"] = "bbbbbbbbbbb"
    _write_episode(repo_root, "2025-12.json", prev)
    _write_episode(repo_root, "2026-01.json", _episode(year=2026, month=1))


def test_normalize_for_match_is_case_and_accent_insensitive() -> None:
    assert normalize_for_match("Llámame") == normalize_for_match("llamame")
    assert normalize_for_match("RYBAK") == normalize_for_match("rybak")


def test_netta_official_query_scores_highest(repo_root: Path) -> None:
    _write_corpus(repo_root)
    scored = find_best_matches("netta toy official", _corpus_rows())
    assert scored[0][1]["video_title"] == NETTA_OFFICIAL


def test_maneskin_grand_final_query(repo_root: Path) -> None:
    scored = find_best_matches("maneskin zitti grand final", _corpus_rows())
    assert scored[0][1]["video_title"] == MANESKIN_LIVE


def test_wrs_national_final_query(repo_root: Path) -> None:
    scored = find_best_matches("wrs llamame national final", _corpus_rows())
    assert scored[0][1]["video_title"] == WRS_NATIONAL


def test_run_add_writes_netta_official(repo_root: Path) -> None:
    _write_corpus(repo_root)
    _write_episode(repo_root, "2026-06.json", _episode(year=2026, month=6))
    result = run_add(repo_root, episode_stem="2026-06", rank=11, query="netta toy official")
    assert "score" in result.summary
    data, _ = load_episode_file(repo_root / "data/raw/episodes/2026-06.json")
    assert data is not None
    entry = next(e for e in data["entries"] if e["rank"] == 11)
    assert entry["video_title"] == NETTA_OFFICIAL
    assert entry["youtube_video_id"] == "CziHrYYSyPc"


def test_run_add_dry_run_does_not_modify_file(repo_root: Path) -> None:
    _write_corpus(repo_root)
    path = _write_episode(repo_root, "2026-06.json", _episode(year=2026, month=6))
    before = path.read_text(encoding="utf-8")
    run_add(
        repo_root,
        episode_stem="2026-06",
        rank=11,
        query="netta toy official",
        dry_run=True,
    )
    assert path.read_text(encoding="utf-8") == before


def test_run_add_ambiguous_go_a_shum_suggests_all_close(repo_root: Path) -> None:
    rows = _corpus_rows() + [
        {
            "video_title": GO_A_OFFICIAL,
            "youtube_video_id": "goaofficial",
        },
        {
            "video_title": GO_A_LIVE,
            "youtube_video_id": "goalivevid",
        },
    ]
    path = processed_alltime_stats_latest_path(repo_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"generated_at": "2026-06-10", "rows": rows}, indent=2) + "\n",
        encoding="utf-8",
    )
    _write_episode(repo_root, "2023-02.json", _episode(year=2023, month=2))

    with pytest.raises(AddSuggestError, match="Ambiguous match") as exc_info:
        run_add(repo_root, episode_stem="2023-02", rank=16, query="go_a shum")

    titles = {title for _, title in exc_info.value.suggestions}
    assert titles == {GO_A_OFFICIAL, GO_A_LIVE}
    data, _ = load_episode_file(repo_root / "data/raw/episodes/2023-02.json")
    assert data is not None
    assert data["entries"][15]["video_title"] == ""


def test_run_add_ambiguous_netta_toy(repo_root: Path) -> None:
    _write_corpus(repo_root)
    _write_episode(repo_root, "2026-06.json", _episode(year=2026, month=6))
    with pytest.raises(AddSuggestError, match="Ambiguous match") as exc_info:
        run_add(repo_root, episode_stem="2026-06", rank=11, query="netta toy")
    titles = {title for _, title in exc_info.value.suggestions}
    assert titles == {NETTA_OFFICIAL, NETTA_LIVE}


def test_run_add_below_threshold_suggests(repo_root: Path) -> None:
    _write_corpus(repo_root)
    _write_episode(repo_root, "2026-06.json", _episode(year=2026, month=6))
    with pytest.raises(AddSuggestError, match="Did you mean:") as exc_info:
        run_add(
            repo_root,
            episode_stem="2026-06",
            rank=11,
            query="netta",
            min_score=101,
        )
    assert len(exc_info.value.suggestions) == 2


def test_run_add_target_already_set(repo_root: Path) -> None:
    _write_corpus(repo_root)
    path = _write_episode(repo_root, "2026-06.json", _episode(year=2026, month=6))
    data = json.loads(path.read_text(encoding="utf-8"))
    data["entries"][0]["video_title"] = "Taken"
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    with pytest.raises(AddError, match="already set"):
        run_add(repo_root, episode_stem="2026-06", rank=1, query="netta toy official")


def test_run_add_force_overwrites_set_rank(repo_root: Path) -> None:
    _write_corpus(repo_root)
    path = _write_episode(repo_root, "2026-06.json", _episode(year=2026, month=6))
    data = json.loads(path.read_text(encoding="utf-8"))
    data["entries"][0]["video_title"] = "Taken"
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    result = run_add(
        repo_root,
        episode_stem="2026-06",
        rank=1,
        query="netta toy official",
        force=True,
    )
    assert "(overwritten)" in result.summary
    data, _ = load_episode_file(path)
    assert data is not None
    entry = next(e for e in data["entries"] if e["rank"] == 1)
    assert entry["video_title"] == NETTA_OFFICIAL


def test_cli_add_force_overwrites(repo_root: Path) -> None:
    _write_corpus(repo_root)
    path = _write_episode(repo_root, "2026-06.json", _episode(year=2026, month=6))
    data = json.loads(path.read_text(encoding="utf-8"))
    data["entries"][10]["video_title"] = "Wrong variant"
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    result = runner.invoke(
        app,
        [
            "add",
            "2026-06",
            "11",
            "netta",
            "toy",
            "official",
            "--force",
            "--repo-root",
            str(repo_root),
        ],
    )
    assert result.exit_code == 0, result.output
    assert "(overwritten)" in result.output
    data, _ = load_episode_file(path)
    assert data is not None
    entry = next(e for e in data["entries"] if e["rank"] == 11)
    assert entry["video_title"] == NETTA_OFFICIAL


def test_run_add_missing_corpus(repo_root: Path) -> None:
    _write_episode(repo_root, "2026-06.json", _episode(year=2026, month=6))
    with pytest.raises(AddError, match="stats file not found"):
        run_add(repo_root, episode_stem="2026-06", rank=1, query="netta")


def test_run_add_empty_query(repo_root: Path) -> None:
    _write_corpus(repo_root)
    _write_episode(repo_root, "2026-06.json", _episode(year=2026, month=6))
    with pytest.raises(AddError, match="search text is required"):
        run_add(repo_root, episode_stem="2026-06", rank=1, query="   ")


def test_cli_add_prev_mode_plus_one(repo_root: Path) -> None:
    _setup_prev_pair(repo_root)
    result = runner.invoke(
        app,
        [
            "add",
            "2026-01",
            "3",
            "+1",
            "--repo-root",
            str(repo_root),
            "--dry-run",
        ],
    )
    assert result.exit_code == 0, result.output
    assert "rank 3 ← 2025-12.json rank 4 (+1)" in result.output


def test_cli_add_fuzzy_mode_1944_not_prev(repo_root: Path) -> None:
    jamala = (
        "Jamala - 1944 - Ukraine 🇺🇦 - Official Music Video - Eurovision 2016"
    )
    path = processed_alltime_stats_latest_path(repo_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "generated_at": "2022-06-10",
                "rows": [
                    {
                        "video_title": jamala,
                        "youtube_video_id": "jamala1944",
                    }
                ],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    _write_episode(repo_root, "2022-06.json", _episode(year=2022, month=6))
    result = runner.invoke(
        app,
        [
            "add",
            "2022-06",
            "1",
            "1944",
            "--repo-root",
            str(repo_root),
            "--dry-run",
        ],
    )
    assert result.exit_code == 0, result.output
    assert "corpus match" in result.output
    assert jamala in result.output


def test_cli_add_fuzzy_mode_20_out_of_delta_range(repo_root: Path) -> None:
    _write_corpus(repo_root)
    _write_episode(repo_root, "2026-06.json", _episode(year=2026, month=6))
    result = runner.invoke(
        app,
        [
            "add",
            "2026-06",
            "3",
            "20",
            "--repo-root",
            str(repo_root),
            "--dry-run",
        ],
    )
    assert result.exit_code != 0
    assert "←" not in result.output


def test_cli_add_prev_mode_extra_tokens_errors(repo_root: Path) -> None:
    _setup_prev_pair(repo_root)
    result = runner.invoke(
        app,
        [
            "add",
            "2026-01",
            "3",
            "+1",
            "netta",
            "--repo-root",
            str(repo_root),
        ],
    )
    assert result.exit_code != 0


def test_cli_add_missing_tail_errors(repo_root: Path) -> None:
    _setup_prev_pair(repo_root)
    result = runner.invoke(
        app,
        ["add", "2026-01", "3", "--repo-root", str(repo_root)],
    )
    assert result.exit_code != 0


def test_cli_add_delta_option_out_of_range_errors(repo_root: Path) -> None:
    _setup_prev_pair(repo_root)
    result = runner.invoke(
        app,
        [
            "add",
            "2026-01",
            "3",
            "--delta=1944",
            "--repo-root",
            str(repo_root),
        ],
    )
    assert result.exit_code != 0
    assert "delta must be between" in result.output


def test_cli_add_joins_remaining_words(repo_root: Path) -> None:
    _write_corpus(repo_root)
    _write_episode(repo_root, "2026-06.json", _episode(year=2026, month=6))
    result = runner.invoke(
        app,
        [
            "add",
            "2026-06",
            "11",
            "netta",
            "toy",
            "official",
            "--repo-root",
            str(repo_root),
            "--dry-run",
        ],
    )
    assert result.exit_code == 0, result.output
    assert NETTA_OFFICIAL in result.output


def test_cli_add_ambiguous_shows_error_prefix(repo_root: Path) -> None:
    _write_corpus(repo_root)
    _write_episode(repo_root, "2026-06.json", _episode(year=2026, month=6))
    result = runner.invoke(
        app,
        [
            "add",
            "2026-06",
            "11",
            "netta",
            "toy",
            "--repo-root",
            str(repo_root),
        ],
    )
    assert result.exit_code == 1
    assert "ERROR: Ambiguous match" in result.output
    assert "Did you mean:" in result.output


def test_rybak_query_beats_unrelated_rows() -> None:
    scored = find_best_matches("rybak fairytale grand final", _corpus_rows())
    assert scored[0][1]["video_title"] == RYBAK_LIVE
    assert score_query("rybak fairytale grand final", RYBAK_LIVE) >= 75
