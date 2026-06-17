from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def normalize_strings(value: Any) -> Any:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return {key: normalize_strings(item) for key, item in value.items()}
    if isinstance(value, list):
        return [normalize_strings(item) for item in value]
    return value


def write_episode_file(path: Path, data: dict) -> None:
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def normalize_episode_data(data: dict) -> tuple[dict, bool]:
    normalized = normalize_strings(data)
    if not isinstance(normalized, dict):
        return data, False
    return normalized, normalized != data
