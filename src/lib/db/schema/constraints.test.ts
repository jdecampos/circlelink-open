import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/db';
import type { Db } from '../client';
import { categories, links, profile } from './index';

let db: Db;
let pg: PGlite;
const CAT = '00000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  ({ db, pg } = await createTestDb());
  await db.insert(categories).values({ id: CAT, name: 'Formations' });
});
afterAll(() => pg.close());

const failsWith = async (p: Promise<unknown>, constraint: string) => {
  const e = await p.then(() => null, (err: unknown) => err);
  expect(e, 'l’insertion aurait dû échouer').not.toBeNull();
  const msg = JSON.stringify(e, Object.getOwnPropertyNames(e as object)) + String((e as Error).cause ?? '');
  expect(msg).toContain(constraint);
};

describe('contraintes de la base', () => {
  it('refuse une URL javascript:', async () => {
    await failsWith(db.insert(links).values({ categoryId: CAT, title: 'x', url: 'javascript:alert(1)' }), 'links_url_check');
  });

  it('accepte https, http et mailto', async () => {
    for (const url of ['https://a.fr', 'http://a.fr/x', 'mailto:moi@example.com']) {
      await expect(db.insert(links).values({ categoryId: CAT, title: 't', url })).resolves.toBeDefined();
    }
  });

  it('refuse une catégorie de 25 caractères', async () => {
    await failsWith(db.insert(categories).values({ name: 'abcdefghijklmnopqrstuvwxy' }), 'categories_name_check');
  });

  it('refuse deux catégories au même nom, à la casse près', async () => {
    await failsWith(db.insert(categories).values({ name: 'formations' }), 'categories_name_key');
  });

  it('refuse un thème inconnu', async () => {
    await failsWith(db.insert(profile).values({ theme: 'bleu' }), 'profile_theme_check');
  });

  it('refuse un réseau social en javascript:', async () => {
    await failsWith(db.insert(profile).values({ socials: { x: 'javascript:alert(1)' } }), 'profile_socials_check');
  });
});
