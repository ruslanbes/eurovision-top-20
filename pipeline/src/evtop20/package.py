from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from evtop20.models import youtube_id_is_set
from evtop20.normalize import write_episode_file
from evtop20.paths import (
    ALLTIME_STATS_BASENAME,
    RECENT_STATS_BASENAME,
    SONG_STATS_BASENAME,
    packaged_per_song_alltime_dir,
    packaged_per_song_alltime_stats_latest_path,
    packaged_per_song_alltime_stats_path,
    packaged_per_song_recent_dir,
    packaged_per_song_recent_stats_latest_path,
    packaged_per_song_recent_stats_path,
    packaged_per_video_alltime_dir,
    packaged_per_video_alltime_stats_latest_path,
    packaged_per_video_alltime_stats_path,
    packaged_per_video_recent_dir,
    packaged_per_video_recent_stats_latest_path,
    packaged_per_video_recent_stats_path,
    processed_alltime_dir,
    processed_recent_dir,
)
from evtop20.song_stats import (
    package_song_stats_payload,
    video_stats_basename_to_song_stats_basename,
)
from evtop20.title_parse import parse_video_title


class PackageError(Exception):
    pass


@dataclass(frozen=True)
class PackageVariantResult:
    label: str
    snapshot_count: int
    first_path: Path
    last_path: Path
    latest_video_path: Path
    latest_song_path: Path
    latest_parsed_count: int
    latest_row_count: int
    latest_song_row_count: int
    latest_unparsed_titles: set[str]
    warnings: list[str]


def youtube_watch_url(video_id: object) -> str | None:
    if not youtube_id_is_set(video_id):
        return None
    return f"https://www.youtube.com/watch?v={video_id}"


def augment_stats_row(row: dict) -> dict:
    packaged = dict(row)
    video_id = row.get("youtube_video_id")
    packaged["youtube_watch_url"] = youtube_watch_url(video_id)

    video_title = row.get("video_title")
    if not isinstance(video_title, str):
        packaged.update(_empty_metadata())
        return packaged

    video_id_str = video_id.strip() if isinstance(video_id, str) else ""
    parsed = parse_video_title(video_title, video_id_str)
    if parsed is None:
        packaged.update(_empty_metadata())
        return packaged

    packaged.update(parsed.as_dict())
    packaged["metadata_extractor"] = parsed.extractor
    return packaged


def _empty_metadata() -> dict[str, object]:
    return {
        "artist": None,
        "song": None,
        "flag": None,
        "country": None,
        "performance_type": None,
        "year": None,
        "metadata_extractor": None,
    }


def package_video_payload(
    processed_payload: dict,
    *,
    source: str,
) -> tuple[dict, int, set[str]]:
    rows = processed_payload.get("rows")
    if not isinstance(rows, list):
        msg = "processed payload rows must be a list"
        raise PackageError(msg)

    packaged_rows: list[dict] = []
    parsed_count = 0
    unparsed_titles: set[str] = set()

    for row in rows:
        if not isinstance(row, dict):
            msg = "processed row must be an object"
            raise PackageError(msg)
        packaged_row = augment_stats_row(row)
        packaged_rows.append(packaged_row)
        if packaged_row.get("artist") is not None:
            parsed_count += 1
        else:
            title = row.get("video_title")
            if isinstance(title, str) and title:
                unparsed_titles.add(title)

    packaged_payload = {
        "generated_at": processed_payload.get("generated_at"),
        "source": source,
        "rows": packaged_rows,
    }
    if "window" in processed_payload:
        packaged_payload["window"] = processed_payload["window"]
    return packaged_payload, parsed_count, unparsed_titles


def package_alltime_payload(processed_payload: dict) -> tuple[dict, int, set[str]]:
    return package_video_payload(processed_payload, source="processed/alltime")


def package_recent_payload(processed_payload: dict) -> tuple[dict, int, set[str]]:
    return package_video_payload(processed_payload, source="processed/recent")


def list_processed_snapshot_paths(repo_root: Path, stats_basename: str) -> list[Path]:
    if stats_basename == ALLTIME_STATS_BASENAME:
        processed_dir = processed_alltime_dir(repo_root)
    elif stats_basename == RECENT_STATS_BASENAME:
        processed_dir = processed_recent_dir(repo_root)
    else:
        msg = f"unsupported stats basename: {stats_basename}"
        raise ValueError(msg)
    return sorted(processed_dir.glob(f"{stats_basename}-*.json"))


def _remove_stale_snapshots(directory: Path, stats_basename: str, kept: set[str]) -> None:
    if not directory.is_dir():
        return
    for path in directory.glob(f"{stats_basename}-*.json"):
        if path.name not in kept:
            path.unlink()


def _display_path(path: Path, repo_root: Path) -> Path:
    try:
        return path.relative_to(repo_root)
    except ValueError:
        return path


