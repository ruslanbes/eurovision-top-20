import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { uploadLinkFromSong, uploadLinkFromVideo } from "./formatters";
import type { SongStatsRow, VideoStatsRow } from "../stats/types";
import {
  computeYearClassics,
  type YearClassicsParams,
} from "./insights/yearClassics";

const DEFAULT_PARAMS: YearClassicsParams = {
  minAgeYears: 10,
  minTop20: 40,
  maxItems: 10,
};

describe("computeYearClassics", () => {
  it("keeps only old contest years with enough Top 20 appearances", () => {
    const classics = computeYearClassics(
      [
        { year: 2009, top20: 76, chart_points: 566 },
        { year: 2018, top20: 40, chart_points: 200 },
        { year: 2006, top20: 27, chart_points: 84 },
        { year: 2010, top20: 44, chart_points: 96 },
      ],
      "2026-06",
      DEFAULT_PARAMS,
      (row) => ({ label: `row-${row.year}`, href: null }),
    );

    expect(classics.map((item) => item.contest_year)).toEqual([2009, 2010]);
  });

  it("respects maxItems after sorting by top20", () => {
    const classics = computeYearClassics(
      [
        { year: 2009, top20: 50, chart_points: 100 },
        { year: 2008, top20: 40, chart_points: 90 },
        { year: 2007, top20: 30, chart_points: 80 },
        { year: 2006, top20: 25, chart_points: 70 },
      ],
      "2026-06",
      { ...DEFAULT_PARAMS, maxItems: 2 },
      (row) => ({ label: `row-${row.year}`, href: null }),
    );

    expect(classics).toHaveLength(2);
    expect(classics[0]?.contest_year).toBe(2009);
  });
});

describe("yearClassics integration", () => {
  it("uses YouTube video titles for upload links", () => {
    const repoRoot = join(process.cwd(), "..");
    const videoRows = JSON.parse(
      readFileSync(
        join(repoRoot, "data/packaged/per-video/alltime/eurovision-top-20-alltime-latest.json"),
        "utf-8",
      ),
    ).rows as VideoStatsRow[];
    const songRows = JSON.parse(
      readFileSync(
        join(repoRoot, "data/packaged/per-song/alltime/eurovision-top-20-song-stats-latest.json"),
        "utf-8",
      ),
    ).rows as SongStatsRow[];

    const videoClassics = computeYearClassics(
      videoRows,
      "2026-06",
      DEFAULT_PARAMS,
      (row) => uploadLinkFromVideo(row as VideoStatsRow),
    );
    const labels = videoClassics.map((item) => item.label).join(" ");
    expect(labels).toMatch(/Fairytale/i);
    expect(labels).toMatch(/Düm Tek Tek|Dum Tek Tek/i);
    expect(labels).not.toMatch(/Lordi/i);
    expect(videoClassics[0]?.label).toBe(
      videoClassics[0] &&
        videoRows.find((row) => row.video_title.includes("Fairytale"))?.video_title,
    );

    const songClassics = computeYearClassics(
      songRows,
      "2026-06",
      DEFAULT_PARAMS,
      (row) => uploadLinkFromSong(row as SongStatsRow, videoRows),
    );
    const fairytale = songClassics.find((item) => item.label.includes("Fairytale"));
    expect(fairytale?.watchUrl).toMatch(/youtube\.com/);
    expect(fairytale?.label).toContain("|");
  });
});
