from __future__ import annotations

from pathlib import Path

from evtop20.esc_results.flatten import FlattenError, flatten_esc_dataset
from evtop20.esc_results.paths import esc_results_dir


def run_vendor_esc_flatten(
    repo_root: Path,
    *,
    dataset_dir: Path,
    release_tag: str,
) -> str:
    try:
        result = flatten_esc_dataset(
            dataset_dir,
            esc_results_dir(repo_root),
            release_tag=release_tag,
        )
    except FlattenError as exc:
        raise FlattenError(str(exc)) from exc

    try:
        manifest_display = result.manifest_path.relative_to(repo_root)
        entries_display = result.entries_path.relative_to(repo_root)
    except ValueError:
        manifest_display = result.manifest_path
        entries_display = result.entries_path

    return (
        f"Wrote {entries_display} ({result.entry_count} entries, "
        f"last completed contest year {result.last_completed_contest_year})\n"
        f"Wrote {manifest_display}"
    )
