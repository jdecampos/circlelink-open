import 'server-only';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import type { Category } from '@/lib/types';
import { getDb, pgErrorCode, type Db } from '../client';
import { categories, links } from '../schema';

export class DuplicateNameError extends Error {
  constructor() {
    super('Une catégorie porte déjà ce nom.');
  }
}

/** Suppression d'une catégorie qui contient encore des liens, sans destination. */
export class CategoryNotEmptyError extends Error {
  constructor() {
    super('Choisis où ranger les liens de cette catégorie.');
  }
}

async function guard<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    const code = pgErrorCode(e);
    if (code === '23505') throw new DuplicateNameError();
    // on delete restrict : 23001 (restrict_violation) ; 23503 si la contrainte devient « no action »
    if (code === '23001' || code === '23503') throw new CategoryNotEmptyError();
    throw e;
  }
}

const toCategory = (c: typeof categories.$inferSelect): Category => ({ id: c.id, name: c.name, position: c.position });

export async function listCategories(): Promise<Category[]> {
  const rows = await getDb().select().from(categories).orderBy(asc(categories.position), asc(categories.createdAt));
  return rows.map(toCategory);
}

export async function getCategory(id: string, db: Db = getDb()): Promise<Category | null> {
  const [c] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return c ? toCategory(c) : null;
}

/** Catégorie portant ce nom, à la casse près (même règle que l'index unique). */
export async function categoryIdByName(name: string, db: Db = getDb()): Promise<string | null> {
  const [c] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(sql`lower(${categories.name})`, name.toLowerCase()))
    .limit(1);
  return c?.id ?? null;
}

/** Crée une catégorie en dernière position. `db` : transaction de l'import. */
export function createCategory(name: string, db: Db = getDb()): Promise<string> {
  return guard(async () => {
    const [last] = await db.select({ p: sql<number | null>`max(${categories.position})` }).from(categories);
    const [c] = await db
      .insert(categories)
      .values({ name, position: Number(last.p ?? -1) + 1 })
      .returning({ id: categories.id });
    return c.id;
  });
}

export function renameCategory(id: string, name: string): Promise<void> {
  return guard(async () => {
    await getDb().update(categories).set({ name }).where(eq(categories.id, id));
  });
}

export async function swapCategories(a: string, b: string): Promise<void> {
  const pa = sql`(select position from categories where id = ${a})`;
  const pb = sql`(select position from categories where id = ${b})`;
  await getDb()
    .update(categories)
    .set({ position: sql`case when ${categories.id} = ${a} then ${pb} else ${pa} end` })
    .where(inArray(categories.id, [a, b]));
}

/** Supprime une catégorie en déplaçant ses liens vers `moveTo`, tout ou rien. */
export function deleteCategory(id: string, moveTo: string | null): Promise<void> {
  return guard(() =>
    getDb().transaction(async (tx) => {
      if (moveTo) await tx.update(links).set({ categoryId: moveTo }).where(eq(links.categoryId, id));
      await tx.delete(categories).where(eq(categories.id, id));
    }),
  );
}
