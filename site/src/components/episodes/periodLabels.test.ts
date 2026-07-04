import { describe, expect, it } from "vitest";

import {
  calendarYearFromPeriod,
  monthAbbrevFromPeriod,
  yearLabelBeforeEpisode,
} from "./periodLabels";

describe("calendarYearFromPeriod", () => {
  it("returns the calendar year prefix", () => {
    expect(calendarYearFromPeriod("2019-12")).toBe("2019");
  });
});

describe("monthAbbrevFromPeriod", () => {
  it("returns a 3-letter English month abbreviation", () => {
    expect(monthAbbrevFromPeriod("2016-09")).toBe("Sep");
    expect(monthAbbrevFromPeriod("2020-01")).toBe("Jan");
    expect(monthAbbrevFromPeriod("2019-05")).toBe("May");
  });
});

describe("yearLabelBeforeEpisode", () => {
  it("labels the first episode and calendar-year boundaries", () => {
    const periods = ["2019-11", "2019-12", "2020-01", "2020-02"];
    expect(yearLabelBeforeEpisode(0, periods)).toBe("2019");
    expect(yearLabelBeforeEpisode(1, periods)).toBeNull();
    expect(yearLabelBeforeEpisode(2, periods)).toBe("2020");
    expect(yearLabelBeforeEpisode(3, periods)).toBeNull();
  });
});
