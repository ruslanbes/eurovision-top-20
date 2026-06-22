import { useEffect, useState } from "react";
import { STATS_URL_CHANGE_EVENT } from "./useStatsUiState";

type StatsNavProps = {
  current: "videos" | "songs" | "insights";
};

function statsHref(grain: "videos" | "songs", search: string): string {
  const base = import.meta.env.BASE_URL;
  const path = grain === "videos" ? base : `${base}songs/`;
  return `${path}${search}`;
}

function insightsHref(): string {
  return `${import.meta.env.BASE_URL}insights/`;
}

export function StatsNav({ current }: StatsNavProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(window.location.search);

    const onUrlChange = (event: Event) => {
      const detail = (event as CustomEvent<{ search: string }>).detail;
      setSearch(detail?.search ?? window.location.search);
    };

    const onPopState = () => {
      setSearch(window.location.search);
    };

    window.addEventListener(STATS_URL_CHANGE_EVENT, onUrlChange);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener(STATS_URL_CHANGE_EVENT, onUrlChange);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const linkClass = (active: boolean) =>
    [
      "rounded-md px-4 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-surface text-text shadow-sm"
        : "text-text-muted hover:text-text",
    ].join(" ");

  return (
    <nav
      aria-label="Site sections"
      className="flex gap-1 rounded-lg border border-border bg-surface-elevated p-1"
    >
      <a
        href={statsHref("videos", search)}
        aria-current={current === "videos" ? "page" : undefined}
        className={linkClass(current === "videos")}
      >
        Videos
      </a>
      <a
        href={statsHref("songs", search)}
        aria-current={current === "songs" ? "page" : undefined}
        className={linkClass(current === "songs")}
      >
        Songs
      </a>
      <a
        href={insightsHref()}
        aria-current={current === "insights" ? "page" : undefined}
        className={linkClass(current === "insights")}
      >
        Insights
      </a>
    </nav>
  );
}
