from __future__ import annotations

from collections import defaultdict

from evtop20.aggregate import TIER_COUNT_FIELDS, chart_points_from_tiers
from evtop20.paths import ALLTIME_STATS_BASENAME, SONG_STATS_BASENAME
from evtop20.sort_keys import song_row_sort_key

SONG_METADATA_FIELDS = (
    "artist",
    "song",
    "flag",
    "country",
    "performance_category",
    "year",
)


def is_eligible_song_rollup_row(row: dict) -> bool:
    for field in SONG_METADATA_FIELDS:
        value = row.get(field)
        if value is None:
            return False
        if field != "year" and isinstance(value, str) and not value.strip():
            return False
    return True


def song_group_key(row: dict) -> tuple[str, str]:
    return (row["artist"].casefold(), row["song"].casefold())


def _member_precedence_key(row: dict) -> tuple:
    title = row.get("video_title")
    title_key = title.casefold() if isinstance(title, str) else ""
    return (
        row["chart_points"],
        row["top1"],
        row["top3"],
        row["top5"],
        row["top10"],
        row["top20"],
        title_key,
    )


def _canonical_member(members: list[dict]) -> dict:
    return max(members, key=_member_precedence_key)


def _merge_song_group(members: list[dict]) -> tuple[dict, list[str]]:
    canonical = _canonical_member(members)
    artist = canonical["artist"]
    song = canonical["song"]
    warnings: list[str] = []

    countries = {row["country"] for row in members}
    if len(countries) > 1:
        warnings.append(
            "Warning: song roll-up country mismatch for "
            f'"{artist} — {song}" ({", ".join(sorted(countries))}); '
            f"using {canonical['country']}"
        )

    years = {row["year"] for row in members}
    if len(years) > 1:
        year_labels = ", ".join(str(year) for year in sorted(years))
        warnings.append(
            "Warning: song roll-up year mismatch for "
            f'"{artist} — {song}" ({year_labels}); using {canonical["year"]}'
        )

    places = {row.get("esc_final_place") for row in members}
    places.discard(None)
    if len(places) > 1:
        warnings.append(
            "Warning: song roll-up esc_final_place mismatch for "
            f'"{artist} — {song}" ({", ".join(map(str, sorted(places, key=str)))}); '
            f"using {canonical.get('esc_final_place')!r}"
        )

    merged = {
        "artist": artist,
        "song": song,
        "flag": canonical["flag"],
        "country": canonical["country"],
        "year": canonical["year"],
        "esc_final_place": canonical.get("esc_final_place"),
    }
    for field in TIER_COUNT_FIELDS:
        merged[field] = sum(row[field] for row in members)
    merged["chart_points"] = chart_points_from_tiers(merged)
    return merged, warnings


def package_song_stats_payload(
    packaged_video_payload: dict,
    *,
    source: str,
) -> tuple[dict, list[str]]:
    rows = packaged_video_payload.get("rows")
    if not isinstance(rows, list):
        msg = "packaged video payload rows must be a list"
        raise TypeError(msg)

    warnings: list[str] = []
    eligible: list[dict] = []
    for row in rows:
        if not isinstance(row, dict):
            msg = "packaged video row must be an object"
            raise TypeError(msg)
        if is_eligible_song_rollup_row(row):
            eligible.append(row)

    ineligible_count = len(rows) - len(eligible)
    if ineligible_count:
        warnings.append(
            f"Warning: {ineligible_count} video row(s) excluded from song roll-up "
            "(incomplete metadata)"
        )

    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in eligible:
        groups[song_group_key(row)].append(row)

    song_rows: list[dict] = []
    for members in groups.values():
        merged, group_warnings = _merge_song_group(members)
        warnings.extend(group_warnings)
        song_rows.append(merged)

    song_rows.sort(key=song_row_sort_key)

    if rows and not song_rows:
        warnings.append(
            "Warning: song roll-up produced no rows for snapshot "
            f"({len(rows)} video row(s), all excluded)"
        )

    payload = {
        "source": source,
        "rows": song_rows,
    }
    return payload, warnings


def video_stats_basename_to_song_stats_basename(video_basename: str) -> str:
    prefix = f"{ALLTIME_STATS_BASENAME}-"
    if video_basename.startswith(prefix):
        return SONG_STATS_BASENAME + video_basename[len(ALLTIME_STATS_BASENAME) :]
    msg = f"unexpected video stats basename: {video_basename}"
    raise ValueError(msg)


def alltime_basename_to_song_stats_basename(alltime_basename: str) -> str:
    return video_stats_basename_to_song_stats_basename(alltime_basename)
