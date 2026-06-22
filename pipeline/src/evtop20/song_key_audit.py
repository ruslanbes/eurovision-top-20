from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from evtop20.paths import packaged_per_video_alltime_stats_latest_path
from evtop20.song_key_normalize import normalized_song_key
from evtop20.song_stats import is_eligible_song_rollup_row, song_group_key


def soft_song_key(artist: str, song: str) -> tuple[str, str]:
    return normalized_song_key(artist, song)


def song_display_label(artist: str, song: str) -> str:
    return f"{artist} — {song}"


@dataclass(frozen=True)
class AuditRow:
    artist: str
    song: str
    country: str
    year: int
    video_title: str
    exact_key: tuple[str, str]
    soft_key: tuple[str, str]

    @classmethod
    def from_video_row(cls, row: dict) -> AuditRow:
        artist = row["artist"]
        song = row["song"]
        return cls(
            artist=artist,
            song=song,
            country=row["country"],
            year=row["year"],
            video_title=row.get("video_title", ""),
            exact_key=song_group_key(row),
            soft_key=soft_song_key(artist, song),
        )


@dataclass
class MergeGroupReport:
    display_label: str
    exact_key: tuple[str, str]
    member_count: int
    video_titles: list[str]
    artist_song_variants: list[str]
    countries: list[str]
    years: list[int]
    country_conflict: bool
    year_conflict: bool


@dataclass
class NearDuplicateCluster:
    year: int
    country: str
    soft_label: str
    exact_keys: list[tuple[str, str]]
    artist_song_variants: list[str]
    video_titles: list[str]
    member_count: int


@dataclass
class SoftMergeConflict:
    soft_label: str
    exact_keys: list[tuple[str, str]]
    artist_song_variants: list[str]
    countries: list[str]
    years: list[int]
    member_count: int


@dataclass
class SongKeyAuditReport:
    snapshot_path: str
    eligible_video_rows: int
    ineligible_video_rows: int
    exact_song_keys: int
    multi_member_merge_groups: list[MergeGroupReport] = field(default_factory=list)
    near_duplicate_clusters: list[NearDuplicateCluster] = field(default_factory=list)
    soft_merge_conflicts: list[SoftMergeConflict] = field(default_factory=list)

    @property
    def recommendation(self) -> str:
        if not self.near_duplicate_clusters and not self.soft_merge_conflicts:
            return (
                "Proceed with exact case-insensitive keys only — no soft-key "
                "near-duplicate clusters found on this snapshot."
            )
        cluster_count = len(self.near_duplicate_clusters)
        conflict_count = len(self.soft_merge_conflicts)
        return (
            f"Spec normalization rules in a follow-up task — found {cluster_count} "
            f"near-duplicate cluster(s) under the soft key heuristic and "
            f"{conflict_count} soft-key merge conflict(s) across year/country."
        )


