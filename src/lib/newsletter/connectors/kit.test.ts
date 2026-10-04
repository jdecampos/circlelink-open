import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '@/test/fetch';
import { kit } from './kit';

// Fausse clé assemblée à l'exécution : écrite d'un bloc, elle a le format d'une vraie et
// déclenche les scanners de secrets (GitHub, gitleaks).
const KEY = 'kit_' + '0123456789abcdef'.repeat(2);
const call = { timeoutMs: 1500 };
const sub = { email: 'alex@example.com', source: 'youtube' as const };
afterEach(() => vi.unstubAllGlobals());

describe('connecteur Kit', () => {
  it('liste les tags (en-tête X-Kit-Api-Key)', async () => {
    const sent = mockFetch([200, { tags: [{ id: 5, name: 'circlelink' }], pagination: {} }]);
    expect(await kit.listAudiences(KEY, call)).toEqual([{ id: '5', name: 'circlelink', count: null }]);
    expect(sent[0].url).toBe('https://api.kit.com/v4/tags?per_page=500');
    expect(sent[0].headers['X-Kit-Api-Key']).toBe(KEY);
  });

  it('crée l’abonné puis lui pose le tag', async () => {
    const sent = mockFetch([201, { subscriber: { id: 1 } }], [201, { subscriber: { id: 1 } }]);
    expect(await kit.subscribe(KEY, '5', sub, call)).toEqual({ kind: 'ok' });
    expect(sent.map((s) => [s.method, s.url, s.body])).toEqual([
      ['POST', 'https://api.kit.com/v4/subscribers', { email_address: 'alex@example.com' }],
      ['POST', 'https://api.kit.com/v4/tags/5/subscribers', { email_address: 'alex@example.com' }],
    ]);
  });

  it('création refusée : pas de tag ; tag en 5xx : à réessayer', async () => {
    const sent = mockFetch([422, { errors: ['Email address is invalid'] }]);
    expect((await kit.subscribe(KEY, '5', sub, call)).kind).toBe('permanent');
    expect(sent).toHaveLength(1);
    mockFetch([200, {}], [502, null]);
    expect((await kit.subscribe(KEY, '5', sub, call)).kind).toBe('retry');
  });

  it('compte les abonnés du tag', async () => {
    const sent = mockFetch([200, { subscribers: [], pagination: { total_count: 31 } }]);
    expect(await kit.countSubscribers(KEY, '5', call)).toBe(31);
    expect(sent[0].url).toBe('https://api.kit.com/v4/tags/5/subscribers?per_page=1&include_total_count=true');
  });
});
