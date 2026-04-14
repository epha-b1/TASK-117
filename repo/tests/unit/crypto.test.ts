import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  sha256Hex,
  encryptAes256Gcm,
  decryptAes256Gcm
} from '../../src/utils/crypto';

describe('crypto utilities', () => {
  it('hashes and verifies a password', async () => {
    const { hash, salt } = await hashPassword('sup3rSecret!');
    expect(hash).toBeTruthy();
    expect(salt).toBeTruthy();
    expect(await verifyPassword('sup3rSecret!', hash, salt)).toBe(true);
    expect(await verifyPassword('wrong', hash, salt)).toBe(false);
  });

  it('produces stable SHA-256 hex', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('AES-256-GCM round-trip with fingerprint check', async () => {
    const plaintext = JSON.stringify({ hello: 'world', n: 42 });
    const bundle = await encryptAes256Gcm(plaintext, 'passphrase-123');
    expect(bundle.version).toBe('1');
    expect(bundle.sha256).toHaveLength(64);
    const decrypted = await decryptAes256Gcm(bundle, 'passphrase-123');
    expect(decrypted).toBe(plaintext);
  });

  it('rejects decrypt with wrong passphrase', async () => {
    const bundle = await encryptAes256Gcm('secret', 'correct');
    await expect(decryptAes256Gcm(bundle, 'wrong')).rejects.toThrow();
  });

  it('rejects tampered ciphertext via fingerprint/AES auth tag', async () => {
    const bundle = await encryptAes256Gcm('payload', 'pass');
    const tampered = { ...bundle, sha256: '0'.repeat(64) };
    await expect(decryptAes256Gcm(tampered, 'pass')).rejects.toThrow();
  });
});
