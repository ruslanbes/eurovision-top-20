from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from typing import Literal

from evtop20.models import LoadedEpisode, youtube_id_is_set

CorpusSeverity = Literal["error"]


@dataclass(frozen=True)
class CorpusFinding:
    file: Path
    rank: int | None
    message: str
    severity: CorpusSeverity = "error"


@dataclass(frozen=True)
class PairLocation:
    path: Path
    rank: int
    title: str
    youtube_id: str

    def format_line(self, label: str) -> str:
        return f'{label}: {self.path.name} rank {self.rank}  "{self.title}"'


@dataclass(frozen=True)
class EpisodeRoundupLocation:
    path: Path

    def format_line(self, label: str) -> str:
        return f"{label}: {self.path.name}"


def _iter_checkable_entries(
    episode: LoadedEpisode,
) -> list[tuple[int, str, str]]:
    entries = episode.data.get("entries", [])
    if not isinstance(entries, list):
        return []

    pairs: list[tuple[int, str, str]] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        rank = entry.get("rank")
        if not isinstance(rank, int):
            continue
        raw_title = entry.get("video_title", "")
        title = raw_title.strip() if isinstance(raw_title, str) else ""
        youtube_id = entry.get("youtube_video_id")
        if not title or not youtube_id_is_set(youtube_id):
            continue
        pairs.append((rank, title, youtube_id))
    return pairs


def validate_corpus_identity(episodes: list[LoadedEpisode]) -> list[CorpusFinding]:
    id_to_location: dict[str, PairLocation] = {}
    title_to_location: dict[str, PairLocation] = {}
    episode_id_to_location: dict[str, EpisodeRoundupLocation] = {}
    findings: list[CorpusFinding] = []

    for episode in episodes:
        episode_youtube_id = episode.data.get("youtube_video_id")
        if youtube_id_is_set(episode_youtube_id) and isinstance(episode_youtube_id, str):
            roundup_location = EpisodeRoundupLocation(path=episode.path)
            existing_roundup = episode_id_to_location.get(episode_youtube_id)
            if existing_roundup is not None:
                findings.append(
                    CorpusFinding(
                        file=episode.path,
                        rank=None,
                        message=(
                            f"episode youtube_video_id {episode_youtube_id!r}: "
                            f"duplicate across episodes\n"
                            f"  {existing_roundup.format_line('first')}\n"
                            f"  {roundup_location.format_line('then')}"
                        ),
                    )
                )
            else:
                episode_id_to_location[episode_youtube_id] = roundup_location

        for rank, title, youtube_id in _iter_checkable_entries(episode):
            location = PairLocation(
                path=episode.path,
                rank=rank,
                title=title,
                youtube_id=youtube_id,
            )

            existing_id = id_to_location.get(youtube_id)
            if existing_id is not None and existing_id.title != title:
                findings.append(
                    CorpusFinding(
                        file=episode.path,
                        rank=rank,
                        message=(
                            f"id {youtube_id}: title mismatch\n"
                            f"  {existing_id.format_line('first')}\n"
                            f"  {location.format_line('then')}"
                        ),
                    )
                )
            elif existing_id is None:
                id_to_location[youtube_id] = location

            existing_title = title_to_location.get(title)
            if existing_title is not None and existing_title.youtube_id != youtube_id:
                findings.append(
                    CorpusFinding(
                        file=episode.path,
                        rank=rank,
                        message=(
                            f"title {title!r}: youtube_video_id mismatch\n"
                            f"  {existing_title.format_line('first')}\n"
                            f"  {location.format_line('then')}"
                        ),
                    )
                )
            elif existing_title is None:
                title_to_location[title] = location

    return findings


def format_corpus_finding(finding: CorpusFinding) -> str:
    if finding.rank is None:
        return finding.message
    return f"rank {finding.rank}: {finding.message}"
