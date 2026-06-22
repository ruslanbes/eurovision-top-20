import { describe, expect, it } from "vitest";
import { CHART_POINTS_FAQ_URL, HELP_CONTENT } from "./helpContent";

describe("HELP_CONTENT", () => {
  it("defines chart_points explainer with formula and FAQ link", () => {
    const content = HELP_CONTENT.chart_points;

    expect(content.title).toBe("What are Chart Points?");
    expect(content.formula).toContain("top20×1");
    expect(content.faqUrl).toBe(CHART_POINTS_FAQ_URL);
    expect(content.faqUrl).toContain("docs/faq/chart_points.md");
  });
});
