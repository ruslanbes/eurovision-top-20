from __future__ import annotations

import json
from pathlib import Path

from evtop20.aggregate import (
    TIER_COUNT_FIELDS,
    StatsAccumulator,
    chart_points_from_tiers,
    episode_period,
    load_episodes,
    tiers_for_rank,
)
from evtop20.paths import (
    ALLTIME_STATS_BASENAME,
    processed_alltime_dir,
)
from evtop20.song_stats import (
    is_eligible_song_rollup_row,
    song_group_key,
)
from evtop20.sort_keys import song_row_sort_key, stats_row_sort_key
from evtop20.periods import format_period, period_before, period_in_range


def _empty_tiers() -> dict[str, int]:
    return {field: 0 for field in TIER_COUNT_FIELDS}


def _tiers_from_rank(rank: int) -> dict[str, int]:
    tiers = _empty_tiers()
    for field in tiers_for_rank(rank):
        tiers[field] += 1
    return tiers


def _add_tiers(left: dict[str, int], right: dict[str, int]) -> dict[str, int]:
    return {field: left.get(field, 0) + right.get(field, 0) for field in TIER_COUNT_FIELDS}


def _subtract_tiers(end: dict[str, int], begin: dict[str, int]) -> dict[str, int]:
    return {
        field: end.get(field, 0) - begin.get(field, 0) for field in TIER_COUNT_FIELDS
    }


def _rows_by_video_title(payload: dict) -> dict[str, dict]:
    rows = payload.get("rows")
    if not isinstance(rows, list):
        return {}
    indexed: dict[str, dict] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        title = row.get("video_title")
        if isinstance(title, str) and title:
            indexed[title] = row
    return indexed


def load_processed_snapshot(repo_root: Path, period_label: str | None) -> dict:
    if period_label is None:
        return {"rows": []}
    path = (
        processed_alltime_dir(repo_root)
        / f"{ALLTIME_STATS_BASENAME}-{period_label}.json"
    )
    if not path.is_file():
        msg = f"missing processed snapshot {path.name}; run process first"
        raise FileNotFoundError(msg)
    return json.loads(path.read_text(encoding="utf-8"))


def window_stats_from_episodes(
    repo_root: Path,
    *,
    begin: str,
    end: str,
    periods: list[str],
) -> list[dict]:
    episodes = load_episodes(repo_root)
    accumulator = StatsAccumulator()
    for path, data in episodes:
        period_label = format_period(episode_period(data))
        if period_in_range(period_label, begin, end, periods):
            accumulator.apply_episode(path, data)

    rows = accumulator.to_rows()
    return [row for row in rows if any(row[field] for field in TIER_COUNT_FIELDS)]


def window_stats_from_cumulative(
    repo_root: Path,
    *,
    begin: str,
    end: str,
    periods: list[str],
) -> list[dict]:
    end_payload = load_processed_snapshot(repo_root, end)
    begin_minus_one = period_before(begin, periods)
    begin_payload = load_processed_snapshot(repo_root, begin_minus_one)
    end_rows = _rows_by_video_title(end_payload)
    begin_rows = _rows_by_video_title(begin_payload)

    titles = set(end_rows) | set(begin_rows)
    window_rows: list[dict] = []
    for title in titles:
        end_row = end_rows.get(title, _empty_tiers())
        begin_row = begin_rows.get(title, _empty_tiers())
        tiers = _subtract_tiers(
            {field: end_row.get(field, 0) for field in TIER_COUNT_FIELDS},
            {field: begin_row.get(field, 0) for field in TIER_COUNT_FIELDS},
        )
        if not any(tiers.values()):
            continue
        window_rows.append(
            {
                "video_title": title,
                **tiers,
                "chart_points": chart_points_from_tiers(tiers),
                "youtube_video_id": end_row.get("youtube_video_id", "")
                if isinstance(end_row.get("youtube_video_id"), str)
                else "",
            }
        )

    window_rows.sort(key=stats_row_sort_key)
    return window_rows


