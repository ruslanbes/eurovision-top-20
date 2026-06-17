from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

_YYYY_MM_STEM = re.compile(r"^(\d{4})-(\d{2})$")

from jsonschema import Draft202012Validator
from jsonschema.exceptions import SchemaError

from evtop20.models import LoadedEpisode
from evtop20.normalize import normalize_episode_data, write_episode_file
from evtop20.paths import episode_schema_path, raw_episodes_dir
from evtop20.validate_corpus import format_corpus_finding, validate_corpus_identity
from evtop20.validate_identity import format_identity_finding, validate_episode_identity

Severity = Literal["error", "warning", "info"]


@dataclass(frozen=True)
class EpisodeValidationIssue:
    file: Path
    message: str
    severity: Severity = "error"


def load_schema(repo_root: Path) -> dict:
    schema_path = episode_schema_path(repo_root)
    with schema_path.open(encoding="utf-8") as f:
        schema = json.load(f)
    Draft202012Validator.check_schema(schema)
    return schema


def list_episode_files(raw_dir: Path) -> list[Path]:
    if not raw_dir.is_dir():
        msg = f"Raw episodes directory not found: {raw_dir}"
        raise FileNotFoundError(msg)
    return sorted(raw_dir.glob("*.json"))


def _schema_issues(data: object, schema: dict, filename: str) -> list[str]:
    validator = Draft202012Validator(schema)
    return [
        f"{filename}: {error.message}"
        for error in sorted(validator.iter_errors(data), key=lambda e: list(e.path))
    ]


def _business_rule_issues(data: dict, path: Path) -> list[str]:
    issues: list[str] = []

    entries = data.get("entries", [])
    ranks = [entry.get("rank") for entry in entries if isinstance(entry, dict)]
    expected = set(range(1, 21))
    actual = set(ranks)
    if actual != expected:
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        parts: list[str] = []
        if missing:
            parts.append(f"missing ranks {missing}")
        if extra:
            parts.append(f"unexpected ranks {extra}")
        issues.append(f"entries must contain ranks 1–20 exactly once ({', '.join(parts)})")

    period = data.get("period")
    if isinstance(period, dict):
        stem_match = _YYYY_MM_STEM.match(path.stem)
        if stem_match:
            year, month = int(stem_match.group(1)), int(stem_match.group(2))
            if period.get("year") != year or period.get("month") != month:
                issues.append(
                    f"period {period!r} does not match filename "
                    f"(expected year={year}, month={month})"
                )

    return issues


def _structural_issues(data: dict, path: Path, schema: dict) -> list[str]:
    filename = path.name
    issues = _schema_issues(data, schema, filename)
    issues.extend(_business_rule_issues(data, path))
    return issues


def load_episode_file(path: Path) -> tuple[dict | None, list[str]]:
    filename = path.name
    try:
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        return None, [f"{filename}: invalid JSON ({exc.msg} at line {exc.lineno})"]

    if not isinstance(data, dict):
        return None, [f"{filename}: root value must be a JSON object"]
    return data, []


def validate_episode_file(path: Path, schema: dict) -> list[str]:
    data, parse_issues = load_episode_file(path)
    if data is None:
        return parse_issues
    return _structural_issues(data, path, schema)


def validate_raw_episodes(
    repo_root: Path,
    *,
    raw_dir: Path | None = None,
) -> list[EpisodeValidationIssue]:
    try:
        schema = load_schema(repo_root)
    except (OSError, json.JSONDecodeError, SchemaError) as exc:
        return [EpisodeValidationIssue(repo_root, f"schema: {exc}")]

    episodes_dir = raw_dir or raw_episodes_dir(repo_root)
    try:
        episode_files = list_episode_files(episodes_dir)
    except FileNotFoundError as exc:
        return [EpisodeValidationIssue(episodes_dir, str(exc))]

    if not episode_files:
        return [EpisodeValidationIssue(episodes_dir, "no episode JSON files found")]

    results: list[EpisodeValidationIssue] = []
    loaded_episodes: list[LoadedEpisode] = []

    for path in episode_files:
        data, parse_issues = load_episode_file(path)
        for message in parse_issues:
            results.append(EpisodeValidationIssue(path, message))

        if data is None:
            continue

        data, changed = normalize_episode_data(data)
        if changed:
            write_episode_file(path, data)
            results.append(
                EpisodeValidationIssue(
                    path,
                    "normalized leading/trailing whitespace in strings",
                    severity="info",
                )
            )

        structural = _structural_issues(data, path, schema)
        for message in structural:
            results.append(EpisodeValidationIssue(path, message))

        if not structural and not parse_issues:
            loaded_episodes.append(LoadedEpisode(path=path, data=data))

    for episode in loaded_episodes:
        for finding in validate_episode_identity(episode):
            results.append(
                EpisodeValidationIssue(
                    file=episode.path,
                    message=format_identity_finding(finding),
                    severity=finding.severity,
                )
            )

    if not has_validation_errors(results) and loaded_episodes:
        for finding in validate_corpus_identity(loaded_episodes):
            results.append(
                EpisodeValidationIssue(
                    file=finding.file,
                    message=format_corpus_finding(finding),
                    severity=finding.severity,
                )
            )

    return results


def _append_multiline_issue(
    lines: list[str],
    issue: EpisodeValidationIssue,
) -> None:
    message_lines = issue.message.splitlines()
    lines.append(f"  {issue.file.name}: {message_lines[0]}")
    for continuation in message_lines[1:]:
        lines.append(f"    {continuation}")


def has_validation_errors(issues: list[EpisodeValidationIssue]) -> bool:
    return any(issue.severity == "error" for issue in issues)


def format_validation_report(issues: list[EpisodeValidationIssue]) -> str:
    errors = [issue for issue in issues if issue.severity == "error"]
    warnings = [issue for issue in issues if issue.severity == "warning"]
    infos = [issue for issue in issues if issue.severity == "info"]

    if errors:
        lines = ["Validation failed:"]
        for issue in errors:
            _append_multiline_issue(lines, issue)
        if infos:
            lines.append("")
            lines.append("Normalized:")
            for issue in infos:
                lines.append(f"  {issue.file.name}: {issue.message}")
        if warnings:
            lines.append("")
            lines.append("Warnings:")
            for issue in warnings:
                lines.append(f"  {issue.file.name}: {issue.message}")
        return "\n".join(lines)

    lines: list[str] = []
    if warnings or infos:
        lines.append("All raw episode files are valid.")
        if infos:
            lines.append("")
            lines.append("Normalized:")
            for issue in infos:
                lines.append(f"  {issue.file.name}: {issue.message}")
        if warnings:
            lines.append("")
            lines.append("Warnings:")
            for issue in warnings:
                lines.append(f"  {issue.file.name}: {issue.message}")
        return "\n".join(lines)

    return "All raw episode files are valid."
