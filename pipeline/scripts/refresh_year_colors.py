#!/usr/bin/env python3
"""Regenerate year-colors and copy to packaged for the site.

Edit constants in generate_year_colors.py, then run:

    python3 pipeline/scripts/refresh_year_colors.py

From repo root. Lighter than `evtop20 package` when you are only tuning colors.
Restart `npm run dev` or hard-refresh the browser if the chart looks stale.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
GENERATE = REPO_ROOT / "pipeline" / "scripts" / "generate_year_colors.py"
METADATA = REPO_ROOT / "data" / "metadata" / "year-colors.json"
PACKAGED = REPO_ROOT / "data" / "packaged" / "insights" / "year-colors.json"


def main() -> None:
    subprocess.check_call([sys.executable, str(GENERATE)], cwd=REPO_ROOT)
    if not METADATA.is_file():
        raise SystemExit(f"missing {METADATA.relative_to(REPO_ROOT)}")

    PACKAGED.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(METADATA, PACKAGED)
    print(f"Copied {METADATA.relative_to(REPO_ROOT)} → {PACKAGED.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
