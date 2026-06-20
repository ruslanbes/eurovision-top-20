from __future__ import annotations

from typing import Protocol

from evtop20.performance_category import category_from_segment
from evtop20.title_parse.helpers import (
    derive_performance_segment_from_tail,
    extract_year,
    parse_artist_song,
    parse_country_flag,
    parse_glued_country_tail,
    split_dash_segments,
    split_pipe_segments,
)
from evtop20.title_parse.models import ParsedVideoTitle


class TitleExtractor(Protocol):
    name: str

    def try_parse(
        self, title: str, youtube_video_id: str
    ) -> ParsedVideoTitle | None: ...


def _build_result(
    *,
    artist: str,
    song: str,
    flag: str,
    country: str,
    performance_segment: str,
    year: int,
    extractor: str,
) -> ParsedVideoTitle | None:
    segment = performance_segment.strip()
    if not segment:
        return None

    result = ParsedVideoTitle(
        artist=artist,
        song=song,
        flag=flag,
        country=country,
        performance_category=category_from_segment(segment),
        year=year,
        extractor=extractor,
    )
    if not result.is_complete():
        return None
    return result


def _parse_artist_country_performance_segment_year(
    artist_song_segment: str,
    country_segment: str,
    performance_segment: str,
    year_segment: str,
    *,
    extractor: str,
) -> ParsedVideoTitle | None:
    artist_song = parse_artist_song(artist_song_segment)
    country_flag = parse_country_flag(country_segment)
    year = extract_year(year_segment)
    if artist_song is None or country_flag is None or year is None:
        return None

    artist, song, _live = artist_song
    country, flag = country_flag

    return _build_result(
        artist=artist,
        song=song,
        flag=flag,
        country=country,
        performance_segment=performance_segment,
        year=year,
        extractor=extractor,
    )


class PipeFourSegmentExtractor:
    name = "pipe_four_segment_v1"

    def try_parse(
        self, title: str, _youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        parts = split_pipe_segments(title)
        if len(parts) != 4:
            return None
        return _parse_artist_country_performance_segment_year(
            parts[0],
            parts[1],
            parts[2],
            parts[3],
            extractor=self.name,
        )


class PipeThreeSegmentExtractor:
    name = "pipe_three_segment_v1"

    def try_parse(
        self, title: str, _youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        parts = split_pipe_segments(title)
        if len(parts) != 3:
            return None

        artist_song = parse_artist_song(parts[0])
        country_flag = parse_country_flag(parts[1])
        performance_segment = derive_performance_segment_from_tail(parts[2])
        year = extract_year(parts[2])
        if (
            artist_song is None
            or country_flag is None
            or performance_segment is None
            or year is None
        ):
            return None

        artist, song, _live = artist_song
        country, flag = country_flag
        return _build_result(
            artist=artist,
            song=song,
            flag=flag,
            country=country,
            performance_segment=performance_segment,
            year=year,
            extractor=self.name,
        )


class PipeTwoSegmentGluedExtractor:
    name = "pipe_two_segment_glued_v1"

    def try_parse(
        self, title: str, _youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        parts = split_pipe_segments(title)
        if len(parts) != 2:
            return None

        artist_song = parse_artist_song(parts[0])
        glued = parse_glued_country_tail(parts[1])
        if artist_song is None or glued is None:
            return None

        country, flag, tail_segment = glued
        performance_segment = derive_performance_segment_from_tail(tail_segment)
        year = extract_year(tail_segment)
        if performance_segment is None or year is None:
            return None

        artist, song, _live = artist_song
        return _build_result(
            artist=artist,
            song=song,
            flag=flag,
            country=country,
            performance_segment=performance_segment,
            year=year,
            extractor=self.name,
        )


class DashFiveSegmentExtractor:
    name = "dash_five_segment_v1"

    def try_parse(
        self, title: str, _youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        if " | " in title:
            return None

        parts = split_dash_segments(title)
        if len(parts) != 5:
            return None

        artist = parts[0].strip()
        song = parts[1].strip()
        country_segment = parts[2]
        performance_segment = parts[3].strip()
        year_segment = parts[4].strip()

        country_flag = parse_country_flag(country_segment)
        year = extract_year(year_segment)
        if (
            not artist
            or not song
            or country_flag is None
            or year is None
            or not performance_segment
        ):
            return None

        country, flag = country_flag
        return _build_result(
            artist=artist,
            song=song,
            flag=flag,
            country=country,
            performance_segment=performance_segment,
            year=year,
            extractor=self.name,
        )


DEFAULT_EXTRACTORS: tuple[TitleExtractor, ...] = (
    PipeFourSegmentExtractor(),
    PipeThreeSegmentExtractor(),
    PipeTwoSegmentGluedExtractor(),
    DashFiveSegmentExtractor(),
)


def _extended_extractors() -> tuple[TitleExtractor, ...]:
    from evtop20.title_parse.extractors_extended import EXTENDED_EXTRACTORS

    return EXTENDED_EXTRACTORS


DEFAULT_EXTRACTORS = (
    *DEFAULT_EXTRACTORS,
    *_extended_extractors(),
)


def _lookup_extractor() -> TitleExtractor:
    from evtop20.title_parse.extractors_lookup import LOOKUP_TABLE_EXTRACTOR

    return LOOKUP_TABLE_EXTRACTOR


DEFAULT_EXTRACTORS = (
    *DEFAULT_EXTRACTORS,
    _lookup_extractor(),
)
