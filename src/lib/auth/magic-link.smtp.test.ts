import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setDbForTests } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { appOwner, user } from '@/lib/db/schema';
import { getAuth } from './server';

// Intégration : vrai PostgreSQL + smtp4dev (compose.dev.yaml). Lancer avec `pnpm test:pg`.
const url = process.env.TEST_DATABASE_URL;
const SMTP_API = 'http://localhost:5080/api/messages';

describe.skipIf(!url)('lien magique — envoi réel vers smtp4dev', () => {
  const sql = postgres(url ?? '', { max: 2, onnotice: () => {} });
  const db = drizzle(sql, { schema });

  beforeAll(async () => {
    Object.assign(process.env, {
      BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-123',
      SITE_URL: 'http://localhost:3000',
      SMTP_HOST: 'localhost',
      SMTP_PORT: '2525',
      SMTP_FROM: 'CircleLink <connexion@example.com>',
    });
    await migrate(db, { migrationsFolder: 'drizzle' });
    setDbForTests(db);
    await db.delete(user);
    await db.insert(user).values({ id: 'u-owner', name: 'Alex', email: 'proprio@example.com', emailVerified: true });
    await db.delete(appOwner);
    await db.insert(appOwner).values({ email: 'proprio@example.com' });
    await fetch(`${SMTP_API}/*`, { method: 'DELETE' });
  });
  afterAll(async () => {
    await db.delete(user);
    await db.delete(appOwner);
    setDbForTests(null);
    await sql.end();
  });

  it('dépose dans smtp4dev un email en français avec la durée de validité', async () => {
    await getAuth().api.signInMagicLink({ body: { email: 'proprio@example.com', callbackURL: '/admin' }, headers: new Headers() });
    let msgs: { id: string; subject: string; to: string[] }[] = [];
    for (let i = 0; i < 20 && !msgs.length; i++) {
      await new Promise((r) => setTimeout(r, 250));
      msgs = ((await (await fetch(SMTP_API)).json()) as { results: typeof msgs }).results;
    }
    expect(msgs).toHaveLength(1);
    expect(msgs[0].subject).toBe('Ton lien de connexion');
    const body = await (await fetch(`${SMTP_API}/${msgs[0].id}/plaintext`)).text();
    expect(body).toContain('Il reste valable 15 minutes.');
    expect(body).toMatch(/http:\/\/localhost:3000\/api\/auth\/magic-link\/verify\?token=/);
  });

  it('n’envoie rien à une adresse qui n’est pas celle du propriétaire', async () => {
    await db.insert(user).values({ id: 'u-autre', name: 'Autre', email: 'autre@example.com', emailVerified: true }).onConflictDoNothing();
    await fetch(`${SMTP_API}/*`, { method: 'DELETE' });
    await getAuth()
      .api.signInMagicLink({ body: { email: 'inconnu@example.com', callbackURL: '/admin' }, headers: new Headers() })
      .catch(() => null);
    await getAuth()
      .api.signInMagicLink({ body: { email: 'autre@example.com', callbackURL: '/admin' }, headers: new Headers() })
      .catch(() => null);
    await new Promise((r) => setTimeout(r, 1000));
    const msgs = ((await (await fetch(SMTP_API)).json()) as { results: unknown[] }).results;
    expect(msgs).toHaveLength(0);
  });
});
