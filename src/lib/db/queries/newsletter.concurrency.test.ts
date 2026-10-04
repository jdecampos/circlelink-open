import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as schema from '../schema';
import { newsletterQueue } from '../schema';
import { claimDue } from './newsletter';

// Concurrence réelle : il faut un vrai PostgreSQL (compose.dev.yaml), PGlite n'a qu'une connexion.
// TEST_DATABASE_URL=postgres://circlelink_owner:dev-owner@localhost:54329/circlelink_test pnpm test
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('file newsletter — reprises simultanées (PostgreSQL réel)', () => {
  const a = postgres(url ?? '', { max: 1, onnotice: () => {} });
  const b = postgres(url ?? '', { max: 1, onnotice: () => {} });
  const dbA = drizzle(a, { schema });
  const dbB = drizzle(b, { schema });

  beforeAll(async () => {
    await migrate(dbA, { migrationsFolder: 'drizzle' });
    await dbA.delete(newsletterQueue);
    await dbA.insert(newsletterQueue).values(
      Array.from({ length: 40 }, (_, i) => ({ email: `c${i}@example.com`, source: 'direct', nextAttemptAt: new Date(Date.now() - 60_000) })),
    );
  });
  afterAll(async () => {
    await dbA.delete(newsletterQueue);
    await a.end();
    await b.end();
  });

  it('deux claimDue lancés en même temps ne prennent jamais la même ligne', async () => {
    const [x, y] = await Promise.all([claimDue(30, dbA), claimDue(30, dbB)]);
    const ids = [...x, ...y].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(40);
  });
});
