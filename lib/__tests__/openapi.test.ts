import { describe, expect, it } from "vitest";
import { generateOpenApiSpec } from "@/lib/openapi";
import { moduleOrder } from "@/lib/modules";

describe("generateOpenApiSpec", () => {
  it("generates a path with all four verbs for every module", () => {
    const spec = generateOpenApiSpec("https://example.com");
    expect(spec.openapi).toBe("3.0.3");
    expect(spec.servers).toEqual([{ url: "https://example.com" }]);

    for (const moduleKey of moduleOrder) {
      const path = spec.paths[`/api/public/v1/${moduleKey}`] as Record<string, unknown>;
      expect(path).toBeDefined();
      expect(path.get).toBeDefined();
      expect(path.post).toBeDefined();
      expect(path.patch).toBeDefined();
      expect(path.delete).toBeDefined();
    }
  });

  it("marks required fields in the POST request schema", () => {
    const spec = generateOpenApiSpec("https://example.com");
    const bugsPost = spec.paths["/api/public/v1/bugs"] as { post: { requestBody: { content: { "application/json": { schema: { required: string[] } } } } } };
    const required = bugsPost.post.requestBody.content["application/json"].schema.required;
    expect(required).toContain("title");
    expect(required).toContain("severity");
  });

  it("declares bearer auth security scheme", () => {
    const spec = generateOpenApiSpec("https://example.com");
    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({ type: "http", scheme: "bearer" });
  });
});
