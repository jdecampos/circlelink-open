import type { PGlite } from '@electric-sql/pglite';
import { asc } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/lib/db/client';
import { categories, links } from '@/lib/db/schema';
import type { PageData } from '@/lib/types';
import { call, setupApi } from '@/test/api';
import * as page from '../page/route';
import * as profile from '../profile/route';
import * as imp from './route';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

let db: Db;
let pg: PGlite | undefined;
let key: string;
beforeEach(async () => {
  await pg?.close();
  ({ db, pg, key } = await setupApi());
});
afterAll(() => pg?.close());

const post = (body: unknown) => call(imp.POST, { method: 'POST', key, body });
const profileIn = { name: 'Alex', handle: 'alex', socials: { tiktok: 'tiktok.com/@alex' } };

describe('import en un appel', () => {
  it('ajoute profil, catégories et liens ; réutilise une catégorie existante', async () => {
    const res = await post({
      profile: profileIn,
      categories: [
        { name: 'formations', links: [{ title: 'F1', url: 'https://f.fr' }] },
        { name: 'Lives', links: [{ title: 'L1', url: 'l.fr' }, { title: 'L2', url: 'mailto:moi@example.com', visible: false }] },
      ],
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ categories_created: 1, categories_reused: 1, links_created: 3 });
    const data = (await (await call(page.GET, { key })).json()) as PageData;
    expect(data.profile).toMatchObject({ name: 'Alex', handle: 'alex', socials: { tiktok: 'https://tiktok.com/@alex' } });
    expect(data.categories.map((c) => c.name)).toEqual(['Formations', 'Outils', 'Lives']);
    expect(data.links.map((l) => l.title)).toEqual(['F1', 'L1', 'L2']);
  });

  it('une seule entrée invalide : 422 qui la nomme, et rien n’est écrit', async () => {
    const before = JSON.stringify([await db.select().from(categories).orderBy(asc(categories.name)), await db.select().from(links)]);
    const res = await post({
      profile: profileIn,
      categories: [{ name: 'Nouvelle', links: [{ title: 'ok', url: 'https://a.fr' }] }, { name: 'Autre', links: [{ title: 'ok', url: 'https://a.fr' }, { title: 'x', url: 'javascript:alert(1)' }] }],
    });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('categories[1].links[1] : Adresse invalide. Exemple : https://monsite.fr/page');
    expect(JSON.stringify([await db.select().from(categories).orderBy(asc(categories.name)), await db.select().from(links)])).toBe(before);
    expect(((await (await call(profile.GET, { key })).json()) as { name: string }).name).toBe('');
  });

  it('refuse un import vide ou trop gros', async () => {
    expect((await post({})).status).toBe(422);
    expect((await post({ categories: Array.from({ length: 51 }, (_, i) => ({ name: 'c' + i })) })).status).toBe(422);
  });
});

describe('profil', () => {
  it('PATCH partiel, fusion des réseaux un par un', async () => {
    await call(profile.PATCH, { method: 'PATCH', key, body: profileIn });
    const res = await call(profile.PATCH, { method: 'PATCH', key, body: { bio: 'Hello', socials: { email: 'moi@example.com' } } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: 'Alex', bio: 'Hello', socials: { tiktok: 'https://tiktok.com/@alex', email: 'mailto:moi@example.com' } });
    expect((await call(profile.PATCH, { method: 'PATCH', key, body: { theme: 'bleu' } })).status).toBe(422);
  });
});
