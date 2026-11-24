import type { ListableScore } from "@langfuse/shared";

type CaseScore = Pick<
  ListableScore,
  | "id"
  | "source"
  | "observationId"
  | "metadata"
  | "dataType"
  | "value"
  | "stringValue"
>;

/**
 * The result a benchmark recorded for one case, read from the score itself
 * rather than from an aggregate: an aggregate pools every score on the trace,
 * including scores attached to child observations.
 *
 * Returns undefined when the trace has no single, unambiguous benchmark result.
 * Status has no room to say which metric a value belongs to, so two different
 * results are left to the level display instead of one being picked.
 */
export function getTraceResultStatus(
  scores: readonly CaseScore[],
): string | undefined {
  let result: { id: string; label: string } | undefined;

  for (const score of scores) {
    const benchmark = score.metadata.benchmark;
    if (
      score.source !== "API" ||
      score.observationId !== null ||
      typeof benchmark !== "string" ||
      !benchmark.trim()
    ) {
      continue;
    }

    const label = formatCaseResult(score);
    if (label === undefined) continue;
    if (result && (result.id !== score.id || result.label !== label)) {
      return undefined;
    }
    result = { id: score.id, label };
  }

  return result?.label;
}

/**
 * The stored value, unmodified: a boolean result reads "True"/"False", a
 * category reads its own name, and a number keeps the precision it was scored
 * with. Numeric zero is a real result and must not be dropped.
 */
function formatCaseResult(score: CaseScore): string | undefined {
  switch (score.dataType) {
    case "BOOLEAN":
    case "CATEGORICAL":
      return score.stringValue?.trim() ? score.stringValue : undefined;
    case "NUMERIC":
      return Number.isFinite(score.value) ? String(score.value) : undefined;
    case "TEXT":
      return undefined;
  }
}
