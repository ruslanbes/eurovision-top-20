from __future__ import annotations

import json
from pathlib import Path

from evtop20.paths import fire_allowlist_path


class FireAllowlistError(Exception):
    pass


def load_fire_allowlist(repo_root: Path) -> frozenset[str]:
    return load_fire_allowlist_from_path(fire_allowlist_path(repo_root))


def load_fire_allowlist_from_path(path: Path) -> frozenset[str]:
    if not path.is_file():
        return frozenset()

    payload = json.loads(path.read_text(encoding="utf-8"))
    entries = payload.get("entries")
    if not isinstance(entries, list):
        msg = f"{path}: entries must be a list"
        raise FireAllowlistError(msg)

    video_ids: set[str] = set()
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            msg = f"{path}: entries[{index}] must be an object"
            raise FireAllowlistError(msg)

        video_id = entry.get("youtube_video_id")
        if not isinstance(video_id, str) or not video_id.strip():
            msg = (
                f"{path}: entries[{index}].youtube_video_id "
                "must be a non-empty string"
            )
            raise FireAllowlistError(msg)

        video_id = video_id.strip()
        if video_id in video_ids:
            msg = f"{path}: duplicate youtube_video_id {video_id!r}"
            raise FireAllowlistError(msg)
        video_ids.add(video_id)

    return frozenset(video_ids)


def row_is_fire(video_id: object, allowlist: frozenset[str]) -> bool:
    if not allowlist:
        return False
    if isinstance(video_id, str):
        video_id = video_id.strip()
        if video_id:
            return video_id in allowlist
    return False
