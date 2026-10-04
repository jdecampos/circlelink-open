import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb } from '@/test/db';
import type { Db } from '../client';
import { newsletterSettings } from '../schema';
import {
  disconnectNewsletter,
  getActiveConnection,
  getNewsletterView,
  markKeyRejected,
  saveNewsletterSettings,
  setNewsletterEnabled,
  storedKey,
} from './newsletter-settings';

// Fausse clé assemblée à l'exécution, pour ne pas déclencher les scanners de secrets.
const KEY = ['xkeysib', 'fausse', 'cle', 'a1b2'].join('-');
let db: Db;
let pg: PGlite;
beforeAll(async () => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'a'.repeat(64));
  ({ db, pg } = await createTestDb());
});
afterAll(() => {
  vi.unstubAllEnvs();
  return pg.close();
});
beforeEach(() => pg.exec('delete from newsletter_settings'));

const save = (enabled = true) => saveNewsletterSettings({ provider: 'brevo', key: KEY, audienceId: '7', audienceName: 'Inscrits', enabled }, db);

describe('réglages newsletter', () => {
  it('instance neuve : désactivée, rien de connecté', async () => {
    expect(await getNewsletterView(db)).toMatchObject({ enabled: false, provider: null });
    expect(await getActiveConnection(db)).toBeNull();
  });

  it('la clé est chiffrée en base et absente de la vue de l’espace', async () => {
    await save();
    const [r] = await db.select().from(newsletterSettings);
    expect(r.keyCiphertext).not.toContain(KEY);
    const view = await getNewsletterView(db);
    expect(view).toEqual({ enabled: true, provider: 'brevo', keyHint: 'a1b2', audienceName: 'Inscrits', keyRejected: false, keyUnreadable: false });
    expect(JSON.stringify(view)).not.toContain(KEY);
    expect(await getActiveConnection(db)).toEqual({ provider: 'brevo', key: KEY, audienceId: '7' });
    expect(await storedKey('brevo', db)).toBe(KEY);
    expect(await storedKey('kit', db)).toBeNull();
  });

  it('désactivée : plus de connexion active', async () => {
    await save();
    await setNewsletterEnabled(false, db);
    expect(await getActiveConnection(db)).toBeNull();
  });

  it('la base refuse l’activation sans service ni liste', async () => {
    await expect(db.insert(newsletterSettings).values({ id: 1, enabled: true })).rejects.toThrow();
  });

  it('clé refusée par le service : signalée, effacée au prochain enregistrement', async () => {
    await save();
    await markKeyRejected(db);
    expect((await getNewsletterView(db)).keyRejected).toBe(true);
    await save();
    expect((await getNewsletterView(db)).keyRejected).toBe(false);
  });

  it('BETTER_AUTH_SECRET changé : clé illisible, newsletter coupée', async () => {
    await save();
    vi.stubEnv('BETTER_AUTH_SECRET', 'b'.repeat(64));
    expect(await getNewsletterView(db)).toMatchObject({ enabled: false, keyUnreadable: true });
    expect(await getActiveConnection(db)).toBeNull();
    vi.stubEnv('BETTER_AUTH_SECRET', 'a'.repeat(64));
  });

  it('déconnexion : tout est effacé', async () => {
    await save();
    await disconnectNewsletter(db);
    expect(await db.select().from(newsletterSettings)).toEqual([]);
  });
});
