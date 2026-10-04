import { sql } from 'drizzle-orm';
import { bigint, check, index, integer, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';

// File des inscriptions pas encore transmises à Mautic (24 h au plus), et compteur de pertes.
export const NEWSLETTER_SOURCES = ['tiktok', 'instagram', 'facebook', 'linkedin', 'x', 'youtube', 'snapchat', 'threads', 'direct'] as const;
const sourceList = sql.raw(NEWSLETTER_SOURCES.map((s) => `'${s}'`).join(', '));

export const newsletterQueue = pgTable(
  'newsletter_queue',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    email: text('email').notNull().unique(),
    source: text('source').notNull().default('direct'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '15 minutes'`),
    // statut HTTP + cause courte : jamais d'email, de corps de réponse Mautic ni d'en-tête
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'newsletter_queue_email_check',
      sql`${t.email} = lower(${t.email}) and char_length(${t.email}) <= 254 and ${t.email} ~ '^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$'`,
    ),
    check('newsletter_queue_source_check', sql`${t.source} in (${sourceList})`),
    check('newsletter_queue_attempts_check', sql`${t.attempts} >= 0`),
    check('newsletter_queue_last_error_check', sql`char_length(${t.lastError}) <= 500`),
    index('newsletter_queue_next_attempt_idx').on(t.nextAttemptAt),
  ],
);

export const newsletterStats = pgTable(
  'newsletter_stats',
  {
    id: smallint('id').primaryKey().default(1),
    lostCount: integer('lost_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('newsletter_stats_id_check', sql`${t.id} = 1`), check('newsletter_stats_lost_count_check', sql`${t.lostCount} >= 0`)],
);
