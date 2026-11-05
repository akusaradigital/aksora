import { z } from "zod";

export const CASE_FIELD_KINDS = ["text", "select", "number", "checkbox"] as const;
export type CaseFieldKind = (typeof CASE_FIELD_KINDS)[number];

export type CaseFieldDef = {
  id?: number;
  key: string;
  label: string;
  kind: CaseFieldKind;
  options: string[];
  required: boolean;
  sortOrder: number;
};

export type CustomFieldValues = Record<string, string | number | boolean>;

export const caseFieldSchema = z
  .object({
    key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,39}$/, "Key must be lowercase letters, digits or _ and start with a letter"),
    label: z.string().trim().min(1).max(80),
    kind: z.enum(CASE_FIELD_KINDS),
    options: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
    required: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  })
  .refine((f) => f.kind !== "select" || f.options.length > 0, { message: "Select fields need at least one option", path: ["options"] });

export const caseTemplateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).default(""),
  isDefault: z.boolean().default(false),
  enabled: z.boolean().default(true),
  fields: z
    .object({
      preCondition: z.string().max(5000).optional(),
      testStep: z.string().max(10000).optional(),
      expectedResult: z.string().max(5000).optional(),
      priority: z.string().max(40).optional(),
      typeCase: z.string().max(40).optional(),
      customFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    })
    .default({}),
});

export function parseJsonObject<T extends object>(raw: unknown, fallback: T): T {
  if (raw && typeof raw === "object") return raw as T;
  try {
    const value = JSON.parse(String(raw || ""));
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

/** Maps a DB row (options JSON text, required int) to a CaseFieldDef. */
export function toFieldDef(row: { id?: number; key: string; label: string; kind: string; options: unknown; required: unknown; sortOrder: unknown }): CaseFieldDef {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    kind: (CASE_FIELD_KINDS as readonly string[]).includes(row.kind) ? (row.kind as CaseFieldKind) : "text",
    options: parseJsonObject<string[]>(row.options, []),
    required: Boolean(Number(row.required)),
    sortOrder: Number(row.sortOrder) || 0,
  };
}

/**
 * Validates and normalizes custom field values against the defs. Unknown keys are dropped,
 * numbers are coerced from strings, empty values are omitted. Returns errors keyed by field key.
 */
export function validateCustomFields(defs: CaseFieldDef[], input: unknown): { values: CustomFieldValues; errors: Record<string, string> } {
  const src = parseJsonObject<Record<string, unknown>>(input, {});
  const values: CustomFieldValues = {};
  const errors: Record<string, string> = {};

  for (const def of defs) {
    const raw = src[def.key];
    const empty = raw === undefined || raw === null || raw === "" || (def.kind === "checkbox" && raw === false);
    if (empty) {
      if (def.required) errors[def.key] = `${def.label} is required`;
      else if (def.kind === "checkbox" && raw === false) values[def.key] = false;
      continue;
    }
    if (def.kind === "number") {
      const n = typeof raw === "number" ? raw : Number(String(raw).trim());
      if (!Number.isFinite(n)) errors[def.key] = `${def.label} must be a number`;
      else values[def.key] = n;
    } else if (def.kind === "checkbox") {
      values[def.key] = raw === true || raw === "true" || raw === 1;
    } else if (def.kind === "select") {
      if (!def.options.includes(String(raw))) errors[def.key] = `${def.label} must be one of: ${def.options.join(", ")}`;
      else values[def.key] = String(raw);
    } else {
      values[def.key] = String(raw).slice(0, 2000);
    }
  }
  return { values, errors };
}
