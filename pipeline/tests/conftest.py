from __future__ import annotations

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