def audit_song_keys(
    rows: list[dict],
    *,
    snapshot_path: str = "",
) -> SongKeyAuditReport:
    eligible: list[AuditRow] = []
    ineligible_count = 0
    for row in rows:
        if not isinstance(row, dict):
            msg = "packaged video row must be an object"
            raise TypeError(msg)
        if is_eligible_song_rollup_row(row):
            eligible.append(AuditRow.from_video_row(row))
        else:
            ineligible_count += 1

    exact_groups: dict[tuple[str, str], list[AuditRow]] = defaultdict(list)
    for audit_row in eligible:
        exact_groups[audit_row.exact_key].append(audit_row)

    multi_member: list[MergeGroupReport] = []
    for exact_key, members in sorted(
        exact_groups.items(),
        key=lambda item: (-len(item[1]), item[0][0], item[0][1]),
    ):
        if len(members) < 2:
            continue
        countries = sorted({member.country for member in members})
        years = sorted({member.year for member in members})
        canonical = max(members, key=lambda member: member.video_title)
        multi_member.append(
            MergeGroupReport(
                display_label=song_display_label(canonical.artist, canonical.song),
                exact_key=exact_key,
                member_count=len(members),
                video_titles=[member.video_title for member in members],
                artist_song_variants=sorted(
                    {
                        song_display_label(member.artist, member.song)
                        for member in members
                    }
                ),
                countries=countries,
                years=years,
                country_conflict=len(countries) > 1,
                year_conflict=len(years) > 1,
            )
        )

    context_soft_groups: dict[tuple[int, str, tuple[str, str]], list[AuditRow]] = (
        defaultdict(list)
    )
    for audit_row in eligible:
        context_soft_groups[
            (audit_row.year, audit_row.country, audit_row.soft_key)
        ].append(audit_row)

    near_duplicates: list[NearDuplicateCluster] = []
    for (year, country, soft_key), members in sorted(
        context_soft_groups.items(),
        key=lambda item: (-len(item[1]), item[0][0], item[0][1], item[0][2]),
    ):
        exact_keys = sorted({member.exact_key for member in members})
        if len(exact_keys) < 2:
            continue
        canonical = members[0]
        near_duplicates.append(
            NearDuplicateCluster(
                year=year,
                country=country,
                soft_label=song_display_label(canonical.artist, canonical.song),
                exact_keys=exact_keys,
                artist_song_variants=sorted(
                    {
                        song_display_label(member.artist, member.song)
                        for member in members
                    }
                ),
                video_titles=[member.video_title for member in members],
                member_count=len(members),
            )
        )

    soft_only_groups: dict[tuple[str, str], list[AuditRow]] = defaultdict(list)
    for audit_row in eligible:
        soft_only_groups[audit_row.soft_key].append(audit_row)

    soft_conflicts: list[SoftMergeConflict] = []
    for soft_key, members in sorted(
        soft_only_groups.items(),
        key=lambda item: (-len(item[1]), item[0][0], item[0][1]),
    ):
        countries = sorted({member.country for member in members})
        years = sorted({member.year for member in members})
        exact_keys = sorted({member.exact_key for member in members})
        if len(exact_keys) < 2:
            continue
        if len(countries) == 1 and len(years) == 1:
            continue
        canonical = members[0]
        soft_conflicts.append(
            SoftMergeConflict(
                soft_label=song_display_label(canonical.artist, canonical.song),
                exact_keys=exact_keys,
                artist_song_variants=sorted(
                    {
                        song_display_label(member.artist, member.song)
                        for member in members
                    }
                ),
                countries=countries,
                years=years,
                member_count=len(members),
            )
        )

    return SongKeyAuditReport(
        snapshot_path=snapshot_path,
        eligible_video_rows=len(eligible),
        ineligible_video_rows=ineligible_count,
        exact_song_keys=len(exact_groups),
        multi_member_merge_groups=multi_member,
        near_duplicate_clusters=near_duplicates,
        soft_merge_conflicts=soft_conflicts,
    )


def load_packaged_alltime_rows(repo_root: Path) -> tuple[list[dict], Path]:
    snapshot_path = packaged_per_video_alltime_stats_latest_path(repo_root)
    payload = json.loads(snapshot_path.read_text(encoding="utf-8"))
    rows = payload.get("rows")
    if not isinstance(rows, list):
        msg = f"{snapshot_path}: rows must be a list"
        raise TypeError(msg)
    return rows, snapshot_path


def run_song_key_audit(repo_root: Path) -> SongKeyAuditReport:
    rows, snapshot_path = load_packaged_alltime_rows(repo_root)
    return audit_song_keys(rows, snapshot_path=str(snapshot_path))


def _truncate(items: list[str], limit: int) -> list[str]:
    if limit <= 0 or len(items) <= limit:
        return items
    remaining = len(items) - limit
    return [*items[:limit], f"… and {remaining} more"]


