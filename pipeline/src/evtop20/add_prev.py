from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from evtop20.models import youtube_id_is_set
from evtop20.normalize import write_episode_file
from evtop20.paths import raw_episodes_dir
from evtop20.validate import load_episode_file

_DELTA_PATTERN = re.compile(r"^[+-]?\d+$")
DELTA_MIN = -19
DELTA_MAX = 19


class AddPrevError(Exception):
    pass


@dataclass(frozen=True)
class AddPrevResult:
    summary: str
    warnings: list[str]


def parse_delta(value: str) -> int:
    text = value.strip()
    if not _DELTA_PATTERN.match(text):
        msg = f"invalid delta syntax: {value!r} (use forms like +1, 1, -1, 0)"
        raise AddPrevError(msg)
    return int(text)


def is_delta_token(value: str) -> bool:
    try:
        delta = parse_delta(value)
    except AddPrevError:
        return False
    return DELTA_MIN <= delta <= DELTA_MAX


def parse_delta_in_range(value: str) -> int:
    delta = parse_delta(value)
    if not (DELTA_MIN <= delta <= DELTA_MAX):
        msg = (
            f"delta must be between {DELTA_MIN} and {DELTA_MAX} (got {delta})"
        )
        raise AddPrevError(msg)
    return delta


def previous_period(year: int, month: int) -> tuple[int, int]:
    if month == 1:
        return year - 1, 12
    return year, month - 1


def find_episode_path_by_stem(repo_root: Path, stem: str) -> Path:
    path = raw_episodes_dir(repo_root) / f"{stem}.json"
    if not path.is_file():
        msg = f"episode file not found: {path.name}"
        raise AddPrevError(msg)
    return path


def find_episode_path_by_period(repo_root: Path, year: int, month: int) -> Path | None:
    raw_dir = raw_episodes_dir(repo_root)
    if not raw_dir.is_dir():
        msg = f"raw episodes directory not found: {raw_dir}"
        raise AddPrevError(msg)

    for path in sorted(raw_dir.glob("*.json")):
        data, _ = load_episode_file(path)
        if data is None:
            continue
        period = data.get("period")
        if (
            isinstance(period, dict)
            and period.get("year") == year
            and period.get("month") == month
        ):
            return path
    return None


def get_entry_by_rank(data: dict, rank: int) -> dict | None:
    entries = data.get("entries", [])
    if not isinstance(entries, list):
        return None
    for entry in entries:
        if isinstance(entry, dict) and entry.get("rank") == rank:
            return entry
    return None


def entry_is_set(entry: dict) -> bool:
    raw_title = entry.get("video_title", "")
    title = raw_title.strip() if isinstance(raw_title, str) else ""
    if title:
        return True
    return youtube_id_is_set(entry.get("youtube_video_id"))


def _format_delta(delta: int) -> str:
    if delta > 0:
        return f"+{delta}"
    return str(delta)


def run_add_prev(
    repo_root: Path,
    *,
    episode_stem: str,
    rank: int,
    delta: int,
    dry_run: bool = False,
    force: bool = False,
) -> AddPrevResult:
    if rank < 1 or rank > 20:
        msg = f"rank must be between 1 and 20 (got {rank})"
        raise AddPrevError(msg)

    target_path = find_episode_path_by_stem(repo_root, episode_stem)
    target_data, parse_issues = load_episode_file(target_path)
    if target_data is None:
        msg = "; ".join(parse_issues) or f"failed to parse {target_path.name}"
        raise AddPrevError(msg)

    period = target_data.get("period")
    if not isinstance(period, dict):
        msg = f"{target_path.name}: missing or invalid period"
        raise AddPrevError(msg)
    year = period.get("year")
    month = period.get("month")
    if not isinstance(year, int) or not isinstance(month, int):
        msg = f"{target_path.name}: period must include integer year and month"
        raise AddPrevError(msg)
    prev_year, prev_month = previous_period(year, month)
    previous_path = find_episode_path_by_period(repo_root, prev_year, prev_month)
    if previous_path is None:
        msg = (
            f"no previous episode found for period "
            f"year={prev_year}, month={prev_month}"
        )
        raise AddPrevError(msg)

    previous_data, prev_parse_issues = load_episode_file(previous_path)
    if previous_data is None:
        msg = "; ".join(prev_parse_issues) or f"failed to parse {previous_path.name}"
        raise AddPrevError(msg)

    previous_rank = rank + delta
    if previous_rank < 1 or previous_rank > 20:
        msg = (
            f"no entry at previous rank {previous_rank} "
            f"(delta {_format_delta(delta)} at current rank {rank})"
        )
        raise AddPrevError(msg)

    target_entry = get_entry_by_rank(target_data, rank)
    if target_entry is None:
        msg = f"{target_path.name}: no entry at rank {rank}"
        raise AddPrevError(msg)

    overwritten = entry_is_set(target_entry)
    if overwritten and not force:
        msg = f"{target_path.name} rank {rank} is already set"
        raise AddPrevError(msg)

    previous_entry = get_entry_by_rank(previous_data, previous_rank)
    if previous_entry is None:
        msg = (
            f"{previous_path.name}: no entry at rank {previous_rank} "
            f"(delta {_format_delta(delta)} at current rank {rank})"
        )
        raise AddPrevError(msg)

    title = previous_entry.get("video_title", "")
    youtube_id = previous_entry.get("youtube_video_id")
    if youtube_id is None:
        youtube_id = ""

    warnings: list[str] = []
    if not (isinstance(title, str) and title.strip()):
        warnings.append(
            f"warning: previous entry at rank {previous_rank} has empty video_title"
        )
    if not youtube_id_is_set(youtube_id):
        warnings.append(
            f"warning: previous entry at rank {previous_rank} has empty youtube_video_id"
        )

    target_entry["video_title"] = title if isinstance(title, str) else ""
    target_entry["youtube_video_id"] = youtube_id

    rank_label = f"rank {rank}" + (" (overwritten)" if overwritten else "")
    summary = (
        f"{target_path.name} {rank_label} ← {previous_path.name} "
        f"rank {previous_rank} ({_format_delta(delta)})\n"
        f"  {target_entry['video_title']}\n"
        f"  {target_entry['youtube_video_id']}"
    )

    if not dry_run:
        write_episode_file(target_path, target_data)

    return AddPrevResult(summary=summary, warnings=warnings)
