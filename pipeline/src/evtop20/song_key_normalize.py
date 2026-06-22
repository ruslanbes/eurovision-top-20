from __future__ import annotations

import re
import unicodedata

from evtop20.esc_results.normalize import normalize_join_artist

_APOSTROPHE_TRANSLATION = str.maketrans(
    {
        "\u2018": "'",
        "\u2019": "'",
        "\u0060": "'",
        "\u00b4": "'",
    }
)


def normalize_song_key_part(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    stripped = "".join(
        character
        for character in normalized
        if not unicodedata.combining(character)
    )
    apostrophe_mapped = stripped.translate(_APOSTROPHE_TRANSLATION)
    folded = apostrophe_mapped.casefold()
    with_and = re.sub(r"\s*&\s*", " and ", folded)
    no_punct = re.sub(r"[^\w\s]", " ", with_and)
    spaced = re.sub(r"\s+", " ", no_punct).strip()
    unified = re.sub(r"\band\b", " and ", spaced)
    return re.sub(r"\s+", " ", unified).strip()


def normalize_song_key_artist(value: str) -> str:
    return normalize_join_artist(normalize_song_key_part(value))


def normalized_song_key(artist: str, song: str) -> tuple[str, str]:
    return (
        normalize_song_key_artist(artist),
        normalize_song_key_part(song),
    )
