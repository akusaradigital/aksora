import { describe, expect, it } from "vitest";
import {
  formDataToEntry,
  formatModuleFieldValue,
  moduleConfigs,
  moduleLabels,
  moduleOrder,
  normalizeEntry,
  normalizeModuleEntry,
  parseModuleEntry,
  safeParseModuleEntry,
  type ModuleKey,
} from "@/lib/modules";

const sampleDate = "2026-04-30";
const sampleUrl = "https://example.com/evidence";

function buildValidValue(field: { kind: string; name: string; label: string; options?: { value: string }[] }) {
  if (field.kind === "date") return sampleDate;
  if (field.kind === "url") return sampleUrl;
  if (field.name.toLowerCase().includes("email") || field.label.toLowerCase().includes("email")) {
    return "qa@example.com";
  }
  if (field.kind === "select") return field.options?.[0]?.value ?? `${field.label} value`;
  if (field.kind === "textarea") return `${field.label} details`;
  return `${field.label} value`;
}

function buildValidEntry(module: ModuleKey) {
  const config = moduleConfigs[module];
  return Object.fromEntries(config.fields.map((field) => [field.name, buildValidValue(field)]));
}

describe("module registry", () => {
  it("keeps moduleOrder aligned with moduleConfigs", () => {
    const configKeys = Object.keys(moduleConfigs);

    expect(new Set(moduleOrder).size).toBe(moduleOrder.length);
    expect(new Set(configKeys).size).toBe(configKeys.length);
    expect([...moduleOrder].sort()).toEqual([...configKeys].sort());
  });

  it("derives moduleLabels from shortTitle", () => {
    for (const key of moduleOrder) {
      expect(moduleLabels[key]).toBe(moduleConfigs[key].shortTitle);
    }
  });
});

describe.each(moduleOrder)("%s config contract", (module) => {
  const config = moduleConfigs[module];

  it("exposes stable metadata and field definitions", () => {
    expect(config.title).not.toEqual("");
    expect(config.shortTitle).not.toEqual("");
    expect(config.description).not.toEqual("");
    expect(config.prefix).not.toEqual("");
    expect(config.sheetName).not.toEqual("");
    expect(config.fields.length).toBeGreaterThan(0);
    expect(config.columns.length).toBeGreaterThan(0);

    const fieldNames = config.fields.map((field) => field.name);
    const columnKeys = config.columns.map((column) => column.key);

    expect(new Set(fieldNames).size).toBe(fieldNames.length);
    expect(new Set(columnKeys).size).toBe(columnKeys.length);

    for (const field of config.fields) {
      if (field.span) {
        expect(field.span).toBeGreaterThanOrEqual(1);
        expect(field.span).toBeLessThanOrEqual(3);
      }
    }
  });

  it("parses a generated valid entry", () => {
    const entry = buildValidEntry(module);
    const result = safeParseModuleEntry(module, entry);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(parseModuleEntry(module, entry)).toEqual(result.data);

      const row = config.toRow(result.data as Record<string, unknown>);
      expect(row).toEqual(expect.any(Object));
      expect(Object.keys(row).length).toBeGreaterThan(0);
      expect(Object.values(row).every((value) => typeof value === "string" || typeof value === "number")).toBe(true);
    }
  });

  it("accepts select labels from exported workbooks", () => {
    const entry = buildValidEntry(module);
    const statusField = config.fields.find(
      (field): field is Extract<(typeof config.fields)[number], { kind: "select" }> =>
        field.kind === "select" && Boolean(field.options?.length),
    );
    if (!statusField) return;

    const label = statusField.options[0]?.label;
    const value = statusField.options[0]?.value;
    if (!label || !value) return;

    entry[statusField.name] = label;
    const result = safeParseModuleEntry(module, entry);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(String((result.data as Record<string, string>)[statusField.name])).toBe(value);
    }
  });
});

describe("formDataToEntry", () => {
  it("keeps only string values", () => {
    const formDataLike = {
      forEach(callback: (value: FormDataEntryValue, key: string) => void) {
        callback("Alpha", "name");
        callback({} as FormDataEntryValue, "ignored");
        callback("Beta", "title");
      },
    } as unknown as FormData;

    expect(formDataToEntry(formDataLike)).toEqual({
      name: "Alpha",
      title: "Beta",
    });
  });
});

describe("field formatting", () => {
  it("formats select values as labels and trims plain text", () => {
    const selectField = moduleConfigs["test-plans"].fields.find(
      (field): field is Extract<(typeof moduleConfigs)["test-plans"]["fields"][number], { kind: "select" }> =>
        field.kind === "select" && field.options.length > 0,
    );

    expect(selectField).toBeTruthy();
    if (!selectField) return;

    const option = selectField.options[0];
    expect(option).toBeTruthy();
    if (!option) return;

    expect(formatModuleFieldValue(selectField, option.value)).toBe(option.label);
    expect(formatModuleFieldValue(selectField, option.label.toLowerCase())).toBe(option.label);
    expect(formatModuleFieldValue(selectField, "  ")).toBe("");
    expect(formatModuleFieldValue({ name: "title", label: "Title", kind: "text" }, "  Hello ")).toBe("Hello");
  });

  it("normalizes select labels back to stored values", () => {
    const source = {
      ...buildValidEntry("test-plans"),
      status: "Active",
    };

    expect(normalizeModuleEntry("test-plans", source).status).toBe("active");
  });

  it("normalizes multiline entry values through the facade export", () => {
    expect(normalizeEntry({ notes: "Line 1\r\nLine 2" })).toEqual({
      notes: "Line 1\nLine 2",
    });
  });
});
