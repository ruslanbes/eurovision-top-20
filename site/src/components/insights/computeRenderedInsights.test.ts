import { describe, expect, it } from "vitest";
import { computeRenderedInsights } from "./computeRenderedInsights";

describe("computeRenderedInsights", () => {
  it("returns Build-up rank and Uncrowned with real packaged labels", () => {
    const blocks = computeRenderedInsights();
    const byId = Object.fromEntries(blocks.map((b) => [b.id, b.result]));

    expect(byId["esc-build-up-rank"]?.title).toBe("Build-up rank");
    expect(byId["esc-uncrowned"]?.title).toBe("Uncrowned");

    const buildUp = byId["esc-build-up-rank"];
    expect(buildUp?.viewKind).toBe("table");
    if (buildUp?.viewKind === "table" && "rows" in buildUp) {
      const labels = buildUp.rows.map((r) => r.linkLabel).filter(Boolean);
      expect(labels.length).toBeGreaterThan(0);
      expect(labels.some((l) => typeof l === "string" && l.length > 0)).toBe(true);
    }
  });
});
