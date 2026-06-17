from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class ParsedVideoTitle:
    artist: str
    song: str
    flag: str
    country: str
    performance_type: str
    year: int
    extractor: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "artist": self.artist,
            "song": self.song,
            "flag": self.flag,
            "country": self.country,
            "performance_type": self.performance_type,
            "year": self.year,
        }

    def is_complete(self) -> bool:
        return all(
            (
                self.artist,
                self.song,
                self.flag,
                self.country,
                self.performance_type,
                self.year,
            )
        )
