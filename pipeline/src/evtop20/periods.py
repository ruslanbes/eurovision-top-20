from __future__ import annotations

from pathlib import Path

from evtop20.aggregate import Period, episode_period, episode_periods_in_order, load_episodes


def format_period(period: Period) -> str:
    return f"{period[0]:04d}-{period[1]:02d}"


def parse_period_label(label: str) -> Period:
    year_str, month_str = label.split("-", maxsplit=1)
    return int(year_str), int(month_str)


def ordered_period_labels(repo_root: Path) -> list[str]:
    episodes = load_episodes(repo_root)
    return [format_period(period) for period in episode_periods_in_order(episodes)]


def period_before(label: str, periods: list[str]) -> str | None:
    index = periods.index(label)
    if index == 0:
        return None
    return periods[index - 1]


def period_in_range(label: str, begin: str, end: str, periods: list[str]) -> bool:
    begin_index = periods.index(begin)
    end_index = periods.index(end)
    if begin_index > end_index:
        msg = f"begin {begin!r} is after end {end!r}"
        raise ValueError(msg)
    index = periods.index(label)
    return begin_index <= index <= end_index
