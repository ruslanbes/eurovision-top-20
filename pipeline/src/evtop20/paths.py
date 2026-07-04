from pathlib import Path

MARKER = Path("data") / "schemas" / "episode.schema.json"

ALLTIME_STATS_BASENAME = "eurovision-top-20-alltime"
SONG_STATS_BASENAME = "eurovision-top-20-song-stats"


def find_repo_root(start: Path | None = None) -> Path:
    start = start or Path.cwd()
    for candidate in (start, *start.parents):
        if (candidate / MARKER).is_file():
            return candidate
    msg = f"Could not find repo root (missing {MARKER})"
    raise FileNotFoundError(msg)


def raw_episodes_dir(repo_root: Path) -> Path:
    return repo_root / "data" / "raw" / "episodes"


def episode_schema_path(repo_root: Path) -> Path:
    return repo_root / MARKER


def processed_dir(repo_root: Path) -> Path:
    return repo_root / "data" / "processed"


def processed_alltime_dir(repo_root: Path) -> Path:
    return processed_dir(repo_root) / "alltime"


def processed_episode_index_dir(repo_root: Path) -> Path:
    return processed_dir(repo_root) / "episode-index"


def processed_alltime_stats_latest_path(repo_root: Path) -> Path:
    return (
        processed_alltime_dir(repo_root) / f"{ALLTIME_STATS_BASENAME}-latest.json"
    )


def processed_alltime_stats_period_path(
    repo_root: Path, year: int, month: int
) -> Path:
    return (
        processed_alltime_dir(repo_root)
        / f"{ALLTIME_STATS_BASENAME}-{year:04d}-{month:02d}.json"
    )


def packaged_dir(repo_root: Path) -> Path:
    return repo_root / "data" / "packaged"


def packaged_query_dir(repo_root: Path) -> Path:
    return packaged_dir(repo_root) / "query"


def packaged_per_video_dir(repo_root: Path) -> Path:
    return packaged_dir(repo_root) / "per-video"


def packaged_per_video_alltime_dir(repo_root: Path) -> Path:
    return packaged_per_video_dir(repo_root) / "alltime"


def packaged_per_video_alltime_stats_path(repo_root: Path, basename: str) -> Path:
    return packaged_per_video_alltime_dir(repo_root) / basename


def packaged_per_video_alltime_stats_latest_path(repo_root: Path) -> Path:
    return packaged_per_video_alltime_stats_path(
        repo_root, f"{ALLTIME_STATS_BASENAME}-latest.json"
    )


def packaged_per_song_dir(repo_root: Path) -> Path:
    return packaged_dir(repo_root) / "per-song"


def packaged_per_song_alltime_dir(repo_root: Path) -> Path:
    return packaged_per_song_dir(repo_root) / "alltime"


def packaged_per_song_alltime_stats_path(repo_root: Path, basename: str) -> Path:
    return packaged_per_song_alltime_dir(repo_root) / basename


def packaged_per_song_alltime_stats_latest_path(repo_root: Path) -> Path:
    return packaged_per_song_alltime_stats_path(
        repo_root, f"{SONG_STATS_BASENAME}-latest.json"
    )


def metadata_dir(repo_root: Path) -> Path:
    return repo_root / "data" / "metadata"


def manual_video_metadata_path(repo_root: Path) -> Path:
    return metadata_dir(repo_root) / "manual-video-metadata.json"


def esc_join_overrides_path(repo_root: Path) -> Path:
    return metadata_dir(repo_root) / "esc-join-overrides.json"


def esc_placement_overrides_path(repo_root: Path) -> Path:
    return metadata_dir(repo_root) / "esc-placement-overrides.json"


def fire_allowlist_path(repo_root: Path) -> Path:
    return metadata_dir(repo_root) / "fire.json"


def metadata_year_colors_path(repo_root: Path) -> Path:
    return metadata_dir(repo_root) / "year-colors.json"


def packaged_insights_dir(repo_root: Path) -> Path:
    return packaged_dir(repo_root) / "insights"


def packaged_episodes_dir(repo_root: Path) -> Path:
    return packaged_dir(repo_root) / "episodes"


def packaged_episodes_browser_path(repo_root: Path) -> Path:
    return packaged_episodes_dir(repo_root) / "browser.json"


def packaged_episodes_year_colors_path(repo_root: Path) -> Path:
    return packaged_episodes_dir(repo_root) / "year-colors.json"
