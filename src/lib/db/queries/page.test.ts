import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/db';
import { categories, links, profile } from '../schema';
import { readAdminPage, readPublicPage } from './page';

let pg: PGlite;
const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';

beforeAll(async () => {
  const t = await createTestDb();
  pg = t.pg;
  await t.db.insert(profile).values({ name: 'Alex', handle: 'alex', socials: { tiktok: 'https://tiktok.com/@j' }, linkShape: 'arrondi' });
  await t.db.insert(categories).values([
    { id: B, name: 'Contenus', position: 1 },
    { id: A, name: 'Formations', position: 0 },
  ]);
  await t.db.insert(links).values([
    { categoryId: A, title: 'Visible 2', url: 'https://a.fr/2', position: 2 },
    { categoryId: A, title: 'Masqué', url: 'https://a.fr/m', position: 1, visible: false },
    { categoryId: B, title: 'Visible 1', url: 'https://a.fr/1', position: 0, type: 'product', price: '49 €' },
  ]);
});
afterAll(() => pg.close());

describe('lecture de la page', () => {
  it('la page publique ne contient aucun lien masqué', async () => {
    const p = await readPublicPage();
    expect(p.links.map((l) => l.title)).toEqual(['Visible 1', 'Visible 2']);
  });

  it('l’admin voit tous les liens, triés par position', async () => {
    const p = await readAdminPage();
    expect(p.links.map((l) => l.title)).toEqual(['Visible 1', 'Masqué', 'Visible 2']);
  });

  it('renvoie le format attendu par l’interface (snake_case)', async () => {
    const p = await readPublicPage();
    expect(p.profile).toEqual({ name: 'Alex', handle: 'alex', bio: '', location: '', socials: { tiktok: 'https://tiktok.com/@j' }, theme: 'clair', link_shape: 'arrondi', avatar_url: '', show_credit: true });
    expect(p.categories.map((c) => c.name)).toEqual(['Formations', 'Contenus']);
    expect(p.links[0]).toMatchObject({ category_id: B, type: 'product', price: '49 €', visible: true, description: '' });
  });
});
