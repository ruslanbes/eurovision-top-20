import { describe, expect, it } from "vitest";
import {
  normalizeSearchText,
  searchFilterActive,
  textMatchesQuery,
} from "./normalizeSearchText";

describe("normalizeSearchText", () => {
  it("folds case and strips diacritics", () => {
    expect(normalizeSearchText("Düm Tek Tek")).toBe("dum tek tek");
    expect(normalizeSearchText("FUeGO")).toBe("fuego");
    expect(normalizeSearchText("España")).toBe("espana");
  });
});

describe("textMatchesQuery", () => {
  it("matches diacritic-insensitive substrings on song labels", () => {
    expect(textMatchesQuery("Hadise — Düm Tek Tek", "dum tek tek")).toBe(true);
  });

  it("matches case-insensitive substrings on video titles", () => {
    expect(
      textMatchesQuery(
        "Eleni Foureira - Fuego (LIVE) | Cyprus 🇨🇾 | Grand Final | Eurovision 2018",
        "FUeGO",
      ),
    ).toBe(true);
  });

  it("trims the query before matching", () => {
    expect(textMatchesQuery("Hadise — Düm Tek Tek", "  dum  ")).toBe(true);
  });

  it("is inactive for empty or whitespace-only queries", () => {
    expect(textMatchesQuery("Anything", "")).toBe(true);
    expect(textMatchesQuery("Anything", "   ")).toBe(true);
  });

  it("returns false when haystack does not contain the query", () => {
    expect(textMatchesQuery("Loreen — Tattoo", "fuego")).toBe(false);
  });
});

describe("searchFilterActive", () => {
  it("is false for missing or blank values", () => {
    expect(searchFilterActive([])).toBe(false);
    expect(searchFilterActive(["   "])).toBe(false);
  });

  it("is true for non-empty trimmed queries", () => {
    expect(searchFilterActive(["fuego"])).toBe(true);
  });
});
