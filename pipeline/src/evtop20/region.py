from __future__ import annotations

import re

REGION_ASIA = "asia"
REGION_EUROPE = "europe"
REGIONS = (REGION_ASIA, REGION_EUROPE)

_ASIA_TITLE_MARKER = re.compile(
    r"Eurovision Song Contest Asia|#EurovisionAsia",
    re.IGNORECASE,
)


def region_from_title(title: object) -> str:
    if isinstance(title, str) and _ASIA_TITLE_MARKER.search(title):
        return REGION_ASIA
    return REGION_EUROPE
