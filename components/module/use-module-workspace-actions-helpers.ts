"use client";

export type ApiPayload = { message?: string; error?: string; item?: Record<string, unknown> };

export async function requestModuleJson<T>(input: string, init: RequestInit): Promise<{ ok: boolean; data: T }> {
  const response = await fetch(input, init);
  const data = (await response.json()) as T;
  return { ok: response.ok, data };
}

export function showApiError(toast: (message: string, type?: "success" | "error" | "info", options?: Record<string, unknown>) => void, data: ApiPayload, fallback: string) {
  toast(data.error ?? fallback, "error");
}

export function showApiSuccess(toast: (message: string, type?: "success" | "error" | "info", options?: Record<string, unknown>) => void, data: ApiPayload, fallback: string) {
  toast(data.message ?? fallback, "success");
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export function refreshWorkspace(router: { refresh: () => void }, setRefreshing: (value: boolean) => void) {
  if (refreshTimer) clearTimeout(refreshTimer);
  setRefreshing(true);
  router.refresh();
  refreshTimer = setTimeout(() => {
    setRefreshing(false);
    refreshTimer = null;
  }, 500);
}

export function scrollToFormSection() {
  setTimeout(() => {
    document.getElementById("module-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
}
