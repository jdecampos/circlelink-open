import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueue } from '@/lib/db/queries/newsletter';
import { readConfig } from './config';
import { deliver } from './deliver';
import { handleSubscription } from './subscription';

vi.mock('./deliver', () => ({ deliver: vi.fn() }));
vi.mock('./config', () => ({ readConfig: vi.fn() }));
vi.mock('@/lib/db/queries/newsletter', () => ({ enqueue: vi.fn() }));

const EMAIL = 'marie@example.com';
const INSTAGRAM_UA = 'Mozilla/5.0 (iPhone) AppleWebKit Instagram 350.0';
const TIKTOK_UA = 'Mozilla/5.0 (iPhone) AppleWebKit BytedanceWebview/d8a21c6';
const cfg = { mauticUrl: 'https://m.fr', mauticUsername: 'u', mauticPassword: 'p', segmentAlias: 's', retrySecret: '' };

let logs: unknown[][];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('MAUTIC_URL', 'https://m.fr');
  vi.stubEnv('MAUTIC_USERNAME', 'u');
  vi.stubEnv('MAUTIC_PASSWORD', 'p');
  vi.mocked(readConfig).mockReturnValue(cfg);
  vi.mocked(enqueue).mockResolvedValue();
  logs = [];
  for (const m of ['log', 'info', 'warn', 'error'] as const) vi.spyOn(console, m).mockImplementation((...a) => void logs.push(a));
});
afterEach(() => {
  // quelle que soit l'issue, aucune ligne journalisée ne contient l'email
  expect(JSON.stringify(logs)).not.toContain(EMAIL);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('handleSubscription', () => {
  it('refuse un email invalide sans appeler Mautic', async () => {
    const r = await handleSubscription({ email: 'pas-un-email', referrer: '', userAgent: '' });
    expect(r).toEqual({ ok: false, error: 'Cette adresse semble incomplète. Exemple : prenom@example.com' });
    expect(deliver).not.toHaveBeenCalled();
  });

  it('transmet l’email normalisé à Mautic, sans mise en file si tout va bien', async () => {
    vi.mocked(deliver).mockResolvedValue({ kind: 'ok', contactId: 1 });
    const r = await handleSubscription({ email: '  Marie@Example.COM ', referrer: '', userAgent: INSTAGRAM_UA });
    expect(r).toEqual({ ok: true });
    expect(deliver).toHaveBeenCalledWith(cfg, { email: EMAIL, source: 'instagram' }, { budgetMs: 1500 });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('détecte TikTok par le User-Agent du navigateur intégré', async () => {
    vi.mocked(deliver).mockResolvedValue({ kind: 'ok', contactId: 1 });
    await handleSubscription({ email: EMAIL, referrer: '', userAgent: TIKTOK_UA });
    expect(vi.mocked(deliver).mock.calls[0][1].source).toBe('tiktok');
  });

  it('détecte la provenance par la page d’origine à défaut de User-Agent', async () => {
    vi.mocked(deliver).mockResolvedValue({ kind: 'ok', contactId: 1 });
    await handleSubscription({ email: EMAIL, referrer: 'https://l.facebook.com/l.php?u=x', userAgent: 'Mozilla/5.0' });
    expect(vi.mocked(deliver).mock.calls[0][1].source).toBe('facebook');
  });

  it('retry : met en file puis annonce le succès au visiteur', async () => {
    vi.mocked(deliver).mockResolvedValue({ kind: 'retry', cause: 'HTTP 503' });
    const r = await handleSubscription({ email: EMAIL, referrer: '', userAgent: TIKTOK_UA });
    expect(r).toEqual({ ok: true });
    expect(enqueue).toHaveBeenCalledWith(EMAIL, 'tiktok');
  });

  it('retry puis échec de la mise en file : erreur générique', async () => {
    vi.mocked(deliver).mockResolvedValue({ kind: 'retry', cause: 'délai dépassé' });
    vi.mocked(enqueue).mockRejectedValue(Object.assign(new Error('boom ' + EMAIL), { code: '53300' }));
    const r = await handleSubscription({ email: EMAIL, referrer: '', userAgent: '' });
    expect(r).toEqual({ ok: false, error: 'Inscription impossible pour le moment. Réessaie dans un instant.' });
  });

  it('permanent : erreur générique, sans mise en file', async () => {
    vi.mocked(deliver).mockResolvedValue({ kind: 'permanent', cause: 'HTTP 422' });
    const r = await handleSubscription({ email: EMAIL, referrer: '', userAgent: '' });
    expect(r).toEqual({ ok: false, error: 'Inscription impossible pour le moment. Réessaie dans un instant.' });
    expect(enqueue).not.toHaveBeenCalled();
    expect(JSON.stringify(logs)).toContain('HTTP 422');
  });

  it('Mautic non configuré : refus clair, ni appel réseau ni mise en file', async () => {
    vi.stubEnv('MAUTIC_URL', '');
    const r = await handleSubscription({ email: EMAIL, referrer: '', userAgent: '' });
    expect(r).toEqual({ ok: false, error: 'La newsletter n’est pas configurée sur cette page.' });
    expect(deliver).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });
});
