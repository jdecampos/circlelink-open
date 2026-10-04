import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '@/test/fetch';
import { brevo } from './brevo';

// Fausse clé assemblée à l'exécution : écrite d'un bloc, elle a le format d'une vraie et
// déclenche les scanners de secrets (GitHub, gitleaks).
const KEY = 'xkeysib-' + '0123456789abcdef'.repeat(2) + '-SECRET';
const call = { timeoutMs: 1500 };
const sub = { email: 'alex@example.com', source: 'tiktok' as const };
afterEach(() => vi.unstubAllGlobals());

describe('connecteur Brevo', () => {
  it('refuse une clé SMTP avant tout appel', () => {
    expect(brevo.checkKey('xsmtpsib-abcdefabcdefabcdefabcdef')).toMatch(/clé SMTP/);
    expect(brevo.checkKey(KEY)).toBeNull();
  });

  it('liste les listes du compte (en-tête api-key)', async () => {
    const sent = mockFetch([200, { lists: [{ id: 7, name: 'Inscrits', uniqueSubscribers: 42 }], count: 1 }]);
    expect(await brevo.listAudiences(KEY, call)).toEqual([{ id: '7', name: 'Inscrits', count: 42 }]);
    expect(sent[0].url).toBe('https://api.brevo.com/v3/contacts/lists?limit=50&offset=0&sort=desc');
    expect(sent[0].headers['api-key']).toBe(KEY);
  });

  it('inscrit le contact dans la liste, sans doublon', async () => {
    const sent = mockFetch([201, { id: 1 }]);
    expect(await brevo.subscribe(KEY, '7', sub, call)).toEqual({ kind: 'ok' });
    expect(sent[0]).toMatchObject({ url: 'https://api.brevo.com/v3/contacts', method: 'POST', body: { email: 'alex@example.com', listIds: [7], updateEnabled: true } });
  });

  it('204 (contact mis à jour) vaut succès ; 400 est définitif ; 429 et 401 sont à réessayer', async () => {
    mockFetch([204, null], [400, { code: 'invalid_parameter' }], [429, null], [401, null]);
    expect((await brevo.subscribe(KEY, '7', sub, call)).kind).toBe('ok');
    expect((await brevo.subscribe(KEY, '7', sub, call)).kind).toBe('permanent');
    expect((await brevo.subscribe(KEY, '7', sub, call)).kind).toBe('retry');
    expect(await brevo.subscribe(KEY, '7', sub, call)).toMatchObject({ kind: 'retry', keyRejected: true });
  });

  it('compte les abonnés de la liste', async () => {
    const sent = mockFetch([200, { id: 7, uniqueSubscribers: 42, totalSubscribers: 45 }]);
    expect(await brevo.countSubscribers(KEY, '7', call)).toBe(42);
    expect(sent[0].url).toBe('https://api.brevo.com/v3/contacts/lists/7');
  });

  it('clé refusée : message qui nomme Brevo, sans la clé', async () => {
    mockFetch([401, { message: 'Key not found' }]);
    const err = await brevo.listAudiences(KEY, call).catch((e: Error) => e);
    expect(String(err)).toContain('Clé refusée par Brevo');
    expect(String(err)).not.toContain(KEY);
  });
});
