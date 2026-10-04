import { updateTag } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuth } from '@/lib/auth/server';
import { SETUP_ERRORS, SetupError, installOwner } from '@/lib/setup/install';
import { hasOwner } from '@/lib/setup/owner';
import { install } from './actions';
import InstallationPage from './page';

vi.mock('next/cache', () => ({ updateTag: vi.fn() }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9, 198.51.100.7' }) }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error('REDIRECT ' + to);
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));
vi.mock('@/lib/setup/owner', () => ({ SETUP_TAG: 'setup', hasOwner: vi.fn() }));
vi.mock('@/lib/setup/install', async (orig) => ({ ...(await orig<typeof import('@/lib/setup/install')>()), installOwner: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getAuth: vi.fn() }));

const signInEmail = vi.fn();
const input = { code: 'ABCD', name: 'Alex', email: 'alex@example.com', password: 'motdepasse-solide' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuth).mockReturnValue({ api: { signInEmail } } as unknown as ReturnType<typeof getAuth>);
});

describe('action install()', () => {
  it('refus : renvoie le message, sans ouvrir de session', async () => {
    vi.mocked(installOwner).mockRejectedValue(new SetupError(SETUP_ERRORS.badCode));
    expect(await install(input)).toEqual({ ok: false, error: SETUP_ERRORS.badCode });
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it('compte l’essai pour l’adresse ajoutée par le proxy', async () => {
    vi.mocked(installOwner).mockRejectedValue(new SetupError(SETUP_ERRORS.badCode));
    await install(input);
    expect(installOwner).toHaveBeenCalledWith(input, '198.51.100.7');
  });

  it('base injoignable : message qui nomme la cause', async () => {
    vi.mocked(installOwner).mockRejectedValue(new Error('ECONNREFUSED'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await install(input)).toMatchObject({ ok: false, error: expect.stringContaining('la base ne répond pas') });
  });

  it('succès : session ouverte, direction /admin', async () => {
    vi.mocked(installOwner).mockResolvedValue({ email: 'alex@example.com' });
    await expect(install(input)).rejects.toThrow('REDIRECT /admin');
    expect(updateTag).toHaveBeenCalledWith('setup');
    expect(updateTag).toHaveBeenCalledWith('public-page');
    expect(signInEmail).toHaveBeenCalledWith(expect.objectContaining({ body: { email: 'alex@example.com', password: 'motdepasse-solide' } }));
  });
});

describe('page /installation', () => {
  it('répond 404 une fois un propriétaire créé', async () => {
    vi.mocked(hasOwner).mockResolvedValue(true);
    await expect(InstallationPage()).rejects.toThrow('NOT_FOUND');
  });

  it('affiche le formulaire tant qu’il n’y a pas de propriétaire', async () => {
    vi.mocked(hasOwner).mockResolvedValue(false);
    await expect(InstallationPage()).resolves.toBeTruthy();
  });
});
