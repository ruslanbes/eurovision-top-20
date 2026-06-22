import { describe, expect, it } from "vitest";

import { songMetaLookupKey } from "./songMetaLookupKey";
import { querySongWindow } from "./queryWindow";

describe("songMetaLookupKey", () => {
  it("matches ampersand and and forms", () => {
    expect(songMetaLookupKey("AySel & Arash", "Always")).toBe(
      songMetaLookupKey("Aysel and Arash", "Always"),
    );
  });

  it("matches curly and straight apostrophes", () => {
    expect(songMetaLookupKey("Alexander Rybak", "That's How You Write A Song")).toBe(
      songMetaLookupKey("Alexander Rybak", "That\u2019s How You Write A Song"),
    );
  });
});

describe("querySongWindow", () => {
  it("joins song meta when hit and meta display strings differ", () => {
    const rows = querySongWindow(
      {
        periods: ["2020-01"],
        hits: [
          {
            artist: "AySel & Arash",
            song: "Always",
            entries: [{ period: "2020-01", ranks: [5] }],
          },
        ],
      },
      {
        rows: [
          {
            artist: "Aysel and Arash",
            song: "Always",
            country: "Azerbaijan",
            year: 2009,
            flag: "🇦🇿",
            esc_final_place: 3,
            fire: false,
            youtube_video_id: "abc123",
            youtube_watch_url: "https://www.youtube.com/watch?v=abc123",
          },
        ],
      },
      "2020-01",
      "2020-01",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.youtube_watch_url).toBe("https://www.youtube.com/watch?v=abc123");
  });
});
