import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NewsletterConfig } from './config';
import { classify, countSubscribers, removeEmailDnc, upsertContact } from './mautic';

const cfg: NewsletterConfig = {
  mauticUrl: 'https://auto.exemple.fr',
  mauticUsername: 'api-user',
  mauticPassword: 'mot-de-passe-secret',
  segmentAlias: 'circlelink-joignables',
  retrySecret: '',
};
const EMAIL = 'marie@example.com';

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const f = vi.fn(impl);
  vi.stubGlobal('fetch', f);
  return f;
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('classify', () => {
  it.each([200, 201])('%i → ok', (status) => expect(classify({ status }).kind).toBe('ok'));
  it.each([500, 502, 503, 429, 401, 403])('%i → retry', (status) => expect(classify({ status }).kind).toBe('retry'));
  it.each([400, 404, 422])('%i → permanent', (status) => expect(classify({ status }).kind).toBe('permanent'));

  it('délai dépassé → retry', () => {
    const e = new DOMException('timeout', 'TimeoutError');
    expect(classify({ error: e })).toEqual({ kind: 'retry', cause: 'délai dépassé' });
  });

  it('erreur réseau → retry', () => {
    expect(classify({ error: new TypeError('fetch failed') })).toEqual({ kind: 'retry', cause: 'erreur réseau' });
  });
});

describe('upsertContact', () => {
  it('envoie l’authentification basique, l’email et les tags', async () => {
    const f = mockFetch(async () => json(201, { contact: { id: 42, doNotContact: [] } }));
    const r = await upsertContact(cfg, { email: EMAIL, tags: ['circleLink', 'source-tiktok'] }, { timeoutMs: 1000 });

    expect(r).toEqual({ ok: true, contact: { id: 42, doNotContact: [] } });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://auto.exemple.fr/api/contacts/new');
    expect(init.method).toBe('POST');
    const auth = new Headers(init.headers).get('Authorization');
    expect(auth).toBe('Basic ' + Buffer.from('api-user:mot-de-passe-secret').toString('base64'));
    expect(JSON.parse(String(init.body))).toMatchObject({ email: EMAIL, tags: ['circleLink', 'source-tiktok'] });
  });

  it('renvoie les « ne pas contacter » du contact', async () => {
    mockFetch(async () => json(200, { contact: { id: 7, doNotContact: [{ channel: 'email', reason: 1 }] } }));
    const r = await upsertContact(cfg, { email: EMAIL, tags: ['circleLink'] }, { timeoutMs: 1000 });
    expect(r.ok && r.contact.doNotContact).toEqual([{ channel: 'email', reason: 1 }]);
  });

  it('une erreur ne laisse fuiter ni l’email, ni le corps, ni l’authentification dans la cause', async () => {
    mockFetch(async () => json(422, { errors: [{ message: `${EMAIL} est invalide` }] }));
    const r = await upsertContact(cfg, { email: EMAIL, tags: ['circleLink'] }, { timeoutMs: 1000 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.outcome.kind).toBe('permanent');
    const cause = r.outcome.kind === 'ok' ? '' : r.outcome.cause;
    expect(cause).toBe('HTTP 422');
    expect(cause).not.toContain(EMAIL);
    expect(cause).not.toContain('Basic');
  });

  it('une réponse 2xx sans contact exploitable est un retry', async () => {
    mockFetch(async () => json(200, { pas: 'de contact' }));
    const r = await upsertContact(cfg, { email: EMAIL, tags: ['circleLink'] }, { timeoutMs: 1000 });
    expect(r).toEqual({ ok: false, outcome: { kind: 'retry', cause: 'réponse Mautic inattendue' } });
  });

  it('respecte le délai d’attente', async () => {
    mockFetch((_url, init) => new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(init.signal?.reason))));
    const t = Date.now();
    const r = await upsertContact(cfg, { email: EMAIL, tags: ['circleLink'] }, { timeoutMs: 50 });
    expect(Date.now() - t).toBeLessThan(500);
    expect(r).toEqual({ ok: false, outcome: { kind: 'retry', cause: 'délai dépassé' } });
  });
});

describe('removeEmailDnc', () => {
  it('appelle dnc/email/remove du contact', async () => {
    const f = mockFetch(async () => json(200, { contact: { id: 7, doNotContact: [] } }));
    expect(await removeEmailDnc(cfg, 7, { timeoutMs: 1000 })).toEqual({ kind: 'ok', contactId: 7 });
    expect(f.mock.calls[0][0]).toBe('https://auto.exemple.fr/api/contacts/7/dnc/email/remove');
    expect(f.mock.calls[0][1].method).toBe('POST');
  });

  it('un 500 est un retry', async () => {
    mockFetch(async () => json(500, {}));
    expect((await removeEmailDnc(cfg, 7, { timeoutMs: 1000 })).kind).toBe('retry');
  });
});

describe('countSubscribers', () => {
  it('compte les membres du segment configuré', async () => {
    const f = mockFetch(async () => json(200, { total: '128', contacts: {} }));
    expect(await countSubscribers(cfg, { timeoutMs: 1000 })).toBe(128);
    const url = new URL(f.mock.calls[0][0]);
    expect(url.pathname).toBe('/api/contacts');
    expect(url.searchParams.get('search')).toBe('segment:circlelink-joignables');
    expect(url.searchParams.get('limit')).toBe('1');
  });

  it('renvoie null sur 500', async () => {
    mockFetch(async () => json(500, {}));
    expect(await countSubscribers(cfg, { timeoutMs: 1000 })).toBeNull();
  });

  it('renvoie null quand le délai est dépassé', async () => {
    mockFetch((_url, init) => new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(init.signal?.reason))));
    expect(await countSubscribers(cfg, { timeoutMs: 50 })).toBeNull();
  });
});
