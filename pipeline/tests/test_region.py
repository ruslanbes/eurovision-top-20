from __future__ import annotations

import pytest

from evtop20.esc_results.join import EscResultsJoiner
from evtop20.package import augment_stats_row
from evtop20.region import region_from_title
from evtop20.song_stats import (
    SongStatsError,
    package_song_stats_payload,
    validate_song_stats_payload,
)
from evtop20.title_parse import ParsedVideoTitle, parse_video_title

CARMELLE_TITLE = (
    "CARMELLE - Sobra-Sobra | The Philippines 🇵🇭 | "
    "Eurovision Song Contest Asia 2026 | #EurovisionAsia"
)


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        (CARMELLE_TITLE, "asia"),
        ("Some clip | Eurovision Song Contest Asia 2027", "asia"),
        ("Some clip | #EurovisionAsia", "asia"),
        ("Some clip | EUROVISION SONG CONTEST ASIA 2027", "asia"),
        ("Some clip #eurovisionasia", "asia"),
        ("Unparseable Asia teaser | eurovision song contest asia", "asia"),
        (
            "Tommy Cash - Espresso Macchiato | Estonia 🇪🇪 | Official Music Video | #Eurovision2025",
            "europe",
        ),
        ("Eurovision Song Contest 2017 - Grand Final - Live", "europe"),
        (None, "europe"),
    ],
)
def test_region_from_title(title: str | None, expected: str) -> None:
    assert region_from_title(title) == expected


def test_parse_asia_pipe_four_segment_title() -> None:
    assert parse_video_title(CARMELLE_TITLE, "LZQg6YKsvJ8") == ParsedVideoTitle(
        artist="CARMELLE",
        song="Sobra-Sobra",
        flag="🇵🇭",
        country="Philippines",
        performance_category="national_final",
        year=2026,
        extractor="pipe_four_segment_asia_v1",
    )


def test_parse_asia_title_detects_type_segment() -> None:
    parsed = parse_video_title(
        "Artist - Song (LIVE) | Philippines 🇵🇭 | "
        "Eurovision Song Contest Asia 2027 | Grand Final"
    )
    assert parsed is not None
    assert parsed.performance_category == "final_live"
    assert parsed.year == 2027
    assert parsed.song == "Song"


def test_european_pipe_four_segment_still_wins_for_european_titles() -> None:
    parsed = parse_video_title(
        "Tommy Cash - Espresso Macchiato | Estonia 🇪🇪 | Official Music Video | #Eurovision2025"
    )
    assert parsed is not None
    assert parsed.extractor == "pipe_four_segment_v1"


def _stats_row(**overrides: object) -> dict:
    row = {
        "video_title": CARMELLE_TITLE,
        "youtube_video_id": "LZQg6YKsvJ8",
        "top1": 0,
        "top3": 0,
        "top5": 1,
        "top10": 1,
        "top20": 1,
        "chart_points": 6,
    }
    row.update(overrides)
    return row


def _joiner(**kwargs: object) -> EscResultsJoiner:
    return EscResultsJoiner(
        last_completed_contest_year=2026,
        entries=[
            {
                "artist": "Someone Else",
                "contest_year": 2026,
                "country_code": "AU",
                "esc_final_place": 4,
                "song": "Other",
            },
        ],
        **kwargs,
    )


def test_augment_stats_row_asia_is_pending() -> None:
    packaged = augment_stats_row(_stats_row(), esc_joiner=_joiner())

    assert packaged["region"] == "asia"
    assert packaged["country"] == "Philippines"
    assert packaged["performance_category"] == "national_final"
    assert packaged["esc_final_place"] == "PENDING"


def test_augment_stats_row_asia_placement_override_wins() -> None:
    joiner = _joiner(placement_overrides={"LZQg6YKsvJ8": 2})
    packaged = augment_stats_row(_stats_row(), esc_joiner=joiner)

    assert packaged["esc_final_place"] == 2


def test_augment_stats_row_unparsed_title_defaults_to_europe() -> None:
    packaged = augment_stats_row(
        _stats_row(video_title="Käärijä & Baby Lasagna - #eurodab | #UnitedByMusic 🇨🇭")
    )
    assert packaged["artist"] is None
    assert packaged["region"] == "europe"


def _song_video_row(**overrides: object) -> dict:
    row = {
        "video_title": "Artist A - Song One | Australia 🇦🇺 | Grand Final | Eurovision 2026",
        "top1": 1,
        "top3": 1,
        "top5": 1,
        "top10": 1,
        "top20": 1,
        "chart_points": 10,
        "youtube_video_id": "vid000000001",
        "artist": "Artist A",
        "song": "Song One",
        "flag": "🇦🇺",
        "country": "Australia",
        "performance_category": "final_live",
        "year": 2026,
        "region": "europe",
        "esc_final_place": 4,
    }
    row.update(overrides)
    return row


def test_song_stats_same_year_country_allowed_across_regions() -> None:
    europe = _song_video_row()
    asia = _song_video_row(
        video_title="Artist B - Song Two | Australia 🇦🇺 | Eurovision Song Contest Asia 2026 | #EurovisionAsia",
        youtube_video_id="vid000000002",
        artist="Artist B",
        song="Song Two",
        region="asia",
        esc_final_place="PENDING",
    )
    payload, _warnings = package_song_stats_payload(
        {"rows": [europe, asia]},
        source="packaged/per-video/alltime",
    )

    assert {row["region"] for row in payload["rows"]} == {"europe", "asia"}
    assert validate_song_stats_payload(payload) == []


def test_song_stats_rejects_same_region_year_country() -> None:
    issues = validate_song_stats_payload(
        {
            "rows": [
                _song_video_row(region="asia"),
                _song_video_row(artist="Artist B", song="Song Two", region="asia"),
            ]
        }
    )
    assert len(issues) == 1
    assert "asia/2026/Australia" in issues[0]


def test_song_stats_rejects_song_spanning_regions() -> None:
    europe = _song_video_row()
    asia = _song_video_row(youtube_video_id="vid000000002", region="asia")
    with pytest.raises(SongStatsError, match="region mismatch"):
        package_song_stats_payload(
            {"rows": [europe, asia]},
            source="packaged/per-video/alltime",
        )
