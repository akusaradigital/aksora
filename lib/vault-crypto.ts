import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// WARNING: single deployment-wide key derived from VAULT_ENCRYPTION_KEY. If
// this env var is ever lost or rotated without first decrypting and
// re-encrypting every existing VaultEntry row, all previously stored
// passwords become PERMANENTLY UNDECRYPTABLE. There is no key-rotation or
// recovery mechanism here — treat VAULT_ENCRYPTION_KEY like a master password.
const VAULT_KEY_SALT = "aksora-vault-v1"; // fixed: one key from one secret, not per-record salting — per-record uniqueness comes from the random IV below, not the salt.
const KEY_LENGTH = 32; // AES-256
const IV_LENGTH = 12; // GCM-recommended IV length

let cachedKey: Buffer | null = null;

function getVaultKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = (
    process.env.VAULT_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    process.env.RESET_SECRET ||
    "aksora-vault-secret-encryption-master-key-32b"
  ).trim();
  cachedKey = scryptSync(secret, VAULT_KEY_SALT, KEY_LENGTH);
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getVaultKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string {
  const [ivB64, authTagB64, ciphertextB64] = String(stored ?? "").split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted value.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getVaultKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
