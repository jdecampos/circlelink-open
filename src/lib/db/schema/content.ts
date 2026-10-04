import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

// Contenu de la page. Contraintes reprises à l'identique du schéma d'origine (feature 001) :
// la base reste le dernier verrou.

export const profile = pgTable(
  'profile',
  {
    id: smallint('id').primaryKey().default(1),
    name: text('name').notNull().default(''),
    handle: text('handle').notNull().default(''),
    bio: text('bio').notNull().default(''),
    location: text('location').notNull().default(''),
    socials: jsonb('socials').$type<Record<string, string>>().notNull().default({}),
    theme: text('theme').notNull().default('clair'),
    linkShape: text('link_shape').notNull().default('pilule'),
    avatarUrl: text('avatar_url').notNull().default(''),
    showCredit: boolean('show_credit').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('profile_id_check', sql`${t.id} = 1`),
    check('profile_name_check', sql`char_length(${t.name}) <= 40`),
    check('profile_handle_check', sql`${t.handle} ~ '^[a-z0-9._-]{0,30}$'`),
    check('profile_bio_check', sql`char_length(${t.bio}) <= 160`),
    check('profile_location_check', sql`char_length(${t.location}) <= 40`),
    check(
      'profile_socials_check',
      sql`jsonb_typeof(${t.socials}) = 'object' and not jsonb_path_exists(${t.socials}, '$.* ? (@ != "" && !(@ like_regex "^(https://|http://|mailto:)" flag "i"))')`,
    ),
    check('profile_theme_check', sql`${t.theme} in ('clair', 'sombre')`),
    check('profile_link_shape_check', sql`${t.linkShape} in ('pilule', 'arrondi', 'carre')`),
    check('profile_avatar_url_check', sql`char_length(${t.avatarUrl}) <= 2048 and (${t.avatarUrl} = '' or ${t.avatarUrl} ~* '^https://[^\\s/]+\\.[^\\s]+$')`),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('categories_name_check', sql`char_length(btrim(${t.name})) between 1 and 24`),
    uniqueIndex('categories_name_key').on(sql`lower(${t.name})`),
  ],
);

export const links = pgTable(
  'links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull().default('link'),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    url: text('url').notNull(),
    description: text('description').notNull().default(''),
    price: text('price').notNull().default(''),
    visible: boolean('visible').notNull().default(true),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('links_type_check', sql`${t.type} in ('link', 'featured', 'product')`),
    check('links_title_check', sql`char_length(btrim(${t.title})) between 1 and 70`),
    check('links_url_check', sql`char_length(${t.url}) <= 2048 and ${t.url} ~* '^(https?://[^\\s/]+\\.[^\\s]+|mailto:[^\\s]+)$'`),
    check('links_description_check', sql`char_length(${t.description}) <= 140`),
    check('links_price_check', sql`char_length(${t.price}) <= 20`),
    index('links_category_id_idx').on(t.categoryId),
    index('links_position_idx').on(t.position),
  ],
);

/** Emails autorisés à administrer la page (comparés à l'email de la session). */
export const appOwner = pgTable('app_owner', { email: text('email').primaryKey() }, (t) => [
  check('app_owner_email_check', sql`${t.email} = lower(${t.email})`),
]);
