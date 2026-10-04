import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb } from '@/test/db';
import type { Db } from '@/lib/db/client';
import { getAuth } from '@/lib/auth/server';
import { MAX_ATTEMPTS, resetAttempts } from './attempts';
import { prepareSetupCode, type Run } from './code';
import { SETUP_ERRORS, installOwner, type InstallInput } from './install';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

let db: Db;
let pg: PGlite;
let run: Run;
let code: string;
beforeAll(async () => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-test-secret-test-secret-123');
  vi.stubEnv('SITE_URL', 'http://localhost:3000');
  ({ db, pg } = await createTestDb());
  run = async (q, p) => (await pg.query<Record<string, unknown>>(q, p)).rows;
});
afterAll(() => {
  vi.unstubAllEnvs();
  return pg.close();
});
beforeEach(async () => {
  resetAttempts();
  await pg.exec('delete from app_owner; delete from "user"; delete from app_setup; delete from profile;');
  code = (await prepareSetupCode(run))!;
});

const input = (over: Partial<InstallInput> = {}): InstallInput => ({ code, name: 'Alex', email: 'Alex@Example.com', password: 'motdepasse-solide', ...over });
const count = async (table: string) => Number((await run(`select count(*)::int as n from ${table}`))[0].n);

describe('installation', () => {
  it('code faux : refusé, rien n’est écrit', async () => {
    await expect(installOwner(input({ code: 'AAAA-BBBB' }), 'ip-1', db)).rejects.toThrow(SETUP_ERRORS.badCode);
    expect(await count('app_owner')).toBe(0);
    expect(await count('"user"')).toBe(0);
    expect(await count('app_setup')).toBe(1);
  });

  it(`au-delà de ${MAX_ATTEMPTS} essais par IP : refusé, même avec le bon code`, async () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) await expect(installOwner(input({ code: 'faux' }), 'ip-2', db)).rejects.toThrow(SETUP_ERRORS.badCode);
    await expect(installOwner(input(), 'ip-2', db)).rejects.toThrow(SETUP_ERRORS.tooMany);
    expect(await count('app_owner')).toBe(0);
  });

  it('champs invalides : message qui nomme le champ', async () => {
    await expect(installOwner(input({ password: 'court' }), 'ip-3', db)).rejects.toThrow('8 caractères minimum');
    await expect(installOwner(input({ email: 'pas-un-email' }), 'ip-3', db)).rejects.toThrow('Adresse email invalide.');
  });

  it('succès : compte, app_owner, profil nommé, code effacé ; le mot de passe ouvre une session', async () => {
    expect(await installOwner(input({ code: code.toLowerCase().replace(/-/g, ' ') }), 'ip-4', db)).toEqual({ email: 'alex@example.com' });
    expect(await run('select email from app_owner')).toEqual([{ email: 'alex@example.com' }]);
    expect(await run('select name from profile')).toEqual([{ name: 'Alex' }]);
    expect(await count('app_setup')).toBe(0);
    const res = await getAuth().api.signInEmail({ body: { email: 'alex@example.com', password: 'motdepasse-solide' } });
    expect(res.token).toBeTruthy();
  });

  it('second appel, même avec l’ancien code : « déjà terminée »', async () => {
    await installOwner(input(), 'ip-5', db);
    await expect(installOwner(input({ email: 'autre@example.com' }), 'ip-5', db)).rejects.toThrow(SETUP_ERRORS.done);
    expect(await count('app_owner')).toBe(1);
  });

  it('deux appels simultanés : un seul propriétaire', async () => {
    const results = await Promise.allSettled([installOwner(input(), 'ip-6', db), installOwner(input({ email: 'b@example.com' }), 'ip-7', db)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await count('app_owner')).toBe(1);
    expect(await count('"user"')).toBe(1);
  });
});
