import { readdirSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { newApiKey } from '@/lib/api/key';
import type { Db } from '@/lib/db/client';
import { categories, links, profile } from '@/lib/db/schema';
import { CAT_A, call, setupApi } from '@/test/api';
import * as catId from './categories/[id]/route';
import * as catOrder from './categories/order/route';
import * as cats from './categories/route';
import * as imp from './import/route';
import * as linkId from './links/[id]/route';
import * as linkOrder from './links/order/route';
import * as lnks from './links/route';
import * as page from './page/route';
import * as prof from './profile/route';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

// Constitution VII.1 : toutes les routes de /api/v1, sauf le document OpenAPI public.
const ROUTES: Record<string, Record<string, unknown>> = {
  'categories/[id]': catId,
  'categories/order': catOrder,
  categories: cats,
  import: imp,
  'links/[id]': linkId,
  'links/order': linkOrder,
  links: lnks,
  page,
  profile: prof,
};
const handlers = Object.entries(ROUTES).flatMap(([path, mod]) => Object.entries(mod).map(([method, fn]) => [path + ' ' + method, fn] as const));
const body = { name: 'Podcast', title: 't', url: 'https://a.fr', category_id: CAT_A, ids: [CAT_A], categories: [{ name: 'Nouvelle' }] };

let db: Db;
let pg: PGlite;
let key: string;
beforeAll(async () => ({ db, pg, key } = await setupApi()));
afterAll(() => pg.close());

const snapshot = async () => JSON.stringify([await db.select().from(categories), await db.select().from(links), await db.select().from(profile)]);

describe('/api/v1 sans clé valide', () => {
  it('couvre tous les dossiers de route', () => {
    const dirs = readdirSync('src/app/api/v1', { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('route.ts'))
      .map((f) => f.replace(/\/?route\.ts$/, ''))
      .filter((d) => d !== 'openapi.json');
    expect(dirs.sort()).toEqual(Object.keys(ROUTES).sort());
  });

  it.each(handlers)('%s répond 401 et n’écrit rien', async (name, fn) => {
    const before = await snapshot();
    const method = name.split(' ')[1];
    const params = { id: CAT_A };
    for (const k of [undefined, 'cl_' + 'x'.repeat(43), newApiKey().key, 'Basic ' + key]) {
      const res = await call(fn, { method, key: k, body: method === 'GET' || method === 'DELETE' ? undefined : body, params });
      expect(res.status).toBe(401);
      expect(res.headers.get('WWW-Authenticate')).toBe('Bearer');
      expect(await res.text()).not.toContain(key);
    }
    expect(await snapshot()).toBe(before);
  });

  it('accepte la bonne clé', async () => {
    expect((await call(page.GET, { key })).status).toBe(200);
  });
});
