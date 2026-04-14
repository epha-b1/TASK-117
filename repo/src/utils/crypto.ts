const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;

function getSubtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('WebCrypto not available');
  }
  return c.subtle;
}

function b64encode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = '';
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  return btoa(str);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function hexEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = '';
  for (let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, '0');
  return out;
}

function randomBytes(len: number): Uint8Array {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return buf;
}

async function deriveBits(password: string, salt: Uint8Array, bits: number): Promise<ArrayBuffer> {
  const subtle = getSubtle();
  const baseKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  return subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    bits
  );
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtle();
  const baseKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(SALT_BYTES);
  const bits = await deriveBits(password, salt, 256);
  return { hash: b64encode(bits), salt: b64encode(salt) };
}

export async function verifyPassword(
  password: string,
  hashB64: string,
  saltB64: string
): Promise<boolean> {
  const salt = b64decode(saltB64);
  const bits = await deriveBits(password, salt, 256);
  const candidate = b64encode(bits);
  return constantTimeEqual(candidate, hashB64);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sha256Hex(input: string): Promise<string> {
  const subtle = getSubtle();
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(input));
  return hexEncode(digest);
}

export interface EncryptedBundle {
  version: string;
  sha256: string;
  salt: string;
  iv: string;
  data: string;
}

export async function encryptAes256Gcm(
  plaintext: string,
  passphrase: string
): Promise<EncryptedBundle> {
  const subtle = getSubtle();
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveAesKey(passphrase, salt);
  const fingerprint = await sha256Hex(plaintext);
  const ct = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    version: '1',
    sha256: fingerprint,
    salt: b64encode(salt),
    iv: b64encode(iv),
    data: b64encode(ct)
  };
}

export async function decryptAes256Gcm(
  bundle: EncryptedBundle,
  passphrase: string
): Promise<string> {
  const subtle = getSubtle();
  if (bundle.version !== '1') throw new Error('Unsupported bundle version');
  const salt = b64decode(bundle.salt);
  const iv = b64decode(bundle.iv);
  const data = b64decode(bundle.data);
  const key = await deriveAesKey(passphrase, salt);
  let plaintextBuf: ArrayBuffer;
  try {
    plaintextBuf = await subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  } catch {
    throw new Error('Decryption failed — bad passphrase or corrupted file');
  }
  const plaintext = new TextDecoder().decode(plaintextBuf);
  const check = await sha256Hex(plaintext);
  if (check !== bundle.sha256) {
    throw new Error('Fingerprint mismatch — file integrity check failed');
  }
  return plaintext;
}
