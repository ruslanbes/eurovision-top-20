import { describe, expect, it } from "vitest";

import {
  compositionSlotStyle,
  compositionSlotVisualState,
  toggleDimensionFocus,
} from "./compositionSlotFocus";
import { MISSING_COUNTRY } from "./episodeComposition";

describe("toggleDimensionFocus", () => {
  it("focuses a year when none is focused", () => {
    expect(toggleDimensionFocus(null, "2017")).toBe("2017");
  });

  it("clears focus when the same year is clicked again", () => {
    expect(toggleDimensionFocus("2017", "2017")).toBeNull();
  });

  it("switches focus to another year", () => {
    expect(toggleDimensionFocus("2017", "2022")).toBe("2022");
  });

  it("clears focus when Missing is clicked", () => {
    expect(toggleDimensionFocus("2017", MISSING_COUNTRY)).toBeNull();
    expect(toggleDimensionFocus(null, MISSING_COUNTRY)).toBeNull();
  });
});

describe("compositionSlotVisualState", () => {
  it("is neutral when nothing is focused", () => {
    expect(compositionSlotVisualState("2017", null)).toBe("neutral");
  });

  it("focuses the active year", () => {
    expect(compositionSlotVisualState("2017", "2017")).toBe("focused");
  });

  it("dims other years while one is focused", () => {
    expect(compositionSlotVisualState("2022", "2017")).toBe("dimmed");
  });

  it("never focuses Missing", () => {
    expect(compositionSlotVisualState(MISSING_COUNTRY, "2017")).toBe("dimmed");
    expect(compositionSlotVisualState(MISSING_COUNTRY, null)).toBe("neutral");
  });
});

describe("compositionSlotStyle", () => {
  it("applies halo emphasis when focused", () => {
    expect(compositionSlotStyle("#3949ab", "focused")).toEqual({
      color: "#3949ab",
      textShadow: "0 0 1px #3949ab, 0 0 2px #3949ab",
    });
  });

  it("dims inactive slots", () => {
    expect(compositionSlotStyle("#3949ab", "dimmed")).toEqual({
      color: "#3949ab",
      opacity: 0.7,
    });
  });
});
