from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from evtop20.models import youtube_id_is_set
from evtop20.normalize import write_episode_file
from evtop20.sort_keys import stats_row_sort_key
from evtop20.paths import (
    ALLTIME_STATS_BASENAME,
    processed_alltime_dir,
    processed_alltime_stats_latest_path,
    processed_alltime_stats_period_path,
    raw_episodes_dir,
)
from evtop20.validate import list_episode_files, load_episode_file

TIERS = (1, 3, 5, 10, 20)
TIER_FIELDS = {1: "top1", 3: "top3", 5: "top5", 10: "top10", 20: "top20"}
TIER_COUNT_FIELDS = tuple(TIER_FIELDS[tier] for tier in TIERS)
CHART_POINT_WEIGHTS: dict[str, int] = {
    "top20": 1,
    "top10": 2,
    "top5": 3,
    "top3": 4,
    "top1": 5,
}
Period = tuple[int, int]


@dataclass
class AggregateResult:
    snapshot_count: int
    video_count: int
    episode_count: int
    start_period: Period
    end_period: Period
    warnings: list[str] = field(default_factory=list)


def tiers_for_rank(rank: int) -> list[str]:
    return [TIER_FIELDS[tier] for tier in TIERS if rank <= tier]


def chart_points_from_tiers(row: dict) -> int:
    return sum(row[field] * weight for field, weight in CHART_POINT_WEIGHTS.items())


def episode_period(data: dict) -> Period:
    period = data.get("period")
    if isinstance(period, dict):
        year = period.get("year")
        month = period.get("month")
        if isinstance(year, int) and isinstance(month, int):
            return year, month
    return 0, 0


def _empty_row() -> dict[str, int]:
    return {field_name: 0 for field_name in TIER_FIELDS.values()}


_STATS_PERIOD_RE = re.compile(
    rf"^{re.escape(ALLTIME_STATS_BASENAME)}-(\d{{4}})-(\d{{2}})\.json$"
)


def episode_periods_in_order(episodes: list[tuple[Path, dict]]) -> list[Period]:
    periods = sorted(
        {
            period
            for _, data in episodes
            if (period := episode_period(data)) != (0, 0)
        }
    )
    if not periods:
        msg = "no episodes with valid period"
        raise ValueError(msg)
    return periods


def load_episodes(repo_root: Path) -> list[tuple[Path, dict]]:
    raw_dir = raw_episodes_dir(repo_root)
    episode_files = list_episode_files(raw_dir)

    loaded: list[tuple[Path, dict]] = []
    for path in episode_files:
        data, parse_issues = load_episode_file(path)
        if data is None:
            msg = "; ".join(parse_issues) or f"failed to parse {path.name}"
            raise ValueError(msg)
        loaded.append((path, data))

    loaded.sort(key=lambda item: episode_period(item[1]))
    return loaded


@dataclass
class StatsAccumulator:
    stats: dict[str, dict] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    def apply_episode(self, path: Path, data: dict) -> None:
        entries = data.get("entries", [])
        if not isinstance(entries, list):
            return
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            rank = entry.get("rank")
            if not isinstance(rank, int):
                continue

            raw_title = entry.get("video_title", "")
            title = raw_title.strip() if isinstance(raw_title, str) else ""
            video_id = entry.get("youtube_video_id")

            if not title:
                if youtube_id_is_set(video_id):
                    self.warnings.append(
                        f"{path.name} rank {rank}: skipped entry with id but empty "
                        "video_title"
                    )
                continue

            if title not in self.stats:
                row = _empty_row()
                self.stats[title] = {
                    "video_title": title,
                    **row,
                    "youtube_video_id": "",
                }

            for tier_field in tiers_for_rank(rank):
                self.stats[title][tier_field] += 1

            if youtube_id_is_set(video_id):
                self.stats[title]["youtube_video_id"] = video_id

    def to_rows(self) -> list[dict]:
        rows = list(self.stats.values())
        rows.sort(key=stats_row_sort_key)
        return [
            {
                "video_title": row["video_title"],
                "top1": row["top1"],
                "top3": row["top3"],
                "top5": row["top5"],
                "top10": row["top10"],
                "top20": row["top20"],
                "chart_points": chart_points_from_tiers(row),
                "youtube_video_id": row["youtube_video_id"],
            }
            for row in rows
        ]

    def to_payload(self) -> dict:
        return {"rows": self.to_rows()}


