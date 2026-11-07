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


def format_episode_stem(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def next_episode_stem(year: int, month: int) -> str:
    if month == 12:
        return format_episode_stem(year + 1, 1)
    return format_episode_stem(year, month + 1)


def latest_raw_episode_stem(repo_root: Path) -> str:
    """Return the latest YYYY-MM stem among `data/raw/episodes/*.json`."""
    raw_dir = raw_episodes_dir(repo_root)
    if not raw_dir.is_dir():
        msg = (
            f"raw episodes directory not found: {raw_dir} "
            "(pass YYYY-MM explicitly for the first episode)"
        )
        raise NewEpisodeError(msg)

    stems: list[str] = []
    for path in raw_dir.glob("*.json"):
        try:
            parse_episode_stem(path.stem)
        except NewEpisodeError:
            continue
        stems.append(path.stem)

    if not stems:
        msg = (
            "no raw episode files found "
            "(pass YYYY-MM explicitly for the first episode)"
        )
        raise NewEpisodeError(msg)

    return max(stems)


def resolve_episode_stem(repo_root: Path, episode_stem: str | None) -> str:
    """Use the given stem, or the month after the latest raw episode."""
    if episode_stem is not None and episode_stem.strip():
        stem = episode_stem.strip()
        parse_episode_stem(stem)
        return stem

    latest = latest_raw_episode_stem(repo_root)
    year, month = parse_episode_stem(latest)
    return next_episode_stem(year, month)


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
    episode_stem: str | None = None,
    *,
    force: bool = False,
) -> Path:
    stem = resolve_episode_stem(repo_root, episode_stem)
    year, month = parse_episode_stem(stem)
    path = raw_episodes_dir(repo_root) / f"{stem}.json"
    if path.is_file() and not force:
        msg = f"episode file already exists: {path.name}"
        raise NewEpisodeError(msg)

    raw_episodes_dir(repo_root).mkdir(parents=True, exist_ok=True)
    write_episode_file(path, empty_episode_data(year, month))
    return path
