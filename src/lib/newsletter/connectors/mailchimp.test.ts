import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '@/test/fetch';
import { mailchimp } from './mailchimp';

// Fausse clé assemblée à l'exécution : écrite d'un bloc, elle a le format d'une vraie et
// déclenche les scanners de secrets (GitHub, gitleaks).
const FAKE = '0123456789abcdef'.repeat(2);
const KEY = FAKE + '-us21';
const call = { timeoutMs: 1500 };
const sub = { email: 'Alex@Example.com', source: 'instagram' as const };
afterEach(() => vi.unstubAllGlobals());

describe('connecteur Mailchimp', () => {
  it('exige le centre de données à la fin de la clé', () => {
    expect(mailchimp.checkKey(FAKE)).toMatch(/-us21/);
    expect(mailchimp.checkKey(KEY + '.evil.com')).not.toBeNull();
    expect(mailchimp.checkKey(KEY)).toBeNull();
  });

  it('appelle le centre de données de la clé, en authentification basique', async () => {
    const sent = mockFetch([200, { lists: [{ id: 'abc123', name: 'Ma liste', stats: { member_count: 12 } }] }]);
    expect(await mailchimp.listAudiences(KEY, call)).toEqual([{ id: 'abc123', name: 'Ma liste', count: 12 }]);
    expect(sent[0].url).toMatch(/^https:\/\/us21\.api\.mailchimp\.com\/3\.0\/lists\?/);
    expect(sent[0].headers.Authorization).toBe('Basic ' + Buffer.from('circlelink:' + KEY).toString('base64'));
  });

  it('ajoute ou met à jour le membre (PUT sur l’empreinte MD5 de l’email), avec la provenance en tag', async () => {
    const sent = mockFetch([200, { id: 'x' }]);
    expect(await mailchimp.subscribe(KEY, 'abc123', sub, call)).toEqual({ kind: 'ok' });
    const hash = createHash('md5').update('alex@example.com').digest('hex');
    expect(sent[0]).toMatchObject({
      url: `https://us21.api.mailchimp.com/3.0/lists/abc123/members/${hash}`,
      method: 'PUT',
      body: { email_address: 'Alex@Example.com', status_if_new: 'subscribed', tags: ['circlelink', 'source-instagram'] },
    });
  });

  it('« Member In Compliance State » (400) est définitif ; 503 à réessayer', async () => {
    mockFetch([400, { title: 'Member In Compliance State' }], [503, null]);
    expect((await mailchimp.subscribe(KEY, 'abc123', sub, call)).kind).toBe('permanent');
    expect((await mailchimp.subscribe(KEY, 'abc123', sub, call)).kind).toBe('retry');
  });

  it('compte les membres de l’audience', async () => {
    mockFetch([200, { stats: { member_count: 12 } }]);
    expect(await mailchimp.countSubscribers(KEY, 'abc123', call)).toBe(12);
  });
});
