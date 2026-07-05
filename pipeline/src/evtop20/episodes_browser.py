from __future__ import annotations

import shutil
from pathlib import Path

from evtop20.aggregate import episode_period, load_episodes
from evtop20.esc_results.join import EscResultsJoiner
from evtop20.models import youtube_id_is_set
from evtop20.normalize import write_episode_file
from evtop20.paths import (
    metadata_year_colors_path,
    packaged_episodes_browser_path,
    packaged_episodes_year_colors_path,
    raw_episodes_dir,
)

ENTRY_CAPACITY = 20

BROWSER_ENTRY_FIELDS = (
    "artist",
    "country",
    "esc_final_place",
    "fire",
    "flag",
    "performance_category",
    "rank",
    "song",
    "video_title",
    "year",
    "youtube_video_id",
)


class EpisodesBrowserError(Exception):
    pass


def missing_entry(rank: int) -> dict:
    return {"missing": True, "rank": rank}


def project_filled_entry(
    augmented: dict,
    *,
    rank: int,
    video_title: str,
    youtube_video_id: str,
) -> dict:
    entry = {field: augmented.get(field) for field in BROWSER_ENTRY_FIELDS}
    entry["rank"] = rank
    entry["video_title"] = video_title
    entry["youtube_video_id"] = youtube_video_id
    entry["fire"] = bool(entry.get("fire"))
    return entry


def _normalize_video_id(value: object) -> str:
    if isinstance(value, str) and youtube_id_is_set(value):
        return value.strip()
    return ""


def _rank_map(path: Path, entries: list) -> dict[int, dict]:
    by_rank: dict[int, dict] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        rank = entry.get("rank")
        if not isinstance(rank, int) or not (1 <= rank <= ENTRY_CAPACITY):
            continue
        if rank in by_rank:
            msg = f"{path.name}: duplicate rank {rank} in entries"
            raise EpisodesBrowserError(msg)
        by_rank[rank] = entry
    return by_rank


def build_episode_browser_rows(
    path: Path,
    data: dict,
    *,
    esc_joiner: EscResultsJoiner | None = None,
    fire_allowlist: frozenset[str] | None = None,
) -> dict:
    year, month = episode_period(data)
    period_label = f"{year:04d}-{month:02d}"
    if path.stem != period_label:
        msg = (
            f"{path.name}: filename stem {path.stem!r} "
            f"does not match period {period_label!r}"
        )
        raise EpisodesBrowserError(msg)

    raw_entries = data.get("entries")
    if not isinstance(raw_entries, list):
        msg = f"{path.name}: entries must be a list"
        raise EpisodesBrowserError(msg)

    by_rank = _rank_map(path, raw_entries)
    episode_entries: list[dict] = []
    missing_count = 0

    for rank in range(1, ENTRY_CAPACITY + 1):
        raw_entry = by_rank.get(rank)
        if raw_entry is None:
            episode_entries.append(missing_entry(rank))
            missing_count += 1
            continue

        title_raw = raw_entry.get("video_title", "")
        title = title_raw.strip() if isinstance(title_raw, str) else ""
        if not title:
            episode_entries.append(missing_entry(rank))
            missing_count += 1
            continue

        video_id = _normalize_video_id(raw_entry.get("youtube_video_id"))
        from evtop20.package import augment_stats_row

        augmented = augment_stats_row(
            {
                "video_title": title,
                "youtube_video_id": video_id,
            },
            esc_joiner=esc_joiner,
            fire_allowlist=fire_allowlist,
        )
        episode_entries.append(
            project_filled_entry(
                augmented,
                rank=rank,
                video_title=title,
                youtube_video_id=video_id,
            )
        )

    filled_count = ENTRY_CAPACITY - missing_count
    if filled_count + missing_count != ENTRY_CAPACITY:
        msg = (
            f"{path.name}: filled ({filled_count}) + missing ({missing_count}) "
            f"!= {ENTRY_CAPACITY}"
        )
        raise EpisodesBrowserError(msg)

    episode_video_id = _normalize_video_id(data.get("youtube_video_id"))

    return {
        "entries": episode_entries,
        "missing": missing_count,
        "period": period_label,
        "youtube_video_id": episode_video_id,
    }


def build_episodes_browser(
    repo_root: Path,
    *,
    esc_joiner: EscResultsJoiner | None = None,
    fire_allowlist: frozenset[str] | None = None,
) -> dict:
    if not raw_episodes_dir(repo_root).is_dir():
        return {
            "entry_capacity": ENTRY_CAPACITY,
            "episodes": [],
            "periods": [],
            "version": 1,
        }

    episodes_data = load_episodes(repo_root)
    periods: list[str] = []
    episodes: list[dict] = []

    for path, data in episodes_data:
        episode = build_episode_browser_rows(
            path,
            data,
            esc_joiner=esc_joiner,
            fire_allowlist=fire_allowlist,
        )
        periods.append(episode["period"])
        episodes.append(episode)

    return {
        "entry_capacity": ENTRY_CAPACITY,
        "episodes": episodes,
        "periods": periods,
        "version": 1,
    }


def copy_year_colors_to_episodes(repo_root: Path) -> Path:
    source = metadata_year_colors_path(repo_root)
    if not source.is_file():
        msg = (
            f"missing {source.relative_to(repo_root)}; "
            "create it with pipeline/scripts/generate_year_colors.py"
        )
        raise EpisodesBrowserError(msg)

    destination = packaged_episodes_year_colors_path(repo_root)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    return destination


def run_episodes_browser(
    repo_root: Path,
    *,
    esc_joiner: EscResultsJoiner | None = None,
    fire_allowlist: frozenset[str] | None = None,
) -> str:
    payload = build_episodes_browser(
        repo_root,
        esc_joiner=esc_joiner,
        fire_allowlist=fire_allowlist,
    )
    destination = packaged_episodes_browser_path(repo_root)
    destination.parent.mkdir(parents=True, exist_ok=True)
    write_episode_file(destination, payload)

    year_colors_path = copy_year_colors_to_episodes(repo_root)
    byte_size = destination.stat().st_size
    entry_count = sum(len(episode["entries"]) for episode in payload["episodes"])
    return (
        f"Wrote {destination.relative_to(repo_root)} "
        f"({len(payload['episodes'])} episodes, {entry_count} entries, "
        f"{byte_size:,} bytes); "
        f"copied {year_colors_path.relative_to(repo_root)}"
    )
