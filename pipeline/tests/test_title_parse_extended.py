from __future__ import annotations

import pytest

from evtop20.title_parse import ParsedVideoTitle, parse_video_title
from evtop20.title_parse.helpers import (
    lookup_country_name,
    resolve_country_flag,
)


@pytest.mark.parametrize(
    ("segment", "expected"),
    [
        ("Israel", ("Israel", "🇮🇱")),
        ("The Netherlands", ("Netherlands", "🇳🇱")),
        ("F.Y.R. Macedonia", ("North Macedonia", "🇲🇰")),
        ("Norway 🇳🇴", ("Norway", "🇳🇴")),
        ("Türkiye 🇹🇷", ("Turkey", "🇹🇷")),
        ("🇷🇺", ("Russia", "🇷🇺")),
    ],
)
def test_resolve_country_flag(segment: str, expected: tuple[str, str]) -> None:
    assert resolve_country_flag(segment) == expected


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        (
            "Netta - TOY - Israel - Official Music Video - Eurovision 2018",
            ParsedVideoTitle(
                artist="Netta",
                song="TOY",
                flag="🇮🇱",
                country="Israel",
                performance_category="official_video",
                year=2018,
                extractor="dash_five_country_name_v1",
            ),
        ),
        (
            "James Newman - My Last Breath - Official Music Video - United Kingdom 🇬🇧 - Eurovision 2020",
            ParsedVideoTitle(
                artist="James Newman",
                song="My Last Breath",
                flag="🇬🇧",
                country="United Kingdom",
                performance_category="official_video",
                year=2020,
                extractor="dash_five_type_country_v1",
            ),
        ),
        (
            "Manizha - Russian Woman - LIVE - Russia 🇷🇺 - Grand Final - Eurovision 2021",
            ParsedVideoTitle(
                artist="Manizha",
                song="Russian Woman",
                flag="🇷🇺",
                country="Russia",
                performance_category="final_live",
                year=2021,
                extractor="dash_six_live_before_country_v1",
            ),
        ),
        (
            "Julia Samoylova - I Won't Break - Russia - LIVE - Second Semi-Final - Eurovision 2018",
            ParsedVideoTitle(
                artist="Julia Samoylova",
                song="I Won't Break",
                flag="🇷🇺",
                country="Russia",
                performance_category="final_live",
                year=2018,
                extractor="dash_six_live_after_country_v1",
            ),
        ),
        (
            "Sergey Lazarev - You Are The Only One 🇷🇺 Russia - Grand Final - Eurovision 2016",
            ParsedVideoTitle(
                artist="Sergey Lazarev",
                song="You Are The Only One",
                flag="🇷🇺",
                country="Russia",
                performance_category="final_live",
                year=2016,
                extractor="dash_four_flag_in_song_v1",
            ),
        ),
        (
            "Go_A - SHUM - Ukraine 🇺🇦 Official Music Video - Eurovision 2021",
            ParsedVideoTitle(
                artist="Go_A",
                song="SHUM",
                flag="🇺🇦",
                country="Ukraine",
                performance_category="official_video",
                year=2021,
                extractor="dash_four_flag_glued_type_v1",
            ),
        ),
        (
            "Alma - Requiem (France) Eurovision 2017 - Official Music Video",
            ParsedVideoTitle(
                artist="Alma",
                song="Requiem",
                flag="🇫🇷",
                country="France",
                performance_category="official_video",
                year=2017,
                extractor="dash_paren_country_year_v1",
            ),
        ),
        (
            "Jessy Matador - Allez Ola Olé (France) - Eurovision Song Contest 2010 - Music Video",
            ParsedVideoTitle(
                artist="Jessy Matador",
                song="Allez Ola Olé",
                flag="🇫🇷",
                country="France",
                performance_category="official_video",
                year=2010,
                extractor="dash_paren_country_year_v1",
            ),
        ),
        (
            "Can Bonomo - Love Me Back - Turkey - Live - Grand Final - 2012 Eurovision Song Contest",
            ParsedVideoTitle(
                artist="Can Bonomo",
                song="Love Me Back",
                flag="🇹🇷",
                country="Turkey",
                performance_category="final_live",
                year=2012,
                extractor="dash_six_live_after_country_v1",
            ),
        ),
        (
            "Ilinca ft. Alex Florea - Yodel It! (Romania) LIVE at the 2017 Eurovision Song Contest",
            ParsedVideoTitle(
                artist="Ilinca ft. Alex Florea",
                song="Yodel It!",
                flag="🇷🇴",
                country="Romania",
                performance_category="final_live",
                year=2017,
                extractor="dash_live_at_eurovision_v1",
            ),
        ),
        (
            "Manel Navarro - Do It For Your Lover (Spain) Eurovision 2017 -National Final Performance",
            ParsedVideoTitle(
                artist="Manel Navarro",
                song="Do It For Your Lover",
                flag="🇪🇸",
                country="Spain",
                performance_category="national_final",
                year=2017,
                extractor="dash_paren_country_year_v1",
            ),
        ),
    ],
)
def test_extended_extractors_parse_recoverable_titles(
    title: str, expected: ParsedVideoTitle
) -> None:
    assert parse_video_title(title) == expected


@pytest.mark.parametrize(
    "title",
    [
        "Dami Im - Sound Of Silence (Australia) 2016 Eurovision Song Contest",
        "Eurovision Song Contest 2017 - Grand Final - Live",
        "Kristian Kostov - Beautiful Mess (Bulgaria) LIVE at the second Semi-Final",
        "5MIINUST x Puuluup - (nendest) narkootikumidest ei tea me (küll) midagi | Estonia 🇪🇪 | Grand Final",
    ],
)
def test_extended_extractors_skip_unrecoverable_titles(title: str) -> None:
    assert parse_video_title(title) is None


def test_lookup_country_name_returns_none_for_unknown_country() -> None:
    assert lookup_country_name("Atlantis") is None
