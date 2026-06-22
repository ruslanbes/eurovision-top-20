export type HelpContent = {
  faqUrl: string;
  interpretation: string;
  formula: string;
  intro: string;
  title: string;
  triggerLabel: string;
};

export const CHART_POINTS_FAQ_URL =
  "https://github.com/ruslanbes/eurovision-top-20/blob/main/docs/faq/chart_points.md";

export const HELP_CONTENT = {
  chart_points: {
    triggerLabel: "Explain Chart Points",
    title: "What are Chart Points?",
    intro:
      "A YouTube channel chart score from Top 20 Most Watched episode ranks.",
    formula: "top20×1 + top10×2 + top5×3 + top3×4 + top1×5",
    interpretation:
      "Higher ranks weigh more: a single #1 appearance earns 15 Chart Points: 1×1 + 1×2 + 1×3 + 1×4 + 1×5",
    faqUrl: CHART_POINTS_FAQ_URL,
  },
} satisfies Record<string, HelpContent>;

export type HelpContentId = keyof typeof HELP_CONTENT;
