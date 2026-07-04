import { describe, expect, it } from "vitest";

import { MISSING_DIMENSION } from "../constants";
import {
  ESC_OTHER_DIMENSION,
  ESC_WINNER_DIMENSION,
  escWinnerDimensionKey,
  escWinnerEntryColor,
  escWinnerGroupSortKey,
  escWinnerLegendItems,
  escWinnerScheme,
} from "./escWinnerScheme";

const filled = (
  esc_final_place: number | string | null,
  rank = 1,
) => ({
  artist: "Artist",
  country: "Country",
  esc_final_place,
  fire: false,
  flag: "🏳️",
  performance_category: "official_video",
  rank,
  song: "Song",
  video_title: "Video",
  year: 2016,
  youtube_video_id: "abc",
});

const ctx = {
  colorMap: {
    [ESC_WINNER_DIMENSION]: "#dc2626",
    [ESC_OTHER_DIMENSION]: "#e4e4e7",
  },
  missingColor: "#a1a1aa",
};

describe("escWinnerScheme", () => {
  it("maps dimension keys for winners, others, and missing entries", () => {
    expect(escWinnerDimensionKey(filled(1))).toBe(ESC_WINNER_DIMENSION);
    expect(escWinnerDimensionKey(filled(2))).toBe(ESC_OTHER_DIMENSION);
    expect(escWinnerDimensionKey(filled("DNQ"))).toBe(ESC_OTHER_DIMENSION);
    expect(escWinnerDimensionKey(filled(null))).toBe(ESC_OTHER_DIMENSION);
    expect(escWinnerDimensionKey({ missing: true, rank: 3 })).toBe(
      MISSING_DIMENSION,
    );
  });

  it("resolves entry colors from the map and missing bucket", () => {
    expect(escWinnerEntryColor(filled(1), ctx)).toBe("#dc2626");
    expect(escWinnerEntryColor(filled(2), ctx)).toBe("#e4e4e7");
    expect(escWinnerEntryColor({ missing: true, rank: 2 }, ctx)).toBe("#a1a1aa");
  });

  it("sorts winners before others before missing", () => {
    expect(escWinnerGroupSortKey(filled(1))).toBe(1);
    expect(escWinnerGroupSortKey(filled(2))).toBe(0);
    expect(escWinnerGroupSortKey({ missing: true, rank: 1 })).toBe(-1);
  });

  it("uses a static winner/other legend", () => {
    expect(escWinnerLegendItems([])).toEqual([
      ESC_WINNER_DIMENSION,
      ESC_OTHER_DIMENSION,
    ]);
  });

  it("labels legend items for accessibility", () => {
    expect(escWinnerScheme.legendItemAriaLabel(ESC_WINNER_DIMENSION)).toBe(
      "ESC winner",
    );
    expect(escWinnerScheme.legendItemAriaLabel(ESC_OTHER_DIMENSION)).toBe(
      "Not an ESC winner",
    );
  });
});
