import { describe, expect, it } from "vitest";

import { MISSING_DIMENSION } from "./constants";
import {
  yearDimensionKey,
  yearEntryColor,
  yearGroupSortKey,
  yearLegendItems,
  yearScheme,
} from "./schemes/yearScheme";
import type { BrowserEpisode } from "./types";

const ctx = {
  colorMap: { "2016": "#111111", "2020": "#222222" },
  missingColor: "#999999",
};

describe("yearScheme", () => {
  it("maps dimension keys for filled and missing entries", () => {
    expect(
      yearDimensionKey({
        artist: "A",
        country: "X",
        esc_final_place: 1,
        fire: false,
        flag: "🏳️",
        performance_category: "official_video",
        rank: 1,
        song: "S",
        video_title: "T",
        year: 2016,
        youtube_video_id: "id",
      }),
    ).toBe("2016");
    expect(yearDimensionKey({ missing: true, rank: 2 })).toBe(MISSING_DIMENSION);
    expect(
      yearDimensionKey({
        artist: "A",
        country: "X",
        esc_final_place: 1,
        fire: false,
        flag: "🏳️",
        performance_category: "official_video",
        rank: 3,
        song: "S",
        video_title: "T",
        year: null,
        youtube_video_id: "id",
      }),
    ).toBe(MISSING_DIMENSION);
  });

  it("resolves entry colors from the map and missing bucket", () => {
    const filled = {
      artist: "A",
      country: "X",
      esc_final_place: 1,
      fire: false,
      flag: "🏳️",
      performance_category: "official_video",
      rank: 1,
      song: "S",
      video_title: "T",
      year: 2016,
      youtube_video_id: "id",
    };
    expect(yearEntryColor(filled, ctx)).toBe("#111111");
    expect(yearEntryColor({ missing: true, rank: 2 }, ctx)).toBe("#999999");
    expect(yearEntryColor({ ...filled, year: null }, ctx)).toBe("#999999");
  });

  it("sorts missing and null-year entries last", () => {
    expect(yearGroupSortKey({ missing: true, rank: 1 })).toBe(-1);
    expect(
      yearGroupSortKey({
        artist: "A",
        country: "X",
        esc_final_place: 1,
        fire: false,
        flag: "🏳️",
        performance_category: "official_video",
        rank: 2,
        song: "S",
        video_title: "T",
        year: null,
        youtube_video_id: "id",
      }),
    ).toBe(-1);
    expect(
      yearGroupSortKey({
        artist: "A",
        country: "X",
        esc_final_place: 1,
        fire: false,
        flag: "🏳️",
        performance_category: "official_video",
        rank: 3,
        song: "S",
        video_title: "T",
        year: 2020,
        youtube_video_id: "id",
      }),
    ).toBe(2020);
  });

  it("labels legend items for accessibility", () => {
    expect(yearScheme.legendItemAriaLabel("2016")).toBe("Contest year 2016");
  });

  it("builds legend years in descending order", () => {
    const episodes: BrowserEpisode[] = [
      {
        period: "2020-01",
        missing: 0,
        entries: [
          {
            artist: "A",
            country: "X",
            esc_final_place: 1,
            fire: false,
            flag: "🏳️",
            performance_category: "official_video",
            rank: 1,
            song: "S",
            video_title: "T",
            year: 2016,
            youtube_video_id: "id",
          },
          {
            artist: "B",
            country: "Y",
            esc_final_place: 2,
            fire: false,
            flag: "🏳️",
            performance_category: "official_video",
            rank: 2,
            song: "S2",
            video_title: "T2",
            year: 2020,
            youtube_video_id: "id2",
          },
        ],
      },
    ];
    expect(yearLegendItems(episodes)).toEqual(["2020", "2016"]);
  });
});
