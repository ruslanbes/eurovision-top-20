from __future__ import annotations

from pathlib import Path


def esc_results_dir(repo_root: Path) -> Path:
    return repo_root / "data" / "external" / "esc-results"


def esc_results_manifest_path(repo_root: Path) -> Path:
    return esc_results_dir(repo_root) / "MANIFEST.json"


def esc_results_entries_path(repo_root: Path) -> Path:
    return esc_results_dir(repo_root) / "entries.json"