def format_audit_markdown(report: SongKeyAuditReport, *, example_limit: int = 10) -> str:
    lines = [
        "# Song key normalization audit",
        "",
        f"Snapshot: `{report.snapshot_path}`",
        "",
        "## Summary",
        "",
        f"- Eligible video rows: **{report.eligible_video_rows}**",
        f"- Ineligible video rows: **{report.ineligible_video_rows}**",
        f"- Distinct exact `(artist, song)` keys (case-insensitive): **{report.exact_song_keys}**",
        f"- Multi-member merge groups today: **{len(report.multi_member_merge_groups)}**",
        f"- Near-duplicate clusters (same year + country + soft key): **{len(report.near_duplicate_clusters)}**",
        f"- Soft-key merge conflicts (different year/country): **{len(report.soft_merge_conflicts)}**",
        "",
        f"**Recommendation:** {report.recommendation}",
        "",
    ]

    merge_conflicts = [
        group
        for group in report.multi_member_merge_groups
        if group.country_conflict or group.year_conflict
    ]
    lines.extend(
        [
            "## Merge groups today (exact key, 2+ videos)",
            "",
        ]
    )
    if not report.multi_member_merge_groups:
        lines.append("_None._")
    else:
        for group in report.multi_member_merge_groups[:example_limit]:
            flags: list[str] = []
            if group.country_conflict:
                flags.append("country mismatch")
            if group.year_conflict:
                flags.append("year mismatch")
            flag_text = f" ({', '.join(flags)})" if flags else ""
            lines.append(
                f"- **{group.display_label}** — {group.member_count} video(s){flag_text}"
            )
            for title in _truncate(group.video_titles, 3):
                lines.append(f"  - `{title}`")
        if len(report.multi_member_merge_groups) > example_limit:
            lines.append(
                f"- … and {len(report.multi_member_merge_groups) - example_limit} more group(s)"
            )
    lines.append("")

    if merge_conflicts:
        lines.extend(
            [
                f"Merge groups with metadata conflicts: **{len(merge_conflicts)}**",
                "",
            ]
        )
        for group in merge_conflicts[:example_limit]:
            lines.append(
                f"- **{group.display_label}** — countries: {', '.join(group.countries)}; "
                f"years: {', '.join(str(year) for year in group.years)}"
            )
        lines.append("")

    lines.extend(["## Near-duplicate clusters (soft key heuristic)", ""])
    if not report.near_duplicate_clusters:
        lines.append("_None._")
    else:
        for cluster in report.near_duplicate_clusters[:example_limit]:
            variants = "; ".join(cluster.artist_song_variants)
            lines.append(
                f"- **{cluster.year} / {cluster.country}** — {cluster.member_count} video(s): "
                f"{variants}"
            )
            for title in _truncate(cluster.video_titles, 2):
                lines.append(f"  - `{title}`")
        if len(report.near_duplicate_clusters) > example_limit:
            lines.append(
                f"- … and {len(report.near_duplicate_clusters) - example_limit} more cluster(s)"
            )
    lines.append("")

    lines.extend(["## Soft-key merge conflicts (naïve merge)", ""])
    if not report.soft_merge_conflicts:
        lines.append("_None._")
    else:
        for conflict in report.soft_merge_conflicts[:example_limit]:
            lines.append(
                f"- **{conflict.soft_label}** — countries: {', '.join(conflict.countries)}; "
                f"years: {', '.join(str(year) for year in conflict.years)}; "
                f"variants: {'; '.join(conflict.artist_song_variants)}"
            )
        if len(report.soft_merge_conflicts) > example_limit:
            lines.append(
                f"- … and {len(report.soft_merge_conflicts) - example_limit} more conflict(s)"
            )

    return "\n".join(lines) + "\n"


def audit_report_to_json(report: SongKeyAuditReport) -> dict[str, Any]:
    return {
        "snapshot_path": report.snapshot_path,
        "eligible_video_rows": report.eligible_video_rows,
        "ineligible_video_rows": report.ineligible_video_rows,
        "exact_song_keys": report.exact_song_keys,
        "recommendation": report.recommendation,
        "multi_member_merge_groups": [
            {
                "display_label": group.display_label,
                "exact_key": list(group.exact_key),
                "member_count": group.member_count,
                "video_titles": group.video_titles,
                "artist_song_variants": group.artist_song_variants,
                "countries": group.countries,
                "years": group.years,
                "country_conflict": group.country_conflict,
                "year_conflict": group.year_conflict,
            }
            for group in report.multi_member_merge_groups
        ],
        "near_duplicate_clusters": [
            {
                "year": cluster.year,
                "country": cluster.country,
                "soft_label": cluster.soft_label,
                "exact_keys": [list(key) for key in cluster.exact_keys],
                "artist_song_variants": cluster.artist_song_variants,
                "video_titles": cluster.video_titles,
                "member_count": cluster.member_count,
            }
            for cluster in report.near_duplicate_clusters
        ],
        "soft_merge_conflicts": [
            {
                "soft_label": conflict.soft_label,
                "exact_keys": [list(key) for key in conflict.exact_keys],
                "artist_song_variants": conflict.artist_song_variants,
                "countries": conflict.countries,
                "years": conflict.years,
                "member_count": conflict.member_count,
            }
            for conflict in report.soft_merge_conflicts
        ],
    }
