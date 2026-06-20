import { describe, expect, it } from "vitest";
import { applyFilters } from "./applyFilters";
import {
  ESC_NON_ENTRIES,
  ESC_NOT_WINNERS,
  ESC_WINNERS,
} from "./esc";
import { filterDefsForGrain } from "./defs";
import { FIRE_FILTER_ON } from "./fireFilter";
import type { FilterableRow, FilterState, VideoFilterableRow } from "./types";

const ROWS: FilterableRow[] = [
  {
    country: "Sweden",
    flag: "🇸🇪",
    year: 2024,
    esc_final_place: 1,
    fire: false,
  },
  {
    country: "Norway",
    flag: "🇳🇴",
    year: 2024,
    esc_final_place: 2,
    fire: false,
  },
  {
    country: "Sweden",
    flag: "🇸🇪",
    year: 2023,
    esc_final_place: "DNQ",
    fire: true,
  },
  {
    country: "Germany",
    flag: "🇩🇪",
    year: 2024,
    esc_final_place: null,
    fire: false,
  },
  { country: null, flag: null, year: 2022, esc_final_place: null, fire: false },
];

const VIDEO_ROWS: VideoFilterableRow[] = [
  {
    country: "Sweden",
    flag: "🇸🇪",
    year: 2024,
    esc_final_place: 1,
    fire: false,
    performance_category: "final_live",
  },
  {
    country: "Germany",
    flag: "🇩🇪",
    year: 2024,
    esc_final_place: 15,
    fire: true,
    performance_category: "official_video",
  },
  {
    country: "Germany",
    flag: "🇩🇪",
    year: 2024,
    esc_final_place: 15,
    fire: false,
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
        fire: false,
      },
      {
        country: "Norway",
        flag: "🇳🇴",
        year: 2024,
        esc_final_place: 2,
        fire: false,
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
        fire: false,
      },
    ]);
  });

  it("matches year even when country is null", () => {
    const yearState: FilterState = { year: [2022] };
    expect(applyFilters(ROWS, yearState, sharedDefs)).toEqual([
      { country: null, flag: null, year: 2022, esc_final_place: null, fire: false },
    ]);
  });

  it("filters ESC winners only", () => {
    const state: FilterState = { esc: [ESC_WINNERS] };
    const result = applyFilters(ROWS, state, sharedDefs);
    expect(result.map((row) => row.esc_final_place)).toEqual([1]);
  });

  it("filters non-winners only", () => {
    const state: FilterState = { esc: [ESC_NOT_WINNERS] };
    const result = applyFilters(ROWS, state, sharedDefs);
    expect(result).toHaveLength(4);
    expect(result.every((row) => row.esc_final_place !== 1)).toBe(true);
  });

  it("filters non-entries only", () => {
    const rows = [
      ...ROWS,
      {
        country: "World",
        flag: "🌍",
        year: 2024,
        esc_final_place: "NON_ENTRY",
        fire: false,
      },
    ];
    const state: FilterState = { esc: [ESC_NON_ENTRIES] };
    const result = applyFilters(rows, state, sharedDefs);
    expect(result).toHaveLength(1);
    expect(result[0]?.esc_final_place).toBe("NON_ENTRY");
  });

  it("filters performance category on video grain", () => {
    const videoDefs = filterDefsForGrain("video");
    const state: FilterState = { performance_category: ["official_video"] };
    const result = applyFilters(VIDEO_ROWS, state, videoDefs);
    expect(result).toHaveLength(1);
    expect(result[0]?.performance_category).toBe("official_video");
  });

  it("filters fire songs when toggle is on", () => {
    const state: FilterState = { fire: [FIRE_FILTER_ON] };
    const result = applyFilters(ROWS, state, sharedDefs);
    expect(result).toHaveLength(1);
    expect(result[0]?.fire).toBe(true);
  });
});
