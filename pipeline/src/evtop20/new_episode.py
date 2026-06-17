from __future__ import annotations

import re
from calendar import month_name
from pathlib import Path

from evtop20.normalize import write_episode_file
from evtop20.paths import raw_episodes_dir

_STEM_PATTERN = re.compile(r"^(\d{4})-(\d{2})$")


class NewEpisodeError(Exception):
    pass


def parse_episode_stem(stem: str) -> tuple[int, int]:
    text = stem.strip()
    match = _STEM_PATTERN.match(text)
    if not match:
        msg = f"invalid episode stem {stem!r} (expected YYYY-MM, e.g. 2026-01)"
        raise NewEpisodeError(msg)

    year = int(match.group(1))
    month = int(match.group(2))
    if month < 1 or month > 12:
        msg = f"invalid month in stem {stem!r} (must be 01–12)"
        raise NewEpisodeError(msg)
    if year < 2000 or year > 2100:
        msg = f"invalid year in stem {stem!r} (must be 2000–2100)"
        raise NewEpisodeError(msg)
    return year, month


def empty_episode_data(year: int, month: int) -> dict:
    return {
        "episode_title": (
            f"Eurovision Top 20 Most Watched: {month_name[month]} {year}"
        ),
        "period": {"year": year, "month": month},
        "youtube_video_id": "",
        "entries": [
            {"rank": rank, "video_title": "", "youtube_video_id": ""}
            for rank in range(1, 21)
        ],
    }


def run_new_episode(
    repo_root: Path,
    episode_stem: str,
    *,
    force: bool = False,
) -> Path:
    year, month = parse_episode_stem(episode_stem)
    path = raw_episodes_dir(repo_root) / f"{episode_stem.strip()}.json"
    if path.is_file() and not force:
        msg = f"episode file already exists: {path.name}"
        raise NewEpisodeError(msg)

    raw_episodes_dir(repo_root).mkdir(parents=True, exist_ok=True)
    write_episode_file(path, empty_episode_data(year, month))
    return path
