from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.esc_results.flatten import flatten_esc_dataset
from evtop20.esc_results.join import EscResultsJoiner, load_esc_results_joiner
from evtop20.esc_results.normalize import normalize_join_artist, normalize_join_text
from evtop20.package import augment_stats_row, run_package
from evtop20.paths import (
    find_repo_root,
    packaged_per_video_alltime_stats_latest_path,
)


@pytest.fixture()
def esc_fixture_dir(tmp_path: Path) -> Path:
    senior = tmp_path / "data" / "senior"
    year_2020 = senior / "2020"
    year_2024 = senior / "2024"
    year_2025 = senior / "2025"

    (year_2020 / "contestants" / "0_ru").mkdir(parents=True)
    (year_2020 / "contestants" / "0_ru" / "contestant.json").write_text(
        json.dumps(
            {
                "id": 0,
                "country": "RU",
                "artist": "Little Big",
                "song": "Uno",
            }
        ),
        encoding="utf-8",
    )
    (year_2020 / "rounds").mkdir(parents=True)
    (year_2020 / "rounds" / "final.json").write_text(
        json.dumps({"performances": None}),
        encoding="utf-8",
    )

    (year_2024 / "contestants" / "36_nl").mkdir(parents=True)
    (year_2024 / "contestants" / "36_nl" / "contestant.json").write_text(
        json.dumps(
            {
                "id": 36,
                "country": "NL",
                "artist": "Joost Klein",
                "song": "Europapa",
            }
        ),
        encoding="utf-8",
    )
    (year_2024 / "contestants" / "1_ch").mkdir(parents=True)
    (year_2024 / "contestants" / "1_ch" / "contestant.json").write_text(
        json.dumps(
            {
                "id": 1,
                "country": "CH",
                "artist": "Nemo",
                "song": "The Code",
            }
        ),
        encoding="utf-8",
    )
    (year_2024 / "rounds").mkdir(parents=True)
    (year_2024 / "rounds" / "final.json").write_text(
        json.dumps(
            {
                "performances": [
                    {"contestantId": 1, "place": 1},
                ]
            }
        ),
        encoding="utf-8",
    )

    (year_2025 / "contestants" / "0_ee").mkdir(parents=True)
    (year_2025 / "contestants" / "0_ee" / "contestant.json").write_text(
        json.dumps(
            {
                "id": 0,
                "country": "EE",
                "artist": "Tommy Cash",
                "song": "Espresso Macchiato",
            }
        ),
        encoding="utf-8",
    )
    (year_2025 / "rounds").mkdir(parents=True)
    (year_2025 / "rounds" / "final.json").write_text(
        json.dumps(
            {
                "performances": [
                    {"contestantId": 0, "place": 14},
                ]
            }
        ),
        encoding="utf-8",
    )

    return tmp_path


def test_normalize_join_artist_treats_duets_equivalently() -> None:
    assert normalize_join_artist("AySel & Arash") == normalize_join_artist("Aysel and Arash")
    assert normalize_join_artist("Amaia & Alfred") == normalize_join_artist("Alfred and Amaia")
    assert normalize_join_artist("Amaia y Alfred") == normalize_join_artist("Alfred and Amaia")
    assert normalize_join_artist("LUM!X feat. Pia Maria") == normalize_join_artist(
        "LUM!X & Pia Maria"
    )
    assert normalize_join_artist("5MIINUST x Puuluup") == normalize_join_artist(
        "5miinust & Puuluup"
    )
    assert normalize_join_artist("Daði og Gagnamagnið") == normalize_join_artist(
        "Daði & Gagnamagnið"
    )
    assert normalize_join_artist("Netta") == "netta"


def test_joiner_matches_artist_alias_spellings() -> None:
    joiner = EscResultsJoiner(
        last_completed_contest_year=2025,
        entries=[
            {
                "artist": "AySel & Arash",
                "contest_year": 2009,
                "country_code": "AZ",
                "esc_final_place": 3,
                "song": "Always",
            },
        ],
    )
    assert (
        joiner.lookup(
            {
                "year": 2009,
                "country": "Azerbaijan",
                "artist": "Aysel and Arash",
                "song": "Always",
                "video_title": "Aysel and Arash - Always - Grand Final",
                "youtube_video_id": "gf",
            }
        )
        == 3
    )


