import { describe, expect, it } from "vitest";

import {
  hashString,
  hashStringToColor,
  relativeLuminance,
} from "../../../scripts/hash-color.mjs";

describe("hashStringToColor", () => {
  it("is stable for the same input", () => {
    expect(hashStringToColor("Hadise - Düm Tek Tek")).toBe(
      hashStringToColor("Hadise - Düm Tek Tek"),
    );
  });

  it("usually differs for different titles", () => {
    expect(hashStringToColor("Upload A")).not.toBe(hashStringToColor("Upload B"));
  });

  it("keeps luminance in a readable mid band", () => {
    const samples = [
      "Alexander Rybak - Fairytale (LIVE)",
      "Loreen - Euphoria (LIVE)",
      "Little Big - Uno - Official Music Video",
    ];
    for (const sample of samples) {
      const luminance = relativeLuminance(hashStringToColor(sample));
      expect(luminance).toBeGreaterThan(0.35);
      expect(luminance).toBeLessThan(0.6);
    }
  });

  it("uses the full hash range for hue", () => {
    const hues = new Set(
      Array.from({ length: 64 }, (_, index) => {
        const color = hashStringToColor(`title-${index}-${hashString(String(index))}`);
        const match = color.match(/hsl\(\s*([\d.]+)/);
        return match ? Number.parseInt(match[1], 10) : -1;
      }),
    );
    expect(hues.size).toBeGreaterThan(8);
  });
});
