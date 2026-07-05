import type { InsightResult } from "../types";

type MatrixBlockProps = {
  result: Extract<InsightResult, { viewKind: "matrix" }>;
};

function cellClass(value: number | null, max: number, colorScale: "binary" | "sequential"): string {
  if (value === null || max <= 0) {
    return "bg-surface";
  }

  const ratio = colorScale === "binary" ? (value > 0 ? 1 : 0) : value / max;
  if (ratio >= 0.75) {
    return "bg-accent/40";
  }
  if (ratio >= 0.5) {
    return "bg-accent/25";
  }
  if (ratio >= 0.25) {
    return "bg-accent/15";
  }
  if (ratio > 0) {
    return "bg-accent/8";
  }
  return "bg-surface";
}

export function MatrixBlock({ result }: MatrixBlockProps) {
  const max = result.cells.flat().reduce<number>(
    (acc, value) => (value !== null && value > acc ? value : acc),
    0,
  );
  const format = result.valueFormat ?? String;

  return (
    <article className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-lg font-semibold text-text">{result.title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-border bg-surface-elevated px-2 py-1 text-left font-semibold text-text">
                {result.rowLabel}
              </th>
              {result.cols.map((col) => (
                <th
                  key={col.id}
                  className="border border-border bg-surface-elevated px-2 py-1 text-left font-semibold text-text"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, rowIndex) => (
              <tr key={row.id}>
                <th className="border border-border bg-surface-elevated px-2 py-1 text-left font-medium text-text">
                  {row.label}
                </th>
                {result.cols.map((col, colIndex) => {
                  const value = result.cells[rowIndex]?.[colIndex] ?? null;
                  return (
                    <td
                      key={col.id}
                      className={[
                        "border border-border px-2 py-1 tabular-nums text-text",
                        cellClass(value, max, result.colorScale),
                      ].join(" ")}
                    >
                      {value === null ? "—" : format(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
