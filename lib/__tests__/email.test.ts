import { describe, expect, it } from "vitest";
import { renderEmailTemplate } from "@/lib/email";

describe("Email multi-language support (lib/email.ts)", () => {
  it("renders welcome email in English (default) and Indonesian", () => {
    const en = renderEmailTemplate("welcome", { workspaceName: "Acme Corp", name: "Alex" }, "en");
    expect(en.subject).toBe("Welcome to Aksora — One Team. One Flow.");
    expect(en.html).toContain("Welcome to Aksora!");
    expect(en.html).toContain("Hi Alex,");
    expect(en.html).toContain("Sign in to Workspace");
    expect(en.html).toContain('lang="en"');
    expect(en.text).toContain("Welcome to Aksora");

    const id = renderEmailTemplate("welcome", { workspaceName: "Acme Corp", name: "Alex" }, "id");
    expect(id.subject).toBe("Selamat Datang di Aksora — One Team. One Flow.");
    expect(id.html).toContain("Selamat Datang di Aksora!");
    expect(id.html).toContain("Halo Alex,");
    expect(id.html).toContain("Masuk ke Workspace");
    expect(id.html).toContain('lang="id"');
    expect(id.text).toContain("Selamat datang di Aksora");
  });

  it("renders otp email in both locales", () => {
    const en = renderEmailTemplate("otp", { code: "123456", name: "Alex" }, "en");
    expect(en.subject).toBe("123456 is your Aksora verification code");
    expect(en.html).toContain("Confirm your email address");
    expect(en.html).toContain("10 minutes");

    const id = renderEmailTemplate("otp", { code: "123456", name: "Alex" }, "id");
    expect(id.subject).toBe("123456 adalah kode verifikasi Aksora Anda");
    expect(id.html).toContain("Konfirmasi alamat email Anda");
    expect(id.html).toContain("10 menit");
  });

  it("renders password reset email in both locales", () => {
    const en = renderEmailTemplate("reset-password", { resetUrl: "https://example.com/reset", name: "Alex" }, "en");
    expect(en.subject).toBe("Reset your Aksora password");
    expect(en.html).toContain("Reset Password");

    const id = renderEmailTemplate("reset-password", { resetUrl: "https://example.com/reset", name: "Alex" }, "id");
    expect(id.subject).toBe("Atur ulang kata sandi Aksora Anda");
    expect(id.html).toContain("Atur Ulang Kata Sandi");
  });

  it("renders password reset success email in both locales", () => {
    const en = renderEmailTemplate("reset-success", { name: "Alex" }, "en");
    expect(en.subject).toBe("Your Aksora password was changed");
    expect(en.html).toContain("Password changed successfully");

    const id = renderEmailTemplate("reset-success", { name: "Alex" }, "id");
    expect(id.subject).toBe("Kata sandi Aksora Anda telah diubah");
    expect(id.html).toContain("Kata sandi berhasil diubah");
  });

  it("renders invite accepted email in both locales", () => {
    const en = renderEmailTemplate("invite-accepted", { acceptedEmail: "dev@acme.com", workspaceName: "Core" }, "en");
    expect(en.subject).toBe("dev@acme.com joined Core on Aksora");
    expect(en.html).toContain("Teammate Joined Workspace");

    const id = renderEmailTemplate("invite-accepted", { acceptedEmail: "dev@acme.com", workspaceName: "Core" }, "id");
    expect(id.subject).toBe("dev@acme.com bergabung ke Core di Aksora");
    expect(id.html).toContain("Rekan Tim Bergabung ke Workspace");
  });

  it("renders assigned email in both locales", () => {
    const en = renderEmailTemplate("assigned", { entityType: "Bug", title: "Login bug", assignedBy: "Sarah" }, "en");
    expect(en.subject).toBe("[Aksora] You were assigned: Login bug");
    expect(en.html).toContain("You were assigned a bug");

    const id = renderEmailTemplate("assigned", { entityType: "Bug", title: "Login bug", assignedBy: "Sarah" }, "id");
    expect(id.subject).toBe("[Aksora] Anda ditugaskan: Login bug");
    expect(id.html).toContain("Anda ditugaskan pada bug");
  });

  it("renders sprint deadline email in both locales", () => {
    const en = renderEmailTemplate("sprint-deadline", { sprintName: "Sprint 1", endDate: "2026-08-30", taskCount: 2 }, "en");
    expect(en.subject).toBe('[Aksora] Sprint "Sprint 1" ends 2026-08-30');
    expect(en.html).toContain("<strong>2</strong> tasks due by");

    const id = renderEmailTemplate("sprint-deadline", { sprintName: "Sprint 1", endDate: "2026-08-30", taskCount: 2 }, "id");
    expect(id.subject).toBe('[Aksora] Sprint "Sprint 1" berakhir 2026-08-30');
    expect(id.html).toContain("<strong>2</strong> tugas");
  });

  it("renders daily standup email in both locales", () => {
    const en = renderEmailTemplate("daily-standup", { date: "2026-08-20", taskCount: 3, blockerCount: 1 }, "en");
    expect(en.subject).toBe("[Aksora] Daily Standup Summary — 2026-08-20");
    expect(en.html).toContain("Daily Standup Summary");
    expect(en.html).toContain("1 blocker");

    const id = renderEmailTemplate("daily-standup", { date: "2026-08-20", taskCount: 3, blockerCount: 1 }, "id");
    expect(id.subject).toBe("[Aksora] Ringkasan Standup Harian — 2026-08-20");
    expect(id.html).toContain("Ringkasan Standup Harian");
    expect(id.html).toContain("1 kendala");
  });

  it("falls back cleanly to en when locale is undefined or invalid", () => {
    const res = renderEmailTemplate("welcome", { workspaceName: "Acme" });
    expect(res.subject).toBe("Welcome to Aksora — One Team. One Flow.");
    expect(res.html).toContain('lang="en"');
  });
});
