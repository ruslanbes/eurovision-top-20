export const EXPLAINER_DISMISSED_KEY = "site-stats-explainer-dismissed";
export const EXPLAINER_DISMISSED_VALUE = "1";
export const EXPLAINER_DISMISSED_CLASS = "site-stats-explainer-dismissed";

export function isExplainerDismissed(): boolean {
  if (typeof localStorage === "undefined") {
    return false;
  }
  return localStorage.getItem(EXPLAINER_DISMISSED_KEY) === EXPLAINER_DISMISSED_VALUE;
}

export function setExplainerDismissed(): void {
  localStorage.setItem(EXPLAINER_DISMISSED_KEY, EXPLAINER_DISMISSED_VALUE);
  document.documentElement.classList.add(EXPLAINER_DISMISSED_CLASS);
}
