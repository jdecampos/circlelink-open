import { defineConfig } from 'drizzle-kit';

// Les migrations sont générées depuis le schéma, puis appliquées avec le rôle propriétaire.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_MIGRATION_URL ?? '' },
  strict: true,
});
