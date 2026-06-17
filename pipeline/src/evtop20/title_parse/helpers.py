from __future__ import annotations

import re

from evtop20.title_parse.countries import (
    COUNTRY_ALIASES,
    COUNTRY_TO_FLAG,
    FLAG_TO_COUNTRY,
)

ARTIST_SONG_SEPARATORS = (" - ", " – ", " — ")
FLAG_PATTERN = re.compile(r"([\U0001F1E6-\U0001F1FF]{2})")
YEAR_PATTERNS = (
    re.compile(r"(?:Winner of )?Eurovision(?: Song Contest)?\s*(\d{4})", re.IGNORECASE),
    re.compile(r"#Eurovision(\d{4})", re.IGNORECASE),
    re.compile(r"(\d{4})\s+Eurovision(?: Song Contest)?", re.IGNORECASE),
)
LIVE_SUFFIX = re.compile(r"\s*\(LIVE\)\s*$", re.IGNORECASE)
PAREN_COUNTRY_PATTERN = re.compile(r"^(.+?)\s*\(([^)]+)\)\s*(.*)$", re.DOTALL)
LIVE_SEGMENT = re.compile(r"^LIVE$", re.IGNORECASE)


def split_pipe_segments(title: str) -> list[str]:
    return [segment.strip() for segment in title.split(" | ")]


def split_dash_segments(title: str) -> list[str]:
    return [segment.strip() for segment in title.split(" - ")]


def extract_year(text: str) -> int | None:
    for pattern in YEAR_PATTERNS:
        match = pattern.search(text)
        if match:
            return int(match.group(1))
    return None


def strip_year_phrases(text: str) -> str:
    cleaned = text
    for pattern in YEAR_PATTERNS:
        cleaned = pattern.sub("", cleaned)
    return cleaned.replace("#", "").strip()


def parse_artist_song(segment: str) -> tuple[str, str, bool] | None:
    segment = segment.strip()
    live = bool(LIVE_SUFFIX.search(segment))
    if live:
        segment = LIVE_SUFFIX.sub("", segment).strip()

    for separator in ARTIST_SONG_SEPARATORS:
        if separator not in segment:
            continue
        artist, song = segment.split(separator, 1)
        artist = artist.strip()
        song = song.strip()
        if artist and song:
            return artist, song, live
    return None


def _canonical_country_name(name: str) -> str:
    stripped = name.strip()
    return COUNTRY_ALIASES.get(stripped, stripped)


def parse_country_flag(segment: str) -> tuple[str, str] | None:
    segment = segment.strip()
    match = FLAG_PATTERN.search(segment)
    if not match:
        return None

    flag = match.group(1)
    before = segment[: match.start()].strip()
    if before:
        return _canonical_country_name(before), flag

    after = segment[match.end() :].strip()
    after = re.sub(r"\s*\([^)]*\)", "", after).strip()
    if not after:
        return None
    return _canonical_country_name(after), flag


def lookup_country_name(name: str) -> tuple[str, str] | None:
    normalized = name.strip()
    if not normalized:
        return None

    canonical = COUNTRY_ALIASES.get(normalized, normalized)
    flag = COUNTRY_TO_FLAG.get(canonical)
    if flag is None:
        return None
    return canonical, flag


def lookup_flag(flag: str) -> tuple[str, str] | None:
    country = FLAG_TO_COUNTRY.get(flag)
    if country is None:
        return None
    return country, flag


def resolve_country_flag(segment: str) -> tuple[str, str] | None:
    segment = segment.strip()
    if not segment:
        return None

    parsed = parse_country_flag(segment)
    if parsed is not None:
        country, flag = parsed
        canonical = COUNTRY_ALIASES.get(country, country)
        if canonical in COUNTRY_TO_FLAG:
            return canonical, COUNTRY_TO_FLAG[canonical]
        return country, flag

    flag_match = FLAG_PATTERN.fullmatch(segment)
    if flag_match is not None:
        return lookup_flag(flag_match.group(1))

    return lookup_country_name(segment)


def split_country_and_performance_type(segment: str) -> tuple[str, str, str] | None:
    """Parse ``Country flag PerformanceType`` in one dash segment."""
    segment = segment.strip()
    match = FLAG_PATTERN.search(segment)
    if not match:
        return None

    flag = match.group(1)
    before = segment[: match.start()].strip()
    after = re.sub(r"^[\s-]+", "", segment[match.end() :]).strip()
    if not before or not after:
        return None

    canonical = COUNTRY_ALIASES.get(before, before)
    if COUNTRY_TO_FLAG.get(canonical) != flag:
        return None
    return canonical, flag, after


def extract_song_and_embedded_country_flag(
    segment: str,
) -> tuple[str, str, str] | None:
    """Parse ``Song flag Country`` embedded in a dash segment."""
    segment = segment.strip()
    match = FLAG_PATTERN.search(segment)
    if not match:
        return None

    flag = match.group(1)
    song = segment[: match.start()].strip()
    country_text = segment[match.end() :].strip()
    if not song or not country_text:
        return None

    country_lookup = lookup_country_name(country_text)
    if country_lookup is None:
        return None
    country, resolved_flag = country_lookup
    if resolved_flag != flag:
        return None
    return song, country, flag


def parse_parenthetical_country_segment(
    segment: str,
) -> tuple[str, str, str, str] | None:
    """Parse ``Song (Country) tail`` from one dash segment."""
    match = PAREN_COUNTRY_PATTERN.match(segment.strip())
    if not match:
        return None

    song = match.group(1).strip()
    country_text = match.group(2).strip()
    tail = match.group(3).strip()
    if not song or not country_text:
        return None

    country_flag = resolve_country_flag(country_text)
    if country_flag is None:
        country_flag = lookup_country_name(country_text)
    if country_flag is None:
        return None

    country, flag = country_flag
    return song, country, flag, tail


def format_performance_type(performance_type_segment: str, *, live: bool) -> str:
    performance_type = performance_type_segment.strip()
    if live and "(LIVE)" not in performance_type.upper():
        return f"{performance_type} (LIVE)"
    return performance_type


def strip_year_from_text(text: str, year: int) -> str:
    without_year = re.sub(rf"\b{year}\b", "", text)
    return re.sub(r"\s+", " ", without_year).strip()


def performance_type_from_year_tail(tail: str) -> tuple[str, int] | None:
    year = extract_year(tail)
    if year is None:
        return None

    if re.search(r"\blive at\b", tail, re.IGNORECASE):
        performance_type = strip_year_from_text(tail, year)
    else:
        performance_type = strip_year_phrases(tail).strip()
        if performance_type.startswith("-"):
            performance_type = performance_type.lstrip("-").strip()

    if not performance_type:
        return None
    return performance_type, year


def derive_performance_type_from_tail(tail_segment: str) -> str | None:
    if extract_year(tail_segment) is None:
        return None

    remainder = strip_year_phrases(tail_segment)
    if not remainder:
        if re.search(r"\bwinner of eurovision\b", tail_segment, re.IGNORECASE):
            return "Winner of Eurovision"
        return None
    if remainder.lower().startswith("winner of eurovision"):
        return "Winner of Eurovision"
    return remainder


def parse_glued_country_tail(segment: str) -> tuple[str, str, str] | None:
    """Parse ``Country flag|tail`` when the pipe has no surrounding spaces."""
    match = re.match(
        r"^(.*?)([\U0001F1E6-\U0001F1FF]{2})\|(.+)$",
        segment.strip(),
    )
    if not match:
        return None

    country = match.group(1).strip()
    flag = match.group(2)
    tail = match.group(3).strip()
    if not country or not tail:
        return None
    return country, flag, tail
