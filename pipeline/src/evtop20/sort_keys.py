from __future__ import annotations

SPECIAL_CODE_ORDER = (
    "DNQ",
    "DQ",
    "CANCELLED",
    "WITHDRAWN",
    "PENDING",
    "NON_ENTRY",
)
SPECIAL_CODE_SORT_BASE = 1000
UNKNOWN_ESC_SORT_KEY = 10_000


def _row_chart_points(row: dict) -> int:
    value = row.get("chart_points")
    if isinstance(value, int):
        return value
    from evtop20.aggregate import chart_points_from_tiers

    return chart_points_from_tiers(row)


def esc_final_place_sort_key(value: object) -> int:
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        try:
            index = SPECIAL_CODE_ORDER.index(value)
        except ValueError:
            return SPECIAL_CODE_SORT_BASE + len(SPECIAL_CODE_ORDER)
        return SPECIAL_CODE_SORT_BASE + index
    return UNKNOWN_ESC_SORT_KEY


def year_sort_key_desc(value: object) -> int:
    if isinstance(value, int) and value > 0:
        return -value
    return 0


def stats_row_sort_key(row: dict) -> tuple:
    title = row.get("video_title")
    title_key = title.casefold() if isinstance(title, str) else ""
    return (
        -_row_chart_points(row),
        -row["top1"],
        -row["top3"],
        -row["top5"],
        -row["top10"],
        -row["top20"],
        esc_final_place_sort_key(row.get("esc_final_place")),
        year_sort_key_desc(row.get("year")),
        title_key,
    )


def song_row_sort_key(row: dict) -> tuple:
    return (
        -_row_chart_points(row),
        -row["top1"],
        -row["top3"],
        -row["top5"],
        -row["top10"],
        -row["top20"],
        esc_final_place_sort_key(row.get("esc_final_place")),
        year_sort_key_desc(row.get("year")),
        row["artist"].casefold(),
        row["song"].casefold(),
    )
