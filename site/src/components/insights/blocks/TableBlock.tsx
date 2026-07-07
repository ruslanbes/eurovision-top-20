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

function LinkCell({
  href,
  label,
}: {
  href: string | null;
  label: string;
}) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:underline"
      >
        {label}
      </a>
    );
  }
  return <span>{label}</span>;
}

function CountLabelTable({
  result,
}: {
  result: Extract<InsightResult, { viewKind: "table"; tableKind: "count_label" }>;
}) {
  return (
    <table className="min-w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="border border-border bg-surface-elevated px-3 py-2 text-left font-semibold text-text">
            {result.countColumnLabel}
          </th>
          <th className="border border-border bg-surface-elevated px-3 py-2 text-left font-semibold text-text">
            {result.labelColumn}
          </th>
        </tr>
      </thead>
      <tbody>
        {result.rows.map((row) => (
          <tr key={row.id}>
            <td className="border border-border px-3 py-2 tabular-nums text-text">
              {row.count}
            </td>
            <td className="border border-border px-3 py-2 text-text">
              <LinkCell href={row.labelHref} label={row.label} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LabelEpisodesTable({
  result,
}: {
  result: Extract<InsightResult, { viewKind: "table"; tableKind: "label_episodes" }>;
}) {
  return (
    <table className="min-w-full border-collapse text-sm">
      <thead>
        <tr>
          {result.showYearColumn ? (
            <th className="border border-border bg-surface-elevated px-3 py-2 text-left font-semibold text-text">
              Year
            </th>
          ) : null}
          <th className="border border-border bg-surface-elevated px-3 py-2 text-left font-semibold text-text">
            {result.labelColumn}
          </th>
          <th className="border border-border bg-surface-elevated px-3 py-2 text-left font-semibold text-text">
            {result.episodeColumnLabel ?? "Episodes"}
          </th>
        </tr>
      </thead>
      <tbody>
        {result.rows.map((row) => (
          <tr key={row.id}>
            {result.showYearColumn ? (
              <td className="border border-border px-3 py-2 tabular-nums text-text">
                {row.contestYear ?? "—"}
              </td>
            ) : null}
            <td className="border border-border px-3 py-2 text-text">
              <LinkCell href={row.labelHref} label={row.label} />
              {row.rowNote ? (
                <p className="mt-1 text-xs leading-snug text-text-muted">
                  {row.rowNote}
                </p>
              ) : null}
            </td>
            <td className="border border-border px-3 py-2 text-text">
              <ul className="space-y-1">
                {row.episodes.map((episode) => (
                  <li key={episode.period}>
                    <LinkCell href={episode.href} label={episode.label} />
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EscWinnerTable({
  result,
}: {
  result: Extract<InsightResult, { viewKind: "table"; tableKind?: "esc_winner" }>;
}) {
  const linkColumnLabel = result.linkColumnLabel ?? "Video";

  return (
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
              {result.rankColumnLabel ?? "Rank"}
            </th>
          ) : null}
          <th className="border border-border bg-surface-elevated px-3 py-2 text-left font-semibold text-text">
            {linkColumnLabel}
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
                <LinkCell href={row.linkHref} label={row.linkLabel} />
              ) : row.linkLabel ? (
                row.linkLabel
              ) : (
                <span className="text-text-muted">—</span>
              )}
              {row.rowNote ? (
                <p className="mt-1 text-xs leading-snug text-text-muted">
                  {row.rowNote}
                </p>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TableBlock({ result }: TableBlockProps) {
  return (
    <article className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-lg font-semibold text-text">{result.title}</h3>
      {result.lead ? <p className="text-sm text-text">{result.lead}</p> : null}
      <div className="overflow-x-auto">
        {result.tableKind === "count_label" ? (
          <CountLabelTable result={result} />
        ) : result.tableKind === "label_episodes" ? (
          <LabelEpisodesTable result={result} />
        ) : (
          <EscWinnerTable result={result} />
        )}
      </div>
      {result.footnote ? (
        <p className="text-xs text-text-muted">{result.footnote}</p>
      ) : null}
    </article>
  );
}
