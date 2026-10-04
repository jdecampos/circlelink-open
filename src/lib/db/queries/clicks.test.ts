import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/db';
import type { Db } from '../client';
import { categories, linkClicks, links } from '../schema';
import { clickCounts, clickSources, trackClick } from './clicks';

let db: Db;
let pg: PGlite;
const CAT = '00000000-0000-0000-0000-000000000001';
const VIS = '00000000-0000-0000-0000-0000000000a1';
const VIS2 = '00000000-0000-0000-0000-0000000000a2';
const HID = '00000000-0000-0000-0000-0000000000b1';

beforeAll(async () => {
  ({ db, pg } = await createTestDb());
  await db.insert(categories).values({ id: CAT, name: 'Cat' });
  await db.insert(links).values([
    { id: VIS, categoryId: CAT, title: 'v', url: 'https://a.fr' },
    { id: VIS2, categoryId: CAT, title: 'v2', url: 'https://b.fr' },
    { id: HID, categoryId: CAT, title: 'h', url: 'https://c.fr', visible: false },
  ]);
});
afterAll(() => pg.close());

describe('clics', () => {
  it('compte un clic sur un lien visible, avec sa provenance', async () => {
    expect(await trackClick(VIS, 'tiktok')).toBe(true);
    const rows = await db.select().from(linkClicks);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ linkId: VIS, source: 'tiktok' });
  });

  it('refuse un lien masqué ou inconnu, sans rien écrire', async () => {
    expect(await trackClick(HID, 'tiktok')).toBe(false);
    expect(await trackClick('00000000-0000-0000-0000-00000000dead', 'x')).toBe(false);
    expect(await db.$count(linkClicks)).toBe(1);
  });

  it('agrège comme les anciennes fonctions click_counts et click_sources', async () => {
    await trackClick(VIS, 'instagram');
    await trackClick(VIS2, 'instagram');
    await db.insert(linkClicks).values({ linkId: VIS2, source: null });
    expect(await clickCounts()).toEqual({ [VIS]: 2, [VIS2]: 2 });
    // provenance absente → direct ; tri par nombre décroissant
    expect(await clickSources()).toEqual([
      { source: 'instagram', clicks: 2 },
      expect.objectContaining({ clicks: 1 }),
      expect.objectContaining({ clicks: 1 }),
    ]);
    expect((await clickSources()).map((s) => s.source).sort()).toEqual(['direct', 'instagram', 'tiktok']);
  });
});
