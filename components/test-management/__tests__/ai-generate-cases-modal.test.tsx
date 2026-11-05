import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/ai-keys", () => ({
  getActiveAiCredentials: () => ({ provider: "9router" }),
  isAiConfigured: () => true,
}));

import { AiGenerateCasesModal } from "../ai-generate-cases-modal";

describe("AiGenerateCasesModal (Vision & Spec)", () => {
  it("renders modal with AI vision attachment dropzone and clipboard paste hint", () => {
    const html = renderToStaticMarkup(
      <AiGenerateCasesModal
        isOpen={true}
        onClose={() => {}}
        suiteId="1"
        suiteLabel="Auth Flow"
      />
    );

    expect(html).toContain("Generate Test Cases with AI (Vision &amp; Spec)");
    expect(html).toContain("Attach UI Screenshot / Mockup (AI Vision)");
    expect(html).toContain("Supports paste (Ctrl+V)");
    expect(html).toContain("Click to upload, drop image here");
    expect(html).toContain("Generate Test Cases");
  });
});
