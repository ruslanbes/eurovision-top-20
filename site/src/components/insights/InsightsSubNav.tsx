export type InsightsSubpage = "overview" | "year-composition";

type InsightsSubNavProps = {
  current: InsightsSubpage;
};

const ITEMS: { id: InsightsSubpage; label: string; path: string }[] = [
  { id: "overview", label: "Overview", path: "insights/" },
  { id: "year-composition", label: "Year composition", path: "insights/year-composition/" },
];

export function InsightsSubNav({ current }: InsightsSubNavProps) {
  const base = import.meta.env.BASE_URL;

  const linkClass = (active: boolean) =>
    [
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      active
        ? "bg-surface text-text shadow-sm"
        : "text-text-muted hover:text-text",
    ].join(" ");

  return (
    <nav
      aria-label="Insights views"
      className="flex gap-1 rounded-lg border border-border bg-surface-elevated p-0.5"
    >
      {ITEMS.map((item) => (
        <a
          key={item.id}
          href={`${base}${item.path}`}
          aria-current={current === item.id ? "page" : undefined}
          className={linkClass(current === item.id)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
