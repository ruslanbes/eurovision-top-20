from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

Severity = Literal["error", "warning"]


def youtube_id_is_set(value: object) -> bool:
    return isinstance(value, str) and value != ""


@dataclass(frozen=True)
class LoadedEpisode:
    path: Path
    data: dict

    @property
    def filename(self) -> str:
        return self.path.name


@dataclass(frozen=True)
class IdentityFinding:
    rank: int | None
    message: str
    severity: Severity = "error"
