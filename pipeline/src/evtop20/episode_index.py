from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from evtop20.aggregate import episode_period, load_episodes
from evtop20.models import youtube_id_is_set
from evtop20.normalize import write_episode_file
from evtop20.paths import processed_episode_index_dir
from evtop20.periods import format_period


@dataclass(frozen=True)
class EpisodeIndexResult:
    episode_count: int
    first_period: str
    last_period: str


def episode_contribution(path: Path, data: dict) -> dict:
    period = format_period(episode_period(data))
    rows: list[dict] = []
    entries = data.get("entries", [])
    if not isinstance(entries, list):
        entries = []

    for entry in entries:
        if not isinstance(entry, dict):
            continue
        rank = entry.get("rank")
        if not isinstance(rank, int) or not (1 <= rank <= 20):
            continue
        raw_title = entry.get("video_title", "")
        title = raw_title.strip() if isinstance(raw_title, str) else ""
        if not title:
            continue
        video_id = entry.get("youtube_video_id")
        rows.append(
            {
                "rank": rank,
                "video_title": title,
                "youtube_video_id": video_id.strip()
                if isinstance(video_id, str) and youtube_id_is_set(video_id)
                else "",
            }
        )

    rows.sort(key=lambda row: row["video_title"].casefold())
    return {"period": period, "rows": rows}


def build_episode_contributions(repo_root: Path) -> list[dict]:
    episodes = load_episodes(repo_root)
    return [episode_contribution(path, data) for path, data in episodes]


def run_episode_index(repo_root: Path) -> EpisodeIndexResult:
    contributions = build_episode_contributions(repo_root)
    if not contributions:
        msg = "no episode contributions produced"
        raise ValueError(msg)

    output_dir = processed_episode_index_dir(repo_root)
    output_dir.mkdir(parents=True, exist_ok=True)
    kept_periods = {contribution["period"] for contribution in contributions}

    for path in output_dir.glob("*.json"):
        if path.stem not in kept_periods:
            path.unlink()

    for contribution in contributions:
        write_episode_file(
            output_dir / f"{contribution['period']}.json", contribution
        )

    return EpisodeIndexResult(
        episode_count=len(contributions),
        first_period=contributions[0]["period"],
        last_period=contributions[-1]["period"],
    )


def load_episode_index(repo_root: Path) -> list[dict]:
    output_dir = processed_episode_index_dir(repo_root)
    if not output_dir.is_dir():
        msg = f"missing episode index at {output_dir}; run process first"
        raise FileNotFoundError(msg)

    contributions: list[dict] = []
    for path in sorted(output_dir.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            contributions.append(data)
    if not contributions:
        msg = f"episode index at {output_dir} is empty; run process first"
        raise FileNotFoundError(msg)
    contributions.sort(key=lambda item: item["period"])
    return contributions
