from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from evtop20.esc_results.countries import country_to_code
from evtop20.esc_results.normalize import normalize_join_artist, normalize_join_text
from evtop20.esc_results.paths import esc_results_entries_path, esc_results_manifest_path
from evtop20.paths import esc_join_overrides_path, esc_placement_overrides_path


class EscResultsJoinError(Exception):
    pass


@dataclass
class EscResultsJoiner:
    last_completed_contest_year: int
    entries: list[dict]
    placement_overrides: dict[str, int | str] = field(default_factory=dict)
    join_overrides: dict[str, tuple[int, str]] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    _primary_index: dict[tuple[int, str, str, str], dict] = field(
        init=False, repr=False
    )
    _artist_index: dict[tuple[int, str, str], list[dict]] = field(
        init=False, repr=False
    )
    _song_index: dict[tuple[int, str, str], list[dict]] = field(
        init=False, repr=False
    )

    def __post_init__(self) -> None:
        primary: dict[tuple[int, str, str, str], dict] = {}
        artist: dict[tuple[int, str, str], list[dict]] = {}
        song: dict[tuple[int, str, str], list[dict]] = {}
        for entry in self.entries:
            contest_year = entry["contest_year"]
            country_code = entry["country_code"]
            norm_artist = normalize_join_artist(entry["artist"])
            norm_song = normalize_join_text(entry["song"])
            primary_key = (contest_year, country_code, norm_artist, norm_song)
            if primary_key in primary:
                msg = (
                    "duplicate vendor primary key "
                    f"{contest_year}/{country_code}/{entry['artist']}/{entry['song']}"
                )
                raise EscResultsJoinError(msg)
            primary[primary_key] = entry

            artist_key = (contest_year, country_code, norm_artist)
            artist.setdefault(artist_key, []).append(entry)

            song_key = (contest_year, country_code, norm_song)
            song.setdefault(song_key, []).append(entry)

        self._primary_index = primary
        self._artist_index = artist
        self._song_index = song

    def _lookup_country_year(
        self, contest_year: int, country_code: str
    ) -> int | str | None:
        matches = [
            entry
            for entry in self.entries
            if entry["contest_year"] == contest_year
            and entry["country_code"] == country_code
        ]
        if len(matches) == 1:
            return matches[0]["esc_final_place"]
        if len(matches) > 1:
            self.warnings.append(
                "Warning: ambiguous ESC country/year override for "
                f"{contest_year}/{country_code}; esc_final_place set to null"
            )
        return None

    def lookup(self, row: dict) -> int | str | None:
        video_id = row.get("youtube_video_id")
        if isinstance(video_id, str):
            video_id = video_id.strip()
            override = self.placement_overrides.get(video_id)
            if override is not None:
                return override
            join_key = self.join_overrides.get(video_id)
            if join_key is not None:
                place = self._lookup_country_year(join_key[0], join_key[1])
                if place is not None:
                    return place

        year = row.get("year")
        country = row.get("country")
        artist = row.get("artist")
        song = row.get("song")
        if not isinstance(year, int):
            return None
        if not isinstance(country, str) or not isinstance(artist, str):
            return None
        if not isinstance(song, str):
            return None

        if year > self.last_completed_contest_year:
            return "PENDING"

        country_code = country_to_code(country)
        if country_code is None:
            return None

        norm_artist = normalize_join_artist(artist)
        norm_song = normalize_join_text(song)
        primary_key = (year, country_code, norm_artist, norm_song)
        match = self._primary_index.get(primary_key)
        if match is not None:
            return match["esc_final_place"]

        artist_key = (year, country_code, norm_artist)
        candidates = self._artist_index.get(artist_key, [])
        if len(candidates) == 1:
            return candidates[0]["esc_final_place"]

        if len(candidates) > 1:
            title = row.get("video_title")
            label = title if isinstance(title, str) else f"{artist} — {song}"
            self.warnings.append(
                "Warning: ambiguous ESC results match for "
                f"{label!r} ({year}, {country_code}); esc_final_place set to null"
            )
            return None

        song_key = (year, country_code, norm_song)
        song_candidates = self._song_index.get(song_key, [])
        if len(song_candidates) == 1:
            return song_candidates[0]["esc_final_place"]

        if len(song_candidates) > 1:
            title = row.get("video_title")
            label = title if isinstance(title, str) else f"{artist} — {song}"
            self.warnings.append(
                "Warning: ambiguous ESC song match for "
                f"{label!r} ({year}, {country_code}); esc_final_place set to null"
            )
        return None


