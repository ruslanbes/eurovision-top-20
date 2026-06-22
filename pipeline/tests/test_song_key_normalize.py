from __future__ import annotations

from evtop20.song_key_normalize import normalize_song_key_part, normalized_song_key


def test_normalize_song_key_part_casefolds() -> None:
    assert normalize_song_key_part("ABBA") == "abba"


def test_normalize_song_key_part_normalizes_and_and_punctuation() -> None:
    assert normalize_song_key_part("Artist A & Artist B") == normalize_song_key_part(
        "Artist A and Artist B"
    )
    assert normalize_song_key_part("Song-One!") == normalize_song_key_part("Song One")


def test_normalize_song_key_part_maps_curly_apostrophe() -> None:
    assert normalize_song_key_part("That's How You Write A Song") == normalize_song_key_part(
        "That\u2019s How You Write A Song"
    )
    assert normalize_song_key_part("Tout l'Univers") == normalize_song_key_part(
        "Tout l\u2019Univers"
    )


def test_normalized_song_key_pairs_artist_and_song() -> None:
    assert normalized_song_key("AySel & Arash", "Always") == normalized_song_key(
        "Aysel and Arash",
        "Always",
    )
