import { describe, expect, it } from "vitest";
import {
  countryToSlug,
  eurovisionworldCountryHref,
  eurovisionworldYearHref,
  VIRTUAL_WORLD_COUNTRY,
} from "./eurovisionworld";

describe("countryToSlug", () => {
  it("kebabs multi-word names", () => {
    expect(countryToSlug("United Kingdom")).toBe("united-kingdom");
    expect(countryToSlug("North Macedonia")).toBe("north-macedonia");
    expect(countryToSlug("San Marino")).toBe("san-marino");
    expect(countryToSlug("Czechia")).toBe("czechia");
    expect(countryToSlug("Norway")).toBe("norway");
    expect(countryToSlug("Philippines")).toBe("philippines");
  });

  it("returns null for World and empty", () => {
    expect(countryToSlug(VIRTUAL_WORLD_COUNTRY)).toBeNull();
    expect(countryToSlug(null)).toBeNull();
    expect(countryToSlug("")).toBeNull();
    expect(countryToSlug("   ")).toBeNull();
  });
});

describe("eurovisionworldYearHref", () => {
  it("uses eurovision for Europe", () => {
    expect(eurovisionworldYearHref(2024, "europe")).toBe(
      "https://eurovisionworld.com/eurovision/2024",
    );
    expect(eurovisionworldYearHref(2024)).toBe(
      "https://eurovisionworld.com/eurovision/2024",
    );
  });

  it("uses eurovision-asia for Asia", () => {
    expect(eurovisionworldYearHref(2026, "asia")).toBe(
      "https://eurovisionworld.com/eurovision-asia/2026",
    );
  });
});

describe("eurovisionworldCountryHref", () => {
  it("builds Europe country URLs", () => {
    expect(eurovisionworldCountryHref("Norway", "europe")).toBe(
      "https://eurovisionworld.com/eurovision/norway",
    );
    expect(eurovisionworldCountryHref("United Kingdom")).toBe(
      "https://eurovisionworld.com/eurovision/united-kingdom",
    );
  });

  it("builds Asia country URLs", () => {
    expect(eurovisionworldCountryHref("Philippines", "asia")).toBe(
      "https://eurovisionworld.com/eurovision-asia/philippines",
    );
  });

  it("returns null for World and missing", () => {
    expect(eurovisionworldCountryHref(VIRTUAL_WORLD_COUNTRY, "europe")).toBeNull();
    expect(eurovisionworldCountryHref(null, "europe")).toBeNull();
  });
});
