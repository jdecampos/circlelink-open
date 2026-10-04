import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnerRequiredError, requireOwner } from '@/lib/auth/owner';
import * as apiKeys from '@/lib/db/queries/api-keys';
import * as categories from '@/lib/db/queries/categories';
import * as links from '@/lib/db/queries/links';
import * as profile from '@/lib/db/queries/profile';
import * as actions from './actions';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock('@/lib/auth/owner', async (orig) => ({ ...(await orig<typeof import('@/lib/auth/owner')>()), requireOwner: vi.fn() }));
vi.mock('@/lib/db/queries/links', () => ({ createLink: vi.fn(), updateLink: vi.fn(), setLinkVisible: vi.fn(), swapLinks: vi.fn(), deleteLink: vi.fn() }));
vi.mock('@/lib/db/queries/categories', async (orig) => ({
  ...(await orig<typeof import('@/lib/db/queries/categories')>()),
  createCategory: vi.fn(),
  renameCategory: vi.fn(),
  swapCategories: vi.fn(),
  deleteCategory: vi.fn(),
}));
vi.mock('@/lib/db/queries/profile', () => ({ updateProfile: vi.fn() }));
vi.mock('@/lib/db/queries/api-keys', () => ({ saveApiKey: vi.fn(), deleteApiKey: vi.fn() }));

const ID = '00000000-0000-0000-0000-0000000000a1';
const ID2 = '00000000-0000-0000-0000-0000000000a2';
const linkInput = { type: 'link' as const, title: 'Titre', url: 'https://a.fr', category_id: ID, description: '', price: '', visible: true };
const profileInput = { name: 'J', handle: 'jj', bio: '', location: '', socials: {}, theme: 'clair' as const, link_shape: 'pilule' as const };
// Des arguments valides pour chaque action : le refus ne doit venir que de l'absence de session.
const ARGS: Record<string, unknown[]> = {
  saveLink: [linkInput],
  setLinkVisible: [ID, false],
  swapLinks: [ID, ID2],
  deleteLink: [ID],
  restoreLink: [{ ...linkInput, id: ID, position: 0 }],
  createCategory: ['Podcast'],
  renameCategory: [ID, 'Podcast'],
  swapCategories: [ID, ID2],
  deleteCategory: [ID, ID2],
  saveProfile: [profileInput],
  generateApiKey: [],
  revokeApiKey: [],
};
const writes = () => [...Object.values(links), ...Object.values(profile), ...Object.values(apiKeys), categories.createCategory, categories.renameCategory, categories.swapCategories, categories.deleteCategory];

beforeEach(() => vi.clearAllMocks());

describe('actions de l’admin sans session propriétaire', () => {
  const exported = Object.entries(actions).filter(([, v]) => typeof v === 'function');

  it('couvrent toutes les actions exportées', () => {
    expect(exported.map(([k]) => k).sort()).toEqual(Object.keys(ARGS).sort());
  });

  it.each(exported)('%s refuse et n’écrit rien', async (name, fn) => {
    vi.mocked(requireOwner).mockRejectedValue(new OwnerRequiredError());
    const res = await (fn as (...a: unknown[]) => Promise<unknown>)(...ARGS[name]);
    expect(res).toMatchObject({ ok: false, error: 'Action réservée au propriétaire de la page.' });
    for (const w of writes()) expect(w).not.toHaveBeenCalled();
  });
});

describe('validation, avec la session propriétaire', () => {
  beforeEach(() => vi.mocked(requireOwner).mockResolvedValue({ userId: 'u', email: 'alex@example.com' }));

  it('refuse une URL javascript: sans écrire', async () => {
    const res = await actions.saveLink({ ...linkInput, url: 'javascript:alert(1)' });
    expect(res).toEqual({ ok: false, error: 'Adresse invalide. Exemple : https://monsite.fr/page' });
    expect(links.createLink).not.toHaveBeenCalled();
  });

  it('refuse un titre vide et un nom de catégorie trop long', async () => {
    expect(await actions.saveLink({ ...linkInput, title: '  ' })).toMatchObject({ ok: false });
    expect(await actions.createCategory('x'.repeat(25))).toEqual({ ok: false, error: '24 caractères maximum.' });
  });

  it('enregistre un lien valide, https:// ajouté si besoin', async () => {
    vi.mocked(links.createLink).mockResolvedValue(ID);
    expect(await actions.saveLink({ ...linkInput, url: 'tiktok.com/@moi' })).toEqual({ ok: true });
    expect(links.createLink).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://tiktok.com/@moi', categoryId: ID }));
  });

  it('traduit un doublon de catégorie en message clair', async () => {
    vi.mocked(categories.createCategory).mockRejectedValue(new categories.DuplicateNameError());
    expect(await actions.createCategory('Podcast')).toEqual({ ok: false, error: 'Une catégorie porte déjà ce nom.' });
  });

  it('refuse un réseau social invalide', async () => {
    expect(await actions.saveProfile({ ...profileInput, socials: { email: 'pas-un-email' } })).toEqual({ ok: false, error: 'Adresse email de contact invalide.' });
    expect(profile.updateProfile).not.toHaveBeenCalled();
  });

  it('refuse une photo javascript: ou http: sans écrire', async () => {
    for (const avatar_url of ['javascript:alert(1)', 'http://cdn.example.com/a.jpg']) {
      expect(await actions.saveProfile({ ...profileInput, avatar_url })).toMatchObject({ ok: false, error: expect.stringMatching(/^Photo/) });
    }
    expect(profile.updateProfile).not.toHaveBeenCalled();
  });

  it('génère une clé pour le compte connecté et ne renvoie qu’elle', async () => {
    const res = await actions.generateApiKey();
    expect(res).toMatchObject({ ok: true, key: expect.stringMatching(/^cl_[A-Za-z0-9_-]{43}$/) });
    expect(apiKeys.saveApiKey).toHaveBeenCalledWith('u', expect.objectContaining({ prefix: (res as { key: string }).key.slice(0, 11) }));
    expect(JSON.stringify(vi.mocked(apiKeys.saveApiKey).mock.calls)).not.toContain((res as { key: string }).key);
  });

  it('révoque la clé du compte connecté', async () => {
    expect(await actions.revokeApiKey()).toEqual({ ok: true });
    expect(apiKeys.deleteApiKey).toHaveBeenCalledWith('u');
  });
});
