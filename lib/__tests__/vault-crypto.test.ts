import { beforeAll, describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/vault-crypto";

beforeAll(() => {
  process.env.VAULT_ENCRYPTION_KEY = "test-only-vault-key-do-not-use-in-prod";
});

describe("vault-crypto", () => {
  it("round-trips plaintext through encrypt/decrypt", () => {
    const secret = "correct-horse-battery-staple";
    const stored = encryptSecret(secret);
    expect(stored.split(":")).toHaveLength(3);
    expect(decryptSecret(stored)).toBe(secret);
  });

  it("produces a different ciphertext on each call for the same plaintext (fresh IV)", () => {
    expect(encryptSecret("same-secret")).not.toBe(encryptSecret("same-secret"));
  });

  it("throws when the auth tag is tampered with", () => {
    const stored = encryptSecret("tamper-me");
    const [iv, authTag, ciphertext] = stored.split(":");
    const tamperedTag = Buffer.from(authTag, "base64");
    tamperedTag[0] ^= 0xff;
    expect(() => decryptSecret([iv, tamperedTag.toString("base64"), ciphertext].join(":"))).toThrow();
  });

  it("throws when the ciphertext is tampered with", () => {
    const stored = encryptSecret("tamper-me-too");
    const [iv, authTag, ciphertext] = stored.split(":");
    const tamperedCipher = Buffer.from(ciphertext, "base64");
    tamperedCipher[0] ^= 0xff;
    expect(() => decryptSecret([iv, authTag, tamperedCipher.toString("base64")].join(":"))).toThrow();
  });

  it("throws on a malformed stored value", () => {
    expect(() => decryptSecret("not-a-valid-value")).toThrow();
  });
});
