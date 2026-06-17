from __future__ import annotations

import json
from pathlib import Path

import pytest

from evtop20.title_parse import ParsedVideoTitle, parse_video_title
from evtop20.title_parse.extractors import (
    DashFiveSegmentExtractor,
    PipeFourSegmentExtractor,
    PipeThreeSegmentExtractor,
)
from evtop20.title_parse.helpers import (
    derive_performance_type_from_tail,
    extract_year,
    parse_artist_song,
    parse_country_flag,
)


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        (
            "Tommy Cash - Espresso Macchiato (LIVE) | Estonia 🇪🇪 | Grand Final | Eurovision 2025",
            ParsedVideoTitle(
                artist="Tommy Cash",
                song="Espresso Macchiato",
                flag="🇪🇪",
                country="Estonia",
                performance_type="Grand Final (LIVE)",
                year=2025,
                extractor="pipe_four_segment_v1",
            ),
        ),
        (
            "Tommy Cash - Espresso Macchiato | Estonia 🇪🇪 | Official Music Video | #Eurovision2025",
            ParsedVideoTitle(
                artist="Tommy Cash",
                song="Espresso Macchiato",
                flag="🇪🇪",
                country="Estonia",
                performance_type="Official Music Video",
                year=2025,
                extractor="pipe_four_segment_v1",
            ),
        ),
        (
            "Alexander Rybak - Fairytale (LIVE) | Norway 🇳🇴 | Grand Final | Winner of Eurovision 2009",
            ParsedVideoTitle(
                artist="Alexander Rybak",
                song="Fairytale",
                flag="🇳🇴",
                country="Norway",
                performance_type="Grand Final (LIVE)",
                year=2009,
                extractor="pipe_four_segment_v1",
            ),
        ),
        (
            "Joost Klein - Europapa (LIVE) | Netherlands 🇳🇱 | Second Semi-Final | Eurovision 2024",
            ParsedVideoTitle(
                artist="Joost Klein",
                song="Europapa",
                flag="🇳🇱",
                country="Netherlands",
                performance_type="Second Semi-Final (LIVE)",
                year=2024,
                extractor="pipe_four_segment_v1",
            ),
        ),
        (
            "Sunstroke Project & Olia Tira - Run Away | Moldova 🇲🇩 (Epic Sax Guy) | Grand Final | Eurovision 2010",
            ParsedVideoTitle(
                artist="Sunstroke Project & Olia Tira",
                song="Run Away",
                flag="🇲🇩",
                country="Moldova",
                performance_type="Grand Final",
                year=2010,
                extractor="pipe_four_segment_v1",
            ),
        ),
        (
            "Nemo - The Code (LIVE) | Switzerland 🇨🇭| Winner of Eurovision 2024",
            ParsedVideoTitle(
                artist="Nemo",
                song="The Code",
                flag="🇨🇭",
                country="Switzerland",
                performance_type="Winner of Eurovision (LIVE)",
                year=2024,
                extractor="pipe_two_segment_glued_v1",
            ),
        ),
        (
            "Sertab Erener - Everyway That I Can | Türkiye 🇹🇷 | Winner of Eurovision 2003",
            ParsedVideoTitle(
                artist="Sertab Erener",
                song="Everyway That I Can",
                flag="🇹🇷",
                country="Turkey",
                performance_type="Winner of Eurovision",
                year=2003,
                extractor="pipe_three_segment_v1",
            ),
        ),
        (
            "DARA - Bangaranga | Bulgaria 🇧🇬 | National Final Performance #Eurovision2026",
            ParsedVideoTitle(
                artist="DARA",
                song="Bangaranga",
                flag="🇧🇬",
                country="Bulgaria",
                performance_type="National Final Performance",
                year=2026,
                extractor="pipe_three_segment_v1",
            ),
        ),
        (
            "Little Big - Uno - Russia 🇷🇺 - Official Music Video - Eurovision 2020",
            ParsedVideoTitle(
                artist="Little Big",
                song="Uno",
                flag="🇷🇺",
                country="Russia",
                performance_type="Official Music Video",
                year=2020,
                extractor="dash_five_segment_v1",
            ),
        ),
        (
            "Hadise - Düm Tek Tek - Türkiye 🇹🇷 - Grand Final - Eurovision 2009",
            ParsedVideoTitle(
                artist="Hadise",
                song="Düm Tek Tek",
                flag="🇹🇷",
                country="Turkey",
                performance_type="Grand Final",
                year=2009,
                extractor="dash_five_segment_v1",
            ),
        ),
    ],
)
def test_parse_video_title_matches_expected(title: str, expected: ParsedVideoTitle) -> None:
    assert parse_video_title(title) == expected


