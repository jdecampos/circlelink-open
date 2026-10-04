import type { PGlite } from '@electric-sql/pglite';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/db';
import type { Db } from '../client';
import { newsletterQueue, newsletterStats } from '../schema';
import { claimDue, enqueue, queueStats, resolve } from './newsletter';

// Reprend les scénarios des tests SQL de la file de la feature 001.
let db: Db;
let pg: PGlite | undefined;
beforeEach(async () => {
  await pg?.close();
  ({ db, pg } = await createTestDb());
});
afterAll(() => pg?.close());

const due = (email: string) => db.update(newsletterQueue).set({ nextAttemptAt: sql`now() - interval '1 minute'` }).where(eq(newsletterQueue.email, email));
const lost = async () => (await db.select().from(newsletterStats))[0].lostCount;

describe('file newsletter', () => {
  it('une adresse n’apparaît qu’une fois ; la seconde inscription met à jour la provenance', async () => {
    await enqueue('Test@Example.com ', 'tiktok');
    await enqueue('test@example.com', 'instagram');
    const rows = await db.select().from(newsletterQueue);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: 'test@example.com', source: 'instagram', attempts: 0 });
  });

  it('refuse un email invalide ; une provenance inconnue devient direct', async () => {
    await expect(enqueue('pas-un-email', 'tiktok')).rejects.toThrow();
    await enqueue('a@example.com', 'myspace' as never);
    expect((await db.select().from(newsletterQueue))[0].source).toBe('direct');
  });

  it('ne prend que les lignes dues, une seule fois, et repousse leur essai de 15 minutes', async () => {
    await enqueue('due@example.com', 'x');
    await enqueue('pas-due@example.com', 'x');
    await due('due@example.com');
    const claimed = await claimDue(10);
    expect(claimed).toEqual([expect.objectContaining({ email: 'due@example.com', source: 'x', attempts: 1 })]);
    expect(await claimDue(10)).toEqual([]);
    const [row] = await db.select().from(newsletterQueue).where(eq(newsletterQueue.email, 'due@example.com'));
    expect(row.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 14 * 60_000);
  });

  it('retry garde la ligne avec sa cause, sent la supprime', async () => {
    await enqueue('r@example.com', 'x');
    const [{ id }] = await db.select().from(newsletterQueue);
    await resolve(id, 'retry', 'HTTP 503');
    expect((await db.select().from(newsletterQueue))[0].lastError).toBe('HTTP 503');
    await resolve(id, 'sent');
    expect(await db.$count(newsletterQueue)).toBe(0);
  });

  it('purge les lignes de plus de 24 h et les compte comme perdues', async () => {
    await enqueue('vieux@example.com', 'x');
    await db.update(newsletterQueue).set({ createdAt: sql`now() - interval '25 hours'`, nextAttemptAt: sql`now() - interval '1 minute'` });
    expect(await claimDue(10)).toEqual([]);
    expect(await db.$count(newsletterQueue)).toBe(0);
    expect(await lost()).toBe(1);
  });

  it('lost supprime et compte ; queueStats résume la file', async () => {
    await enqueue('p@example.com', 'x');
    await enqueue('q@example.com', 'x');
    const [{ id }] = await db.select().from(newsletterQueue).where(eq(newsletterQueue.email, 'p@example.com'));
    await resolve(id, 'lost', 'HTTP 422');
    expect(await queueStats()).toEqual({ pending: 1, lost: 1 });
  });

  it('tronque la cause à 500 caractères', async () => {
    await enqueue('t@example.com', 'x');
    const [{ id }] = await db.select().from(newsletterQueue);
    await resolve(id, 'retry', 'x'.repeat(900));
    expect((await db.select().from(newsletterQueue))[0].lastError).toHaveLength(500);
  });
});
