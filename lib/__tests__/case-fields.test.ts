import { describe, expect, it } from "vitest";
import { caseFieldSchema, toFieldDef, validateCustomFields, type CaseFieldDef } from "@/lib/case-fields";

const defs: CaseFieldDef[] = [
  { key: "component", label: "Component", kind: "select", options: ["web", "api"], required: true, sortOrder: 0 },
  { key: "estimate", label: "Estimate", kind: "number", options: [], required: false, sortOrder: 1 },
  { key: "smoke", label: "Smoke", kind: "checkbox", options: [], required: false, sortOrder: 2 },
  { key: "note", label: "Note", kind: "text", options: [], required: false, sortOrder: 3 },
];

describe("validateCustomFields", () => {
  it("normalizes valid values and drops unknown keys", () => {
    const res = validateCustomFields(defs, JSON.stringify({ component: "api", estimate: "3", smoke: "true", note: "x", extra: 1 }));
    expect(res.errors).toEqual({});
    expect(res.values).toEqual({ component: "api", estimate: 3, smoke: true, note: "x" });
  });

  it("reports required, bad select and bad number", () => {
    expect(validateCustomFields(defs, {}).errors).toEqual({ component: "Component is required" });
    const res = validateCustomFields(defs, { component: "mobile", estimate: "abc" });
    expect(Object.keys(res.errors).sort()).toEqual(["component", "estimate"]);
  });

  it("treats garbage input as empty", () => {
    expect(validateCustomFields(defs.slice(1), "not json")).toEqual({ values: {}, errors: {} });
  });
});

describe("caseFieldSchema / toFieldDef", () => {
  it("requires options for select fields", () => {
    expect(caseFieldSchema.safeParse({ key: "c", label: "C", kind: "select" }).success).toBe(false);
    expect(caseFieldSchema.safeParse({ key: "Bad Key", label: "C", kind: "text" }).success).toBe(false);
  });

  it("parses DB rows", () => {
    expect(toFieldDef({ key: "c", label: "C", kind: "select", options: '["a"]', required: 1, sortOrder: "2" })).toMatchObject({ options: ["a"], required: true, sortOrder: 2 });
  });
});
