import { describe, expect, it } from "vitest";

import { MISSING_ENTRY_LABEL } from "./constants";
import { entryTooltipLabel } from "./entryTooltip";

describe("entryTooltipLabel", () => {
  it("shows video title for filled entries", () => {
    expect(
      entryTooltipLabel({
        artist: "A",
        country: "X",
        esc_final_place: 1,
        fire: false,
        flag: "🏳️",
        performance_category: "official_video",
        rank: 1,
        song: "S",
        video_title: "Example video title",
        year: 2016,
        youtube_video_id: "id",
      }),
    ).toBe("Example video title");
  });

  it("shows Missing for gap entries", () => {
    expect(entryTooltipLabel({ missing: true, rank: 5 })).toBe(
      MISSING_ENTRY_LABEL,
    );
  });
});
