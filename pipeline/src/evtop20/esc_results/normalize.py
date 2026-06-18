from __future__ import annotations

import re

_WHITESPACE_RE = re.compile(r"\s+")
_ARTIST_SEPARATOR_RE = re.compile(
    r"\s+(?:&|and|og|y|x|feat\.?|ft\.?|featuring)\s+",
    re.IGNORECASE,
)


def normalize_join_text(value: str) -> str:
    return _WHITESPACE_RE.sub(" ", value.strip().casefold())


def normalize_join_artist(value: str) -> str:
    text = normalize_join_text(value)
    parts = [part.strip() for part in _ARTIST_SEPARATOR_RE.split(text) if part.strip()]
    if len(parts) < 2:
        return text
    parts.sort()
    return " & ".join(parts)
