import 'server-only';
import { asc, eq } from 'drizzle-orm';
import type { Category, PageData } from '@/lib/types';
import { getDb } from '../client';
import { categories, links } from '../schema';
import { toLinkItem } from './links';
import { getNewsletterView } from './newsletter-settings';
import { getProfile } from './profile';

async function readPage(onlyVisible: boolean): Promise<PageData> {
  const db = getDb();
  const [p, cats, rows, newsletter] = await Promise.all([
    getProfile(db),
    db.select().from(categories).orderBy(asc(categories.position), asc(categories.createdAt)),
    db
      .select()
      .from(links)
      .where(onlyVisible ? eq(links.visible, true) : undefined)
      .orderBy(asc(links.position), asc(links.createdAt)),
    getNewsletterView(db),
  ]);
  return {
    profile: p,
    categories: cats.map((c): Category => ({ id: c.id, name: c.name, position: c.position })),
    links: rows.map(toLinkItem),
    newsletter: newsletter.enabled,
  };
}

/** Page publique : liens visibles seulement. */
export function readPublicPage() {
  return readPage(true);
}

/** Admin : tous les liens (à n'appeler qu'après requireOwner). */
export function readAdminPage() {
  return readPage(false);
}
