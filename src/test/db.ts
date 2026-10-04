import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { setDbForTests, type Db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';

/** Base PostgreSQL neuve en mémoire, migrée avec drizzle/, branchée sur getDb(). */
export async function createTestDb(): Promise<{ db: Db; pg: PGlite }> {
  const pg = new PGlite();
  const db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder: 'drizzle' });
  setDbForTests(db);
  return { db, pg };
}
