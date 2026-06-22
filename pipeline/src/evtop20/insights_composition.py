from __future__ import annotations

import shutil
from collections import Counter, defaultdict
from pathlib import Path

from evtop20.aggregate import episode_period, load_episodes
from evtop20.normalize import write_episode_file
from evtop20.paths import (
    metadata_year_colors_path,
    packaged_episode_year_composition_path,
    packaged_year_colors_path,
    raw_episodes_dir,
)
from evtop20.title_parse import parse_video_title

SLOT_CAPACITY = 20
UNKNOWN_YEAR = "Unknown"


class InsightsCompositionError(Exception):
    pass


def year_for_entry(video_title: str, youtube_video_id: str) -> str:
    parsed = parse_video_title(video_title, youtube_video_id)
    if parsed is not None and parsed.year:
        return str(parsed.year)
    return UNKNOWN_YEAR


def year_sort_key(year: str) -> tuple[int, int]:
    if year == UNKNOWN_YEAR:
        return (1, 0)
    return (0, int(year))


def build_episode_year_composition(repo_root: Path) -> dict:
    if not raw_episodes_dir(repo_root).is_dir():
        return {
            "episodes": [],
            "periods": [],
            "slot_capacity": SLOT_CAPACITY,
            "version": 2,
        }

    episodes_data = load_episodes(repo_root)
    periods: list[str] = []
    episodes: list[dict] = []

    for path, data in episodes_data:
        year, month = episode_period(data)
        period_label = f"{year:04d}-{month:02d}"
        periods.append(period_label)

        entries = data.get("entries")
        if not isinstance(entries, list):
            msg = f"{path.name}: entries must be a list"
            raise InsightsCompositionError(msg)

        counts: Counter[str] = Counter()
        titles_by_year: defaultdict[str, list[str]] = defaultdict(list)
        filled = 0
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            title = entry.get("video_title")
            if not isinstance(title, str) or not title.strip():
                continue
            filled += 1
            video_id = entry.get("youtube_video_id")
            youtube_video_id = video_id if isinstance(video_id, str) else ""
            contest_year = year_for_entry(title, youtube_video_id)
            counts[contest_year] += 1
            titles_by_year[contest_year].append(title.strip())

        missing = SLOT_CAPACITY - filled
        if missing < 0:
            msg = f"{path.name}: more than {SLOT_CAPACITY} filled entries"
            raise InsightsCompositionError(msg)

        segment_total = sum(counts.values())
        if segment_total + missing != SLOT_CAPACITY:
            msg = (
                f"{path.name}: segments ({segment_total}) + missing ({missing}) "
                f"!= {SLOT_CAPACITY}"
            )
            raise InsightsCompositionError(msg)

        segments = []
        for contest_year, count in sorted(
            counts.items(),
            key=lambda item: year_sort_key(item[0]),
            reverse=True,
        ):
            titles = sorted(titles_by_year[contest_year], key=str.casefold)
            if len(titles) != count:
                msg = (
                    f"{path.name}: titles ({len(titles)}) != count ({count}) "
                    f"for year {contest_year}"
                )
                raise InsightsCompositionError(msg)
            segments.append(
                {
                    "count": count,
                    "titles": titles,
                    "year": contest_year,
                }
            )
        episodes.append(
            {
                "filled": filled,
                "missing": missing,
                "period": period_label,
                "segments": segments,
            }
        )

    return {
        "episodes": episodes,
        "periods": periods,
        "slot_capacity": SLOT_CAPACITY,
        "version": 2,
    }


def copy_year_colors(repo_root: Path) -> Path:
    source = metadata_year_colors_path(repo_root)
    if not source.is_file():
        msg = (
            f"missing {source.relative_to(repo_root)}; "
            "create it with pipeline/scripts/generate_year_colors.py"
        )
        raise InsightsCompositionError(msg)

    destination = packaged_year_colors_path(repo_root)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    return destination


def run_insights_composition(repo_root: Path) -> str:
    year_payload = build_episode_year_composition(repo_root)
    year_destination = packaged_episode_year_composition_path(repo_root)
    year_destination.parent.mkdir(parents=True, exist_ok=True)
    write_episode_file(year_destination, year_payload)

    year_colors_path = copy_year_colors(repo_root)
    return (
        f"Wrote {year_destination.relative_to(repo_root)} "
        f"({len(year_payload['episodes'])} episodes); "
        f"copied {year_colors_path.relative_to(repo_root)}"
    )
