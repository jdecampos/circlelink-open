import { sql } from 'drizzle-orm';
import { bigint, check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { links } from './content';

export const linkClicks = pgTable(
  'link_clicks',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    linkId: uuid('link_id')
      .notNull()
      .references(() => links.id, { onDelete: 'cascade' }),
    source: text('source'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('link_clicks_source_check', sql`char_length(${t.source}) <= 20`), index('link_clicks_link_id_idx').on(t.linkId)],
);
