from __future__ import annotations

import json
import shutil
from pathlib import Path


def write_vendored_esc_results(repo_root: Path) -> None:
    source_dir = (
        Path(__file__).resolve().parents[2] / "data" / "external" / "esc-results"
    )
    target_dir = repo_root / "data" / "external" / "esc-results"
    target_dir.mkdir(parents=True, exist_ok=True)
    for name in ("MANIFEST.json", "entries.json"):
        shutil.copyfile(source_dir / name, target_dir / name)


def write_episode_index_snapshot(
    repo_root: Path,
    period: str,
    rows: list[dict],
) -> Path:
    from evtop20.paths import processed_episode_index_dir

    path = processed_episode_index_dir(repo_root) / f"{period}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"period": period, "rows": rows}, indent=2) + "\n",
        encoding="utf-8",
    )
    return path


def write_year_colors(repo_root: Path) -> Path:
    from evtop20.paths import metadata_year_colors_path

    source = (
        Path(__file__).resolve().parents[2] / "data" / "metadata" / "year-colors.json"
    )
    destination = metadata_year_colors_path(repo_root)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    return destination
