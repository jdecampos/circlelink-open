import type { PGlite } from '@electric-sql/pglite';
import { afterAll, describe, expect, it } from 'vitest';
import { setDbForTests } from '@/lib/db/client';
import { createTestDb } from '@/test/db';
import { GET } from './route';

let pg: PGlite | undefined;
afterAll(() => pg?.close());

describe('GET /api/health', () => {
  it('200 quand la base répond', async () => {
    ({ pg } = await createTestDb());
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('503 quand la base est injoignable, sans détail', async () => {
    setDbForTests(null);
    const before = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgres://x:secret-pw@127.0.0.1:1/nope';
    const res = await GET();
    process.env.DATABASE_URL = before;
    setDbForTests(null);
    expect(res.status).toBe(503);
    const body = await res.text();
    expect(body).toBe(JSON.stringify({ ok: false, error: 'base injoignable' }));
  });
});
