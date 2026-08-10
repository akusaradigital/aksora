export type ValidationField = {
  name: string;
  label: string;
  required?: boolean;
  readonly?: boolean;
};

export function getRequiredFieldErrors(
  fields: ValidationField[],
  formData: FormData,
  ignoredFields: string[] = [],
) {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (!field.required || field.readonly || ignoredFields.includes(field.name)) continue;
    const value = String(formData.get(field.name) ?? "").trim();
    if (!value) {
      errors[field.name] = `${field.label} is required.`;
    }
  }

  return errors;
}
