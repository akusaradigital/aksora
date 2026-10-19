import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ dnsLookup: vi.fn() }));
vi.mock("dns/promises", () => ({ lookup: mocks.dnsLookup }));

import { validateOutboundUrl, validateOutboundUrlAsync } from "@/lib/ssrf-guard";

beforeEach(() => {
  mocks.dnsLookup.mockReset();
});

describe("validateOutboundUrl (sync, literal-IP + protocol checks)", () => {
  it("allows a normal public https URL", () => {
    expect(validateOutboundUrl("https://example.com/webhook")).toBeNull();
  });

  it("rejects non-http(s) protocols", () => {
    expect(validateOutboundUrl("ftp://example.com")).toMatch(/http/i);
    expect(validateOutboundUrl("file:///etc/passwd")).toMatch(/http/i);
  });

  it("rejects malformed URLs", () => {
    expect(validateOutboundUrl("not a url")).toMatch(/invalid/i);
  });

  it("rejects literal loopback and private IPv4 addresses", () => {
    expect(validateOutboundUrl("http://127.0.0.1")).toMatch(/private|loopback/i);
    expect(validateOutboundUrl("http://10.0.0.5")).toMatch(/private|loopback/i);
    expect(validateOutboundUrl("http://172.16.0.1")).toMatch(/private|loopback/i);
    expect(validateOutboundUrl("http://192.168.1.1")).toMatch(/private|loopback/i);
  });

  it("rejects the cloud metadata IP", () => {
    expect(validateOutboundUrl("http://169.254.169.254/latest/meta-data/")).toMatch(/private|loopback/i);
  });

  it("rejects literal loopback IPv6", () => {
    expect(validateOutboundUrl("http://[::1]")).toMatch(/private|loopback/i);
  });

  it("rejects the localhost hostname", () => {
    expect(validateOutboundUrl("http://localhost:5432")).toMatch(/not allowed/i);
  });

  it("allows a public IPv4 address", () => {
    expect(validateOutboundUrl("http://93.184.216.34")).toBeNull();
  });
});

describe("validateOutboundUrlAsync (DNS-rebinding protection)", () => {
  it("rejects a hostname that resolves to a private IP", async () => {
    mocks.dnsLookup.mockResolvedValueOnce({ address: "10.0.0.5", family: 4 });
    const result = await validateOutboundUrlAsync("https://rebind.example.com");
    expect(result).toMatch(/private|loopback/i);
  });

  it("allows a hostname that resolves to a public IP", async () => {
    mocks.dnsLookup.mockResolvedValueOnce({ address: "93.184.216.34", family: 4 });
    const result = await validateOutboundUrlAsync("https://example.com");
    expect(result).toBeNull();
  });

  it("rejects when DNS resolution fails", async () => {
    mocks.dnsLookup.mockRejectedValueOnce(new Error("ENOTFOUND"));
    const result = await validateOutboundUrlAsync("https://does-not-exist.invalid");
    expect(result).toMatch(/resolve/i);
  });

  it("skips DNS lookup for a literal public IP (already checked synchronously)", async () => {
    const result = await validateOutboundUrlAsync("http://93.184.216.34");
    expect(result).toBeNull();
    expect(mocks.dnsLookup).not.toHaveBeenCalled();
  });
});
