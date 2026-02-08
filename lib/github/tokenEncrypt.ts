/**
 * Encrypt/decrypt GitHub token for per-user storage.
 * Uses Web Crypto (AES-GCM) so it works in Edge and Node.
 * Key: 32 bytes (64 hex chars) in env GITHUB_TOKEN_ENCRYPTION_KEY.
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

function getKeyBytes(): Uint8Array | null {
  const raw = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!raw || raw.length !== 64 || !/^[0-9a-fA-F]+$/.test(raw)) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function getCryptoKey(): Promise<CryptoKey | null> {
  const keyBytes = getKeyBytes();
  if (!keyBytes) return null;
  const keyBuffer = new ArrayBuffer(32);
  new Uint8Array(keyBuffer).set(keyBytes);
  return crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt plaintext token. Returns base64(IV + ciphertext) or null if encryption key not set.
 */
export async function encryptToken(plaintext: string): Promise<string | null> {
  const key = await getCryptoKey();
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: 128 },
    key,
    encoded,
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt token from base64(IV + ciphertext). Returns null if decryption fails or key not set.
 */
export async function decryptToken(encrypted: string): Promise<string | null> {
  const key = await getCryptoKey();
  if (!key) return null;
  try {
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv, tagLength: 128 },
      key,
      ciphertext,
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}
