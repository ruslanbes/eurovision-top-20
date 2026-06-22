import { describe, expect, it } from "vitest";
import {
  isDefaultTableSort,
  parseUrlSort,
  serializeUrlSort,
  sortingStateToTableSort,
  tableSortToSortingState,
} from "./sortUrl";

describe("parseUrlSort", () => {
  it("parses sort and order when both are valid", () => {
    expect(parseUrlSort("year", "asc")).toEqual({ column: "year", desc: false });
    expect(parseUrlSort("title", "desc")).toEqual({ column: "title", desc: true });
  });

  it("requires both sort and order", () => {
    expect(parseUrlSort("year", null)).toBeNull();
    expect(parseUrlSort(null, "asc")).toBeNull();
  });

  it("rejects unknown columns and invalid order", () => {
    expect(parseUrlSort("flag", "asc")).toBeNull();
    expect(parseUrlSort("year", "up")).toBeNull();
  });

  it("normalizes default chart_points desc to null", () => {
    expect(parseUrlSort("chart_points", "desc")).toBeNull();
  });
});

describe("serializeUrlSort", () => {
  it("omits default sort", () => {
    expect(serializeUrlSort(null)).toEqual({});
    expect(serializeUrlSort({ column: "chart_points", desc: true })).toEqual({});
  });

  it("serializes non-default sort with order", () => {
    expect(serializeUrlSort({ column: "country", desc: false })).toEqual({
      order: "asc",
      sort: "country",
    });
  });
});

describe("sorting conversions", () => {
  it("round-trips through table sort helpers", () => {
    const sorting = tableSortToSortingState({ column: "year", desc: false });
    expect(sortingStateToTableSort(sorting)).toEqual({ column: "year", desc: false });
  });

  it("treats default sorting state as null table sort", () => {
    expect(isDefaultTableSort(sortingStateToTableSort([{ id: "chart_points", desc: true }]))).toBe(
      true,
    );
  });
});
