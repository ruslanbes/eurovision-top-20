from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from evtop20.episode_index import load_episode_index
from evtop20.models import youtube_id_is_set
from evtop20.normalize import write_episode_file
from evtop20.paths import packaged_per_video_alltime_stats_latest_path, packaged_query_dir
from evtop20.song_stats import (
    _canonical_member,
    is_eligible_song_rollup_row,
    song_group_key,
)

VIDEO_META_FIELDS = (
    "artist",
    "country",
    "esc_final_place",
    "fire",
    "flag",
    "metadata_extractor",
    "performance_category",
    "song",
    "video_title",
    "year",
    "youtube_video_id",
    "youtube_watch_url",
)

SONG_META_FIELDS = (
    "artist",
    "country",
    "esc_final_place",
    "fire",
    "flag",
    "song",
    "year",
)

QUERY_ARTIFACT_NAMES = (
    "video-hits.json",
    "video-meta.json",
    "song-hits.json",
    "song-meta.json",
)


@dataclass(frozen=True)
class QueryIndexResult:
    output_dir: Path
    period_count: int
    video_hit_count: int
    video_entry_count: int
    song_hit_count: int
    song_entry_count: int

    @property
    def summary(self) -> str:
        rel = self.output_dir
        return (
            f"Wrote {rel}/video-hits.json … {rel}/song-meta.json "
            f"({self.period_count} periods, "
            f"{self.video_hit_count} video hits / {self.video_entry_count} entries, "
            f"{self.song_hit_count} song hits / {self.song_entry_count} entries)"
        )


def build_video_hits(contributions: list[dict]) -> dict:
    periods = [contribution["period"] for contribution in contributions]
    by_title: dict[str, dict] = {}

    for contribution in contributions:
        period = contribution["period"]
        rows = contribution.get("rows")
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            title = row.get("video_title")
            rank = row.get("rank")
            if not isinstance(title, str) or not title or not isinstance(rank, int):
                continue
            if title not in by_title:
                by_title[title] = {
                    "entries": [],
                    "video_title": title,
                    "youtube_video_id": "",
                }
            by_title[title]["entries"].append({"period": period, "rank": rank})
            video_id = row.get("youtube_video_id")
            if isinstance(video_id, str) and youtube_id_is_set(video_id):
                by_title[title]["youtube_video_id"] = video_id

    hits = list(by_title.values())
    hits.sort(key=lambda item: item["video_title"].casefold())
    for hit in hits:
        hit["entries"].sort(key=lambda entry: (entry["period"], entry["rank"]))
    return {"hits": hits, "periods": periods}


def build_video_meta(rows: list[dict]) -> dict:
    meta_rows: list[dict] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        title = row.get("video_title")
        if not isinstance(title, str) or not title:
            continue
        meta_rows.append({field: row.get(field) for field in VIDEO_META_FIELDS})

    meta_rows.sort(key=lambda row: row["video_title"].casefold())
    return {"rows": meta_rows}


def build_song_hits(
    contributions: list[dict],
    video_meta: dict,
) -> dict:
    periods = [contribution["period"] for contribution in contributions]
    title_to_key: dict[str, tuple[str, str]] = {}
    display_by_key: dict[tuple[str, str], tuple[str, str]] = {}
    meta_rows = video_meta.get("rows")
    if isinstance(meta_rows, list):
        for row in meta_rows:
            if not isinstance(row, dict):
                continue
            if not is_eligible_song_rollup_row(row):
                continue
            title = row.get("video_title")
            artist = row.get("artist")
            song = row.get("song")
            if (
                isinstance(title, str)
                and isinstance(artist, str)
                and isinstance(song, str)
            ):
                key = song_group_key(row)
                title_to_key[title] = key
                display_by_key.setdefault(key, (artist, song))

    by_song: dict[tuple[str, str], dict] = {}

    for contribution in contributions:
        period = contribution["period"]
        episode_ranks: dict[tuple[str, str], list[int]] = defaultdict(list)
        rows = contribution.get("rows")
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            title = row.get("video_title")
            rank = row.get("rank")
            if not isinstance(title, str) or not isinstance(rank, int):
                continue
            song_key = title_to_key.get(title)
            if song_key is None:
                continue
            episode_ranks[song_key].append(rank)

        for song_key, ranks in episode_ranks.items():
            artist, song = display_by_key[song_key]
            group = by_song.setdefault(
                song_key,
                {"artist": artist, "entries": [], "song": song},
            )
            group["entries"].append({"period": period, "ranks": sorted(ranks)})

    hits = list(by_song.values())
    hits.sort(key=lambda item: (item["artist"].casefold(), item["song"].casefold()))
    for hit in hits:
        hit["entries"].sort(key=lambda entry: entry["period"])
    return {"hits": hits, "periods": periods}


