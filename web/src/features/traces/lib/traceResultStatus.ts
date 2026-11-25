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
 * A pass/fail result reads as an outcome, not as the stored literal: the
 * scorer's own spelling ("True", "PASS", "yes") says nothing a reader wants to
 * see in a status column. An unrecognised spelling keeps its own text rather
 * than being guessed into a verdict.
 */
function formatBooleanResult(score: CaseScore): string | undefined {
  // The stored text is the score's own value; a boolean row without one has no
  // result to show, and the numeric column must not stand in for it.
  const text = score.stringValue?.trim();
  if (!text) return undefined;
  const normalized = text.toLowerCase();
  if (POSITIVE_OUTCOMES.has(normalized)) return "成功";
  if (NEGATIVE_OUTCOMES.has(normalized)) return "失败";
  return text;
}

const POSITIVE_OUTCOMES = new Set([
  "true",
  "1",
  "pass",
  "passed",
  "yes",
  "y",
  "真",
]);
const NEGATIVE_OUTCOMES = new Set([
  "false",
  "0",
  "fail",
  "failed",
  "no",
  "n",
  "假",
]);

/**
 * A category reads its own name and a number keeps the precision it was scored
 * with. Numeric zero is a real result and must not be dropped; a boolean is
 * formatted as an outcome instead.
 */
function formatCaseResult(score: CaseScore): string | undefined {
  switch (score.dataType) {
    case "BOOLEAN":
      return formatBooleanResult(score);
    case "CATEGORICAL":
      return score.stringValue?.trim() ? score.stringValue : undefined;
    case "NUMERIC":
      return Number.isFinite(score.value) ? String(score.value) : undefined;
    case "TEXT":
      return undefined;
  }
}
