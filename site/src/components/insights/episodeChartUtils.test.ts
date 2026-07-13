import { describe, expect, it } from "vitest";
import {
  buildUpWindowBounds,
  isBuildUpChartPeriod,
} from "./insights/episodeChartUtils";

describe("isBuildUpChartPeriod", () => {
  it("includes May prior year through April contest year", () => {
    expect(isBuildUpChartPeriod("2023-05", 2024)).toBe(true);
    expect(isBuildUpChartPeriod("2023-12", 2024)).toBe(true);
    expect(isBuildUpChartPeriod("2024-04", 2024)).toBe(true);
  });

  it("excludes before May prior year and from May contest year onward", () => {
    expect(isBuildUpChartPeriod("2023-04", 2024)).toBe(false);
    expect(isBuildUpChartPeriod("2024-05", 2024)).toBe(false);
    expect(isBuildUpChartPeriod("2025-01", 2024)).toBe(false);
  });
});

describe("buildUpWindowBounds", () => {
  it("returns May Y-1 through April Y", () => {
    expect(buildUpWindowBounds(2024)).toEqual({
      begin: "2023-05",
      end: "2024-04",
    });
  });
});
