import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestDb } from '@/test/db';
import { user } from '@/lib/db/schema';
import { installOwner } from '@/lib/setup/install';
import { prepareSetupCode } from '@/lib/setup/code';
import { createResetLink, type Run } from './reset-link';
import { getAuth } from './server';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

let pg: PGlite;
let run: Run;
beforeAll(async () => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-test-secret-test-secret-123');
  vi.stubEnv('SITE_URL', 'http://localhost:3000');
  vi.stubEnv('SMTP_HOST', '');
  const t = await createTestDb();
  pg = t.pg;
  run = async (q, p) => (await pg.query<Record<string, unknown>>(q, p)).rows;
  const code = (await prepareSetupCode(run))!;
  await installOwner({ code, name: 'Alex', email: 'alex@example.com', password: 'ancien-mot-de-passe' }, 'ip', t.db);
  await t.db.insert(user).values({ id: 'u-autre', name: 'Autre', email: 'autre@example.com', emailVerified: true });
});
afterAll(() => {
  vi.unstubAllEnvs();
  return pg.close();
});

describe('réinitialisation en ligne de commande', () => {
  it('refuse un email qui n’est pas celui du propriétaire', async () => {
    await expect(createResetLink(run, 'autre@example.com', 'https://liens.example.com')).rejects.toThrow('n’est pas le compte propriétaire');
    await expect(createResetLink(run, 'inconnu@example.com', 'https://liens.example.com')).rejects.toThrow('n’est pas le compte propriétaire');
  });

  it('le lien fonctionne avec Better Auth, sans SMTP, une seule fois', async () => {
    const link = await createResetLink(run, ' Alex@Example.com ', 'https://liens.example.com/');
    expect(link).toMatch(/^https:\/\/liens\.example\.com\/nouveau-mot-de-passe\?token=[\w-]+$/);
    const token = new URL(link).searchParams.get('token')!;
    await getAuth().api.resetPassword({ body: { newPassword: 'nouveau-mot-de-passe', token } });
    const res = await getAuth().api.signInEmail({ body: { email: 'alex@example.com', password: 'nouveau-mot-de-passe' } });
    expect(res.token).toBeTruthy();
    await expect(getAuth().api.resetPassword({ body: { newPassword: 'encore-un-autre', token } })).rejects.toThrow();
  });

  it('expire au bout de 15 minutes', async () => {
    const link = await createResetLink(run, 'alex@example.com', 'https://liens.example.com', new Date(Date.now() - 16 * 60 * 1000));
    const token = new URL(link).searchParams.get('token')!;
    await expect(getAuth().api.resetPassword({ body: { newPassword: 'nouveau-mot-de-passe', token } })).rejects.toThrow();
  });
});
