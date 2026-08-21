/**
 * Aksora REST API client — a single dependency-free file.
 *
 * Usage: copy this file into your project (no npm install needed) and:
 *
 *   import { AksoraClient } from "./aksora-client";
 *
 *   const aksora = new AksoraClient({
 *     baseUrl: "https://your-domain.com",
 *     apiKey: process.env.AKSORA_API_KEY!,
 *   });
 *
 *   const { data: bugs } = await aksora.list("bugs");
 *   await aksora.create("tasks", { title: "Add export button", project: "Mobile App" });
 *   await aksora.update("tasks", 12, { status: "done" });
 *   await aksora.remove("bugs", 12);
 *
 * Generate an API key under Settings > API Keys in Aksora. A read-only key
 * can only call list(); create/update/remove require a read & write key.
 * Full field reference: GET {baseUrl}/api/openapi.json
 */

export type AksoraClientOptions = {
  /** e.g. "https://your-domain.com" — no trailing slash. */
  baseUrl: string;
  /** Personal API key, e.g. "aksora_xxxxx". */
  apiKey: string;
};

export class AksoraApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AksoraApiError";
    this.status = status;
  }
}

export class AksoraClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(options: AksoraClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
  }

  private async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new AksoraApiError(payload?.error || `Request failed with status ${res.status}`, res.status);
    }
    return payload as T;
  }

  /** GET /api/public/v1/{module} — list all records. */
  list<T = unknown>(module: string): Promise<{ data: T[] }> {
    return this.request("GET", `/api/public/v1/${module}`);
  }

  /** POST /api/public/v1/{module} — create a record. */
  create(module: string, data: Record<string, unknown>): Promise<{ message: string }> {
    return this.request("POST", `/api/public/v1/${module}`, { data });
  }

  /** PATCH /api/public/v1/{module} — update a record by id. */
  update(module: string, id: string | number, data: Record<string, unknown>): Promise<{ message: string }> {
    return this.request("PATCH", `/api/public/v1/${module}`, { id, data });
  }

  /** DELETE /api/public/v1/{module}?id=... — delete a record by id. */
  remove(module: string, id: string | number): Promise<{ message: string }> {
    return this.request("DELETE", `/api/public/v1/${module}?id=${encodeURIComponent(String(id))}`);
  }
}
