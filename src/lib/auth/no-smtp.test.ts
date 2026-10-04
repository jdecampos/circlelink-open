import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestDb } from '@/test/db';
import { getAuth } from './server';
import * as mail from './mail';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('./mail', async (orig) => ({ ...(await orig<typeof import('./mail')>()), sendMail: vi.fn() }));

let pg: PGlite;
beforeAll(async () => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-test-secret-test-secret-123');
  vi.stubEnv('SITE_URL', 'http://localhost:3000');
  vi.stubEnv('SMTP_HOST', '');
  vi.stubEnv('SMTP_FROM', '');
  ({ pg } = await createTestDb());
  await pg.exec(`insert into app_owner (email) values ('alex@example.com');
    insert into "user" (id, name, email, email_verified) values ('u1', 'Alex', 'alex@example.com', true);`);
});
afterAll(() => {
  vi.unstubAllEnvs();
  return pg.close();
});

const post = (path: string, body: unknown) =>
  getAuth().handler(new Request('http://localhost:3000/api/auth' + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify(body) }));

describe('sans SMTP', () => {
  it('le lien magique n’existe pas côté serveur', async () => {
    expect((await post('/sign-in/magic-link', { email: 'alex@example.com' })).status).toBe(404);
    expect(mail.sendMail).not.toHaveBeenCalled();
  });

  it('« mot de passe oublié » n’envoie rien', async () => {
    const res = await post('/request-password-reset', { email: 'alex@example.com', redirectTo: '/nouveau-mot-de-passe' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(mail.sendMail).not.toHaveBeenCalled();
  });
});
