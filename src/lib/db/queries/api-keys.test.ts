import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { newApiKey } from '@/lib/api/key';
import { createTestDb } from '@/test/db';
import type { Db } from '../client';
import { apiKeys, appOwner, user } from '../schema';
import { apiKeyInfo, deleteApiKey, ownerByKeyHash, saveApiKey } from './api-keys';

let db: Db;
let pg: PGlite | undefined;

beforeEach(async () => {
  await pg?.close();
  ({ db, pg } = await createTestDb());
  await db.insert(user).values([
    { id: 'u1', name: 'J', email: 'Alex@Example.com' },
    { id: 'u2', name: 'X', email: 'intrus@example.com' },
  ]);
  await db.insert(appOwner).values({ email: 'alex@example.com' });
});
afterAll(() => pg?.close());

describe('clés API en base', () => {
  it('retrouve le propriétaire par l’empreinte et note la dernière utilisation', async () => {
    const k = newApiKey();
    await saveApiKey('u1', k);
    expect((await apiKeyInfo('u1'))?.last_used_at).toBeNull();
    expect(await ownerByKeyHash(k.hash)).toEqual({ userId: 'u1', email: 'alex@example.com' });
    const info = await apiKeyInfo('u1');
    expect(info).toMatchObject({ prefix: k.prefix });
    expect(info?.last_used_at).not.toBeNull();
  });

  it('ne garde jamais la clé en clair', async () => {
    const k = newApiKey();
    await saveApiKey('u1', k);
    expect(JSON.stringify(await db.select().from(apiKeys))).not.toContain(k.key);
  });

  it('regénérer invalide l’ancienne clé', async () => {
    const old = newApiKey();
    await saveApiKey('u1', old);
    const fresh = newApiKey();
    await saveApiKey('u1', fresh);
    expect(await ownerByKeyHash(old.hash)).toBeNull();
    expect(await ownerByKeyHash(fresh.hash)).not.toBeNull();
    expect(await db.select().from(apiKeys)).toHaveLength(1);
  });

  it('refuse une clé révoquée, inconnue, ou d’un compte hors app_owner', async () => {
    const k = newApiKey();
    await saveApiKey('u1', k);
    await deleteApiKey('u1');
    expect(await ownerByKeyHash(k.hash)).toBeNull();
    expect(await ownerByKeyHash(newApiKey().hash)).toBeNull();
    const intrus = newApiKey();
    await saveApiKey('u2', intrus);
    expect(await ownerByKeyHash(intrus.hash)).toBeNull();
  });

  it('la base refuse une empreinte mal formée', async () => {
    await expect(db.insert(apiKeys).values({ userId: 'u1', prefix: 'cl_abcdefgh', keyHash: 'pas-une-empreinte' })).rejects.toThrow();
  });
});
