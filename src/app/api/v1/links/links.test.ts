import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/lib/db/client';
import { links } from '@/lib/db/schema';
import type { LinkItem } from '@/lib/types';
import { CAT_A, CAT_B, call, setupApi } from '@/test/api';
import * as one from './[id]/route';
import * as order from './order/route';
import * as all from './route';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

let db: Db;
let pg: PGlite | undefined;
let key: string;
beforeEach(async () => {
  await pg?.close();
  ({ db, pg, key } = await setupApi());
});
afterAll(() => pg?.close());

const create = async (b: Record<string, unknown>) => call(all.POST, { method: 'POST', key, body: { category_id: CAT_A, title: 'Lien', url: 'https://a.fr', ...b } });
const titles = async (q = '') => ((await (await call(all.GET, { key, path: '/x' + q })).json()) as LinkItem[]).map((l) => l.title);

describe('liens par l’API', () => {
  it('crée un lien, https:// ajouté, visible par défaut', async () => {
    const res = await create({ url: 'tiktok.com/@moi', type: 'product', price: '29 €' });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ url: 'https://tiktok.com/@moi', type: 'product', price: '29 €', visible: true, category_id: CAT_A });
  });

  it('422 sur javascript:, titre vide, type inconnu, catégorie inexistante — rien n’est écrit', async () => {
    for (const b of [{ url: 'javascript:alert(1)' }, { title: ' ' }, { type: 'video' }, { category_id: '00000000-0000-0000-0000-00000000dead' }]) {
      expect((await create(b)).status).toBe(422);
    }
    expect(await db.select().from(links)).toHaveLength(0);
  });

  it('PATCH ne change que les champs envoyés', async () => {
    const l = (await (await create({ type: 'featured', description: 'd' })).json()) as LinkItem;
    const res = await call(one.PATCH, { method: 'PATCH', key, body: { visible: false, category_id: CAT_B }, params: { id: l.id } });
    expect(await res.json()).toMatchObject({ title: 'Lien', description: 'd', visible: false, category_id: CAT_B });
    expect((await call(one.PATCH, { method: 'PATCH', key, body: { url: 'data:text/html,x' }, params: { id: l.id } })).status).toBe(422);
  });

  it('lit, filtre par catégorie, supprime ; 404 ensuite', async () => {
    const l = (await (await create({ title: 'A1' })).json()) as LinkItem;
    await create({ title: 'B1', category_id: CAT_B });
    expect(await titles('?category_id=' + CAT_B)).toEqual(['B1']);
    expect((await call(one.GET, { key, params: { id: l.id } })).status).toBe(200);
    expect((await call(one.DELETE, { method: 'DELETE', key, params: { id: l.id } })).status).toBe(204);
    expect((await call(one.GET, { key, params: { id: l.id } })).status).toBe(404);
    expect((await call(one.DELETE, { method: 'DELETE', key, params: { id: l.id } })).status).toBe(404);
  });

  it('réordonne les liens d’une catégorie sans toucher aux autres', async () => {
    const a1 = (await (await create({ title: 'A1' })).json()) as LinkItem;
    const a2 = (await (await create({ title: 'A2' })).json()) as LinkItem;
    await create({ title: 'B1', category_id: CAT_B });
    const a3 = (await (await create({ title: 'A3' })).json()) as LinkItem;
    expect(await titles()).toEqual(['A1', 'A2', 'A3', 'B1']);
    expect((await call(order.PUT, { method: 'PUT', key, body: { ids: [a3.id, a1.id, a2.id] } })).status).toBe(200);
    expect(await titles()).toEqual(['A3', 'A1', 'A2', 'B1']);
  });
});
