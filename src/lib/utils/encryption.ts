import "server-only";

const VERSION_PREFIX = "v1:";
const KEY_BYTE_LENGTH = 32;
const IV_BYTE_LENGTH = 12;

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY env var is missing. Generate with `openssl rand -hex 32`.",
    );
  }
  if (hex.length !== KEY_BYTE_LENGTH * 2 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must be ${KEY_BYTE_LENGTH * 2} hex chars (${KEY_BYTE_LENGTH} bytes).`,
    );
  }
  const raw = hexToBytes(hex);
  cachedKey = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  return cachedKey;
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(IV_BYTE_LENGTH)));
  const data = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const cipher = new Uint8Array(cipherBuf);
  const combined = new Uint8Array(new ArrayBuffer(iv.length + cipher.length));
  combined.set(iv, 0);
  combined.set(cipher, iv.length);
  return VERSION_PREFIX + bytesToBase64(combined);
}

export async function decrypt(payload: string): Promise<string> {
  if (!payload.startsWith(VERSION_PREFIX)) {
    throw new Error(`Encrypted payload missing ${VERSION_PREFIX} prefix`);
  }
  const key = await getKey();
  const combined = base64ToBytes(payload.slice(VERSION_PREFIX.length));
  if (combined.length <= IV_BYTE_LENGTH) {
    throw new Error("Encrypted payload too short");
  }
  const iv = combined.slice(0, IV_BYTE_LENGTH);
  const cipher = combined.slice(IV_BYTE_LENGTH);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plainBuf);
}