@pytest.mark.parametrize(
    "title",
    [
        "Käärijä & Baby Lasagna - #eurodab - Winners Of Our Hearts at Eurovision 2025 | #UnitedByMusic ​​🇨🇭",
        "5MIINUST x Puuluup - (nendest) narkootikumidest ei tea me (küll) midagi | Estonia 🇪🇪 | Grand Final",
        "Marina Satti - ZARI (Unplugged) | Greece 🇬🇷 | #EurovisionALBM",
    ],
)
def test_parse_video_title_returns_none_for_unhandled_titles(title: str) -> None:
    assert parse_video_title(title) is None


def test_parse_artist_song_strips_live_suffix() -> None:
    assert parse_artist_song("Tommy Cash - Espresso Macchiato (LIVE)") == (
        "Tommy Cash",
        "Espresso Macchiato",
        True,
    )


def test_parse_country_flag_handles_flag_after_country() -> None:
    assert parse_country_flag("Estonia 🇪🇪") == ("Estonia", "🇪🇪")


def test_parse_country_flag_canonicalizes_country_aliases() -> None:
    assert parse_country_flag("Türkiye 🇹🇷") == ("Turkey", "🇹🇷")


def test_parse_country_flag_handles_flag_before_country() -> None:
    assert parse_country_flag("🇷🇺 Russia") == ("Russia", "🇷🇺")


def test_extract_year_from_hashtag_and_plain_phrase() -> None:
    assert extract_year("#Eurovision2025") == 2025
    assert extract_year("Winner of Eurovision 2009") == 2009


def test_derive_performance_type_from_tail() -> None:
    assert (
        derive_performance_type_from_tail("Winner of Eurovision 2003")
        == "Winner of Eurovision"
    )
    assert (
        derive_performance_type_from_tail(
            "National Final Performance #Eurovision2026"
        )
        == "National Final Performance"
    )


def test_parsed_video_title_as_dict_uses_performance_type_key() -> None:
    parsed = parse_video_title(
        "Tommy Cash - Espresso Macchiato | Estonia 🇪🇪 | Official Music Video | #Eurovision2025"
    )
    assert parsed is not None
    assert parsed.as_dict() == {
        "artist": "Tommy Cash",
        "song": "Espresso Macchiato",
        "flag": "🇪🇪",
        "country": "Estonia",
        "performance_type": "Official Music Video",
        "year": 2025,
    }


def test_extractor_chain_first_match_wins() -> None:
    title = "Tommy Cash - Espresso Macchiato | Estonia 🇪🇪 | Official Music Video | #Eurovision2025"
    assert PipeFourSegmentExtractor().try_parse(title, "") is not None
    assert PipeThreeSegmentExtractor().try_parse(title, "") is None
    assert DashFiveSegmentExtractor().try_parse(title, "") is None


def test_alltime_latest_coverage_is_at_least_half() -> None:
    alltime_path = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "processed"
        / "alltime"
        / "eurovision-top-20-alltime-latest.json"
    )
    payload = json.loads(alltime_path.read_text(encoding="utf-8"))
    titles = [row["video_title"] for row in payload["rows"]]
    distinct_titles = sorted(set(titles))

    matched = sum(1 for title in distinct_titles if parse_video_title(title) is not None)
    coverage = matched / len(distinct_titles)

    assert coverage >= 0.5, (
        f"Expected at least 50% distinct-title coverage, got {coverage:.1%} "
        f"({matched}/{len(distinct_titles)})"
    )
    assert coverage >= 0.94, (
        f"Expected at least 94% distinct-title coverage, got {coverage:.1%}"
    )