def test_joiner_matches_stage_name_via_song_fallback() -> None:
    joiner = EscResultsJoiner(
        last_completed_contest_year=2025,
        entries=[
            {
                "artist": "Kristina Pelakova",
                "contest_year": 2010,
                "country_code": "SK",
                "esc_final_place": "DNQ",
                "song": "Horehronie",
            },
        ],
    )
    assert (
        joiner.lookup(
            {
                "year": 2010,
                "country": "Slovakia",
                "artist": "Kristina",
                "song": "Horehronie",
                "video_title": "Kristina - Horehronie - Slovakia",
                "youtube_video_id": "kghCqyMLPFA",
            }
        )
        == "DNQ"
    )


def test_joiner_country_year_override_maps_malta_mesc() -> None:
    joiner = EscResultsJoiner(
        last_completed_contest_year=2025,
        entries=[
            {
                "artist": "Miriana Conte",
                "contest_year": 2025,
                "country_code": "MT",
                "esc_final_place": 17,
                "song": "Serving",
            },
        ],
        join_overrides={"VLCV0GV4g9A": (2025, "MT")},
    )
    assert (
        joiner.lookup(
            {
                "year": 2025,
                "country": "Malta",
                "artist": "Kant",
                "song": "Miriana Conte",
                "video_title": "Kant - Miriana Conte | MESC 2025",
                "youtube_video_id": "VLCV0GV4g9A",
            }
        )
        == 17
    )


def test_flatten_assigns_cancelled_dq_and_rank(esc_fixture_dir: Path, tmp_path: Path) -> None:
    out_dir = tmp_path / "esc-results"
    result = flatten_esc_dataset(esc_fixture_dir, out_dir, release_tag="test")

    entries = json.loads((out_dir / "entries.json").read_text(encoding="utf-8"))
    by_key = {
        (row["contest_year"], row["country_code"], row["artist"]): row["esc_final_place"]
        for row in entries
    }

    assert result.last_completed_contest_year == 2025
    assert by_key[(2020, "RU", "Little Big")] == "CANCELLED"
    assert by_key[(2024, "NL", "Joost Klein")] == "DQ"
    assert by_key[(2024, "CH", "Nemo")] == 1
    assert by_key[(2025, "EE", "Tommy Cash")] == 14


def test_joiner_exact_and_fallback_and_ambiguous(tmp_path: Path) -> None:
    joiner = EscResultsJoiner(
        last_completed_contest_year=2025,
        entries=[
            {
                "artist": "Nemo",
                "contest_year": 2024,
                "country_code": "CH",
                "esc_final_place": 1,
                "song": "The Code",
            },
            {
                "artist": "Nemo",
                "contest_year": 2024,
                "country_code": "CH",
                "esc_final_place": 1,
                "song": "The Code (Live)",
            },
        ],
    )

    exact = joiner.lookup(
        {
            "year": 2024,
            "country": "Switzerland",
            "artist": "Nemo",
            "song": "The Code",
            "video_title": "Nemo - The Code",
            "youtube_video_id": "abc",
        }
    )
    assert exact == 1

    fallback = joiner.lookup(
        {
            "year": 2024,
            "country": "Switzerland",
            "artist": "Nemo",
            "song": "Different Title On YouTube",
            "video_title": "Nemo - Different Title On YouTube",
            "youtube_video_id": "def",
        }
    )
    assert fallback is None
    assert any("ambiguous ESC results match" in warning for warning in joiner.warnings)

    single_song_joiner = EscResultsJoiner(
        last_completed_contest_year=2025,
        entries=[
            {
                "artist": "Nemo",
                "contest_year": 2024,
                "country_code": "CH",
                "esc_final_place": 1,
                "song": "The Code",
            },
        ],
    )
    assert (
        single_song_joiner.lookup(
            {
                "year": 2024,
                "country": "Switzerland",
                "artist": "Nemo",
                "song": "The Code (Official Video)",
                "video_title": "Nemo - The Code (Official Video)",
                "youtube_video_id": "xyz",
            }
        )
        == 1
    )

    pending = joiner.lookup(
        {
            "year": 2026,
            "country": "Estonia",
            "artist": "Tommy Cash",
            "song": "Espresso Macchiato",
            "video_title": "Tommy Cash - Espresso Macchiato",
            "youtube_video_id": "ghi",
        }
    )
    assert pending == "PENDING"


