import { describe, expect, it } from "vitest";
import { applyFilters } from "./applyFilters";
import {
  ESC_DNQ,
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
    region: "europe" as const,
  },
  {
    country: "Norway",
    flag: "🇳🇴",
    year: 2024,
    esc_final_place: 2,
    fire: false,
    region: "europe" as const,
  },
  {
    country: "Sweden",
    flag: "🇸🇪",
    year: 2023,
    esc_final_place: "DNQ",
    fire: true,
    region: "europe" as const,
  },
  {
    country: "Germany",
    flag: "🇩🇪",
    year: 2024,
    esc_final_place: null,
    fire: false,
    region: "europe" as const,
  },
  { country: null, flag: null, year: 2022, esc_final_place: null, fire: false, region: "europe" },
];

const VIDEO_ROWS: VideoFilterableRow[] = [
  {
    country: "Sweden",
    flag: "🇸🇪",
    year: 2024,
    esc_final_place: 1,
    fire: false,
    region: "europe" as const,
    performance_category: "final_live",
  },
  {
    country: "Germany",
    flag: "🇩🇪",
    year: 2024,
    esc_final_place: 15,
    fire: true,
    region: "europe" as const,
    performance_category: "official_video",
  },
  {
    country: "Germany",
    flag: "🇩🇪",
    year: 2024,
    esc_final_place: 15,
    fire: false,
    region: "europe" as const,
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
        region: "europe" as const,
      },
      {
        country: "Norway",
        flag: "🇳🇴",
        year: 2024,
        esc_final_place: 2,
        fire: false,
        region: "europe" as const,
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
        region: "europe" as const,
      },
    ]);
  });

  it("matches year even when country is null", () => {
    const yearState: FilterState = { year: [2022] };
    expect(applyFilters(ROWS, yearState, sharedDefs)).toEqual([
      { country: null, flag: null, year: 2022, esc_final_place: null, fire: false, region: "europe" },
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
        region: "europe" as const,
      },
    ];
    const state: FilterState = { esc: [ESC_NON_ENTRIES] };
    const result = applyFilters(rows, state, sharedDefs);
    expect(result).toHaveLength(1);
    expect(result[0]?.esc_final_place).toBe("NON_ENTRY");
  });

  it("filters DNQ only", () => {
    const state: FilterState = { esc: [ESC_DNQ] };
    const result = applyFilters(ROWS, state, sharedDefs);
    expect(result).toHaveLength(1);
    expect(result[0]?.esc_final_place).toBe("DNQ");
    expect(result[0]?.country).toBe("Sweden");
  });

  it("filters performance category on video grain", () => {
    const videoDefs = filterDefsForGrain("video");
    const state: FilterState = { performance_category: ["official_video"] };
    const result = applyFilters(VIDEO_ROWS, state, videoDefs);
    expect(result).toHaveLength(1);
    expect(result[0]?.performance_category).toBe("official_video");
  });

  it("filters by region", () => {
    const rows: FilterableRow[] = [
      ...ROWS,
      {
        country: "Philippines",
        flag: "🇵🇭",
        year: 2026,
        esc_final_place: "PENDING",
        fire: false,
        region: "asia",
      },
    ];
    expect(
      applyFilters(rows, { region: ["asia"] }, sharedDefs).map((row) => row.country),
    ).toEqual(["Philippines"]);
    expect(applyFilters(rows, { region: ["europe"] }, sharedDefs)).toHaveLength(
      ROWS.length,
    );
  });

  it("orders the region filter before the place filter", () => {
    const ids = filterDefsForGrain("video").map((def) => def.id);
    expect(ids.indexOf("region")).toBe(ids.indexOf("esc") - 1);
    expect(filterDefsForGrain("song").find((def) => def.id === "esc")?.label).toBe(
      "Contest Place",
    );
  });

  it("filters fire songs when toggle is on", () => {
    const state: FilterState = { fire: [FIRE_FILTER_ON] };
    const result = applyFilters(ROWS, state, sharedDefs);
    expect(result).toHaveLength(1);
    expect(result[0]?.fire).toBe(true);
  });

  it("filters song rows by diacritic-insensitive search", () => {
    const songRows = [
      {
        artist: "Hadise",
        song: "Düm Tek Tek",
        country: "Turkey",
        flag: "🇹🇷",
        year: 2009,
        esc_final_place: 4,
        fire: false,
        region: "europe" as const,
      },
      {
        artist: "Loreen",
        song: "Tattoo",
        country: "Sweden",
        flag: "🇸🇪",
        year: 2023,
        esc_final_place: 1,
        fire: false,
        region: "europe" as const,
      },
    ];
    const state: FilterState = { search: ["dum tek tek"] };
    const result = applyFilters(songRows, state, sharedDefs);
    expect(result).toHaveLength(1);
    expect(result[0]?.artist).toBe("Hadise");
  });

  it("ANDs search with other filters", () => {
    const songRows = [
      {
        artist: "Hadise",
        song: "Düm Tek Tek",
        country: "Turkey",
        flag: "🇹🇷",
        year: 2009,
        esc_final_place: 4,
        fire: false,
        region: "europe" as const,
      },
      {
        artist: "Loreen",
        song: "Tattoo",
        country: "Sweden",
        flag: "🇸🇪",
        year: 2023,
        esc_final_place: 1,
        fire: false,
        region: "europe" as const,
      },
    ];
    const state: FilterState = { search: ["tattoo"], country: ["Sweden"] };
    const result = applyFilters(songRows, state, sharedDefs);
    expect(result).toHaveLength(1);
    expect(result[0]?.artist).toBe("Loreen");
  });

  it("filters video rows by video_title search", () => {
    const videoRows = [
      {
        video_title: "Eleni Foureira - Fuego (LIVE) | Cyprus 🇨🇾 | Grand Final | Eurovision 2018",
        country: "Cyprus",
        flag: "🇨🇾",
        year: 2018,
        esc_final_place: 2,
        fire: true,
        region: "europe" as const,
        performance_category: "final_live",
      },
      {
        video_title: "Loreen - Tattoo (LIVE) | Sweden 🇸🇪 | Grand Final | Eurovision 2023",
        country: "Sweden",
        flag: "🇸🇪",
        year: 2023,
        esc_final_place: 1,
        fire: false,
        region: "europe" as const,
        performance_category: "final_live",
      },
    ];
    const videoDefs = filterDefsForGrain("video");
    const state: FilterState = { search: ["fuego"] };
    const result = applyFilters(videoRows, state, videoDefs);
    expect(result).toHaveLength(1);
    expect(result[0]?.country).toBe("Cyprus");
  });
});
