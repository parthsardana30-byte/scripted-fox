import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function encryptionKey(base64Key: string) {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("The YouTube token encryption key must contain exactly 32 bytes.");
  return key;
}

export function encryptRefreshToken(refreshToken: string, base64Key: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(base64Key), iv);
  const ciphertext = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptRefreshToken(encryptedToken: string, base64Key: string) {
  const payload = Buffer.from(encryptedToken, "base64");
  if (payload.length <= IV_BYTES + AUTH_TAG_BYTES) throw new Error("The encrypted YouTube token is invalid.");

  const iv = payload.subarray(0, IV_BYTES);
  const authTag = payload.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const ciphertext = payload.subarray(IV_BYTES + AUTH_TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(base64Key), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
