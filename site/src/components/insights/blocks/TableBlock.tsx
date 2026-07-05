import type { InsightResult, InsightTableStatus } from "../types";

type TableBlockProps = {
  result: Extract<InsightResult, { viewKind: "table" }>;
};

const STATUS_SYMBOL: Record<InsightTableStatus, string> = {
  yes: "✓",
  no: "✗",
  unknown: "—",
};

const STATUS_LABEL: Record<InsightTableStatus, string> = {
  yes: "Yes",
  no: "No",
  unknown: "Unknown",
};

function StatusCell({
  status,
  title,
}: {
  status: InsightTableStatus;
  title?: string;
}) {
  return (
    <span
      className={[
        "inline-flex min-w-[1.5rem] justify-center font-semibold",
        status === "yes" ? "text-accent" : "",
        status === "no" ? "text-text" : "",
        status === "unknown" ? "text-text-muted" : "",
      ].join(" ")}
      title={title}
      aria-label={title ? `${STATUS_LABEL[status]}: ${title}` : STATUS_LABEL[status]}
    >
      {STATUS_SYMBOL[status]}
    </span>
  );
}

export function TableBlock({ result }: TableBlockProps) {
  return (
    <article className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-lg font-semibold text-text">{result.title}</h3>
      {result.lead ? <p className="text-sm text-text">{result.lead}</p> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-border bg-surface-elevated px-3 py-2 text-left font-semibold text-text">
                Year
              </th>
              {result.showHitColumn !== false ? (
                <th className="border border-border bg-surface-elevated px-3 py-2 text-center font-semibold text-text">
                  Hit
                </th>
              ) : null}
              {result.showRankColumn ? (
                <th className="border border-border bg-surface-elevated px-3 py-2 text-center font-semibold text-text">
                  Rank
                </th>
              ) : null}
              <th className="border border-border bg-surface-elevated px-3 py-2 text-left font-semibold text-text">
                ESC winner
              </th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.year}>
                <td className="border border-border px-3 py-2 tabular-nums text-text">
                  {row.year}
                </td>
                {result.showHitColumn !== false ? (
                  <td className="border border-border px-3 py-2 text-center">
                    <StatusCell status={row.status} title={row.statusTitle} />
                  </td>
                ) : null}
                {result.showRankColumn ? (
                  <td className="border border-border px-3 py-2 text-center tabular-nums text-text">
                    {row.rank ?? <span className="text-text-muted">—</span>}
                  </td>
                ) : null}
                <td className="border border-border px-3 py-2 text-text">
                  {row.linkHref && row.linkLabel ? (
                    <a
                      href={row.linkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {row.linkLabel}
                    </a>
                  ) : row.linkLabel ? (
                    row.linkLabel
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.footnote ? (
        <p className="text-xs text-text-muted">{result.footnote}</p>
      ) : null}
    </article>
  );
}
