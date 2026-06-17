from __future__ import annotations

from evtop20.title_parse.extractors import DEFAULT_EXTRACTORS, TitleExtractor
from evtop20.title_parse.models import ParsedVideoTitle

EXTRACTOR_CHAIN: list[TitleExtractor] = list(DEFAULT_EXTRACTORS)


def register_extractor(extractor: TitleExtractor, *, before: str | None = None) -> None:
    if before is None:
        EXTRACTOR_CHAIN.append(extractor)
        return

    for index, existing in enumerate(EXTRACTOR_CHAIN):
        if existing.name == before:
            EXTRACTOR_CHAIN.insert(index, extractor)
            return

    raise ValueError(f"Unknown extractor name: {before}")


def parse_video_title(title: str, youtube_video_id: str = "") -> ParsedVideoTitle | None:
    """Return metadata from the first extractor that yields a complete parse.

    Extractors may overlap (several can match the same title). Prefer small,
    readable extractors over one complex matcher; chain order breaks ties.
    """
    normalized = title.strip()
    if not normalized:
        return None

    normalized_video_id = youtube_video_id.strip()

    for extractor in EXTRACTOR_CHAIN:
        result = extractor.try_parse(normalized, normalized_video_id)
        if result is not None:
            return result
    return None
