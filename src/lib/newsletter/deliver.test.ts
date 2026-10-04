import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewsletterConfig } from './config';
import { deliver } from './deliver';
import { removeEmailDnc, upsertContact } from './mautic';

vi.mock('./mautic', () => ({ upsertContact: vi.fn(), removeEmailDnc: vi.fn() }));
const upsert = vi.mocked(upsertContact);
const removeDnc = vi.mocked(removeEmailDnc);

const cfg = { mauticUrl: 'https://m.fr', mauticUsername: 'u', mauticPassword: 'p', segmentAlias: 's', retrySecret: '' } satisfies NewsletterConfig;
const sub = { email: 'marie@example.com', source: 'instagram' } as const;

beforeEach(() => vi.resetAllMocks());

describe('deliver', () => {
  it('ajoute les tags circleLink et de provenance', async () => {
    upsert.mockResolvedValue({ ok: true, contact: { id: 1, doNotContact: [] } });
    expect(await deliver(cfg, sub, { budgetMs: 1500 })).toEqual({ kind: 'ok', contactId: 1 });
    expect(upsert.mock.calls[0][1]).toEqual({ email: 'marie@example.com', tags: ['circleLink', 'source-instagram'] });
  });

  it('ne lève pas le DNC si le contact n’en a pas sur le canal email', async () => {
    upsert.mockResolvedValue({ ok: true, contact: { id: 1, doNotContact: [{ channel: 'sms', reason: 1 }] } });
    await deliver(cfg, sub, { budgetMs: 1500 });
    expect(removeDnc).not.toHaveBeenCalled();
  });

  it('lève le DNC email d’un désinscrit qui se réinscrit', async () => {
    upsert.mockResolvedValue({ ok: true, contact: { id: 9, doNotContact: [{ channel: 'email', reason: 1 }] } });
    removeDnc.mockResolvedValue({ kind: 'ok', contactId: 9 });
    expect(await deliver(cfg, sub, { budgetMs: 1500 })).toEqual({ kind: 'ok', contactId: 9 });
    expect(removeDnc).toHaveBeenCalledWith(cfg, 9, expect.objectContaining({ timeoutMs: expect.any(Number) }));
  });

  it('passe l’échec de l’upsert tel quel', async () => {
    upsert.mockResolvedValue({ ok: false, outcome: { kind: 'permanent', cause: 'HTTP 422' } });
    expect(await deliver(cfg, sub, { budgetMs: 1500 })).toEqual({ kind: 'permanent', cause: 'HTTP 422' });
  });

  it('un délai dépassé sur l’upsert rend retry dans le budget', async () => {
    upsert.mockImplementation(async (_c, _i, { timeoutMs }) => {
      await new Promise((r) => setTimeout(r, timeoutMs));
      return { ok: false, outcome: { kind: 'retry', cause: 'délai dépassé' } };
    });
    const t = Date.now();
    const r = await deliver(cfg, sub, { budgetMs: 100 });
    expect(r.kind).toBe('retry');
    expect(Date.now() - t).toBeLessThan(150);
  });

  it('un échec de la levée DNC rend retry, même sur une erreur 4xx', async () => {
    upsert.mockResolvedValue({ ok: true, contact: { id: 9, doNotContact: [{ channel: 'email', reason: 1 }] } });
    removeDnc.mockResolvedValue({ kind: 'permanent', cause: 'HTTP 404' });
    expect(await deliver(cfg, sub, { budgetMs: 1500 })).toEqual({ kind: 'retry', cause: 'levée du DNC : HTTP 404' });
  });

  it('un budget épuisé avant la levée DNC rend retry sans l’appeler', async () => {
    upsert.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 60));
      return { ok: true, contact: { id: 9, doNotContact: [{ channel: 'email', reason: 1 }] } };
    });
    expect(await deliver(cfg, sub, { budgetMs: 100 })).toEqual({ kind: 'retry', cause: 'budget épuisé avant la levée du DNC' });
    expect(removeDnc).not.toHaveBeenCalled();
  });
});