def _package_variant(
    repo_root: Path,
    *,
    label: str,
    stats_basename: str,
    processed_source: str,
    song_source: str,
    video_out_dir: Path,
    video_stats_path: Callable[[Path, str], Path],
    video_latest_path: Callable[[Path], Path],
    song_out_dir: Path,
    song_stats_path: Callable[[Path, str], Path],
    song_latest_path: Callable[[Path], Path],
) -> PackageVariantResult | None:
    source_paths = list_processed_snapshot_paths(repo_root, stats_basename)
    if not source_paths:
        return None

    video_out_dir.mkdir(parents=True, exist_ok=True)
    song_out_dir.mkdir(parents=True, exist_ok=True)

    kept_video_basenames: set[str] = set()
    kept_song_basenames: set[str] = set()
    latest_parsed_count = 0
    latest_unparsed_titles: set[str] = set()
    latest_row_count = 0
    latest_song_row_count = 0
    song_warnings: list[str] = []

    for source_path in source_paths:
        processed_payload = json.loads(source_path.read_text(encoding="utf-8"))
        packaged_payload, parsed_count, unparsed_titles = package_video_payload(
            processed_payload,
            source=processed_source,
        )

        write_episode_file(video_stats_path(repo_root, source_path.name), packaged_payload)

        song_payload, snapshot_warnings = package_song_stats_payload(
            packaged_payload,
            source=song_source,
        )
        song_basename = video_stats_basename_to_song_stats_basename(source_path.name)
        write_episode_file(song_stats_path(repo_root, song_basename), song_payload)

        kept_video_basenames.add(source_path.name)
        kept_song_basenames.add(song_basename)
        song_warnings.extend(snapshot_warnings)
        if source_path.name == f"{stats_basename}-latest.json":
            latest_parsed_count = parsed_count
            latest_unparsed_titles = unparsed_titles
            latest_row_count = len(packaged_payload["rows"])
            latest_song_row_count = len(song_payload["rows"])

    _remove_stale_snapshots(video_out_dir, stats_basename, kept_video_basenames)
    _remove_stale_snapshots(song_out_dir, SONG_STATS_BASENAME, kept_song_basenames)

    return PackageVariantResult(
        label=label,
        snapshot_count=len(source_paths),
        first_path=_display_path(
            video_stats_path(repo_root, source_paths[0].name), repo_root
        ),
        last_path=_display_path(
            video_stats_path(repo_root, source_paths[-1].name), repo_root
        ),
        latest_video_path=_display_path(video_latest_path(repo_root), repo_root),
        latest_song_path=_display_path(song_latest_path(repo_root), repo_root),
        latest_parsed_count=latest_parsed_count,
        latest_row_count=latest_row_count,
        latest_song_row_count=latest_song_row_count,
        latest_unparsed_titles=latest_unparsed_titles,
        warnings=song_warnings,
    )


def _format_variant_summary(result: PackageVariantResult) -> str:
    coverage = (
        result.latest_parsed_count / result.latest_row_count
        if result.latest_row_count
        else 0.0
    )
    lines = [
        (
            f"Wrote {result.first_path} … {result.last_path} "
            f"({result.snapshot_count} {result.label} snapshots)"
        ),
        f"Wrote {result.latest_video_path}",
        (
            f"Title metadata ({result.label} latest): "
            f"{result.latest_parsed_count}/{result.latest_row_count} rows parsed "
            f"({coverage:.1%})"
        ),
        (
            f"Wrote {result.label} song stats ({result.snapshot_count} snapshots); "
            f"latest: {result.latest_song_path} ({result.latest_song_row_count} songs)"
        ),
    ]
    if result.latest_unparsed_titles:
        lines.append(
            f"Unparsed titles on {result.label} latest snapshot: "
            f"{len(result.latest_unparsed_titles)} (excluded from song roll-up)"
        )
    return "\n".join(lines)


def run_package(repo_root: Path) -> str:
    alltime = _package_variant(
        repo_root,
        label="alltime",
        stats_basename=ALLTIME_STATS_BASENAME,
        processed_source="processed/alltime",
        song_source="packaged/per-video/alltime",
        video_out_dir=packaged_per_video_alltime_dir(repo_root),
        video_stats_path=packaged_per_video_alltime_stats_path,
        video_latest_path=packaged_per_video_alltime_stats_latest_path,
        song_out_dir=packaged_per_song_alltime_dir(repo_root),
        song_stats_path=packaged_per_song_alltime_stats_path,
        song_latest_path=packaged_per_song_alltime_stats_latest_path,
    )
    if alltime is None:
        msg = (
            "no processed alltime snapshots found under "
            f"{_display_path(processed_alltime_dir(repo_root), repo_root)}; "
            "run process first"
        )
        raise PackageError(msg)

    recent = _package_variant(
        repo_root,
        label="recent",
        stats_basename=RECENT_STATS_BASENAME,
        processed_source="processed/recent",
        song_source="packaged/per-video/recent",
        video_out_dir=packaged_per_video_recent_dir(repo_root),
        video_stats_path=packaged_per_video_recent_stats_path,
        video_latest_path=packaged_per_video_recent_stats_latest_path,
        song_out_dir=packaged_per_song_recent_dir(repo_root),
        song_stats_path=packaged_per_song_recent_stats_path,
        song_latest_path=packaged_per_song_recent_stats_latest_path,
    )

    message_parts = [_format_variant_summary(alltime)]
    if recent is not None:
        message_parts.append(_format_variant_summary(recent))

    warnings = dict.fromkeys(alltime.warnings)
    if recent is not None:
        warnings.update(dict.fromkeys(recent.warnings))

    message = "\n".join(message_parts)
    for warning in warnings:
        message += f"\n{warning}"
    return message
