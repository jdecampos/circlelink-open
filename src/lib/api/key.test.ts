import { describe, expect, it } from 'vitest';
import { API_KEY_RE, hashApiKey, newApiKey } from './key';

describe('clé API', () => {
  it('génère des clés différentes, au bon format', () => {
    const a = newApiKey();
    const b = newApiKey();
    expect(a.key).toMatch(API_KEY_RE);
    expect(a.key).not.toBe(b.key);
    expect(a.prefix).toBe(a.key.slice(0, 11));
    expect(a.prefix).toMatch(/^cl_[A-Za-z0-9_-]{8}$/);
  });

  it('empreinte SHA-256 stable, qui ne contient pas la clé', () => {
    const { key, hash } = newApiKey();
    expect(hashApiKey(key)).toBe(hash);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(key.slice(3, 15));
  });
});