def aggregate_video_hits(
    video_hits: dict,
    video_meta: dict,
    *,
    begin: str,
    end: str,
) -> list[dict]:
    periods = video_hits.get("periods")
    hits = video_hits.get("hits")
    meta_rows = video_meta.get("rows")
    if not isinstance(periods, list) or not isinstance(hits, list):
        msg = "video-hits payload must include periods and hits"
        raise ValueError(msg)
    if not isinstance(meta_rows, list):
        msg = "video-meta payload must include rows"
        raise ValueError(msg)

    meta_by_title = {
        row["video_title"]: row
        for row in meta_rows
        if isinstance(row, dict) and isinstance(row.get("video_title"), str)
    }

    window_rows: list[dict] = []
    for hit in hits:
        if not isinstance(hit, dict):
            continue
        title = hit.get("video_title")
        if not isinstance(title, str) or not title:
            continue
        tiers = _empty_tiers()
        entries = hit.get("entries")
        if isinstance(entries, list):
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                period = entry.get("period")
                rank = entry.get("rank")
                if (
                    not isinstance(period, str)
                    or not isinstance(rank, int)
                    or not period_in_range(period, begin, end, periods)
                ):
                    continue
                tiers = _add_tiers(tiers, _tiers_from_rank(rank))
        if not any(tiers.values()):
            continue

        meta = meta_by_title.get(title, {})
        window_rows.append(
            {
                "video_title": title,
                **tiers,
                "chart_points": chart_points_from_tiers(tiers),
                "youtube_video_id": hit.get("youtube_video_id", "")
                if isinstance(hit.get("youtube_video_id"), str)
                else "",
                "youtube_watch_url": meta.get("youtube_watch_url"),
                "artist": meta.get("artist"),
                "song": meta.get("song"),
                "flag": meta.get("flag"),
                "country": meta.get("country"),
                "performance_category": meta.get("performance_category"),
                "year": meta.get("year"),
                "esc_final_place": meta.get("esc_final_place"),
                "fire": bool(meta.get("fire")),
                "metadata_extractor": meta.get("metadata_extractor"),
            }
        )

    window_rows.sort(key=stats_row_sort_key)
    return window_rows


def aggregate_song_hits(
    song_hits: dict,
    song_meta: dict,
    *,
    begin: str,
    end: str,
) -> list[dict]:
    periods = song_hits.get("periods")
    hits = song_hits.get("hits")
    meta_rows = song_meta.get("rows")
    if not isinstance(periods, list) or not isinstance(hits, list):
        msg = "song-hits payload must include periods and hits"
        raise ValueError(msg)
    if not isinstance(meta_rows, list):
        msg = "song-meta payload must include rows"
        raise ValueError(msg)

    meta_by_key = {
        song_group_key(row): row
        for row in meta_rows
        if isinstance(row, dict) and is_eligible_song_rollup_row(row)
    }

    window_rows: list[dict] = []
    for hit in hits:
        if not isinstance(hit, dict):
            continue
        artist = hit.get("artist")
        song = hit.get("song")
        if not isinstance(artist, str) or not isinstance(song, str):
            continue
        key = (artist.casefold(), song.casefold())
        tiers = _empty_tiers()
        entries = hit.get("entries")
        if isinstance(entries, list):
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                period = entry.get("period")
                if not isinstance(period, str) or not period_in_range(
                    period, begin, end, periods
                ):
                    continue
                ranks = entry.get("ranks")
                if not isinstance(ranks, list):
                    continue
                for rank in ranks:
                    if isinstance(rank, int) and 1 <= rank <= 20:
                        tiers = _add_tiers(tiers, _tiers_from_rank(rank))
        if not any(tiers.values()):
            continue

        meta = meta_by_key.get(key, {})
        window_rows.append(
            {
                "artist": artist,
                "song": song,
                **tiers,
                "chart_points": chart_points_from_tiers(tiers),
                "flag": meta.get("flag", ""),
                "country": meta.get("country", ""),
                "year": meta.get("year", 0),
                "esc_final_place": meta.get("esc_final_place"),
                "fire": bool(meta.get("fire")),
                "youtube_video_id": meta.get("youtube_video_id", ""),
                "youtube_watch_url": meta.get("youtube_watch_url"),
            }
        )

    window_rows.sort(key=song_row_sort_key)
    return window_rows


def window_stats(
    repo_root: Path,
    *,
    begin: str,
    end: str,
    grain: str = "video",
    source: str = "episodes",
) -> list[dict]:
    from evtop20.periods import ordered_period_labels
    from evtop20.query_index import load_query_payloads

    periods = ordered_period_labels(repo_root)
    if begin not in periods or end not in periods:
        msg = f"begin/end must be episode months in corpus ({periods[0]} … {periods[-1]})"
        raise ValueError(msg)

    if source == "episodes":
        if grain != "video":
            msg = "episode source supports video grain only"
            raise ValueError(msg)
        return window_stats_from_episodes(
            repo_root, begin=begin, end=end, periods=periods
        )

    if source == "cumulative":
        if grain != "video":
            msg = "cumulative source supports video grain only"
            raise ValueError(msg)
        return window_stats_from_cumulative(
            repo_root, begin=begin, end=end, periods=periods
        )

    if source == "query":
        payloads = load_query_payloads(repo_root)
        if grain == "video":
            return aggregate_video_hits(
                payloads["video_hits"],
                payloads["video_meta"],
                begin=begin,
                end=end,
            )
        if grain == "song":
            return aggregate_song_hits(
                payloads["song_hits"],
                payloads["song_meta"],
                begin=begin,
                end=end,
            )
        msg = f"unsupported grain: {grain}"
        raise ValueError(msg)

    msg = f"unsupported source: {source}"
    raise ValueError(msg)
