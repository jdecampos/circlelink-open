import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as schema from '@/lib/db/schema';
import { resetAttempts } from './attempts';
import { prepareSetupCode } from './code';
import { installOwner } from './install';

// Concurrence réelle : deux connexions PostgreSQL (PGlite n'en a qu'une). Base dédiée,
// pour ne pas gêner les autres tests qui écrivent dans "user" et app_owner.
const url = process.env.TEST_DATABASE_URL;
const dedicated = url ? Object.assign(new URL(url), { pathname: '/circlelink_test_setup' }).toString() : '';

describe.skipIf(!url)('installation — deux appels simultanés (PostgreSQL réel)', () => {
  let a: postgres.Sql;
  let b: postgres.Sql;

  beforeAll(async () => {
    const admin = postgres(url!, { max: 1, onnotice: () => {} });
    await admin.unsafe('drop database if exists circlelink_test_setup with (force)');
    await admin.unsafe('create database circlelink_test_setup');
    await admin.end();
    a = postgres(dedicated, { max: 1, onnotice: () => {} });
    b = postgres(dedicated, { max: 1, onnotice: () => {} });
    await migrate(drizzle(a), { migrationsFolder: 'drizzle' });
  });
  afterAll(async () => {
    await a?.end();
    await b?.end();
  });

  it('un seul propriétaire est créé, l’autre appel est refusé', async () => {
    resetAttempts();
    const code = (await prepareSetupCode((q, p) => a.unsafe(q, (p ?? []) as never[]) as Promise<Record<string, unknown>[]>))!;
    const base = { code, name: 'Alex', password: 'motdepasse-solide' };
    const results = await Promise.allSettled([
      installOwner({ ...base, email: 'a@example.com' }, 'ip-a', drizzle(a, { schema })),
      installOwner({ ...base, email: 'b@example.com' }, 'ip-b', drizzle(b, { schema })),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(await a`select count(*)::int as n from app_owner`).toEqual([{ n: 1 }]);
    expect(await a`select count(*)::int as n from "user"`).toEqual([{ n: 1 }]);
  });
});
