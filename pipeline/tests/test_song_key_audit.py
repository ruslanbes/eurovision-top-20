from __future__ import annotations

from evtop20.song_key_audit import (
    audit_song_keys,
    format_audit_markdown,
    soft_song_key,
)
from evtop20.song_key_normalize import normalize_song_key_part


def _row(**overrides: object) -> dict:
    base = {
        "video_title": "Artist A - Song One | Norway 🇳🇴 | Grand Final | Eurovision 2020",
        "artist": "Artist A",
        "song": "Song One",
        "country": "Norway",
        "year": 2020,
        "flag": "🇳🇴",
        "performance_category": "final_live",
        "top1": 1,
        "top3": 1,
        "top5": 1,
        "top10": 1,
        "top20": 1,
        "chart_points": 20,
    }
    base.update(overrides)
    return base


def test_soft_token_normalizes_and_and_punctuation() -> None:
    assert normalize_song_key_part("Artist A & Artist B") == normalize_song_key_part(
        "Artist A and Artist B"
    )
    assert normalize_song_key_part("Song-One!") == normalize_song_key_part("Song One")


def test_soft_song_key_differs_from_exact_for_punctuation() -> None:
    exact_a = ("artist a", "song-one")
    exact_b = ("artist a", "song one")
    assert exact_a != exact_b
    assert soft_song_key("Artist A", "Song-One") == soft_song_key("Artist A", "Song One")


def test_audit_reports_multi_member_exact_merge_groups() -> None:
    report = audit_song_keys(
        [
            _row(video_title="live clip"),
            _row(
                video_title="official clip",
                youtube_video_id="other",
                performance_category="official_video",
            ),
        ]
    )

    assert report.eligible_video_rows == 2
    assert report.exact_song_keys == 1
    assert len(report.multi_member_merge_groups) == 1
    assert report.multi_member_merge_groups[0].member_count == 2
    assert report.near_duplicate_clusters == []


def test_audit_merges_punctuation_variants_under_normalized_exact_key() -> None:
    report = audit_song_keys(
        [
            _row(song="Song-One", video_title="title a"),
            _row(song="Song One", video_title="title b"),
        ]
    )

    assert report.exact_song_keys == 1
    assert report.near_duplicate_clusters == []
    assert len(report.multi_member_merge_groups) == 1


def test_audit_reports_country_conflict_in_multi_member_group() -> None:
    report = audit_song_keys(
        [
            _row(song="Song One", country="Norway", year=2020),
            _row(
                song="Song Two",
                country="Sweden",
                year=2021,
                video_title="other song",
            ),
        ]
    )

    assert report.exact_song_keys == 2
    assert report.soft_merge_conflicts == []


def test_format_audit_markdown_includes_recommendation() -> None:
    report = audit_song_keys([_row()])
    text = format_audit_markdown(report)

    assert "Song key normalization audit" in text
    assert "Recommendation" in text
    assert report.recommendation in text
