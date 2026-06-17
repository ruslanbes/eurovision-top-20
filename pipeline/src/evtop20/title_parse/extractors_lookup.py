from __future__ import annotations

from pathlib import Path

from evtop20.paths import find_repo_root, manual_video_metadata_path
from evtop20.title_parse.manual_lookup import load_manual_video_metadata
from evtop20.title_parse.models import ParsedVideoTitle


class LookupTableExtractor:
    name = "lookup_table_v1"

    def __init__(self) -> None:
        self._path: Path | None = None
        self._entries: dict[str, ParsedVideoTitle] | None = None

    def configure(self, path: Path | None) -> None:
        self._path = path
        self._entries = None

    def _resolve_path(self) -> Path:
        if self._path is not None:
            return self._path
        return manual_video_metadata_path(find_repo_root())

    def _entries_map(self) -> dict[str, ParsedVideoTitle]:
        if self._entries is None:
            self._entries = load_manual_video_metadata(self._resolve_path())
        return self._entries

    def try_parse(
        self, _title: str, youtube_video_id: str
    ) -> ParsedVideoTitle | None:
        if not youtube_video_id:
            return None
        return self._entries_map().get(youtube_video_id)


LOOKUP_TABLE_EXTRACTOR = LookupTableExtractor()