def build_period_snapshots(
    episodes: list[tuple[Path, dict]],
) -> tuple[list[tuple[Period, dict]], StatsAccumulator]:
    sorted_episodes = sorted(episodes, key=lambda item: episode_period(item[1]))
    snapshot_periods = episode_periods_in_order(episodes)
    accumulator = StatsAccumulator()
    snapshots: list[tuple[Period, dict]] = []
    episode_index = 0

    for snapshot_period in snapshot_periods:
        while episode_index < len(sorted_episodes):
            path, data = sorted_episodes[episode_index]
            if episode_period(data) <= snapshot_period:
                accumulator.apply_episode(path, data)
                episode_index += 1
            else:
                break
        snapshots.append((snapshot_period, accumulator.to_payload()))

    return snapshots, accumulator


def _period_from_stats_filename(name: str) -> Period | None:
    match = _STATS_PERIOD_RE.match(name)
    if match is None:
        return None
    return int(match.group(1)), int(match.group(2))


def _remove_stale_period_snapshots(
    repo_root: Path, kept_periods: set[Period]
) -> None:
    for path in processed_alltime_dir(repo_root).glob(
        f"{ALLTIME_STATS_BASENAME}-*.json"
    ):
        period = _period_from_stats_filename(path.name)
        if period is not None and period not in kept_periods:
            path.unlink()


def aggregate_video_stats(repo_root: Path) -> tuple[dict, AggregateResult]:
    """Aggregate all episodes (final snapshot only; for tests and direct use)."""
    episodes = load_episodes(repo_root)
    snapshots, accumulator = build_period_snapshots(episodes)
    if not snapshots:
        msg = "no period snapshots produced"
        raise ValueError(msg)
    _, payload = snapshots[-1]
    return payload, AggregateResult(
        snapshot_count=len(snapshots),
        video_count=len(payload["rows"]),
        episode_count=len(episodes),
        start_period=snapshots[0][0],
        end_period=snapshots[-1][0],
        warnings=accumulator.warnings,
    )


def stats_row_tier_issues(row: dict) -> list[str]:
    label = row.get("video_title", "?")
    if not isinstance(label, str):
        label = "?"

    counts: list[int] = []
    for field in TIER_COUNT_FIELDS:
        value = row.get(field)
        if not isinstance(value, int):
            return [f"{label}: {field} must be int (got {value!r})"]
        counts.append(value)

    for left, right in zip(counts, counts[1:]):
        if left > right:
            return [
                f"{label}: expected top1 <= top3 <= top5 <= top10 <= top20 "
                f"(got {', '.join(f'{f}={v}' for f, v in zip(TIER_COUNT_FIELDS, counts, strict=True))})"
            ]
    return []


def validate_stats_payload(payload: dict, *, context: str = "") -> list[str]:
    prefix = f"{context}: " if context else ""
    rows = payload.get("rows")
    if not isinstance(rows, list):
        return [f"{prefix}rows must be a list"]

    issues: list[str] = []
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            issues.append(f"{prefix}rows[{index}] must be an object")
            continue
        for issue in stats_row_tier_issues(row):
            issues.append(f"{prefix}{issue}")
    return issues


def write_stats_payload(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    write_episode_file(path, payload)


def run_aggregate(repo_root: Path) -> AggregateResult:
    episodes = load_episodes(repo_root)
    snapshots, accumulator = build_period_snapshots(episodes)

    if not snapshots:
        msg = "no period snapshots produced"
        raise ValueError(msg)

    processed_alltime_dir(repo_root).mkdir(parents=True, exist_ok=True)

    kept_periods: set[Period] = set()
    for period, payload in snapshots:
        period_label = f"{period[0]:04d}-{period[1]:02d}"
        issues = validate_stats_payload(payload, context=period_label)
        if issues:
            detail = "\n".join(f"  {issue}" for issue in issues)
            msg = f"stats validation failed:\n{detail}"
            raise ValueError(msg)
        write_stats_payload(
            processed_alltime_stats_period_path(repo_root, *period), payload
        )
        kept_periods.add(period)

    _remove_stale_period_snapshots(repo_root, kept_periods)

    _, final_payload = snapshots[-1]
    write_stats_payload(
        processed_alltime_stats_latest_path(repo_root), final_payload
    )

    return AggregateResult(
        snapshot_count=len(snapshots),
        video_count=len(final_payload["rows"]),
        episode_count=len(episodes),
        start_period=snapshots[0][0],
        end_period=snapshots[-1][0],
        warnings=list(dict.fromkeys(accumulator.warnings)),
    )