def test_joiner_placement_override() -> None:
    joiner = EscResultsJoiner(
        last_completed_contest_year=2025,
        entries=[],
        placement_overrides={"ehH0_UXtQlY": "NON_ENTRY"},
    )
    place = joiner.lookup(
        {
            "year": 2017,
            "country": "Ukraine",
            "artist": "Various Artists",
            "song": "Grand Final",
            "video_title": "Eurovision Song Contest 2017 - Grand Final - Live",
            "youtube_video_id": "ehH0_UXtQlY",
        }
    )
    assert place == "NON_ENTRY"


def test_joiner_skips_vendor_join_for_world_country() -> None:
    joiner = EscResultsJoiner(
        last_completed_contest_year=2026,
        entries=[
            {
                "artist": "Nemo",
                "contest_year": 2026,
                "country_code": "CH",
                "esc_final_place": 1,
                "song": "The Code",
            },
        ],
    )
    place = joiner.lookup(
        {
            "year": 2026,
            "country": "World",
            "artist": "Various Artists",
            "song": "Grand Final",
            "video_title": "Eurovision Song Contest 2026 - Grand Final - Live",
            "youtube_video_id": "not-in-overrides",
        }
    )
    assert place is None


def test_package_writes_esc_final_place() -> None:
    repo_root = find_repo_root(Path(__file__))
    load_esc_results_joiner(repo_root)
    run_package(repo_root)

    packaged = json.loads(
        packaged_per_video_alltime_stats_latest_path(repo_root).read_text(encoding="utf-8")
    )
    rows = packaged["rows"]
    assert rows
    assert "esc_final_place" in rows[0]

    netta = next(
        row
        for row in rows
        if row.get("artist") == "Netta" and row.get("year") == 2018
    )
    assert netta["esc_final_place"] == 1

    joost = next(
        row
        for row in rows
        if row.get("artist") == "Joost Klein" and row.get("year") == 2024
    )
    assert joost["esc_final_place"] == "DQ"

    live_stream = next(
        row for row in rows if row.get("youtube_video_id") == "ehH0_UXtQlY"
    )
    assert live_stream["esc_final_place"] == "NON_ENTRY"

    aysel_gf = next(
        row for row in rows if row.get("youtube_video_id") == "9OEIOS1oUeY"
    )
    assert aysel_gf["esc_final_place"] == 3

    kristina = next(
        row for row in rows if row.get("youtube_video_id") == "kghCqyMLPFA"
    )
    assert kristina["esc_final_place"] == "DNQ"

    kant_mesc = next(
        row for row in rows if row.get("youtube_video_id") == "VLCV0GV4g9A"
    )
    assert kant_mesc["esc_final_place"] == 17

    samoylova = next(
        row for row in rows if row.get("youtube_video_id") == "Qu5kSWkZqOI"
    )
    assert samoylova["esc_final_place"] == "WITHDRAWN"

    eurodab = next(
        row for row in rows if row.get("youtube_video_id") == "DGsL8hA-1rE"
    )
    assert eurodab["country"] == "World"
    assert eurodab["flag"] == "🌍"
    assert eurodab["esc_final_place"] == "NON_ENTRY"


def test_augment_stats_row_without_joiner_sets_null_esc_final_place() -> None:
    row = augment_stats_row(
        {
            "video_title": (
                "Netta - Toy (LIVE) | Israel 🇮🇱 | Grand Final | Winner of Eurovision 2018"
            ),
            "youtube_video_id": "abc",
            "top1": 1,
            "top3": 1,
            "top5": 1,
            "top10": 1,
            "top20": 1,
            "chart_points": 1,
        }
    )
    assert row["esc_final_place"] is None
    assert normalize_join_text(row["artist"]) == normalize_join_text("Netta")
