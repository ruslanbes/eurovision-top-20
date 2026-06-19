from __future__ import annotations

from pathlib import Path

from evtop20.aggregate import run_aggregate
from evtop20.paths import (
    processed_alltime_stats_latest_path,
    processed_alltime_stats_period_path,
)
from evtop20.validate import (
    format_validation_report,
    has_validation_errors,
    validate_raw_episodes,
)


class ProcessError(Exception):
    pass


def _display_path(path: Path, repo_root: Path) -> Path:
    try:
        return path.relative_to(repo_root)
    except ValueError:
        return path


def run_process(repo_root: Path) -> str:
    issues = validate_raw_episodes(repo_root)
    if has_validation_errors(issues):
        raise ProcessError(format_validation_report(issues))

    try:
        result = run_aggregate(repo_root)
    except ValueError as exc:
        raise ProcessError(str(exc)) from exc

    first_path = _display_path(
        processed_alltime_stats_period_path(repo_root, *result.start_period),
        repo_root,
    )
    last_path = _display_path(
        processed_alltime_stats_period_path(repo_root, *result.end_period),
        repo_root,
    )
    latest_path = _display_path(
        processed_alltime_stats_latest_path(repo_root), repo_root
    )

    message = (
        f"Wrote {first_path} … {last_path} ({result.snapshot_count} snapshots)\n"
        f"Wrote {latest_path} ({result.video_count} videos from "
        f"{result.episode_count} episodes)"
    )
    if result.warnings:
        message += "\nWarnings:\n" + "\n".join(f"  {w}" for w in result.warnings)
    return message
