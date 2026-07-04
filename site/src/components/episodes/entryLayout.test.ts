import { describe, expect, it } from "vitest";

import { layoutEpisodeEntries } from "./entryLayout";
import { countryGroupSortKey } from "./schemes/countryScheme";
import { yearGroupSortKey } from "./schemes/yearScheme";
import type { BrowserEntry } from "./types";

const filled = (rank: number, year: number | null): BrowserEntry => ({
  artist: "Artist",
  country: "Country",
  esc_final_place: 1,
  fire: false,
  flag: "🏳️",
  performance_category: "official_video",
  rank,
  song: "Song",
  video_title: `Video ${rank}`,
  year,
  youtube_video_id: "abc",
});

const missing = (rank: number): BrowserEntry => ({
  missing: true,
  rank,
});

describe("layoutEpisodeEntries", () => {
  it("keeps rank order when grouping is off", () => {
    const entries = [filled(3, 2020), filled(1, 2016), filled(2, 2018)];
    const layout = layoutEpisodeEntries(entries, false, yearGroupSortKey);
    expect(layout.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });

  it("groups by year desc with missing last when grouping is on", () => {
    const entries = [
      filled(1, 2016),
      filled(2, 2020),
      missing(3),
      filled(4, 2018),
      filled(5, null),
    ];
    const layout = layoutEpisodeEntries(entries, true, yearGroupSortKey);
    expect(layout.map((entry) => entry.rank)).toEqual([2, 4, 1, 3, 5]);
  });

  it("groups by country ASC with unknown and missing last when grouping is on", () => {
    const entries = [
      { ...filled(1, 2016), country: "Germany", flag: "🇩🇪" },
      { ...filled(2, 2020), country: "Sweden", flag: "🇸🇪" },
      missing(3),
      { ...filled(4, 2018), country: "France", flag: "🇫🇷" },
      { ...filled(5, null), country: "", flag: "" },
    ];
    const layout = layoutEpisodeEntries(entries, true, countryGroupSortKey);
    expect(layout.map((entry) => entry.rank)).toEqual([4, 1, 2, 3, 5]);
  });
});
