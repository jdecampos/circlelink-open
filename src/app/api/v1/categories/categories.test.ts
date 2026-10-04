import type { PGlite } from '@electric-sql/pglite';
import { revalidateTag } from 'next/cache';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/lib/db/client';
import { links } from '@/lib/db/schema';
import { CAT_A, CAT_B, call, setupApi } from '@/test/api';
import * as one from './[id]/route';
import * as order from './order/route';
import * as all from './route';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

let db: Db;
let pg: PGlite | undefined;
let key: string;
beforeEach(async () => {
  vi.clearAllMocks();
  await pg?.close();
  ({ db, pg, key } = await setupApi());
});
afterAll(() => pg?.close());

const names = async () => ((await (await call(all.GET, { key })).json()) as { name: string }[]).map((c) => c.name);

describe('catégories par l’API', () => {
  it('crée en dernière position et expire le cache de la page', async () => {
    const res = await call(all.POST, { method: 'POST', key, body: { name: ' Podcast ' } });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ name: 'Podcast', position: 2 });
    expect(await names()).toEqual(['Formations', 'Outils', 'Podcast']);
    expect(revalidateTag).toHaveBeenCalledWith('public-page', { expire: 0 });
  });

  it('422 sur un nom pris (à la casse près), vide ou trop long, sans expirer le cache', async () => {
    for (const name of ['formations', '', 'x'.repeat(25)]) {
      const res = await call(all.POST, { method: 'POST', key, body: { name } });
      expect(res.status).toBe(422);
      expect((await res.json()).error).toBeTruthy();
    }
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('400 sur un JSON illisible', async () => {
    expect((await call(all.POST, { method: 'POST', key, body: '{pas du json' })).status).toBe(400);
  });

  it('renomme, 404 sur un identifiant inconnu', async () => {
    const res = await call(one.PATCH, { method: 'PATCH', key, body: { name: 'Lives' }, params: { id: CAT_A } });
    expect(await res.json()).toMatchObject({ id: CAT_A, name: 'Lives' });
    const unknown = '00000000-0000-0000-0000-00000000dead';
    expect((await call(one.PATCH, { method: 'PATCH', key, body: { name: 'X' }, params: { id: unknown } })).status).toBe(404);
    expect((await call(one.DELETE, { method: 'DELETE', key, params: { id: 'pas-un-uuid' } })).status).toBe(404);
  });

  it('409 pour supprimer une catégorie non vide, 204 en déplaçant ses liens', async () => {
    await db.insert(links).values({ categoryId: CAT_A, title: 'L', url: 'https://a.fr' });
    expect((await call(one.DELETE, { method: 'DELETE', key, params: { id: CAT_A } })).status).toBe(409);
    expect((await call(one.DELETE, { method: 'DELETE', key, path: '/x?move_to=' + CAT_A, params: { id: CAT_A } })).status).toBe(422);
    expect((await call(one.DELETE, { method: 'DELETE', key, path: '/x?move_to=' + CAT_B, params: { id: CAT_A } })).status).toBe(204);
    expect(await names()).toEqual(['Outils']);
    expect((await db.select().from(links))[0].categoryId).toBe(CAT_B);
  });

  it('réordonne, 422 sur un identifiant inconnu ou répété', async () => {
    const res = await call(order.PUT, { method: 'PUT', key, body: { ids: [CAT_B, CAT_A] } });
    expect(res.status).toBe(200);
    expect(await names()).toEqual(['Outils', 'Formations']);
    expect((await call(order.PUT, { method: 'PUT', key, body: { ids: [CAT_A, CAT_A] } })).status).toBe(422);
    expect((await call(order.PUT, { method: 'PUT', key, body: { ids: [CAT_A, '00000000-0000-0000-0000-00000000dead'] } })).status).toBe(422);
    expect((await call(order.PUT, { method: 'PUT', key, body: { ids: 'x' } })).status).toBe(422);
  });
});
