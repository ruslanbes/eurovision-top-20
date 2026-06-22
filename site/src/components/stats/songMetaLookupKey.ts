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

const ARTIST_SEPARATOR =
  /\s+(?:&|and|og|y|x|feat\.?|ft\.?|featuring)\s+/i;

/** Match pipeline `normalize_song_key_artist` — duet order and separator variants. */
export function normalizedSongKeyArtist(value: string): string {
  const base = normalizedSongKeyPart(value);
  const parts = base.split(ARTIST_SEPARATOR).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return base;
  }
  parts.sort();
  return parts.join(" & ");
}

export function songMetaLookupKey(artist: string, song: string): string {
  return `${normalizedSongKeyArtist(artist)}\0${normalizedSongKeyPart(song)}`;
}
