from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from rapidfuzz import fuzz

from evtop20.add_prev import (
    AddPrevError,
    entry_is_set,
    find_episode_path_by_stem,
    get_entry_by_rank,
)
from evtop20.models import youtube_id_is_set
from evtop20.normalize import write_episode_file
from evtop20.paths import processed_alltime_stats_latest_path
from evtop20.validate import load_episode_file

AUTO_MATCH_MIN_SCORE = 75
AUTO_MATCH_MIN_GAP = 5

_SEPARATOR_PATTERN = re.compile(r"[|\-–/(),]+")
_EMOJI_PATTERN = re.compile(
    "["
    "\U0001F300-\U0001FAFF"
    "\U0001F1E0-\U0001F1FF"
    "\u2600-\u27BF"
    "]",
    flags=re.UNICODE,
)


class AddError(Exception):
    pass


class AddSuggestError(Exception):
    def __init__(self, message: str, suggestions: list[tuple[int, str]]) -> None:
        super().__init__(message)
        self.suggestions = suggestions


@dataclass(frozen=True)
class AddResult:
    summary: str


def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_for_match(text: str) -> str:
    text = strip_accents(text).casefold()
    text = _EMOJI_PATTERN.sub(" ", text)
    text = _SEPARATOR_PATTERN.sub(" ", text)
    tokens = text.split()
    seen: set[str] = set()
    deduped: list[str] = []
    for token in tokens:
        if token and token not in seen:
            seen.add(token)
            deduped.append(token)
    return " ".join(deduped)


def score_query(query: str, title: str) -> int:
    return int(
        fuzz.token_set_ratio(
            normalize_for_match(query),
            normalize_for_match(title),
        )
    )


def load_corpus_rows(repo_root: Path) -> list[dict]:
    path = processed_alltime_stats_latest_path(repo_root)
    if not path.is_file():
        msg = (
            f"stats file not found: {path.name} "
            "(run `uv run evtop20 process` first)"
        )
        raise AddError(msg)

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        msg = f"failed to parse {path.name}: {exc}"
        raise AddError(msg) from exc

    rows = data.get("rows", [])
    if not isinstance(rows, list) or not rows:
        msg = f"{path.name} has no stats rows (run `uv run evtop20 process` first)"
        raise AddError(msg)

    corpus: list[dict] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        title = row.get("video_title", "")
        if isinstance(title, str) and title.strip():
            corpus.append(row)
    if not corpus:
        msg = f"{path.name} has no video titles to search"
        raise AddError(msg)
    return corpus


def find_best_matches(
    query: str,
    rows: list[dict],
) -> list[tuple[int, dict]]:
    scored = [
        (score_query(query, row.get("video_title", "")), row)
        for row in rows
        if isinstance(row.get("video_title"), str)
    ]
    scored.sort(key=lambda item: (-item[0], item[1]["video_title"].casefold()))
    return scored


def close_scored_matches(
    scored: list[tuple[int, dict]],
    *,
    min_score: int,
    min_gap: int,
    require_min_score: bool = True,
) -> list[tuple[int, dict]]:
    if not scored:
        return []

    best_score = scored[0][0]
    close: list[tuple[int, dict]] = []
    seen_titles: set[str] = set()
    for score, row in scored:
        if best_score - score >= min_gap:
            break
        if require_min_score and score < min_score:
            continue
        title = row.get("video_title", "")
        if not isinstance(title, str) or not title or title in seen_titles:
            continue
        seen_titles.add(title)
        close.append((score, row))
    return close


def format_suggestions(scored: list[tuple[int, dict]]) -> list[tuple[int, str]]:
    return [
        (score, row["video_title"])
        for score, row in scored
        if isinstance(row.get("video_title"), str)
    ]


def _raise_suggest(header: str, close: list[tuple[int, dict]]) -> None:
    suggestions = format_suggestions(close)
    lines = [header, "Did you mean:"]
    for score, title in suggestions:
        lines.append(f"  {score}  {title}")
    raise AddSuggestError("\n".join(lines), suggestions)


def run_add(
    repo_root: Path,
    *,
    episode_stem: str,
    rank: int,
    query: str,
    dry_run: bool = False,
    force: bool = False,
    min_score: int = AUTO_MATCH_MIN_SCORE,
    min_gap: int = AUTO_MATCH_MIN_GAP,
) -> AddResult:
    search = query.strip()
    if not search:
        msg = "search text is required"
        raise AddError(msg)

    if rank < 1 or rank > 20:
        msg = f"rank must be between 1 and 20 (got {rank})"
        raise AddError(msg)

    corpus = load_corpus_rows(repo_root)
    scored = find_best_matches(search, corpus)
    if not scored:
        msg = "no candidates found in stats corpus"
        raise AddError(msg)

    best_score = scored[0][0]
    if best_score < min_score:
        close = close_scored_matches(
            scored,
            min_score=min_score,
            min_gap=min_gap,
            require_min_score=False,
        )
        _raise_suggest(
            f"No match above threshold (best score {best_score}).",
            close,
        )

    close = close_scored_matches(
        scored,
        min_score=min_score,
        min_gap=min_gap,
        require_min_score=True,
    )
    if len(close) >= 2:
        score_list = ", ".join(str(score) for score, _ in close)
        _raise_suggest(f"Ambiguous match (scores too close: {score_list}).", close)

    if close:
        best_score, best_row = close[0]
    else:
        best_score, best_row = scored[0]

    try:
        target_path = find_episode_path_by_stem(repo_root, episode_stem)
    except AddPrevError as exc:
        raise AddError(str(exc)) from exc
    target_data, parse_issues = load_episode_file(target_path)
    if target_data is None:
        msg = "; ".join(parse_issues) or f"failed to parse {target_path.name}"
        raise AddError(msg)

    target_entry = get_entry_by_rank(target_data, rank)
    if target_entry is None:
        msg = f"{target_path.name}: no entry at rank {rank}"
        raise AddError(msg)

    overwritten = entry_is_set(target_entry)
    if overwritten and not force:
        msg = f"{target_path.name} rank {rank} is already set"
        raise AddError(msg)

    title = best_row.get("video_title", "")
    youtube_id = best_row.get("youtube_video_id", "")
    if not youtube_id_is_set(youtube_id):
        youtube_id = ""

    target_entry["video_title"] = title if isinstance(title, str) else ""
    target_entry["youtube_video_id"] = youtube_id

    rank_label = f"rank {rank}" + (" (overwritten)" if overwritten else "")
    summary = (
        f"{target_path.name} {rank_label} ← corpus match (score {best_score})\n"
        f"  {target_entry['video_title']}\n"
        f"  {target_entry['youtube_video_id']}"
    )

    if not dry_run:
        write_episode_file(target_path, target_data)

    return AddResult(summary=summary)
