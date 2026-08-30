import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  EXPLAINER_DISMISSED_CLASS,
  EXPLAINER_DISMISSED_KEY,
  isExplainerDismissed,
  setExplainerDismissed,
} from "./explainerStorage";

describe("explainerStorage", () => {
  const store = new Map<string, string>();
  const classList = {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
  };

  beforeEach(() => {
    store.clear();
    classList.add.mockReset();
    classList.remove.mockReset();
    classList.contains.mockReset();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    vi.stubGlobal("document", {
      documentElement: { classList },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is false by default", () => {
    expect(isExplainerDismissed()).toBe(false);
  });

  it("persists dismiss and sets document class", () => {
    setExplainerDismissed();
    expect(store.get(EXPLAINER_DISMISSED_KEY)).toBe("1");
    expect(isExplainerDismissed()).toBe(true);
    expect(classList.add).toHaveBeenCalledWith(EXPLAINER_DISMISSED_CLASS);
  });
});
