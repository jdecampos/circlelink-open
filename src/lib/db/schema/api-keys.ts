import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';

/** Clé API d'un compte (une au plus) : seule son empreinte SHA-256 est gardée. */
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    prefix: text('prefix').notNull(),
    keyHash: text('key_hash').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (t) => [
    check('api_keys_prefix_check', sql`${t.prefix} ~ '^cl_[A-Za-z0-9_-]{8}$'`),
    check('api_keys_key_hash_check', sql`${t.keyHash} ~ '^[0-9a-f]{64}$'`),
  ],
);
