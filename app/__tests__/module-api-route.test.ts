import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  getCurrentUser: vi.fn(),
  isAdminUser: vi.fn(),
  createModuleRecord: vi.fn(),
  updateModuleRecord: vi.fn(),
  updateModuleStatus: vi.fn(),
  makePublicToken: vi.fn(() => "token-123"),
  db: {
    get: vi.fn(),
  },
  formDataToEntry: vi.fn(),
  normalizeModuleEntry: vi.fn((_moduleKey: string, entry: Record<string, unknown>) => entry),
  logError: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/auth-core", () => ({ isAdminUser: mocks.isAdminUser }));
vi.mock("@/lib/data", () => ({
  createModuleRecord: mocks.createModuleRecord,
  updateModuleRecord: mocks.updateModuleRecord,
  updateModuleStatus: mocks.updateModuleStatus,
  makePublicToken: mocks.makePublicToken,
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/modules", () => ({
  formDataToEntry: mocks.formDataToEntry,
  normalizeModuleEntry: mocks.normalizeModuleEntry,
  moduleConfigs: {
    bugs: {
      schema: { safeParse: (value: Record<string, string>) => ({ success: true, data: value }) },
      coerce: (value: Record<string, string>) => value,
      shortTitle: "Bugs",
    },
  },
  moduleOrder: ["bugs"],
}));
vi.mock("@/lib/logger", () => ({ friendlyErrorMessage: (_error: unknown, fallback: string) => fallback, logError: mocks.logError }));

import { POST, PATCH } from "@/app/api/items/[module]/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: 1, name: "Rina", role: "pm", company: "acme", email: "rina@example.com" });
  mocks.isAdminUser.mockReturnValue(false);
});

function makeRequest(body: Record<string, unknown>) {
  return {
    headers: new Headers(),
    formData: async () => {
      const form = new FormData();
      Object.entries(body).forEach(([key, value]) => form.set(key, String(value)));
      return form;
    },
    json: async () => body,
  } as any;
}

describe("module api route", () => {
  it("allows cross-assignment on POST for non-admin", async () => {
    mocks.formDataToEntry.mockReturnValue({ suggestedDev: "Budi", title: "Bug 1" });

    const response = await POST(makeRequest({ suggestedDev: "Budi", title: "Bug 1" }), { params: Promise.resolve({ module: "bugs" }) } as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.message).toContain("Bugs added successfully");
    expect(mocks.createModuleRecord).toHaveBeenCalled();
  });

  it("allows cross-assignment on PATCH for non-admin", async () => {
    const response = await PATCH(makeRequest({ id: 1, entry: { suggestedDev: "Budi", title: "Bug 1" } }), { params: Promise.resolve({ module: "bugs" }) } as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.message).toContain("Bugs updated successfully");
    expect(mocks.updateModuleRecord).toHaveBeenCalled();
  });

  it("allows cross-assignment on POST for admin users", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      name: "Admin",
      role: "admin",
      company: "",
      email: "admin@example.com",
    });
    mocks.isAdminUser.mockReturnValueOnce(true);
    mocks.formDataToEntry.mockReturnValue({ suggestedDev: "Budi", title: "Bug 1" });
    mocks.createModuleRecord.mockResolvedValueOnce(undefined);

    const response = await POST(
      makeRequest({ suggestedDev: "Budi", title: "Bug 1" }),
      { params: Promise.resolve({ module: "bugs" }) } as any,
    );

    expect(response.status).toBe(200);
    expect(mocks.createModuleRecord).toHaveBeenCalled();
  });
});
