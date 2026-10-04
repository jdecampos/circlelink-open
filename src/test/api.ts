import type { PGlite } from '@electric-sql/pglite';
import { newApiKey } from '@/lib/api/key';
import type { Db } from '@/lib/db/client';
import { saveApiKey } from '@/lib/db/queries/api-keys';
import { appOwner, categories, user } from '@/lib/db/schema';
import { createTestDb } from './db';

export const CAT_A = '00000000-0000-0000-0000-00000000000a';
export const CAT_B = '00000000-0000-0000-0000-00000000000b';

/** Base neuve avec le propriétaire, sa clé API et deux catégories. Penser à mocker next/cache. */
export async function setupApi(): Promise<{ db: Db; pg: PGlite; key: string }> {
  const { db, pg } = await createTestDb();
  await db.insert(user).values({ id: 'u1', name: 'J', email: 'alex@example.com' });
  await db.insert(appOwner).values({ email: 'alex@example.com' });
  await db.insert(categories).values([
    { id: CAT_A, name: 'Formations', position: 0 },
    { id: CAT_B, name: 'Outils', position: 1 },
  ]);
  const k = newApiKey();
  await saveApiKey('u1', { prefix: k.prefix, hash: k.hash });
  return { db, pg, key: k.key };
}

type Route = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

/** Appelle une route comme Next le ferait. `body` objet → JSON, chaîne → telle quelle. */
export function call(route: unknown, o: { method?: string; path?: string; key?: string; body?: unknown; params?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (o.key) headers.Authorization = 'Bearer ' + o.key;
  const body = o.body === undefined ? undefined : typeof o.body === 'string' ? o.body : JSON.stringify(o.body);
  const req = new Request('http://localhost' + (o.path ?? '/api/v1'), { method: o.method ?? 'GET', headers, body });
  return (route as Route)(req, { params: Promise.resolve(o.params ?? {}) });
}
