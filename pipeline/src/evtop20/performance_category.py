from __future__ import annotations

import re

PERFORMANCE_CATEGORIES = (
    "final_live",
    "national_final",
    "official_video",
    "special",
)

_NATIONAL_FINAL_MARKERS = (
    "national final",
    "sanremo",
    "melfest",
    "melodifestivalen",
)

_FINAL_LIVE_MARKERS = (
    "grand final",
    "semi-final",
    "semi final",
    "winner of eurovision",
    "live at the eurovision song contest",
    "first semi-final",
    "second semi-final",
)

_OFFICIAL_VIDEO_MARKERS = (
    "official music video",
    "official video",
    "official lyric video",
    "official preview video",
    "music video",
    "performance in arena",
    "showcase performance",
)

_LIVE_SUFFIX_RE = re.compile(r"\s*\(LIVE\)\s*$", re.IGNORECASE)


def normalize_performance_segment(segment: str) -> str:
    text = segment.strip()
    while True:
        stripped = _LIVE_SUFFIX_RE.sub("", text).strip()
        if stripped == text:
            break
        text = stripped
    return text.casefold()


def category_from_segment(segment: str) -> str | None:
    normalized = normalize_performance_segment(segment)
    if not normalized:
        return None
    if normalized == "special":
        return "special"
    if any(marker in normalized for marker in _NATIONAL_FINAL_MARKERS):
        return "national_final"
    if any(marker in normalized for marker in _FINAL_LIVE_MARKERS):
        return "final_live"
    if any(marker in normalized for marker in _OFFICIAL_VIDEO_MARKERS):
        return "official_video"
    return None
