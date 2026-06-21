from __future__ import annotations

from evtop20.sort_keys import (
    esc_final_place_sort_key,
    song_row_sort_key,
    stats_row_sort_key,
    year_sort_key_desc,
)


def _video_row(**overrides: object) -> dict:
    row = {
        "video_title": "Artist - Song | Country | Grand Final | Eurovision 2020",
        "chart_points": 10,
        "top1": 0,
        "top3": 0,
        "top5": 0,
        "top10": 1,
        "top20": 1,
        "esc_final_place": 5,
        "year": 2020,
    }
    row.update(overrides)
    return row


def _song_row(**overrides: object) -> dict:
    row = {
        "artist": "Artist",
        "song": "Song",
        "chart_points": 10,
        "top1": 0,
        "top3": 0,
        "top5": 0,
        "top10": 1,
        "top20": 1,
        "esc_final_place": 5,
        "year": 2020,
    }
    row.update(overrides)
    return row


def test_esc_final_place_sort_key_orders_numeric_before_codes() -> None:
    assert esc_final_place_sort_key(1) < esc_final_place_sort_key(2)
    assert esc_final_place_sort_key(26) < esc_final_place_sort_key("DNQ")
    assert esc_final_place_sort_key("DNQ") < esc_final_place_sort_key(None)


def test_year_sort_key_desc_prefers_newer_years() -> None:
    assert year_sort_key_desc(2026) < year_sort_key_desc(2020)
    assert year_sort_key_desc(2020) < year_sort_key_desc(None)


def test_stats_row_sort_key_uses_esc_place_before_year_and_title() -> None:
    rows = [
        _video_row(
            video_title="Zebra",
            esc_final_place=10,
            year=2018,
        ),
        _video_row(
            video_title="Alpha",
            esc_final_place=2,
            year=2024,
        ),
        _video_row(
            video_title="Beta",
            esc_final_place=2,
            year=2020,
        ),
    ]
    rows.sort(key=stats_row_sort_key)
    assert [row["video_title"] for row in rows] == ["Alpha", "Beta", "Zebra"]


def test_song_row_sort_key_uses_esc_place_before_year_and_name() -> None:
    rows = [
        _song_row(artist="Zed", song="Zed", esc_final_place=10, year=2018),
        _song_row(artist="Amy", song="Amy", esc_final_place=2, year=2024),
        _song_row(artist="Bob", song="Bob", esc_final_place=2, year=2020),
    ]
    rows.sort(key=song_row_sort_key)
    assert [(row["artist"], row["song"]) for row in rows] == [
        ("Amy", "Amy"),
        ("Bob", "Bob"),
        ("Zed", "Zed"),
    ]
