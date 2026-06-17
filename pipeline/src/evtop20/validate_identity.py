from __future__ import annotations

from evtop20.models import IdentityFinding, LoadedEpisode, youtube_id_is_set

Period = tuple[int, int]

# First episode month with a full Top 20 chart. Earlier months were Top 10 only.
TOP20_CHART_START_PERIOD: Period = (2022, 1)

# Ranks 11–20 are intentionally empty on pre–Top-20 episodes (Top 10 roundups).
TOP10_ONLY_EMPTY_RANK_FLOOR = 11


def episode_period(data: dict) -> Period:
    period = data.get("period")
    if isinstance(period, dict):
        year = period.get("year")
        month = period.get("month")
        if isinstance(year, int) and isinstance(month, int):
            return year, month
    return 0, 0


def suppress_empty_entry_warnings(data: dict, rank: int | None) -> bool:
    """Skip empty-entry warnings for ranks 11–20 before TOP20_CHART_START_PERIOD."""
    if not isinstance(rank, int) or rank < TOP10_ONLY_EMPTY_RANK_FLOOR:
        return False
    period = episode_period(data)
    if period == (0, 0):
        return False
    return period < TOP20_CHART_START_PERIOD


def validate_episode_identity(episode: LoadedEpisode) -> list[IdentityFinding]:
    data = episode.data
    episode_title = data.get("episode_title")
    episode_youtube_id = data.get("youtube_video_id")

    findings: list[IdentityFinding] = []

    if not youtube_id_is_set(episode_youtube_id):
        findings.append(
            IdentityFinding(
                rank=None,
                message=(
                    "warning: episode youtube_video_id is empty; "
                    "skipped roundup id self-contamination check"
                ),
                severity="warning",
            )
        )

    titles_seen: dict[str, int] = {}
    ids_seen: dict[str, int] = {}
    pairs_seen: dict[tuple[str, str], int] = {}

    entries = data.get("entries", [])
    if not isinstance(entries, list):
        return findings

    for entry in entries:
        if not isinstance(entry, dict):
            continue

        rank = entry.get("rank")
        raw_title = entry.get("video_title", "")
        title = raw_title.strip() if isinstance(raw_title, str) else ""
        youtube_id = entry.get("youtube_video_id")

        has_title = bool(title)
        has_id = youtube_id_is_set(youtube_id)
        skip_empty_warnings = suppress_empty_entry_warnings(data, rank)

        if not has_id and not skip_empty_warnings:
            findings.append(
                IdentityFinding(
                    rank=rank if isinstance(rank, int) else None,
                    message="warning: entry youtube_video_id is empty; pair checks skipped",
                    severity="warning",
                )
            )
        if not has_title and not skip_empty_warnings:
            findings.append(
                IdentityFinding(
                    rank=rank if isinstance(rank, int) else None,
                    message="warning: entry video_title is empty; pair checks skipped",
                    severity="warning",
                )
            )

        if (
            youtube_id_is_set(episode_youtube_id)
            and youtube_id == episode_youtube_id
        ):
            findings.append(
                IdentityFinding(
                    rank=rank if isinstance(rank, int) else None,
                    message=(
                        f"entry youtube_video_id matches episode roundup video "
                        f"({episode_youtube_id})"
                    ),
                    severity="error",
                )
            )

        if (
            has_title
            and isinstance(episode_title, str)
            and title == episode_title
        ):
            findings.append(
                IdentityFinding(
                    rank=rank if isinstance(rank, int) else None,
                    message="entry video_title matches episode title",
                    severity="error",
                )
            )

        if has_title:
            if title in titles_seen:
                first_rank = titles_seen[title]
                findings.append(
                    IdentityFinding(
                        rank=rank if isinstance(rank, int) else None,
                        message=(
                            f"duplicate video_title {title!r} "
                            f"(first at rank {first_rank})"
                        ),
                        severity="error",
                    )
                )
            else:
                titles_seen[title] = rank if isinstance(rank, int) else -1

        if has_id and isinstance(youtube_id, str):
            if youtube_id in ids_seen:
                first_rank = ids_seen[youtube_id]
                findings.append(
                    IdentityFinding(
                        rank=rank if isinstance(rank, int) else None,
                        message=(
                            f"duplicate youtube_video_id {youtube_id!r} "
                            f"(first at rank {first_rank})"
                        ),
                        severity="error",
                    )
                )
            else:
                ids_seen[youtube_id] = rank if isinstance(rank, int) else -1

        if has_title and has_id and isinstance(youtube_id, str):
            pair = (title, youtube_id)
            if pair in pairs_seen:
                first_rank = pairs_seen[pair]
                findings.append(
                    IdentityFinding(
                        rank=rank if isinstance(rank, int) else None,
                        message=(
                            f"duplicate (video_title, youtube_video_id) pair "
                            f"(first at rank {first_rank})"
                        ),
                        severity="error",
                    )
                )
            else:
                pairs_seen[pair] = rank if isinstance(rank, int) else -1

    return findings


def format_identity_finding(finding: IdentityFinding) -> str:
    if finding.rank is None:
        return finding.message
    return f"rank {finding.rank}: {finding.message}"
