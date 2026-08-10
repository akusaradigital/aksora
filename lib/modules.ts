import { type Field, type ModuleKey } from "@/lib/modules-core";
import { moduleConfigs } from "@/lib/module-config-definitions";

export { moduleConfigs };
export type { Option, Field, Column, ModuleConfig } from "@/lib/modules-core";
export { normalizeEntry } from "@/lib/modules-core";
export type { ModuleKey } from "@/lib/modules-core";

export const moduleOrder: ModuleKey[] = [
  "tasks",
  "bugs",
  "test-cases",
  "test-plans",
  "test-sessions",
  "test-suites",
  "meeting-notes",
  "assignees",
  "sprints",
  "users",
  "deployments",
  "work-logs",
];

export const moduleLabels = Object.fromEntries(
  moduleOrder.map((key) => [key, moduleConfigs[key].shortTitle]),
) as Record<ModuleKey, string>;

function findSelectOption(field: Extract<Field, { kind: "select" }>, value: string) {
  const lowered = value.toLowerCase();
  return field.options.find((option) => option.value === value || option.label.toLowerCase() === lowered || option.value.toLowerCase() === lowered);
}

export function formatModuleFieldValue(field: Field, value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (field.kind !== "select") return text;

  const option = findSelectOption(field, text);
  return option?.label ?? text;
}

export function normalizeModuleEntry(module: ModuleKey, entry: Record<string, string>) {
  const normalized = { ...entry };
  for (const field of moduleConfigs[module].fields) {
    if (field.kind !== "select") continue;
    const rawValue = String(entry[field.name] ?? "").trim();
    if (!rawValue) continue;
    const option = findSelectOption(field, rawValue);
    if (option) normalized[field.name] = option.value;
  }
  return normalized;
}

export function formDataToEntry(formData: FormData) {
  const entry: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      entry[key] = value === "undefined" ? "" : value;
    }
  });
  return entry;
}

export function parseModuleEntry(module: ModuleKey, entry: Record<string, string>) {
  return moduleConfigs[module].schema.parse(normalizeModuleEntry(module, entry));
}

export function safeParseModuleEntry(module: ModuleKey, entry: Record<string, string>) {
  return moduleConfigs[module].schema.safeParse(normalizeModuleEntry(module, entry));
}
