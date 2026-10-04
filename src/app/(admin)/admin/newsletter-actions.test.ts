import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnerRequiredError, requireOwner } from '@/lib/auth/owner';
import * as settings from '@/lib/db/queries/newsletter-settings';
import { connector } from '@/lib/newsletter/connectors';
import { ConnectorError } from '@/lib/newsletter/connectors/types';
import * as actions from './newsletter-actions';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock('@/lib/auth/owner', async (orig) => ({ ...(await orig<typeof import('@/lib/auth/owner')>()), requireOwner: vi.fn() }));
vi.mock('@/lib/db/queries/newsletter-settings', async (orig) => ({
  ...(await orig<typeof import('@/lib/db/queries/newsletter-settings')>()),
  getNewsletterView: vi.fn(),
  saveNewsletterSettings: vi.fn(),
  setNewsletterEnabled: vi.fn(),
  disconnectNewsletter: vi.fn(),
  storedKey: vi.fn(),
}));
vi.mock('@/lib/newsletter/connectors', () => ({ connector: vi.fn() }));

const KEY = 'xkeysib-cle-secrete-de-test-0123456789';
const listAudiences = vi.fn();
const checkKey = vi.fn();
const writes = () => [settings.saveNewsletterSettings, settings.setNewsletterEnabled, settings.disconnectNewsletter];
const ARGS: Record<string, unknown[]> = {
  checkNewsletterKey: ['brevo', KEY],
  saveNewsletter: [{ provider: 'brevo', key: KEY, audienceId: '7', enabled: true }],
  setNewsletterEnabled: [true],
  disconnectNewsletter: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  checkKey.mockReturnValue(null);
  listAudiences.mockResolvedValue([{ id: '7', name: 'Inscrits', count: 3 }]);
  vi.mocked(connector).mockReturnValue({ label: 'Brevo', audienceLabel: 'liste', checkKey, listAudiences } as unknown as ReturnType<typeof connector>);
});

describe('actions Newsletter sans session propriétaire', () => {
  const exported = Object.entries(actions).filter(([, v]) => typeof v === 'function');

  it('couvrent toutes les actions exportées', () => {
    expect(exported.map(([k]) => k).sort()).toEqual(Object.keys(ARGS).sort());
  });

  it.each(exported)('%s refuse, sans appel au service ni écriture', async (name, fn) => {
    vi.mocked(requireOwner).mockRejectedValue(new OwnerRequiredError());
    const res = await (fn as (...a: unknown[]) => Promise<unknown>)(...ARGS[name]);
    expect(res).toMatchObject({ ok: false, error: 'Action réservée au propriétaire de la page.' });
    expect(listAudiences).not.toHaveBeenCalled();
    for (const w of writes()) expect(w).not.toHaveBeenCalled();
  });
});

describe('actions Newsletter, propriétaire connectée', () => {
  beforeEach(() => vi.mocked(requireOwner).mockResolvedValue({ userId: 'u', email: 'alex@example.com' }));

  it('Vérifier : renvoie les listes, jamais la clé', async () => {
    const res = await actions.checkNewsletterKey('brevo', '  ' + KEY + ' ');
    expect(res).toEqual({ ok: true, audiences: [{ id: '7', name: 'Inscrits', count: 3 }] });
    expect(listAudiences).toHaveBeenCalledWith(KEY, { timeoutMs: 5000 });
    expect(JSON.stringify(res)).not.toContain(KEY);
  });

  it('clé au mauvais format : refus sans appel réseau', async () => {
    checkKey.mockReturnValue('C’est une clé SMTP.');
    expect(await actions.checkNewsletterKey('brevo', 'xsmtpsib-x')).toEqual({ ok: false, error: 'C’est une clé SMTP.' });
    expect(listAudiences).not.toHaveBeenCalled();
  });

  it('service inconnu, clé refusée : messages clairs', async () => {
    expect(await actions.checkNewsletterKey('mautic' as never, KEY)).toEqual({ ok: false, error: 'Service inconnu.' });
    listAudiences.mockRejectedValue(new ConnectorError('key', 'Clé refusée par Brevo : vérifie qu’elle est complète et active.'));
    expect(await actions.checkNewsletterKey('brevo', KEY)).toMatchObject({ ok: false, error: expect.stringContaining('Clé refusée par Brevo') });
  });

  it('Enregistrer : vérifie la liste chez le service et garde son nom', async () => {
    expect(await actions.saveNewsletter({ provider: 'brevo', key: KEY, audienceId: '7', enabled: true })).toEqual({ ok: true });
    expect(settings.saveNewsletterSettings).toHaveBeenCalledWith({ provider: 'brevo', key: KEY, audienceId: '7', audienceName: 'Inscrits', enabled: true });
  });

  it('Enregistrer sans clé saisie : reprend la clé déjà enregistrée pour ce service', async () => {
    vi.mocked(settings.storedKey).mockResolvedValue(KEY);
    expect(await actions.saveNewsletter({ provider: 'brevo', audienceId: '7', enabled: false })).toEqual({ ok: true });
    expect(listAudiences).toHaveBeenCalledWith(KEY, expect.anything());
  });

  it('liste disparue : refus sans écriture', async () => {
    expect(await actions.saveNewsletter({ provider: 'brevo', key: KEY, audienceId: '99', enabled: true })).toMatchObject({ ok: false });
    expect(settings.saveNewsletterSettings).not.toHaveBeenCalled();
  });

  it('activer sans service connecté : refus', async () => {
    vi.mocked(settings.getNewsletterView).mockResolvedValue({ enabled: false, provider: null, keyHint: null, audienceName: null, keyRejected: false, keyUnreadable: false });
    expect(await actions.setNewsletterEnabled(true)).toEqual({ ok: false, error: 'Connecte d’abord un service.' });
    expect(settings.setNewsletterEnabled).not.toHaveBeenCalled();
    expect(await actions.setNewsletterEnabled(false)).toEqual({ ok: true });
  });
});
