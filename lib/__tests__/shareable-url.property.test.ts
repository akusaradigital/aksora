import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  parseViewId,
  buildShareableUrl,
  preserveQueryParams,
} from "@/lib/shareable-url";
import { moduleOrder } from "@/lib/modules";

const NUM_RUNS = 100;

/**
 * Property 1: Shareable URL Construction
 *
 * For any valid module key and positive integer ID, verify URL equals
 * `origin + "/" + module + "?view=" + id`
 *
 * **Validates: Requirements 1.1, 2.2, 3.1, 3.3**
 */
describe("Property 1: Shareable URL Construction", () => {
  const moduleKeyArb = fc.constantFrom(...moduleOrder);
  const positiveIdArb = fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER });
  const originArb = fc.oneof(
    fc.constant("https://qa-hub.example.com"),
    fc.constant("http://localhost:3000"),
    fc.constant("https://app.company.io"),
  );

  it("constructed URL equals origin + '/' + module + '?view=' + id", () => {
    fc.assert(
      fc.property(originArb, moduleKeyArb, positiveIdArb, (origin, module, id) => {
        const url = buildShareableUrl(origin, module, id);
        expect(url).toBe(`${origin}/${module}?view=${id}`);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("constructed URL is parseable and contains the correct view param", () => {
    fc.assert(
      fc.property(originArb, moduleKeyArb, positiveIdArb, (origin, module, id) => {
        const url = buildShareableUrl(origin, module, id);
        const parsed = new URL(url);
        expect(parsed.searchParams.get("view")).toBe(String(id));
        expect(parsed.pathname).toBe(`/${module}`);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("works with string IDs as well as numeric IDs", () => {
    fc.assert(
      fc.property(originArb, moduleKeyArb, positiveIdArb, (origin, module, id) => {
        const fromNumber = buildShareableUrl(origin, module, id);
        const fromString = buildShareableUrl(origin, module, String(id));
        expect(fromNumber).toBe(fromString);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

/**
 * Property 2: Query Parameter Preservation
 *
 * For any set of existing query params, adding/removing `view` preserves
 * all other params unchanged.
 *
 * **Validates: Requirements 1.4**
 */
describe("Property 2: Query Parameter Preservation", () => {
  // Generate arbitrary query param key-value pairs (excluding "view")
  const paramKeyArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s !== "view" && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));
  const paramValueArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.length > 0);
  const paramsArb = fc.array(fc.tuple(paramKeyArb, paramValueArb), { minLength: 1, maxLength: 10 });
  const viewIdArb = fc.integer({ min: 1, max: 999999 });

  it("adding view preserves all other params unchanged", () => {
    fc.assert(
      fc.property(paramsArb, viewIdArb, (params, viewId) => {
        const original = new URLSearchParams();
        for (const [key, value] of params) {
          original.set(key, value);
        }

        const result = preserveQueryParams(original, viewId);

        // All original params should still be present with same values
        for (const [key, value] of original.entries()) {
          expect(result.get(key)).toBe(value);
        }
        // view should be set
        expect(result.get("view")).toBe(String(viewId));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("removing view preserves all other params unchanged", () => {
    fc.assert(
      fc.property(paramsArb, viewIdArb, (params, viewId) => {
        // Start with params + a view param
        const original = new URLSearchParams();
        for (const [key, value] of params) {
          original.set(key, value);
        }
        original.set("view", String(viewId));

        const result = preserveQueryParams(original, undefined, true);

        // All non-view params should still be present
        for (const [key, value] of params) {
          expect(result.get(key)).toBe(original.get(key));
        }
        // view should be removed
        expect(result.has("view")).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("does not introduce extra params when adding view", () => {
    fc.assert(
      fc.property(paramsArb, viewIdArb, (params, viewId) => {
        const original = new URLSearchParams();
        for (const [key, value] of params) {
          original.set(key, value);
        }

        const result = preserveQueryParams(original, viewId);

        // Result should have exactly the original keys + "view"
        const resultKeys = new Set<string>();
        result.forEach((_, key) => resultKeys.add(key));

        const expectedKeys = new Set<string>();
        original.forEach((_, key) => expectedKeys.add(key));
        expectedKeys.add("view");

        expect(resultKeys).toEqual(expectedKeys);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

/**
 * Property 3: URL Round-Trip (Open/Close)
 *
 * For any URL without `view`, adding then removing `view` produces
 * equivalent URL (same set of query parameters).
 *
 * **Validates: Requirements 1.2, 4.1**
 */
describe("Property 3: URL Round-Trip (Open/Close)", () => {
  const paramKeyArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s !== "view" && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));
  const paramValueArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.length > 0);
  const paramsArb = fc.array(fc.tuple(paramKeyArb, paramValueArb), { minLength: 0, maxLength: 10 });
  const viewIdArb = fc.integer({ min: 1, max: 999999 });

  it("adding then removing view produces equivalent params to original", () => {
    fc.assert(
      fc.property(paramsArb, viewIdArb, (params, viewId) => {
        // Build original params (no view)
        const original = new URLSearchParams();
        for (const [key, value] of params) {
          original.set(key, value);
        }

        // Add view (simulates opening detail view)
        const withView = preserveQueryParams(original, viewId);

        // Remove view (simulates closing detail view)
        const afterClose = preserveQueryParams(withView, undefined, true);

        // Should be equivalent to original
        expect(afterClose.has("view")).toBe(false);

        // All original params preserved
        for (const [key] of params) {
          expect(afterClose.get(key)).toBe(original.get(key));
        }

        // No extra params introduced
        const afterCloseKeys = new Set<string>();
        afterClose.forEach((_, key) => afterCloseKeys.add(key));

        const originalKeys = new Set<string>();
        original.forEach((_, key) => originalKeys.add(key));

        expect(afterCloseKeys).toEqual(originalKeys);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("round-trip preserves param values exactly", () => {
    fc.assert(
      fc.property(paramsArb, viewIdArb, (params, viewId) => {
        const original = new URLSearchParams();
        for (const [key, value] of params) {
          original.set(key, value);
        }

        const withView = preserveQueryParams(original, viewId);
        const afterClose = preserveQueryParams(withView, undefined, true);

        // Every value in original should match afterClose
        original.forEach((value, key) => {
          expect(afterClose.get(key)).toBe(value);
        });
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

/**
 * Property 4: View Parameter Validation
 *
 * `parseViewId` returns null only for empty/whitespace/null/undefined values.
 * Any non-empty trimmed string is a valid token.
 *
 * **Validates: Requirements 1.5, 5.4**
 */
describe("Property 4: View Parameter Validation", () => {
  // Whitespace-only strings
  const whitespaceArb = fc
    .array(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 1, maxLength: 10 })
    .map((chars) => chars.join(""));

  // Empty string
  const emptyArb = fc.constant("");

  // Any non-empty string (valid tokens)
  const validTokenArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0);

  it("accepts any non-empty trimmed string as valid token", () => {
    fc.assert(
      fc.property(validTokenArb, (value) => {
        const result = parseViewId(value);
        expect(result).toBe(value.trim());
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("rejects whitespace-only strings", () => {
    fc.assert(
      fc.property(whitespaceArb, (value) => {
        expect(parseViewId(value)).toBeNull();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("rejects empty strings", () => {
    fc.assert(
      fc.property(emptyArb, (value) => {
        expect(parseViewId(value)).toBeNull();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("rejects null and undefined", () => {
    expect(parseViewId(null)).toBeNull();
    expect(parseViewId(undefined)).toBeNull();
  });
});
