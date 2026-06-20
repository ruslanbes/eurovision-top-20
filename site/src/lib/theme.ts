export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

export function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") {
    return "system";
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveIsDark(theme: Theme): boolean {
  if (theme === "dark") {
    return true;
  }
  if (theme === "light") {
    return false;
  }
  return systemPrefersDark();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", resolveIsDark(theme));
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}
