import { describe, expect, it } from "vitest";
import {
  generateTotpSecret,
  generateTotpUri,
  verifyTotpCode,
  generateHotp,
  decodeBase32,
} from "../totp";

describe("totp", () => {
  it("generates a valid base32 secret", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThan(0);
    // 20 bytes should produce 32 base32 chars
    expect(secret.length).toBe(32);
  });

  it("generates a correct OTP URI", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const email = "user@example.com";
    const uri = generateTotpUri(secret, email);
    expect(uri).toBe(
      "otpauth://totp/Aksora:user%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Aksora&algorithm=SHA1&digits=6&period=30"
    );
  });

  it("verifies a valid TOTP code correctly within window", () => {
    const secret = "JBSWY3DPEHPK3PXP"; // Dummy secret
    const secretBuffer = decodeBase32(secret);
    
    // Simulate current time
    const nowUnix = 1600000000; 
    const currentCounter = Math.floor(nowUnix / 30);
    
    const validCode = generateHotp(secretBuffer, currentCounter);
    
    // Verify valid code
    expect(verifyTotpCode(secret, validCode, 1, nowUnix)).toBe(true);
    
    // Verify valid code (previous window)
    const prevCode = generateHotp(secretBuffer, currentCounter - 1);
    expect(verifyTotpCode(secret, prevCode, 1, nowUnix)).toBe(true);

    // Verify valid code (next window)
    const nextCode = generateHotp(secretBuffer, currentCounter + 1);
    expect(verifyTotpCode(secret, nextCode, 1, nowUnix)).toBe(true);
  });

  it("rejects an invalid TOTP code", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const nowUnix = 1600000000;
    
    expect(verifyTotpCode(secret, "123456", 1, nowUnix)).toBe(false);
    expect(verifyTotpCode(secret, "000000", 1, nowUnix)).toBe(false);
    expect(verifyTotpCode(secret, "abcdef", 1, nowUnix)).toBe(false);
    expect(verifyTotpCode(secret, "", 1, nowUnix)).toBe(false);
  });

  it("rejects a valid TOTP code outside of the time window", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const secretBuffer = decodeBase32(secret);
    const nowUnix = 1600000000; 
    const currentCounter = Math.floor(nowUnix / 30);
    
    // Code from 2 windows ago (outside the default +-1 window)
    const oldCode = generateHotp(secretBuffer, currentCounter - 2);
    
    expect(verifyTotpCode(secret, oldCode, 1, nowUnix)).toBe(false);
  });
});
