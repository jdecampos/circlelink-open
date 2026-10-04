import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { EMAIL_RE } from '@/lib/links';
import { toSource, type QueuedSubscription, type Source } from '@/lib/newsletter/types';
import { exec, getDb, type Db } from '../client';
import { newsletterQueue, newsletterStats } from '../schema';

/** Met une inscription en file. Une adresse déjà en attente garde sa date d'entrée (purge à 24 h). */
export async function enqueue(rawEmail: string, source: Source): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) throw new Error('invalid_email');
  const s = toSource(source);
  await getDb()
    .insert(newsletterQueue)
    .values({ email, source: s })
    .onConflictDoUpdate({ target: newsletterQueue.email, set: { source: s } });
}

/**
 * Reprise, en une seule requête : purge les inscriptions de plus de 24 h (comptées comme
 * perdues), puis réserve les lignes dues en repoussant leur prochain essai de 15 minutes.
 * `skip locked` : deux reprises simultanées ne prennent jamais la même ligne.
 */
export async function claimDue(limit: number, db: Db = getDb()): Promise<QueuedSubscription[]> {
  const n = Math.max(1, Math.min(limit, 200));
  const rows = await exec<{ id: number | string; email: string; source: string; attempts: number }>(
    sql`
    with purged as (
      delete from newsletter_queue where created_at < now() - interval '24 hours' returning 1
    ), lost as (
      update newsletter_stats set lost_count = lost_count + (select count(*) from purged), updated_at = now()
      where id = 1 and exists (select 1 from purged) returning 1
    ), due as (
      select id from newsletter_queue
      where next_attempt_at <= now() and created_at >= now() - interval '24 hours'
      order by next_attempt_at limit ${n}
      for update skip locked
    )
    update newsletter_queue q
    set attempts = q.attempts + 1, next_attempt_at = now() + interval '15 minutes'
    from due where q.id = due.id
    returning q.id, q.email, q.source, q.attempts`,
    db,
  );
  return rows.map((r) => ({ id: Number(r.id), email: r.email, source: toSource(r.source), attempts: Number(r.attempts) }));
}

/** Sans service connecté : seule la purge des inscriptions de plus de 24 h (comptées comme perdues). */
export async function purgeExpired(db: Db = getDb()): Promise<number> {
  const [r] = await exec<{ n: number | string }>(
    sql`
    with purged as (
      delete from newsletter_queue where created_at < now() - interval '24 hours' returning 1
    ), lost as (
      update newsletter_stats set lost_count = lost_count + (select count(*) from purged), updated_at = now()
      where id = 1 and exists (select 1 from purged) returning 1
    )
    select count(*) as n from purged`,
    db,
  );
  return Number(r?.n ?? 0);
}

/** Issue d'une transmission : `sent` et `lost` retirent la ligne, `lost` la compte, `retry` garde la cause. */
export async function resolve(id: number, outcome: 'sent' | 'lost' | 'retry', error: string | null = null): Promise<void> {
  const db = getDb();
  if (outcome === 'retry') {
    await db.update(newsletterQueue).set({ lastError: error?.slice(0, 500) ?? null }).where(eq(newsletterQueue.id, id));
    return;
  }
  await db.transaction(async (tx) => {
    const removed = await tx.delete(newsletterQueue).where(eq(newsletterQueue.id, id)).returning({ id: newsletterQueue.id });
    if (outcome === 'lost' && removed.length) {
      await tx
        .update(newsletterStats)
        .set({ lostCount: sql`${newsletterStats.lostCount} + 1`, updatedAt: new Date() })
        .where(eq(newsletterStats.id, 1));
    }
  });
}

export async function queueStats(): Promise<{ pending: number; lost: number }> {
  const db = getDb();
  const [pending, [stats]] = await Promise.all([db.$count(newsletterQueue), db.select().from(newsletterStats).where(eq(newsletterStats.id, 1))]);
  return { pending, lost: stats?.lostCount ?? 0 };
}
