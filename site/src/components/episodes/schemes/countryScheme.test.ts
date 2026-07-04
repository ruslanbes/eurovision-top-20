import { describe, expect, it } from "vitest";

import { ENTRY_CIRCLE, MISSING_DIMENSION, UNKNOWN_COUNTRY_DIMENSION } from "../constants";
import type { BrowserEntry } from "../types";
import {
  countryDimensionKey,
  countryEntryColor,
  countryEntryGlyph,
  countryGroupSortKey,
  countryLegendItemGlyph,
  countryLegendItems,
  countryScheme,
} from "./countryScheme";

const filled = (
  country: string,
  flag: string,
  rank = 1,
): BrowserEntry => ({
  artist: "Artist",
  country,
  esc_final_place: 1,
  fire: false,
  flag,
  performance_category: "official_video",
  rank,
  song: "Song",
  video_title: "Video",
  year: 2016,
  youtube_video_id: "abc",
});

const ctx = {
  colorMap: {
    Sweden: "rgb(var(--chart-other))",
    [UNKNOWN_COUNTRY_DIMENSION]: "rgb(var(--chart-other))",
  },
  missingColor: "rgb(var(--chart-missing))",
  glyphMap: {
    Sweden: "🇸🇪",
    France: "🇫🇷",
  },
};

describe("countryScheme", () => {
  it("maps dimension keys for known, unknown, and missing entries", () => {
    expect(countryDimensionKey(filled("Sweden", "🇸🇪"))).toBe("Sweden");
    expect(countryDimensionKey(filled("", ""))).toBe(UNKNOWN_COUNTRY_DIMENSION);
    expect(countryDimensionKey(filled("Sweden", ""))).toBe(UNKNOWN_COUNTRY_DIMENSION);
    expect(countryDimensionKey({ missing: true, rank: 3 })).toBe(MISSING_DIMENSION);
  });

  it("uses flag and circle glyphs", () => {
    expect(countryEntryGlyph(filled("Sweden", "🇸🇪"))).toBe("🇸🇪");
    expect(countryEntryGlyph(filled("", ""))).toBe(ENTRY_CIRCLE);
    expect(countryLegendItemGlyph("Sweden", ctx)).toBe("🇸🇪");
    expect(countryLegendItemGlyph(UNKNOWN_COUNTRY_DIMENSION, ctx)).toBe(ENTRY_CIRCLE);
  });

  it("resolves entry colors from the map and missing bucket", () => {
    expect(countryEntryColor(filled("Sweden", "🇸🇪"), ctx)).toBe(
      "rgb(var(--chart-other))",
    );
    expect(countryEntryColor(filled("", ""), ctx)).toBe(
      "rgb(var(--chart-other))",
    );
    expect(countryEntryColor({ missing: true, rank: 2 }, ctx)).toBe(
      "rgb(var(--chart-missing))",
    );
  });

  it("sorts countries ASC with unknown and missing last", () => {
    expect(countryGroupSortKey(filled("Sweden", "🇸🇪"))).toBe("Sweden");
    expect(countryGroupSortKey(filled("", ""))).toBe("\u{10FFFF}");
    expect(countryGroupSortKey({ missing: true, rank: 1 })).toBe("\u{10FFFF}");
  });

  it("builds a dynamic legend with unknown when needed", () => {
    const episodes = [
      {
        entries: [
          filled("Sweden", "🇸🇪", 1),
          filled("France", "🇫🇷", 2),
          filled("", "", 3),
        ],
        missing: 0,
        period: "2016-05",
      },
    ];
    expect(countryLegendItems(episodes)).toEqual(["France", "Sweden", "Unknown"]);
  });

  it("labels legend items for accessibility", () => {
    expect(countryScheme.legendItemAriaLabel("Sweden")).toBe("Country: Sweden");
    expect(countryScheme.legendItemAriaLabel(UNKNOWN_COUNTRY_DIMENSION)).toBe(
      "Unknown country",
    );
  });
});
