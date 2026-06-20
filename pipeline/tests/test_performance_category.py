from __future__ import annotations

import pytest

from evtop20.package import augment_stats_row
from evtop20.performance_category import (
    category_from_segment,
    normalize_performance_segment,
)
from evtop20.title_parse import parse_video_title


@pytest.mark.parametrize(
    ("segment", "expected"),
    [
        ("Special", "special"),
        ("National Final Performance", "national_final"),
        ("Sanremo (National Final Performance)", "national_final"),
        ("Grand Final (LIVE)", "final_live"),
        ("Grand Final", "final_live"),
        ("First Semi-Final (LIVE)", "final_live"),
        ("Second Semi-Final (LIVE)", "final_live"),
        ("Semi-Final", "final_live"),
        ("Winner of Eurovision", "final_live"),
        ("Winner of Eurovision (LIVE)", "final_live"),
        (
            "LIVE at the Eurovision Song Contest (LIVE)",
            "final_live",
        ),
        ("Official Music Video", "official_video"),
        ("Official Video", "official_video"),
        ("Official Lyric Video", "official_video"),
        ("Official Preview Video", "official_video"),
        ("Music Video", "official_video"),
        ("Performance in Arena di Verona", "official_video"),
        ("Showcase Performance", "official_video"),
    ],
)
def test_category_from_segment_patterns(segment: str, expected: str) -> None:
    assert category_from_segment(segment) == expected


def test_category_from_segment_returns_none_for_unknown() -> None:
    assert category_from_segment("Studio Session") is None


def test_normalize_performance_segment_strips_live_suffix() -> None:
    assert normalize_performance_segment("Grand Final (LIVE)") == normalize_performance_segment(
        "Grand Final"
    )


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        (
            "Ilinca ft. Alex Florea - Yodel It! (Romania) LIVE at the 2017 Eurovision Song Contest",
            "final_live",
        ),
        (
            "Diodato - Fai Rumore - Italy 🇮🇹 - Performance in Arena di Verona - Eurovision 2020",
            "official_video",
        ),
        (
            "Sertab Erener - Everyway That I Can | Türkiye 🇹🇷 | Winner of Eurovision 2003",
            "final_live",
        ),
        (
            "Nemo - The Code (LIVE) | Switzerland 🇨🇭| Winner of Eurovision 2024",
            "final_live",
        ),
    ],
)
def test_seed_examples_resolve_via_title_parse(title: str, expected: str) -> None:
    parsed = parse_video_title(title, "")
    assert parsed is not None
    assert parsed.performance_category == expected


def test_augment_stats_row_sets_performance_category() -> None:
    row = {
        "video_title": (
            "Tommy Cash - Espresso Macchiato | Estonia 🇪🇪 "
            "| Official Music Video | Eurovision 2025"
        ),
        "youtube_video_id": "abc123xyz01",
        "top1": 1,
        "chart_points": 10,
    }
    packaged = augment_stats_row(row)
    assert packaged["performance_category"] == "official_video"
    assert "performance_type" not in packaged
