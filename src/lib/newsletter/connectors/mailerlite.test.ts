import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '@/test/fetch';
import { mailerlite } from './mailerlite';

const KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.jeton-de-test-mailerlite';
const call = { timeoutMs: 1500 };
const sub = { email: 'alex@example.com', source: 'direct' as const };
afterEach(() => vi.unstubAllGlobals());

describe('connecteur MailerLite', () => {
  it('liste les groupes (jeton Bearer)', async () => {
    const sent = mockFetch([200, { data: [{ id: '123', name: 'Page de liens', active_count: 8 }] }]);
    expect(await mailerlite.listAudiences(KEY, call)).toEqual([{ id: '123', name: 'Page de liens', count: 8 }]);
    expect(sent[0].url).toBe('https://connect.mailerlite.com/api/groups?limit=100&sort=name');
    expect(sent[0].headers.Authorization).toBe('Bearer ' + KEY);
  });

  it('crée ou met à jour l’abonné dans le groupe', async () => {
    const sent = mockFetch([201, { data: {} }], [200, { data: {} }]);
    expect(await mailerlite.subscribe(KEY, '123', sub, call)).toEqual({ kind: 'ok' });
    expect(await mailerlite.subscribe(KEY, '123', sub, call)).toEqual({ kind: 'ok' });
    expect(sent[0]).toMatchObject({ url: 'https://connect.mailerlite.com/api/subscribers', method: 'POST', body: { email: 'alex@example.com', groups: ['123'] } });
  });

  it('422 définitif, 429 à réessayer', async () => {
    mockFetch([422, { message: 'The given data was invalid.' }], [429, null]);
    expect((await mailerlite.subscribe(KEY, '123', sub, call)).kind).toBe('permanent');
    expect((await mailerlite.subscribe(KEY, '123', sub, call)).kind).toBe('retry');
  });

  it('compte les abonnés actifs du groupe ; groupe disparu : erreur claire', async () => {
    mockFetch([200, { data: [{ id: '123', active_count: 8 }] }], [200, { data: [] }]);
    expect(await mailerlite.countSubscribers(KEY, '123', call)).toBe(8);
    await expect(mailerlite.countSubscribers(KEY, '123', call)).rejects.toThrow('n’existe plus chez MailerLite');
  });
});
