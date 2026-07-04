from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from evtop20.esc_results.normalize import normalize_join_text
from evtop20.normalize import write_episode_file

DQ_ALLOWLIST: frozenset[tuple[int, str, str]] = frozenset(
    {
        (2024, "NL", normalize_join_text("Joost Klein")),
    }
)

SOURCE_REPO = "https://github.com/EurovisionAPI/dataset"
DEFAULT_RELEASE_TAG = "2026.5"
UPSTREAM_CREDITS = [
    "eschome.net",
    "EurovisionWorld",
    "Eurovision LOD",
]


class FlattenError(Exception):
    pass


@dataclass(frozen=True)
class FlattenResult:
    entry_count: int
    last_completed_contest_year: int
    manifest_path: Path
    entries_path: Path


def _load_contestants(year_dir: Path) -> list[dict]:
    contestants_dir = year_dir / "contestants"
    if not contestants_dir.is_dir():
        return []

    rows: list[dict] = []
    for contestant_dir in sorted(contestants_dir.iterdir()):
        if not contestant_dir.is_dir():
            continue
        contestant_path = contestant_dir / "contestant.json"
        if not contestant_path.is_file():
            continue
        payload = json.loads(contestant_path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            msg = f"{contestant_path}: contestant must be an object"
            raise FlattenError(msg)
        rows.append(payload)
    return rows


def _final_places(year_dir: Path) -> dict[int, int] | None:
    final_path = year_dir / "rounds" / "final.json"
    if not final_path.is_file():
        return None
    payload = json.loads(final_path.read_text(encoding="utf-8"))
    performances = payload.get("performances")
    if not performances:
        return {}
    places: dict[int, int] = {}
    for performance in performances:
        if not isinstance(performance, dict):
            continue
        contestant_id = performance.get("contestantId")
        place = performance.get("place")
        if isinstance(contestant_id, int) and isinstance(place, int):
            places[contestant_id] = place
    return places


def _discover_contest_years(senior_dir: Path) -> list[int]:
    years: list[int] = []
    for path in senior_dir.iterdir():
        if path.is_dir() and path.name.isdigit():
            years.append(int(path.name))
    return sorted(years)


def _last_completed_contest_year(senior_dir: Path, years: list[int]) -> int:
    last_completed = 0
    for year in years:
        places = _final_places(senior_dir / str(year))
        if places:
            last_completed = year
    return last_completed


def _assign_place(
    *,
    contest_year: int,
    contestant: dict,
    final_places: dict[int, int] | None,
    last_completed_contest_year: int,
) -> int | str:
    contestant_id = contestant.get("id")
    country_code = contestant.get("country")
    artist = contestant.get("artist")
    if not isinstance(contestant_id, int):
        msg = f"contestant in {contest_year} missing integer id"
        raise FlattenError(msg)
    if not isinstance(country_code, str) or not isinstance(artist, str):
        msg = f"contestant {contestant_id} in {contest_year} missing country/artist"
        raise FlattenError(msg)

    if final_places and contestant_id in final_places:
        return final_places[contestant_id]

    if final_places is not None and not final_places:
        if contest_year > last_completed_contest_year:
            return "PENDING"
        return "CANCELLED"

    if contest_year > last_completed_contest_year:
        return "PENDING"

    dq_key = (
        contest_year,
        country_code,
        normalize_join_text(artist),
    )
    if dq_key in DQ_ALLOWLIST:
        return "DQ"

    return "DNQ"


def flatten_esc_dataset(
    dataset_dir: Path,
    out_dir: Path,
    *,
    release_tag: str = DEFAULT_RELEASE_TAG,
) -> FlattenResult:
    senior_dir = dataset_dir / "data" / "senior"
    if not senior_dir.is_dir():
        msg = (
            f"missing senior data directory: {senior_dir}\n"
            "Clone EurovisionAPI/dataset and pass the repo root, e.g.:\n"
            "  git clone --depth 1 --branch 2026.5 "
            "https://github.com/EurovisionAPI/dataset.git ~/EurovisionAPI-dataset\n"
            "  uv run evtop20 vendor-esc flatten --dataset-dir ~/EurovisionAPI-dataset"
        )
        raise FlattenError(msg)

    years = _discover_contest_years(senior_dir)
    if not years:
        msg = f"no contest years found under {senior_dir}"
        raise FlattenError(msg)

    last_completed_contest_year = _last_completed_contest_year(senior_dir, years)
    entries: list[dict] = []

    for contest_year in years:
        year_dir = senior_dir / str(contest_year)
        final_places = _final_places(year_dir)
        for contestant in _load_contestants(year_dir):
            country_code = contestant.get("country")
            artist = contestant.get("artist")
            song = contestant.get("song")
            if not isinstance(country_code, str):
                continue
            if not isinstance(artist, str) or not isinstance(song, str):
                msg = (
                    f"contestant {contestant.get('id')} in {contest_year} "
                    "missing artist/song"
                )
                raise FlattenError(msg)

            esc_final_place = _assign_place(
                contest_year=contest_year,
                contestant=contestant,
                final_places=final_places,
                last_completed_contest_year=last_completed_contest_year,
            )
            entries.append(
                {
                    "artist": artist,
                    "contest_year": contest_year,
                    "country_code": country_code,
                    "esc_final_place": esc_final_place,
                    "song": song,
                }
            )

    entries.sort(
        key=lambda row: (
            row["contest_year"],
            row["country_code"],
            normalize_join_text(row["artist"]),
            normalize_join_text(row["song"]),
        )
    )

    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "MANIFEST.json"
    entries_path = out_dir / "entries.json"

    manifest = {
        "flattened_at": datetime.now(UTC).date().isoformat(),
        "last_completed_contest_year": last_completed_contest_year,
        "release_tag": release_tag,
        "source_repo": SOURCE_REPO,
        "upstream_credits": UPSTREAM_CREDITS,
    }
    write_episode_file(manifest_path, manifest)
    write_episode_file(entries_path, entries)

    return FlattenResult(
        entry_count=len(entries),
        last_completed_contest_year=last_completed_contest_year,
        manifest_path=manifest_path,
        entries_path=entries_path,
    )
