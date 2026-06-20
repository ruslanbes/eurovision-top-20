import { describe, expect, it } from "vitest";
import { applyFilters } from "./applyFilters";
import {
  ESC_WINNER_NOT_WINNERS,
  ESC_WINNER_WINNERS,
} from "./escWinner";
import { filterDefsForGrain } from "./defs";
import type { FilterableRow, FilterState, VideoFilterableRow } from "./types";

const ROWS: FilterableRow[] = [
  {
    country: "Sweden",
    flag: "🇸🇪",
    year: 2024,
    esc_final_place: 1,
  },
  {
    country: "Norway",
    flag: "🇳🇴",
    year: 2024,
    esc_final_place: 2,
  },
  {
    country: "Sweden",
    flag: "🇸🇪",
    year: 2023,
    esc_final_place: "DNQ",
  },
  {
    country: "Germany",
    flag: "🇩🇪",
    year: 2024,
    esc_final_place: null,
  },
  { country: null, flag: null, year: 2022, esc_final_place: null },
];

const VIDEO_ROWS: VideoFilterableRow[] = [
  {
    country: "Sweden",
    flag: "🇸🇪",
    year: 2024,
    esc_final_place: 1,
    performance_category: "final_live",
  },
  {
    country: "Germany",
    flag: "🇩🇪",
    year: 2024,
    esc_final_place: 15,
    performance_category: "official_video",
  },
  {
    country: "Germany",
    flag: "🇩🇪",
    year: 2024,
    esc_final_place: 15,
    performance_category: "final_live",
  },
];

describe("applyFilters", () => {
  const sharedDefs = filterDefsForGrain("song");

  it("returns all rows when no filters are active", () => {
    expect(applyFilters(ROWS, {}, sharedDefs)).toEqual(ROWS);
  });

  it("ORs values within one filter", () => {
    const state: FilterState = { country: ["Sweden", "Norway"] };
    const result = applyFilters(ROWS, state, sharedDefs);
    expect(result.map((row) => row.country)).toEqual([
      "Sweden",
      "Norway",
      "Sweden",
    ]);
  });

  it("ANDs values across filters", () => {
    const state: FilterState = {
      country: ["Sweden", "Norway"],
      year: [2024],
    };
    const result = applyFilters(ROWS, state, sharedDefs);
    expect(result).toEqual([
      {
        country: "Sweden",
        flag: "🇸🇪",
        year: 2024,
        esc_final_place: 1,
      },
      {
        country: "Norway",
        flag: "🇳🇴",
        year: 2024,
        esc_final_place: 2,
      },
    ]);
  });

  it("excludes rows with null country when country filter is active", () => {
    const state: FilterState = { country: ["Germany"] };
    const result = applyFilters(ROWS, state, sharedDefs);
    expect(result).toEqual([
      {
        country: "Germany",
        flag: "🇩🇪",
        year: 2024,
        esc_final_place: null,
      },
    ]);
  });

  it("matches year even when country is null", () => {
    const yearState: FilterState = { year: [2022] };
    expect(applyFilters(ROWS, yearState, sharedDefs)).toEqual([
      { country: null, flag: null, year: 2022, esc_final_place: null },
    ]);
  });

  it("filters ESC winners only", () => {
    const state: FilterState = { esc_winner: [ESC_WINNER_WINNERS] };
    const result = applyFilters(ROWS, state, sharedDefs);
    expect(result.map((row) => row.esc_final_place)).toEqual([1]);
  });

  it("filters non-winners only", () => {
    const state: FilterState = { esc_winner: [ESC_WINNER_NOT_WINNERS] };
    const result = applyFilters(ROWS, state, sharedDefs);
    expect(result).toHaveLength(4);
    expect(result.every((row) => row.esc_final_place !== 1)).toBe(true);
  });

  it("filters performance category on video grain", () => {
    const videoDefs = filterDefsForGrain("video");
    const state: FilterState = { performance_category: ["official_video"] };
    const result = applyFilters(VIDEO_ROWS, state, videoDefs);
    expect(result).toHaveLength(1);
    expect(result[0]?.performance_category).toBe("official_video");
  });
});
