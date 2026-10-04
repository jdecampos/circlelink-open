import { sql } from 'drizzle-orm';
import { bigint, boolean, check, index, integer, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';

// File des inscriptions pas encore transmises au service d'emailing (24 h au plus), compteur de
// pertes, et réglages du connecteur choisi dans l'espace.
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
    // statut HTTP + cause courte : jamais d'email, de corps de réponse du service ni d'en-tête
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

export const NEWSLETTER_PROVIDERS = ['brevo', 'mailchimp', 'mailerlite', 'kit'] as const;
const providerList = sql.raw(NEWSLETTER_PROVIDERS.map((s) => `'${s}'`).join(', '));

/** Connecteur newsletter (ligne unique). La clé du service n'est stockée que chiffrée (constitution VII.3). */
export const newsletterSettings = pgTable(
  'newsletter_settings',
  {
    id: smallint('id').primaryKey().default(1),
    enabled: boolean('enabled').notNull().default(false),
    provider: text('provider'),
    keyCiphertext: text('key_ciphertext'),
    keyHint: text('key_hint'),
    audienceId: text('audience_id'),
    audienceName: text('audience_name'),
    keyRejectedAt: timestamp('key_rejected_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('newsletter_settings_id_check', sql`${t.id} = 1`),
    check('newsletter_settings_provider_check', sql`${t.provider} is null or ${t.provider} in (${providerList})`),
    check(
      'newsletter_settings_key_check',
      sql`${t.keyCiphertext} is null or (char_length(${t.keyCiphertext}) <= 2048 and ${t.keyCiphertext} ~ '^v1\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$')`,
    ),
    check('newsletter_settings_key_hint_check', sql`${t.keyHint} is null or char_length(${t.keyHint}) = 4`),
    check('newsletter_settings_audience_check', sql`${t.audienceId} is null or char_length(${t.audienceId}) between 1 and 100`),
    check('newsletter_settings_audience_name_check', sql`${t.audienceName} is null or char_length(${t.audienceName}) <= 200`),
    check(
      'newsletter_settings_enabled_check',
      sql`not ${t.enabled} or (${t.provider} is not null and ${t.keyCiphertext} is not null and ${t.audienceId} is not null)`,
    ),
  ],
);
