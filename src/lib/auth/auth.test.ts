import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestDb } from '@/test/db';
import type { Db } from '@/lib/db/client';
import { appOwner, user } from '@/lib/db/schema';
import { magicLinkMail, resetPasswordMail } from './mail';
import { OwnerRequiredError, ownerFrom, requireOwner } from './owner';
import { AUTH_DURATIONS, getAuth } from './server';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

let db: Db;
let pg: PGlite;
beforeAll(async () => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-test-secret-test-secret-123');
  vi.stubEnv('SITE_URL', 'http://localhost:3000');
  ({ db, pg } = await createTestDb());
  await db.insert(appOwner).values({ email: 'alex@example.com' });
  await db.insert(user).values([
    { id: 'u-owner', name: 'Alex', email: 'alex@example.com', emailVerified: true },
    { id: 'u-autre', name: 'Autre', email: 'autre@example.com', emailVerified: true },
  ]);
});
afterAll(() => {
  vi.unstubAllEnvs();
  return pg.close();
});

describe('contrôle propriétaire', () => {
  it('sans session : pas de propriétaire', async () => {
    expect(await ownerFrom(null)).toBeNull();
  });

  it('compte absent d’app_owner : pas de propriétaire', async () => {
    expect(await ownerFrom({ user: { id: 'u-autre', email: 'autre@example.com' } })).toBeNull();
  });

  it('propriétaire : session reconnue, email comparé sans la casse', async () => {
    expect(await ownerFrom({ user: { id: 'u-owner', email: 'Alex@Example.com' } })).toEqual({ userId: 'u-owner', email: 'alex@example.com' });
  });

  it('requireOwner lève OwnerRequiredError sans session valide', async () => {
    await expect(requireOwner()).rejects.toBeInstanceOf(OwnerRequiredError);
  });
});

describe('configuration Better Auth', () => {
  it('sessions de 30 jours, liens de 15 minutes', () => {
    const o = getAuth().options;
    expect(AUTH_DURATIONS.sessionSeconds).toBe(30 * 24 * 3600);
    expect(o.session?.expiresIn).toBe(30 * 24 * 3600);
    expect(o.emailAndPassword?.resetPasswordTokenExpiresIn).toBe(900);
    expect(AUTH_DURATIONS.tokenSeconds).toBe(900);
  });

  it('refuse toute inscription', async () => {
    await expect(getAuth().api.signUpEmail({ body: { email: 'pirate@example.com', password: 'motdepasse123', name: 'x' } })).rejects.toThrow();
    const rows = await db.select().from(user);
    expect(rows.map((r) => r.email)).not.toContain('pirate@example.com');
  });
});

describe('emails de connexion', () => {
  it('sont en français et annoncent la durée de validité', () => {
    for (const m of [magicLinkMail('https://liens.example.com/x'), resetPasswordMail('https://liens.example.com/y')]) {
      expect(m.text).toContain('Il reste valable 15 minutes.');
      expect(m.html).toContain('Il reste valable 15 minutes.');
    }
    expect(magicLinkMail('https://liens.example.com/x').subject).toBe('Ton lien de connexion');
  });

  it('échappe l’URL dans le HTML', () => {
    expect(magicLinkMail('https://a.fr/?a=1&b="x"').html).toContain('a=1&amp;b=&quot;x&quot;');
  });

  it('affichent le logo en PNG, par une URL absolue du site (les messageries ignorent le SVG)', () => {
    const { html } = magicLinkMail('https://liens.example.com/x', 'https://autre.example.com');
    expect(html).toContain('<img src="https://autre.example.com/email/logo.png"');
    expect(html).toMatch(/alt="CircleLink"/);
    expect(magicLinkMail('https://liens.example.com/x', 'https://liens.example.com', 'Alex <Martin>').html).toContain('alt="Alex &lt;Martin&gt;"');
  });

  it('gardent le lien en clair sous le bouton, et un aperçu pour la boîte de réception', () => {
    const { html } = resetPasswordMail('https://liens.example.com/r/abc');
    expect(html.match(/https:\/\/liens\.example\.com\/r\/abc/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toMatch(/display:none[^>]*>[^<]*15 minutes/);
  });
});