def build_song_meta(rows: list[dict]) -> dict:
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in rows:
        if isinstance(row, dict) and is_eligible_song_rollup_row(row):
            groups[song_group_key(row)].append(row)

    song_rows: list[dict] = []
    for members in groups.values():
        canonical = _canonical_member(members)
        row = {field: canonical.get(field) for field in SONG_META_FIELDS}
        row["fire"] = any(m.get("fire") for m in members)
        song_rows.append(row)

    song_rows.sort(
        key=lambda row: (row["artist"].casefold(), row["song"].casefold())
    )
    return {"rows": song_rows}


def build_query_payloads(
    contributions: list[dict],
    latest_video_rows: list[dict],
) -> dict[str, dict]:
    video_meta = build_video_meta(latest_video_rows)
    return {
        "video_hits": build_video_hits(contributions),
        "video_meta": video_meta,
        "song_hits": build_song_hits(contributions, video_meta),
        "song_meta": build_song_meta(latest_video_rows),
    }


def _load_latest_video_rows(repo_root: Path) -> list[dict]:
    latest_path = packaged_per_video_alltime_stats_latest_path(repo_root)
    if not latest_path.is_file():
        msg = f"missing {latest_path.name}; run package alltime first"
        raise FileNotFoundError(msg)
    latest_payload = json.loads(latest_path.read_text(encoding="utf-8"))
    rows = latest_payload.get("rows")
    if not isinstance(rows, list):
        msg = "latest packaged video payload rows must be a list"
        raise ValueError(msg)
    return rows


def run_query_index(
    repo_root: Path,
    *,
    latest_video_rows: list[dict] | None = None,
) -> QueryIndexResult:
    contributions = load_episode_index(repo_root)

    if latest_video_rows is None:
        latest_video_rows = _load_latest_video_rows(repo_root)

    payloads = build_query_payloads(contributions, latest_video_rows)
    output_dir = packaged_query_dir(repo_root)
    output_dir.mkdir(parents=True, exist_ok=True)

    write_episode_file(output_dir / "video-hits.json", payloads["video_hits"])
    write_episode_file(output_dir / "video-meta.json", payloads["video_meta"])
    write_episode_file(output_dir / "song-hits.json", payloads["song_hits"])
    write_episode_file(output_dir / "song-meta.json", payloads["song_meta"])

    video_hits = payloads["video_hits"]
    song_hits = payloads["song_hits"]
    return QueryIndexResult(
        output_dir=_display_path(output_dir, repo_root),
        period_count=len(video_hits["periods"]),
        video_hit_count=len(video_hits["hits"]),
        video_entry_count=sum(len(hit["entries"]) for hit in video_hits["hits"]),
        song_hit_count=len(song_hits["hits"]),
        song_entry_count=sum(len(hit["entries"]) for hit in song_hits["hits"]),
    )


def load_query_payloads(repo_root: Path) -> dict[str, dict]:
    output_dir = packaged_query_dir(repo_root)
    names = {
        "video_hits": "video-hits.json",
        "video_meta": "video-meta.json",
        "song_hits": "song-hits.json",
        "song_meta": "song-meta.json",
    }
    payloads: dict[str, dict] = {}
    for key, name in names.items():
        path = output_dir / name
        if not path.is_file():
            msg = f"missing {path}; run package first"
            raise FileNotFoundError(msg)
        payloads[key] = json.loads(path.read_text(encoding="utf-8"))
    return payloads


def _display_path(path: Path, repo_root: Path) -> Path:
    try:
        return path.relative_to(repo_root)
    except ValueError:
        return path
