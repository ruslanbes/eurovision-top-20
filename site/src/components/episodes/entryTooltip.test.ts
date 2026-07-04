import { describe, expect, it } from "vitest";

import { MISSING_ENTRY_LABEL } from "./constants";
import { entryTooltipLabel } from "./entryTooltip";

describe("entryTooltipLabel", () => {
  it("shows video title for filled entries", () => {
    expect(
      entryTooltipLabel("2016-11", {
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
    ).toContain("Example video title");
  });

  it("shows Missing for gap entries", () => {
    expect(entryTooltipLabel("2016-11", { missing: true, rank: 5 })).toContain(
      MISSING_ENTRY_LABEL,
    );
  });
});
