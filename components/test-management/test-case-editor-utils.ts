import type { TestCaseRow, FieldKey } from "@/components/test-management/test-case-detail-helpers";

export function normalizeRow(row: Record<string, unknown>, suiteId: string): TestCaseRow {
  return {
    id: row.id === undefined || row.id === null || row.id === "" ? undefined : Number(row.id),
    testSuiteId: String(row.testSuiteId ?? suiteId),
    tcId: String(row.tcId ?? ""),
    caseName: String(row.caseName ?? ""),
    typeCase: String(row.typeCase ?? ""),
    preCondition: String(row.preCondition ?? ""),
    testStep: String(row.testStep ?? ""),
    expectedResult: String(row.expectedResult ?? ""),
    actualResult: String(row.actualResult ?? ""),
    status: String(row.status ?? ""),
    evidence: String(row.evidence ?? ""),
    priority: String(row.priority ?? ""),
  };
}

export function createBlankDraft(suiteId: string, tcId: string): TestCaseRow {
  return {
    testSuiteId: suiteId,
    tcId,
    caseName: "",
    typeCase: "Positive",
    preCondition: "",
    testStep: "",
    expectedResult: "",
    actualResult: "",
    status: "Pending",
    evidence: "",
    priority: "Medium",
  };
}

export function extractPrefixAndNumber(tcId: string): { prefix: string; num: number; padLen: number } | null {
  const match = tcId.match(/^(.*?)(\d+)$/);
  if (!match) return null;
  const prefix = match[1] ?? "";
  const numStr = match[2] ?? "0";
  return { prefix, num: Number.parseInt(numStr, 10), padLen: numStr.length };
}

export function suggestNextId(rows: TestCaseRow[]) {
  if (rows.length === 0) return "TC-001";
  const last = String(rows[rows.length - 1]?.tcId ?? "");
  const parsed = extractPrefixAndNumber(last);
  if (parsed) {
    const next = parsed.num + 1;
    return `${parsed.prefix}${String(next).padStart(parsed.padLen, "0")}`;
  }
  return `TC-${String(rows.length + 1).padStart(3, "0")}`;
}

export function renumberRows(rows: TestCaseRow[], newPrefix: string, startNum: number, padLen: number): TestCaseRow[] {
  return rows.map((row, i) => ({
    ...row,
    tcId: `${newPrefix}${String(startNum + i).padStart(padLen, "0")}`,
  }));
}

export function isFailedStatus(value: string) {
  return ["Failed", "FAILURE", "FAILED"].includes(String(value).toUpperCase()) || String(value).toLowerCase() === "failed";
}

export function requiredEditReady(row: TestCaseRow | null) {
  return Boolean(row?.tcId && row.caseName && row.typeCase && row.expectedResult && row.status && row.priority);
}

const REQUIRED_FIELDS: FieldKey[] = ["tcId", "caseName", "typeCase", "preCondition", "testStep", "expectedResult", "status", "priority"];

export function getInvalidFields(row: TestCaseRow | null): FieldKey[] {
  if (!row) return REQUIRED_FIELDS;
  return REQUIRED_FIELDS.filter((field) => !row[field]?.trim());
}
