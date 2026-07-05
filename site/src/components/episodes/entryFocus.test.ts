import { describe, expect, it } from "vitest";

import { MISSING_DIMENSION } from "./constants";
import {
  entryStyle,
  entryVisualState,
  toggleEntryFocus,
} from "./entryFocus";

describe("toggleEntryFocus", () => {
  it("focuses a year when none is focused", () => {
    expect(toggleEntryFocus(null, "2017")).toBe("2017");
  });

  it("clears focus when the same year is clicked again", () => {
    expect(toggleEntryFocus("2017", "2017")).toBeNull();
  });

  it("switches focus to another year", () => {
    expect(toggleEntryFocus("2017", "2022")).toBe("2022");
  });

  it("clears focus when Missing is clicked", () => {
    expect(toggleEntryFocus("2017", MISSING_DIMENSION)).toBeNull();
    expect(toggleEntryFocus(null, MISSING_DIMENSION)).toBeNull();
  });
});

describe("entryVisualState", () => {
  it("is neutral when nothing is focused", () => {
    expect(entryVisualState("2017", null)).toBe("neutral");
  });

  it("focuses the active year", () => {
    expect(entryVisualState("2017", "2017")).toBe("focused");
  });

  it("dims other years while one is focused", () => {
    expect(entryVisualState("2022", "2017")).toBe("dimmed");
  });

  it("never focuses Missing", () => {
    expect(entryVisualState(MISSING_DIMENSION, "2017")).toBe("dimmed");
    expect(entryVisualState(MISSING_DIMENSION, null)).toBe("neutral");
  });
});

describe("entryStyle", () => {
  it("applies halo emphasis when focused", () => {
    expect(entryStyle("#3949ab", "focused")).toEqual({
      color: "#3949ab",
      textShadow: "0 0 1px #3949ab, 0 0 2px #3949ab",
    });
  });

  it("dims inactive entries", () => {
    expect(entryStyle("#3949ab", "dimmed")).toEqual({
      color: "#3949ab",
      opacity: 0.4,
    });
  });
});