class EscPlacementOverrideError(Exception):
    pass


def _load_esc_placement_overrides(path: Path) -> dict[str, int | str]:
    if not path.is_file():
        return {}

    payload = json.loads(path.read_text(encoding="utf-8"))
    entries = payload.get("entries")
    if not isinstance(entries, list):
        msg = f"{path}: entries must be a list"
        raise EscPlacementOverrideError(msg)

    overrides: dict[str, int | str] = {}
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            msg = f"{path}: entries[{index}] must be an object"
            raise EscPlacementOverrideError(msg)

        video_id = entry.get("youtube_video_id")
        place = entry.get("esc_final_place")
        if not isinstance(video_id, str) or not video_id.strip():
            msg = (
                f"{path}: entries[{index}].youtube_video_id "
                "must be a non-empty string"
            )
            raise EscPlacementOverrideError(msg)
        if isinstance(place, int) and place > 0:
            normalized_place: int | str = place
        elif isinstance(place, str) and place:
            normalized_place = place
        else:
            msg = (
                f"{path}: entries[{index}].esc_final_place "
                "must be a positive integer or non-empty string"
            )
            raise EscPlacementOverrideError(msg)

        video_id = video_id.strip()
        if video_id in overrides:
            msg = f"{path}: duplicate youtube_video_id {video_id!r}"
            raise EscPlacementOverrideError(msg)
        overrides[video_id] = normalized_place

    return overrides


class EscJoinOverrideError(Exception):
    pass


def _load_esc_join_overrides(path: Path) -> dict[str, tuple[int, str]]:
    if not path.is_file():
        return {}

    payload = json.loads(path.read_text(encoding="utf-8"))
    entries = payload.get("entries")
    if not isinstance(entries, list):
        msg = f"{path}: entries must be a list"
        raise EscJoinOverrideError(msg)

    overrides: dict[str, tuple[int, str]] = {}
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            msg = f"{path}: entries[{index}] must be an object"
            raise EscJoinOverrideError(msg)

        video_id = entry.get("youtube_video_id")
        contest_year = entry.get("contest_year")
        country_code = entry.get("country_code")
        if not isinstance(video_id, str) or not video_id.strip():
            msg = f"{path}: entries[{index}].youtube_video_id must be a non-empty string"
            raise EscJoinOverrideError(msg)
        if not isinstance(contest_year, int):
            msg = f"{path}: entries[{index}].contest_year must be an integer"
            raise EscJoinOverrideError(msg)
        if not isinstance(country_code, str) or not country_code.strip():
            msg = f"{path}: entries[{index}].country_code must be a non-empty string"
            raise EscJoinOverrideError(msg)

        video_id = video_id.strip()
        country_code = country_code.strip()
        if video_id in overrides:
            msg = f"{path}: duplicate youtube_video_id {video_id!r}"
            raise EscJoinOverrideError(msg)
        overrides[video_id] = (contest_year, country_code)

    return overrides


def load_esc_results_joiner(repo_root: Path) -> EscResultsJoiner:
    manifest_path = esc_results_manifest_path(repo_root)
    entries_path = esc_results_entries_path(repo_root)
    if not manifest_path.is_file() or not entries_path.is_file():
        msg = (
            "missing vendored ESC results; run "
            "`uv run evtop20 vendor-esc flatten --dataset-dir <path>` "
            f"and commit {entries_path.relative_to(repo_root)}"
        )
        raise EscResultsJoinError(msg)

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    last_completed = manifest.get("last_completed_contest_year")
    if not isinstance(last_completed, int):
        msg = f"{manifest_path}: last_completed_contest_year must be an integer"
        raise EscResultsJoinError(msg)

    entries = json.loads(entries_path.read_text(encoding="utf-8"))
    if not isinstance(entries, list):
        msg = f"{entries_path}: root must be a list"
        raise EscResultsJoinError(msg)

    try:
        placement_overrides = _load_esc_placement_overrides(
            esc_placement_overrides_path(repo_root)
        )
    except EscPlacementOverrideError as exc:
        raise EscResultsJoinError(str(exc)) from exc
    try:
        join_overrides = _load_esc_join_overrides(esc_join_overrides_path(repo_root))
    except EscJoinOverrideError as exc:
        raise EscResultsJoinError(str(exc)) from exc
    return EscResultsJoiner(
        last_completed_contest_year=last_completed,
        entries=entries,
        placement_overrides=placement_overrides,
        join_overrides=join_overrides,
    )
