import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i += 1) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function decodeBase32(base32: string): Buffer {
  const normalized = String(base32 ?? "").toUpperCase().replace(/=/g, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < normalized.length; i += 1) {
    const charIndex = BASE32_ALPHABET.indexOf(normalized[i]);
    if (charIndex === -1) continue;
    value = (value << 5) | charIndex;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  return encodeBase32(bytes);
}

export function generateTotpUri(secret: string, email: string): string {
  const cleanEmail = encodeURIComponent(String(email ?? "").trim());
  return `otpauth://totp/Aksora:${cleanEmail}?secret=${secret}&issuer=Aksora&algorithm=SHA1&digits=6&period=30`;
}

export function generateHotp(secretBuffer: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter), 0);

  const hmac = createHmac("sha1", secretBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, "0");
  return otp;
}

export function verifyTotpCode(
  secret: string,
  code: string,
  timeWindow: number = 1,
  nowUnix?: number
): boolean {
  const cleanCode = String(code ?? "").trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    return false;
  }

  const secretBuffer = decodeBase32(secret);
  if (secretBuffer.length === 0) {
    return false;
  }

  const currentTime = nowUnix ?? Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(currentTime / 30);

  const cleanCodeBuffer = Buffer.from(cleanCode, "utf8");

  for (let offset = -timeWindow; offset <= timeWindow; offset += 1) {
    const counter = currentCounter + offset;
    const expectedCode = generateHotp(secretBuffer, counter);
    const expectedBuffer = Buffer.from(expectedCode, "utf8");

    if (
      cleanCodeBuffer.length === expectedBuffer.length &&
      timingSafeEqual(cleanCodeBuffer, expectedBuffer)
    ) {
      return true;
    }
  }

  return false;
}
