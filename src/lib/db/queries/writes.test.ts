import type { PGlite } from '@electric-sql/pglite';
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/db';
import type { Db } from '../client';
import { categories, links, profile } from '../schema';
import { CategoryNotEmptyError, DuplicateNameError, createCategory, deleteCategory, renameCategory, swapCategories } from './categories';
import { createLink, deleteLink, setLinkVisible, swapLinks, updateLink } from './links';
import { updateProfile } from './profile';

let db: Db;
let pg: PGlite | undefined;
const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const base = { type: 'link' as const, url: 'https://a.fr', description: '', price: '', visible: true };

beforeEach(async () => {
  await pg?.close();
  ({ db, pg } = await createTestDb());
  await db.insert(categories).values([
    { id: A, name: 'Formations', position: 0 },
    { id: B, name: 'Outils', position: 1 },
  ]);
});
afterAll(() => pg?.close());

const order = async () => (await db.select().from(links).orderBy(asc(links.position))).map((l) => l.title);

describe('liens', () => {
  it('insère un lien juste après le dernier de sa catégorie et décale les suivants', async () => {
    await createLink({ ...base, title: 'A1', categoryId: A });
    await createLink({ ...base, title: 'B1', categoryId: B });
    await createLink({ ...base, title: 'A2', categoryId: A });
    expect(await order()).toEqual(['A1', 'A2', 'B1']);
  });

  it('restaure un lien supprimé à sa place, avec son identifiant', async () => {
    await createLink({ ...base, title: 'A1', categoryId: A });
    const id = await createLink({ ...base, title: 'A2', categoryId: A });
    await createLink({ ...base, title: 'A3', categoryId: A });
    const removed = await deleteLink(id);
    expect(await order()).toEqual(['A1', 'A3']);
    await createLink({ ...base, title: 'A2', categoryId: A }, { id, position: removed!.position });
    expect(await order()).toEqual(['A1', 'A2', 'A3']);
    expect((await db.select().from(links).where(eq(links.id, id)))[0].title).toBe('A2');
  });

  it('échange deux positions, modifie et masque', async () => {
    const x = await createLink({ ...base, title: 'X', categoryId: A });
    const y = await createLink({ ...base, title: 'Y', categoryId: A });
    await swapLinks(x, y);
    expect(await order()).toEqual(['Y', 'X']);
    await updateLink(x, { ...base, title: 'X2', categoryId: B });
    await setLinkVisible(x, false);
    const row = (await db.select().from(links).where(eq(links.id, x)))[0];
    expect(row).toMatchObject({ title: 'X2', categoryId: B, visible: false });
  });

  it('supprimer un lien inconnu renvoie null', async () => {
    expect(await deleteLink('00000000-0000-0000-0000-00000000dead')).toBeNull();
  });
});

describe('catégories', () => {
  it('crée en dernière position et refuse un doublon à la casse près', async () => {
    const id = await createCategory('Podcast');
    const c = (await db.select().from(categories).where(eq(categories.id, id)))[0];
    expect(c.position).toBe(2);
    await expect(createCategory('podcast')).rejects.toBeInstanceOf(DuplicateNameError);
    await expect(renameCategory(A, 'OUTILS')).rejects.toBeInstanceOf(DuplicateNameError);
  });

  it('échange deux catégories', async () => {
    await swapCategories(A, B);
    const rows = await db.select().from(categories).orderBy(asc(categories.position));
    expect(rows.map((r) => r.name)).toEqual(['Outils', 'Formations']);
  });

  it('supprime en déplaçant les liens, en une seule transaction', async () => {
    await createLink({ ...base, title: 'A1', categoryId: A });
    await deleteCategory(A, B);
    expect((await db.select().from(links))[0].categoryId).toBe(B);
    expect(await db.$count(categories)).toBe(1);
  });

  it('refuse de supprimer une catégorie non vide sans destination, sans rien changer', async () => {
    await createLink({ ...base, title: 'A1', categoryId: A });
    await expect(deleteCategory(A, null)).rejects.toBeInstanceOf(CategoryNotEmptyError);
    expect(await db.$count(categories)).toBe(2);
  });

  it('annule tout si la destination n’existe pas', async () => {
    await createLink({ ...base, title: 'A1', categoryId: A });
    await expect(deleteCategory(A, '00000000-0000-0000-0000-00000000dead')).rejects.toThrow();
    expect((await db.select().from(links))[0].categoryId).toBe(A);
    expect(await db.$count(categories)).toBe(2);
  });
});

describe('profil', () => {
  it('crée puis met à jour la ligne unique', async () => {
    const p = { name: 'J', handle: 'j', bio: '', location: '', socials: {}, theme: 'clair' as const, link_shape: 'pilule' as const, avatar_url: '' };
    await updateProfile(p);
    await updateProfile({ ...p, name: 'Alex', theme: 'sombre', avatar_url: 'https://cdn.example.com/alex.jpg' });
    const rows = await db.select().from(profile);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 1, name: 'Alex', theme: 'sombre', avatarUrl: 'https://cdn.example.com/alex.jpg' });
  });

  it('la base refuse une photo javascript: ou http:', async () => {
    for (const bad of ['javascript:alert(1)', 'http://cdn.example.com/a.jpg', 'https://sans-point']) {
      await expect(db.insert(profile).values({ id: 1, avatarUrl: bad }).onConflictDoUpdate({ target: profile.id, set: { avatarUrl: bad } })).rejects.toThrow();
    }
  });
});
