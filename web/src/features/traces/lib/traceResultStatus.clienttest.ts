import { describe, expect, it } from "vitest";
import { getTraceResultStatus } from "./traceResultStatus";

type CaseScore = Parameters<typeof getTraceResultStatus>[0][number];

const score = (overrides: Partial<CaseScore> = {}) =>
  ({
    id: "case-result",
    source: "API",
    observationId: null,
    metadata: { benchmark: "example-benchmark" },
    dataType: "BOOLEAN",
    value: 1,
    stringValue: "True",
    ...overrides,
  }) as CaseScore;

describe("getTraceResultStatus", () => {
  it("shows booleans as outcome words and other values exactly as scored", () => {
    expect(getTraceResultStatus([score()])).toBe("成功");
    expect(
      getTraceResultStatus([score({ value: 0, stringValue: "False" })]),
    ).toBe("失败");
    for (const stringValue of ["真", "true", "PASS", "yes", "1"]) {
      expect(getTraceResultStatus([score({ value: 1, stringValue })])).toBe(
        "成功",
      );
    }
    for (const stringValue of ["假", "false", "FAIL", "no", "0"]) {
      expect(getTraceResultStatus([score({ value: 0, stringValue })])).toBe(
        "失败",
      );
    }
    expect(
      getTraceResultStatus([
        score({ dataType: "CATEGORICAL", stringValue: "needs_Review" }),
      ]),
    ).toBe("needs_Review");
    for (const value of [0, 0.62]) {
      expect(
        getTraceResultStatus([
          score({ dataType: "NUMERIC", value, stringValue: null }),
        ]),
      ).toBe(String(value));
    }
  });

  it("ignores scores that are not this case's result", () => {
    expect(
      getTraceResultStatus([
        score({ observationId: "child" }),
        score({ id: "unrelated", metadata: {} }),
        score({ id: "annotation", source: "ANNOTATION" }),
        score({ id: "blank", stringValue: "" }),
        score({ id: "text", dataType: "TEXT", stringValue: "notes" }),
      ]),
    ).toBeUndefined();
    expect(getTraceResultStatus([])).toBeUndefined();
  });

  it("does not choose between two different results", () => {
    expect(
      getTraceResultStatus([score(), score({ id: "another-result" })]),
    ).toBeUndefined();
  });
});
