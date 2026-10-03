/**
 * HyperBeam Zero-Knowledge Cryptography Engine
 * Web Crypto API AES-256-GCM
 *
 * Ephemeral 256-bit symmetric encryption keys are created strictly inside
 * the sender's browser and shared via the URL anchor fragment (#key=...).
 * The decryption key NEVER leaves client memory and is never transmitted
 * to signaling servers, databases, or cloud storage.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH_BYTES = 12; // 96 bits standard for AES-GCM

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable so we can serialize into the URL anchor
    ['encrypt', 'decrypt']
  );
}

export async function exportKeyToBase64Url(key: CryptoKey): Promise<string> {
  const raw = await window.crypto.subtle.exportKey('raw', key);
  const bytes = new Uint8Array(raw);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  // Convert standard base64 to base64url safe for URL anchors
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function importKeyFromBase64Url(base64Url: string): Promise<CryptoKey> {
  // Restore padding
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return await window.crypto.subtle.importKey(
    'raw',
    bytes.buffer,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false, // receiver key does not need to be extractable
    ['decrypt']
  );
}

/**
 * Encrypts an ArrayBuffer payload.
 * Prepends the 12-byte IV to the returned Uint8Array: [12-byte IV | Ciphertext + Tag]
 */
export async function encryptBuffer(
  plaintext: ArrayBuffer,
  key: CryptoKey
): Promise<Uint8Array> {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    plaintext
  );

  // Pack [IV (12 bytes) + Ciphertext]
  const packed = new Uint8Array(iv.byteLength + encrypted.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(encrypted), iv.byteLength);

  return packed;
}

/**
 * Decrypts a packed Uint8Array: [12-byte IV | Ciphertext + Tag]
 */
export async function decryptBuffer(
  packedData: Uint8Array,
  key: CryptoKey
): Promise<ArrayBuffer> {
  if (packedData.byteLength <= IV_LENGTH_BYTES) {
    throw new Error('Encrypted payload too short to contain IV');
  }

  const iv = packedData.slice(0, IV_LENGTH_BYTES);
  const ciphertext = packedData.slice(IV_LENGTH_BYTES);

  return await window.crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    ciphertext
  );
}
