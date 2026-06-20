import { describe, expect, it } from "vitest";
import {
  ESC_WINNER_NOT_WINNERS,
  ESC_WINNER_WINNERS,
} from "./filters/escWinner";
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
    });
  });

  it("returns empty window when periods missing", () => {
    expect(defaultStatsUiState([])).toEqual({
      window: { begin: "", end: "" },
      filters: {},
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
        "?begin=2021-01&end=2023-01&country=Sweden,Norway&year=2024,2023&esc_winner=winners",
        PERIODS,
      ),
    ).toEqual({
      window: { begin: "2021-01", end: "2023-01" },
      filters: {
        country: ["Sweden", "Norway"],
        year: [2024, 2023],
        esc_winner: [ESC_WINNER_WINNERS],
      },
    });
  });

  it("maps esc_winner not_winners to internal value", () => {
    expect(parseStatsUiState("?esc_winner=not_winners", PERIODS).filters).toEqual({
      esc_winner: [ESC_WINNER_NOT_WINNERS],
    });
  });

  it("accepts legacy esc_winner not-winners alias", () => {
    expect(parseStatsUiState("?esc_winner=not-winners", PERIODS).filters).toEqual({
      esc_winner: [ESC_WINNER_NOT_WINNERS],
    });
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

  it("ignores unknown query keys", () => {
    expect(parseStatsUiState("?sort=artist&country=Sweden", PERIODS).filters).toEqual({
      country: ["Sweden"],
    });
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

  it("round-trips active state", () => {
    const state = parseStatsUiState(
      "?begin=2022-01&end=2024-12&country=Sweden&year=2024&esc_winner=winners&performance_category=final_live",
      PERIODS,
    );
    const serialized = serializeStatsUiState(state, PERIODS);
    expect(parseStatsUiState(`?${serialized}`, PERIODS)).toEqual(state);
  });

  it("serializes params in alphabetical order", () => {
    const serialized = serializeStatsUiState(
      {
        window: { begin: "2021-01", end: "2023-01" },
        filters: {
          country: ["Sweden"],
          performance_category: ["final_live"],
        },
      },
      PERIODS,
    );
    expect(serialized).toBe(
      "begin=2021-01&country=Sweden&end=2023-01&performance_category=final_live",
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
  });
});
