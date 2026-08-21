import { moduleConfigs, moduleOrder } from "@/lib/modules";
import type { Field } from "@/lib/modules-core";

// Auto-generates an OpenAPI 3.0 document for /api/public/v1/{module} straight
// from moduleConfigs — this is the single source of truth for module fields,
// so the spec can never drift out of sync with the actual API like a
// hand-written doc page can.

function fieldToJsonSchema(field: Field): Record<string, unknown> {
  if (field.kind === "select") {
    return {
      type: "string",
      enum: field.options.map((o) => o.value),
      description: field.label,
    };
  }
  return {
    type: "string",
    description: field.label,
  };
}

function moduleRequestSchema(moduleKey: string): Record<string, unknown> {
  const config = moduleConfigs[moduleKey as keyof typeof moduleConfigs];
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of config.fields) {
    properties[field.name] = fieldToJsonSchema(field);
    if (field.required) required.push(field.name);
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

export function generateOpenApiSpec(baseUrl: string) {
  const paths: Record<string, unknown> = {};

  for (const moduleKey of moduleOrder) {
    const config = moduleConfigs[moduleKey];
    const requestSchema = moduleRequestSchema(moduleKey);
    const tag = config.shortTitle;

    paths[`/api/public/v1/${moduleKey}`] = {
      get: {
        summary: `List ${tag}`,
        tags: [tag],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Array of records",
            content: { "application/json": { schema: { type: "object", properties: { data: { type: "array" } } } } },
          },
          "401": { description: "Missing or invalid API key" },
          "403": { description: "Key lacks access to this module" },
          "429": { description: "Rate limit exceeded" },
        },
      },
      post: {
        summary: `Create a ${tag} record`,
        tags: [tag],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: requestSchema } },
        },
        responses: {
          "200": { description: "Created" },
          "400": { description: "Validation error" },
          "401": { description: "Missing or invalid API key" },
          "403": { description: "Key lacks access, or is read-only" },
          "429": { description: "Rate limit exceeded" },
        },
      },
      patch: {
        summary: `Update a ${tag} record`,
        tags: [tag],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { id: { type: ["string", "number"] }, data: requestSchema },
                required: ["id"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated" },
          "400": { description: "Validation error, or missing id" },
          "401": { description: "Missing or invalid API key" },
          "403": { description: "Key lacks access, or is read-only" },
          "429": { description: "Rate limit exceeded" },
        },
      },
      delete: {
        summary: `Delete a ${tag} record`,
        tags: [tag],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Deleted" },
          "400": { description: "Missing id" },
          "401": { description: "Missing or invalid API key" },
          "403": { description: "Key lacks access, or is read-only" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    };
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "Aksora REST API",
      description: "Auto-generated from the live module registry — always in sync with what the API actually accepts.",
      version: "1.0.0",
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "Personal API key from Settings > API Keys" },
      },
    },
    paths,
  };
}
