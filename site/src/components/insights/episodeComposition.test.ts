import { describe, expect, it } from "vitest";
import {
  MISSING_COUNTRY,
  MISSING_SLOT_LABEL,
  UNKNOWN_COUNTRY,
  buildBarSegments,
  calendarYearFromPeriod,
  isCalendarYearBoundaryGap,
  slotTooltipLabel,
  yearLabelBeforeEpisode,
  yearEpisodesAsComposition,
  yearsInComposition,
  type CompositionEpisode,
} from "./episodeComposition";

const EPISODE: CompositionEpisode = {
  period: "2023-07",
  filled: 2,
  missing: 18,
  segments: [
    { country: "Finland", count: 1, titles: ["Finland title"] },
    { country: "Sweden", count: 1, titles: ["Sweden title"] },
  ],
};

describe("buildBarSegments", () => {
  it("sizes segments by slot capacity and appends gray missing last", () => {
    const segments = buildBarSegments(EPISODE, 20, { Sweden: "#111111" }, "#cccccc");

    expect(segments).toHaveLength(3);
    expect(segments[0]?.country).toBe("Finland");
    expect(segments[0]?.titles).toEqual(["Finland title"]);
    expect(segments[0]?.widthPercent).toBe(5);
    expect(segments[2]?.country).toBe(MISSING_COUNTRY);
    expect(segments[2]?.widthPercent).toBe(90);
    expect(segments[2]?.isMissing).toBe(true);
    expect(segments[2]?.color).toBe("#cccccc");
  });

  it("uses missing color for unknown bucket", () => {
    const segments = buildBarSegments(
      {
        ...EPISODE,
        filled: 1,
        missing: 19,
        segments: [
          { country: UNKNOWN_COUNTRY, count: 1, titles: ["Unparsed title"] },
        ],
      },
      20,
      {},
      "#cccccc",
    );

    expect(segments[0]?.color).toBe("#cccccc");
    expect(segments[0]?.titles).toEqual(["Unparsed title"]);
  });
});

describe("slotTooltipLabel", () => {
  it("shows period header and title for parsed year slots", () => {
    const segment = buildBarSegments(
      {
        period: "2025-03",
        filled: 1,
        missing: 19,
        segments: [{ country: "2025", count: 1, titles: ["Song A"] }],
      },
      20,
      { "2025": "#111111" },
      "#cccccc",
    )[0]!;

    expect(slotTooltipLabel("2025-03", segment, 0)).toBe("Mar 2025:\nSong A");
  });

  it("shows Missing for unfilled slots", () => {
    const segment = buildBarSegments(EPISODE, 20, {}, "#cccccc").find(
      (item) => item.isMissing,
    )!;

    expect(slotTooltipLabel("2023-07", segment, 0)).toBe(
      `Jul 2023:\n${MISSING_SLOT_LABEL}`,
    );
  });

  it("shows Missing for unknown year slots", () => {
    const segment = buildBarSegments(
      {
        period: "2023-07",
        filled: 1,
        missing: 19,
        segments: [
          { country: UNKNOWN_COUNTRY, count: 1, titles: ["Unparsed title"] },
        ],
      },
      20,
      {},
      "#cccccc",
    )[0]!;

    expect(slotTooltipLabel("2023-07", segment, 0)).toBe(
      `Jul 2023:\n${MISSING_SLOT_LABEL}`,
    );
  });
});

describe("isCalendarYearBoundaryGap", () => {
  it("is true for Dec to Jan of the next calendar year", () => {
    expect(isCalendarYearBoundaryGap("2019-12", "2020-01")).toBe(true);
  });

  it("is false for consecutive months in the same year", () => {
    expect(isCalendarYearBoundaryGap("2019-11", "2019-12")).toBe(false);
  });

  it("is false for Jan to Feb", () => {
    expect(isCalendarYearBoundaryGap("2020-01", "2020-02")).toBe(false);
  });
});

describe("calendarYearFromPeriod", () => {
  it("returns the year portion of a period", () => {
    expect(calendarYearFromPeriod("2019-12")).toBe("2019");
  });
});

describe("yearLabelBeforeEpisode", () => {
  it("labels the first episode with its calendar year", () => {
    expect(yearLabelBeforeEpisode(0, ["2016-09", "2016-10"])).toBe("2016");
  });

  it("labels the first episode after a Dec-Jan boundary", () => {
    expect(
      yearLabelBeforeEpisode(2, ["2019-11", "2019-12", "2020-01", "2020-02"]),
    ).toBe("2020");
  });

  it("labels the first episode when December is missing", () => {
    expect(
      yearLabelBeforeEpisode(2, ["2021-10", "2021-11", "2022-01", "2022-02"]),
    ).toBe("2022");
  });

  it("returns null for episodes within the same calendar year", () => {
    expect(yearLabelBeforeEpisode(1, ["2019-11", "2019-12"])).toBeNull();
  });
});

describe("yearsInComposition", () => {
  it("returns sorted unique years excluding unknown", () => {
    expect(
      yearsInComposition([
        {
          period: "2023-07",
          filled: 3,
          missing: 17,
          segments: [
            { year: "2023", count: 2, titles: ["A", "B"] },
            { year: "2016", count: 1, titles: ["C"] },
          ],
        },
      ]),
    ).toEqual(["2023", "2016"]);
  });
});

describe("yearEpisodesAsComposition", () => {
  it("maps year segments to chart shape", () => {
    expect(
      yearEpisodesAsComposition([
        {
          period: "2023-07",
          filled: 1,
          missing: 19,
          segments: [{ year: "2023", count: 1, titles: ["Song A"] }],
        },
      ]),
    ).toEqual([
      {
        period: "2023-07",
        filled: 1,
        missing: 19,
        segments: [{ country: "2023", count: 1, titles: ["Song A"] }],
      },
    ]);
  });
});
