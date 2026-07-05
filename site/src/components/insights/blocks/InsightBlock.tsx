import { HighlightBlock } from "./HighlightBlock";
import { MatrixBlock } from "./MatrixBlock";
import { TableBlock } from "./TableBlock";
import type { InsightResult } from "../types";

type InsightBlockProps = {
  result: InsightResult;
};

export function InsightBlock({ result }: InsightBlockProps) {
  if (result.viewKind === "highlight") {
    return <HighlightBlock result={result} />;
  }
  if (result.viewKind === "table") {
    return <TableBlock result={result} />;
  }
  return <MatrixBlock result={result} />;
}
