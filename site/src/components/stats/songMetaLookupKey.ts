/** Match pipeline `normalize_song_key_part` for song-hits ↔ song-meta joins. */
export function normalizedSongKeyPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\u2018\u2019`\u00B4]/g, "'")
    .toLocaleLowerCase("en")
    .replace(/\s*&\s*/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\band\b/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

export function songMetaLookupKey(artist: string, song: string): string {
  return `${normalizedSongKeyPart(artist)}\0${normalizedSongKeyPart(song)}`;
}
