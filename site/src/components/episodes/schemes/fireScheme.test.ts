import { describe, expect, it } from "vitest";

import { ENTRY_CIRCLE, FIRE_GLYPH, MISSING_DIMENSION } from "../constants";
import {
  FIRE_DIMENSION,
  FIRE_OTHER_DIMENSION,
  fireDimensionKey,
  fireEntryColor,
  fireEntryGlyph,
  fireGroupSortKey,
  fireLegendItemGlyph,
  fireLegendItems,
  fireScheme,
} from "./fireScheme";

const filled = (fire: boolean, rank = 1) => ({
  artist: "Artist",
  country: "Country",
  esc_final_place: 1,
  fire,
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
    [FIRE_DIMENSION]: "rgb(var(--chart-fire-other))",
    [FIRE_OTHER_DIMENSION]: "rgb(var(--chart-fire-other))",
  },
  missingColor: "rgb(var(--chart-missing))",
};

describe("fireScheme", () => {
  it("maps dimension keys for fire, other, and missing entries", () => {
    expect(fireDimensionKey(filled(true))).toBe(FIRE_DIMENSION);
    expect(fireDimensionKey(filled(false))).toBe(FIRE_OTHER_DIMENSION);
    expect(fireDimensionKey({ missing: true, rank: 3 })).toBe(MISSING_DIMENSION);
  });

  it("uses fire and circle glyphs", () => {
    expect(fireEntryGlyph(filled(true))).toBe(FIRE_GLYPH);
    expect(fireEntryGlyph(filled(false))).toBe(ENTRY_CIRCLE);
    expect(fireLegendItemGlyph(FIRE_DIMENSION, ctx)).toBe(FIRE_GLYPH);
    expect(fireLegendItemGlyph(FIRE_OTHER_DIMENSION, ctx)).toBe(ENTRY_CIRCLE);
  });

  it("resolves entry colors from the map and missing bucket", () => {
    expect(fireEntryColor(filled(true), ctx)).toBe("rgb(var(--chart-fire-other))");
    expect(fireEntryColor(filled(false), ctx)).toBe("rgb(var(--chart-fire-other))");
    expect(fireEntryColor({ missing: true, rank: 2 }, ctx)).toBe(
      "rgb(var(--chart-missing))",
    );
  });

  it("sorts fire before other before missing", () => {
    expect(fireGroupSortKey(filled(true))).toBe(1);
    expect(fireGroupSortKey(filled(false))).toBe(0);
    expect(fireGroupSortKey({ missing: true, rank: 1 })).toBe(-1);
  });

  it("uses a static fire/other legend", () => {
    expect(fireLegendItems([])).toEqual([FIRE_DIMENSION, FIRE_OTHER_DIMENSION]);
  });

  it("labels legend items for accessibility", () => {
    expect(fireScheme.legendItemAriaLabel(FIRE_DIMENSION)).toBe("Fire-themed video");
    expect(fireScheme.legendItemAriaLabel(FIRE_OTHER_DIMENSION)).toBe(
      "Not fire-themed",
    );
  });
});
