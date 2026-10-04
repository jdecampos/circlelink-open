import { sql } from 'drizzle-orm';
import { check, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Code d'installation (ligne unique), présent tant que l'instance n'a pas de propriétaire.
 * Seule l'empreinte SHA-256 est gardée ; le code en clair n'apparaît que dans les journaux.
 */
export const appSetup = pgTable(
  'app_setup',
  {
    id: smallint('id').primaryKey().default(1),
    codeHash: text('code_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('app_setup_id_check', sql`${t.id} = 1`), check('app_setup_code_hash_check', sql`${t.codeHash} ~ '^[0-9a-f]{64}$'`)],
);
