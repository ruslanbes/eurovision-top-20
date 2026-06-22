import { describe, expect, it } from "vitest";
import {
  ESC_NON_ENTRIES,
  ESC_NOT_WINNERS,
  ESC_WINNERS,
} from "./filters/esc";
import {
  defaultStatsUiState,
  normalizeWindow,
  parseStatsUiState,
  serializeStatsUiState,
} from "./statsUiState";

const PERIODS = [
  "2020-01",
  "2020-06",
  "2021-01",
  "2022-01",
  "2023-01",
  "2024-12",
] as const;

describe("defaultStatsUiState", () => {
  it("uses full corpus when periods exist", () => {
    expect(defaultStatsUiState(PERIODS)).toEqual({
      window: { begin: "2020-01", end: "2024-12" },
      filters: {},
      sort: null,
    });
  });

  it("returns empty window when periods missing", () => {
    expect(defaultStatsUiState([])).toEqual({
      window: { begin: "", end: "" },
      filters: {},
      sort: null,
    });
  });
});

describe("normalizeWindow", () => {
  it("swaps begin and end when reversed", () => {
    expect(normalizeWindow("2024-12", "2020-01", PERIODS)).toEqual({
      begin: "2020-01",
      end: "2024-12",
    });
  });

  it("clamps unknown periods to nearest valid label", () => {
    expect(normalizeWindow("2020-03", "2024-11", PERIODS)).toEqual({
      begin: "2020-01",
      end: "2024-12",
    });
  });
});

describe("parseStatsUiState", () => {
  it("returns defaults for empty search", () => {
    expect(parseStatsUiState("", PERIODS)).toEqual(defaultStatsUiState(PERIODS));
  });

  it("parses window and shared filters", () => {
    expect(
      parseStatsUiState(
        "?begin=2021-01&end=2023-01&country=Sweden,Norway&year=2024,2023&esc=winners",
        PERIODS,
      ),
    ).toEqual({
      window: { begin: "2021-01", end: "2023-01" },
      filters: {
        country: ["Sweden", "Norway"],
        year: [2024, 2023],
        esc: [ESC_WINNERS],
      },
      sort: null,
    });
  });

  it("maps esc not_winners to internal value", () => {
    expect(parseStatsUiState("?esc=not_winners", PERIODS).filters).toEqual({
      esc: [ESC_NOT_WINNERS],
    });
  });

  it("accepts legacy esc not-winners alias", () => {
    expect(parseStatsUiState("?esc=not-winners", PERIODS).filters).toEqual({
      esc: [ESC_NOT_WINNERS],
    });
  });

  it("parses and serializes esc non_entries", () => {
    const state = parseStatsUiState("?esc=non_entries", PERIODS);
    expect(state.filters.esc).toEqual([ESC_NON_ENTRIES]);
    const serialized = serializeStatsUiState(state, PERIODS);
    expect(serialized).toBe("esc=non_entries");
  });

  it("parses performance_category and strips invalid values", () => {
    expect(
      parseStatsUiState(
        "?performance_category=final_live,bad_bucket,official_video",
        PERIODS,
      ).filters,
    ).toEqual({
      performance_category: ["final_live", "official_video"],
    });
  });

  it("parses fire toggle when fire=1", () => {
    expect(parseStatsUiState("?fire=1", PERIODS).filters).toEqual({
      fire: ["1"],
    });
  });

  it("parses and serializes full-text search q", () => {
    const state = parseStatsUiState("?q=dum+tek+tek", PERIODS);
    expect(state.filters.search).toEqual(["dum tek tek"]);
    expect(serializeStatsUiState(state, PERIODS)).toBe("q=dum%20tek%20tek");
  });

  it("ignores blank q values", () => {
    expect(parseStatsUiState("?q=%20%20", PERIODS).filters).toEqual({});
  });

  it("ignores unknown query keys", () => {
    expect(parseStatsUiState("?sort=artist&country=Sweden", PERIODS)).toEqual({
      window: defaultStatsUiState(PERIODS).window,
      filters: {
        country: ["Sweden"],
      },
      sort: null,
    });
  });

  it("parses sort and order when both are present", () => {
    expect(parseStatsUiState("?sort=year&order=asc", PERIODS).sort).toEqual({
      column: "year",
      desc: false,
    });
  });

  it("requires order when sort is set", () => {
    expect(parseStatsUiState("?sort=year", PERIODS).sort).toBeNull();
  });

  it("serializes non-default sort with order", () => {
    const state = {
      ...defaultStatsUiState(PERIODS),
      sort: { column: "title", desc: true },
    };
    expect(serializeStatsUiState(state, PERIODS)).toBe("order=desc&sort=title");
  });

  it("defaults missing end to corpus end when only begin is set", () => {
    expect(parseStatsUiState("?begin=2022-01", PERIODS).window).toEqual({
      begin: "2022-01",
      end: "2024-12",
    });
  });

  it("defaults missing begin to corpus start when only end is set", () => {
    expect(parseStatsUiState("?end=2022-01", PERIODS).window).toEqual({
      begin: "2020-01",
      end: "2022-01",
    });
  });
});

describe("serializeStatsUiState", () => {
  it("omits defaults for full range and empty filters", () => {
    expect(serializeStatsUiState(defaultStatsUiState(PERIODS), PERIODS)).toBe("");
  });

  it("serializes params in alphabetical order", () => {
    const serialized = serializeStatsUiState(
      {
        window: { begin: "2021-01", end: "2023-01" },
        filters: {
          country: ["Sweden"],
          fire: ["1"],
          performance_category: ["final_live"],
        },
        sort: null,
      },
      PERIODS,
    );
    expect(serialized).toBe(
      "begin=2021-01&country=Sweden&end=2023-01&fire=1&performance_category=final_live",
    );
  });
});

describe("navigation round-trip", () => {
  it("preserves grain-specific filters when shared filters change", () => {
    const initial = parseStatsUiState(
      "?performance_category=final_live,official_video&country=Sweden",
      PERIODS,
    );

    const afterSharedEdit = {
      ...initial,
      filters: {
        ...initial.filters,
        country: ["Sweden", "Norway"],
        year: [2024],
      },
    };

    const serialized = serializeStatsUiState(afterSharedEdit, PERIODS);
    const reparsed = parseStatsUiState(`?${serialized}`, PERIODS);

    expect(reparsed.filters.performance_category).toEqual([
      "final_live",
      "official_video",
    ]);
    expect(reparsed.filters.country).toEqual(["Sweden", "Norway"]);
    expect(reparsed.filters.year).toEqual([2024]);
    expect(reparsed.sort).toBeNull();
  });

  it("preserves sort across navigation round-trip", () => {
    const state = {
      ...parseStatsUiState("?country=Sweden", PERIODS),
      sort: { column: "country", desc: false },
    };
    const serialized = serializeStatsUiState(state, PERIODS);
    expect(serialized).toBe("country=Sweden&order=asc&sort=country");
    expect(parseStatsUiState(`?${serialized}`, PERIODS).sort).toEqual({
      column: "country",
      desc: false,
    });
  });
});
