// ponytail: one small {var} replacer instead of a generic ICU engine — only 2 strings need interpolation.
export function interpolate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => String(vars[key] ?? match));
}
