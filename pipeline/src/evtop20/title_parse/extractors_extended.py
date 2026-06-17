from __future__ import annotations

import re

from evtop20.title_parse.extractors import _build_result
from evtop20.title_parse.helpers import (
    LIVE_SEGMENT,
    extract_song_and_embedded_country_flag,
    extract_year,
    format_performance_type,
    parse_parenthetical_country_segment,
    performance_type_from_year_tail,
    resolve_country_flag,
    split_country_and_performance_type,
    split_dash_segments,
)


def _dash_title(title: str) -> bool:
    return " | " not in title


class DashFiveCountryNameExtractor:
    name = "dash_five_country_name_v1"

    def try_parse(
        self, title: str, _youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        if not _dash_title(title):
            return None

        parts = split_dash_segments(title)
        if len(parts) != 5:
            return None

        artist = parts[0].strip()
        song = parts[1].strip()
        country_flag = resolve_country_flag(parts[2])
        performance_type_segment = parts[3].strip()
        year = extract_year(parts[4])
        if (
            not artist
            or not song
            or country_flag is None
            or year is None
            or not performance_type_segment
        ):
            return None

        country, flag = country_flag
        return _build_result(
            artist=artist,
            song=song,
            flag=flag,
            country=country,
            performance_type=performance_type_segment,
            year=year,
            extractor=self.name,
        )


class DashFiveTypeCountryExtractor:
    name = "dash_five_type_country_v1"

    def try_parse(
        self, title: str, _youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        if not _dash_title(title):
            return None

        parts = split_dash_segments(title)
        if len(parts) != 5:
            return None

        artist = parts[0].strip()
        song = parts[1].strip()
        performance_type_segment = parts[2].strip()
        country_flag = resolve_country_flag(parts[3])
        year = extract_year(parts[4])
        if (
            not artist
            or not song
            or country_flag is None
            or year is None
            or not performance_type_segment
        ):
            return None

        country, flag = country_flag
        return _build_result(
            artist=artist,
            song=song,
            flag=flag,
            country=country,
            performance_type=performance_type_segment,
            year=year,
            extractor=self.name,
        )


class DashSixLiveBeforeCountryExtractor:
    name = "dash_six_live_before_country_v1"

    def try_parse(
        self, title: str, _youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        if not _dash_title(title):
            return None

        parts = split_dash_segments(title)
        if len(parts) != 6:
            return None

        artist = parts[0].strip()
        song = parts[1].strip()
        if not LIVE_SEGMENT.match(parts[2].strip()):
            return None

        country_flag = resolve_country_flag(parts[3])
        performance_type_segment = parts[4].strip()
        year = extract_year(parts[5])
        if (
            not artist
            or not song
            or country_flag is None
            or year is None
            or not performance_type_segment
        ):
            return None

        country, flag = country_flag
        return _build_result(
            artist=artist,
            song=song,
            flag=flag,
            country=country,
            performance_type=format_performance_type(
                performance_type_segment, live=True
            ),
            year=year,
            extractor=self.name,
        )


class DashSixLiveAfterCountryExtractor:
    name = "dash_six_live_after_country_v1"

    def try_parse(
        self, title: str, _youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        if not _dash_title(title):
            return None

        parts = split_dash_segments(title)
        if len(parts) != 6:
            return None

        artist = parts[0].strip()
        song = parts[1].strip()
        country_flag = resolve_country_flag(parts[2])
        live_segment = parts[3].strip()
        performance_type_segment = parts[4].strip()
        year = extract_year(parts[5])
        if (
            not artist
            or not song
            or country_flag is None
            or year is None
            or not performance_type_segment
        ):
            return None

        live = LIVE_SEGMENT.match(live_segment) is not None
        if not live and live_segment.lower() != "live":
            return None

        country, flag = country_flag
        return _build_result(
            artist=artist,
            song=song,
            flag=flag,
            country=country,
            performance_type=format_performance_type(
                performance_type_segment, live=live
            ),
            year=year,
            extractor=self.name,
        )


class DashFourFlagInSongExtractor:
    name = "dash_four_flag_in_song_v1"

    def try_parse(
        self, title: str, _youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        if not _dash_title(title):
            return None

        parts = split_dash_segments(title)
        if len(parts) != 4:
            return None

        artist = parts[0].strip()
        embedded = extract_song_and_embedded_country_flag(parts[1])
        performance_type_segment = parts[2].strip()
        year = extract_year(parts[3])
        if (
            not artist
            or embedded is None
            or year is None
            or not performance_type_segment
        ):
            return None

        song, country, flag = embedded
        return _build_result(
            artist=artist,
            song=song,
            flag=flag,
            country=country,
            performance_type=performance_type_segment,
            year=year,
            extractor=self.name,
        )


class DashFourFlagGluedTypeExtractor:
    name = "dash_four_flag_glued_type_v1"

    def try_parse(
        self, title: str, _youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        if not _dash_title(title):
            return None

        parts = split_dash_segments(title)
        if len(parts) != 4:
            return None

        artist = parts[0].strip()
        song = parts[1].strip()
        split_type = split_country_and_performance_type(parts[2])
        year = extract_year(parts[3])
        if not artist or not song or split_type is None or year is None:
            return None

        country, flag, performance_type_segment = split_type
        return _build_result(
            artist=artist,
            song=song,
            flag=flag,
            country=country,
            performance_type=performance_type_segment,
            year=year,
            extractor=self.name,
        )


class DashParenCountryYearExtractor:
    name = "dash_paren_country_year_v1"

    def try_parse(
        self, title: str, _youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        if not _dash_title(title):
            return None

        parts = split_dash_segments(title)
        if len(parts) == 3:
            artist = parts[0].strip()
            parsed = parse_parenthetical_country_segment(parts[1])
            performance_type_segment = parts[2].strip()
            if not artist or parsed is None or not performance_type_segment:
                return None
            song, country, flag, tail = parsed
            year = extract_year(tail) or extract_year(parts[1])
            if year is None:
                return None
        elif len(parts) == 4:
            artist = parts[0].strip()
            parsed = parse_parenthetical_country_segment(parts[1])
            performance_type_segment = parts[3].strip()
            if not artist or parsed is None or not performance_type_segment:
                return None
            song, country, flag, _tail = parsed
            year = extract_year(parts[2])
            if year is None:
                return None
        elif len(parts) == 2:
            artist = parts[0].strip()
            parsed = parse_parenthetical_country_segment(parts[1])
            if not artist or parsed is None:
                return None
            song, country, flag, tail = parsed
            if re.search(r"\blive at\b", tail, re.IGNORECASE):
                return None
            parsed_tail = performance_type_from_year_tail(tail)
            if parsed_tail is None:
                return None
            performance_type_segment, year = parsed_tail
        else:
            return None

        return _build_result(
            artist=artist,
            song=song,
            flag=flag,
            country=country,
            performance_type=performance_type_segment,
            year=year,
            extractor=self.name,
        )


class DashLiveAtEurovisionExtractor:
    name = "dash_live_at_eurovision_v1"

    def try_parse(
        self, title: str, _youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        if not _dash_title(title):
            return None

        parts = split_dash_segments(title)
        if len(parts) != 2:
            return None

        artist = parts[0].strip()
        parsed = parse_parenthetical_country_segment(parts[1])
        if not artist or parsed is None:
            return None

        song, country, flag, tail = parsed
        parsed_tail = performance_type_from_year_tail(tail)
        if parsed_tail is None:
            return None
        performance_type, year = parsed_tail
        if not re.search(r"\blive at\b", tail, re.IGNORECASE):
            return None

        return _build_result(
            artist=artist,
            song=song,
            flag=flag,
            country=country,
            performance_type=format_performance_type(performance_type, live=True),
            year=year,
            extractor=self.name,
        )


EXTENDED_EXTRACTORS = (
    DashFiveCountryNameExtractor(),
    DashFiveTypeCountryExtractor(),
    DashSixLiveBeforeCountryExtractor(),
    DashSixLiveAfterCountryExtractor(),
    DashFourFlagInSongExtractor(),
    DashFourFlagGluedTypeExtractor(),
    DashParenCountryYearExtractor(),
    DashLiveAtEurovisionExtractor(),
)
