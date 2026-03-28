/**
 * Client-side Crypto Module for SecureVault
 * Uses Web Crypto API for encryption/decryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const PBKDF2_ITERATIONS = 100000;
const HASH_ALGORITHM = 'SHA-256';

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to ArrayBuffer
 */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Derive a 256-bit key from the master password using PBKDF2
 */
export async function deriveKey(masterPassword: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(masterPassword);

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    passwordKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Hash password with salt for verification
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest(HASH_ALGORITHM, data);
  return bufferToHex(hashBuffer);
}

/**
 * Encrypt plaintext using AES-256-GCM
 */
export async function encrypt(
  plaintext: string,
  masterPassword: string
): Promise<{ ciphertext: string; iv: string; authTag: string }> {
  const STATIC_SALT = 'securevault-static-salt';
  const key = await deriveKey(masterPassword, STATIC_SALT);
  
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: bufferToHex(encryptedBuffer),
    iv: bufferToHex(iv.buffer),
    authTag: 'aesgcm', // Placeholder for compatibility
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 */
export async function decrypt(
  ciphertext: string,
  iv: string,
  _authTag: string,
  masterPassword: string
): Promise<string> {
  const STATIC_SALT = 'securevault-static-salt';
  const key = await deriveKey(masterPassword, STATIC_SALT);
  
  const encryptedBytes = hexToBuffer(ciphertext);
  const ivBytes = hexToBuffer(iv);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: ivBytes,
    },
    key,
    encryptedBytes.buffer as ArrayBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
