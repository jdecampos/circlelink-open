import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import type { OwnerSession } from '@/lib/auth/owner';
import type { ApiKeyInfo } from '@/lib/types';
import { getDb } from '../client';
import { apiKeys, appOwner, user } from '../schema';

/** Enregistre la clé du compte, en remplaçant la précédente (une clé par compte). */
export async function saveApiKey(userId: string, k: { prefix: string; hash: string }): Promise<void> {
  const values = { prefix: k.prefix, keyHash: k.hash, createdAt: new Date(), lastUsedAt: null };
  await getDb()
    .insert(apiKeys)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: apiKeys.userId, set: values });
}

export async function deleteApiKey(userId: string): Promise<void> {
  await getDb().delete(apiKeys).where(eq(apiKeys.userId, userId));
}

export async function apiKeyInfo(userId: string): Promise<ApiKeyInfo | null> {
  const [k] = await getDb().select().from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);
  if (!k) return null;
  return { prefix: k.prefix, created_at: k.createdAt.toISOString(), last_used_at: k.lastUsedAt?.toISOString() ?? null };
}

/**
 * Propriétaire titulaire de cette empreinte : la clé doit exister ET son compte être dans
 * app_owner (constitution VII.1). Note la date d'utilisation.
 */
export async function ownerByKeyHash(hash: string): Promise<OwnerSession | null> {
  const db = getDb();
  const [row] = await db
    .select({ userId: user.id, email: appOwner.email })
    .from(apiKeys)
    .innerJoin(user, eq(user.id, apiKeys.userId))
    .innerJoin(appOwner, eq(appOwner.email, sql`lower(${user.email})`))
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);
  if (!row) return null;
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.userId, row.userId)));
  return row;
}
