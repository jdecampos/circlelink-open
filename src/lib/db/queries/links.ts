import 'server-only';
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm';
import type { LinkItem, LinkType } from '@/lib/types';
import { getDb, type Db } from '../client';
import { links } from '../schema';

export type LinkRow = {
  type: LinkType;
  title: string;
  url: string;
  categoryId: string;
  description: string;
  price: string;
  visible: boolean;
};

export const toLinkItem = (l: typeof links.$inferSelect): LinkItem => ({
  id: l.id,
  type: l.type as LinkType,
  category_id: l.categoryId,
  title: l.title,
  url: l.url,
  description: l.description,
  price: l.price,
  visible: l.visible,
  position: l.position,
});

export async function getLink(id: string): Promise<LinkItem | null> {
  const [l] = await getDb().select().from(links).where(eq(links.id, id)).limit(1);
  return l ? toLinkItem(l) : null;
}

/** Tous les liens, masqués compris, dans l'ordre de la page. */
export async function listLinks(categoryId?: string): Promise<LinkItem[]> {
  const rows = await getDb()
    .select()
    .from(links)
    .where(categoryId ? eq(links.categoryId, categoryId) : undefined)
    .orderBy(asc(links.position), asc(links.createdAt));
  return rows.map(toLinkItem);
}

/**
 * Crée un lien, par défaut juste après le dernier lien de sa catégorie.
 * `id` et `position` servent à restaurer un lien supprimé (« Annuler ») ; `db` : transaction de l'import.
 */
export async function createLink(row: LinkRow, opts: { id?: string; position?: number } = {}, db: Db = getDb()): Promise<string> {
  return db.transaction(async (tx) => {
    let pos = opts.position;
    if (pos === undefined) {
      const [inCat] = await tx
        .select({ p: sql<number | null>`max(${links.position})` })
        .from(links)
        .where(eq(links.categoryId, row.categoryId));
      const [all] = await tx.select({ p: sql<number | null>`max(${links.position})` }).from(links);
      pos = inCat.p !== null ? Number(inCat.p) + 1 : Number(all.p ?? -1) + 1;
    }
    await tx
      .update(links)
      .set({ position: sql`${links.position} + 1` })
      .where(gte(links.position, pos));
    const [created] = await tx
      .insert(links)
      .values({ ...row, ...(opts.id ? { id: opts.id } : {}), position: pos })
      .returning({ id: links.id });
    return created.id;
  });
}

export async function updateLink(id: string, row: LinkRow): Promise<void> {
  await getDb().update(links).set(row).where(eq(links.id, id));
}

export async function setLinkVisible(id: string, visible: boolean): Promise<void> {
  await getDb().update(links).set({ visible }).where(eq(links.id, id));
}

/** Échange les positions de deux liens, en une seule requête. */
export async function swapLinks(a: string, b: string): Promise<void> {
  const pa = sql`(select position from links where id = ${a})`;
  const pb = sql`(select position from links where id = ${b})`;
  await getDb()
    .update(links)
    .set({ position: sql`case when ${links.id} = ${a} then ${pb} else ${pa} end` })
    .where(and(inArray(links.id, [a, b])));
}

/** Supprime un lien et renvoie ce qu'il était (null s'il n'existait pas). */
export async function deleteLink(id: string): Promise<LinkItem | null> {
  const [l] = await getDb().delete(links).where(eq(links.id, id)).returning();
  return l ? toLinkItem(l) : null;
}
