import type { HighlightItem, InsightResult } from "../types";

type HighlightBlockProps = {
  result: Extract<InsightResult, { viewKind: "highlight" }>;
};

function HighlightItemView({ item }: { item: HighlightItem }) {
  const content = item.href ? (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline"
    >
      {item.label}
    </a>
  ) : (
    <span>{item.label}</span>
  );

  return (
    <li>
      {content}
      {item.meta ? (
        <span className="text-text-muted"> ({item.meta})</span>
      ) : null}
    </li>
  );
}

export function HighlightBlock({ result }: HighlightBlockProps) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <h3 className="text-lg font-semibold text-text">{result.title}</h3>
      <p className="text-sm text-text">{result.lead}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-text">
        {result.items.map((item) => (
          <HighlightItemView key={item.label} item={item} />
        ))}
      </ul>
      {result.footnote ? (
        <p className="text-xs text-text-muted">{result.footnote}</p>
      ) : null}
    </article>
  );
}
