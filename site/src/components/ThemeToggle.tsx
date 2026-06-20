import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  applyTheme,
  getStoredTheme,
  setTheme,
  type Theme,
} from "../lib/theme";

const OPTIONS: { value: Theme; label: string; icon: ReactNode }[] = [
  {
    value: "light",
    label: "Light theme",
    icon: (
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 3v1.5M12 19.5V21M4.22 4.22l1.06 1.06M18.72 18.72l1.06 1.06M3 12h1.5M19.5 12H21M4.22 19.78l1.06-1.06M18.72 5.28l1.06-1.06"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark theme",
    icon: (
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
      >
        <path
          d="M21 14.5A8.5 8.5 0 1 1 9.5 3a6.5 6.5 0 1 0 11.5 11.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    value: "system",
    label: "System theme",
    icon: (
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
      >
        <rect height="14" rx="2" width="20" x="2" y="3" />
        <path d="M8 21h8" strokeLinecap="round" />
        <path d="M12 17v4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  useEffect(() => {
    if (theme !== "system") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const selectTheme = (next: Theme) => {
    setThemeState(next);
    setTheme(next);
  };

  return (
    <div
      aria-label="Theme"
      className="flex shrink-0 gap-0.5 rounded-lg border border-border bg-surface-elevated p-0.5"
      role="radiogroup"
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            className={[
              "rounded-md p-2 transition-colors",
              active
                ? "bg-surface text-text shadow-sm"
                : "text-text-muted hover:text-text",
            ].join(" ")}
            onClick={() => selectTheme(option.value)}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
