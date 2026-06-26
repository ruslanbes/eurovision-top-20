#!/usr/bin/env python3
"""One-off helper: write data/metadata/year-colors.json.

Pre-2000: one muted family, tiny per-year deltas.
2000+: fixed 20-color palette; index = (year - 2000) % 20 (repeats every 20 years).

Not invoked by `evtop20 package`. Re-run when the year range should grow.

Regenerate after editing constants below:

    python3 pipeline/scripts/refresh_year_colors.py

That writes `data/metadata/year-colors.json` and copies it to
`data/packaged/insights/year-colors.json`. Or run only
`python3 pipeline/scripts/generate_year_colors.py` then `evtop20 package`.
"""

from __future__ import annotations

import colorsys
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

FIRST_ESC_YEAR = 1956
LAST_ESC_YEAR = 2026
PRE_2000_CUTOFF = 2000
MODERN_EPOCH = 2000
UNKNOWN_YEAR = "Unknown"

# Pre-2000: desaturated slate; total lightness spread across the era
PRE_2000_HUE = 235
PRE_2000_SATURATION = 0.14
PRE_2000_LIGHTNESS_MID = 0.50
PRE_2000_LIGHTNESS_SPREAD = 0.04

# Twenty baseline colors from 2000 onward; repeats every 20 years (2000 ≡ 2020).
YEAR_PALETTE: tuple[str, ...] = (
    "#e6194b",
    "#3cb44b",
    "#ffe119",
    "#4363d8",
    "#f58231",
    "#911eb4",
    "#46f0f0",
    "#f032e6",
    "#bcf60c",
    "#fabebe",
    "#008080",
    "#e6beff",
    "#9a6324",
    "#fffac8",
    "#800000",
    "#aaffc3",
    "#808000",
    "#3949ab",
    "#000075",
    "#7c4dff",
)


def _hsl_to_hex(hue: float, saturation: float, lightness: float) -> str:
    red, green, blue = colorsys.hls_to_rgb(
        hue / 360,
        max(0.0, min(1.0, lightness)),
        max(0.0, min(1.0, saturation)),
    )
    return f"#{round(red * 255):02x}{round(green * 255):02x}{round(blue * 255):02x}"


def _pre_2000_color(year: int) -> str:
    first = FIRST_ESC_YEAR
    last = PRE_2000_CUTOFF - 1
    span = max(last - first, 1)
    position = (year - first) / span
    lightness = (
        PRE_2000_LIGHTNESS_MID
        - PRE_2000_LIGHTNESS_SPREAD / 2
        + position * PRE_2000_LIGHTNESS_SPREAD
    )
    return _hsl_to_hex(PRE_2000_HUE, PRE_2000_SATURATION, lightness)


def _modern_color(year: int) -> str:
    index = (year - MODERN_EPOCH) % len(YEAR_PALETTE)
    return YEAR_PALETTE[index]


def year_color(year: int) -> str:
    if year < PRE_2000_CUTOFF:
        return _pre_2000_color(year)
    return _modern_color(year)


def main() -> None:
    colors: dict[str, dict[str, str]] = {}
    for year in range(FIRST_ESC_YEAR, LAST_ESC_YEAR + 1):
        source = "generated" if year < PRE_2000_CUTOFF else "palette"
        colors[str(year)] = {"hex": year_color(year), "source": source}
    colors[UNKNOWN_YEAR] = {"hex": "#71717a", "source": "generated"}

    payload = {"colors": colors, "version": 1}
    destination = REPO_ROOT / "data" / "metadata" / "year-colors.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {destination} ({len(colors)} years)")


if __name__ == "__main__":
    main()
