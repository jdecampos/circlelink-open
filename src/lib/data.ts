import 'server-only';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';
import { ownerFrom } from './auth/owner';
import { PUBLIC_PAGE_TAG } from './cache-tags';
import { getAuth } from './auth/server';
import { apiKeyInfo } from './db/queries/api-keys';
import { clickCounts, clickSources } from './db/queries/clicks';
import { queueStats } from './db/queries/newsletter';
import { getNewsletterView } from './db/queries/newsletter-settings';
import { readAdminPage, readPublicPage } from './db/queries/page';
import type { AdminData } from './types';


/**
 * Données de la page publique (liens visibles uniquement), servies depuis le cache de Next :
 * aucune requête en base par visite (constitution VII.2). Régénérées après une action de
 * l'admin, et au plus tard toutes les heures.
 * Note : unstable_cache est marqué « remplacé par use cache » dans Next 16 ; il est isolé ici.
 */
export const getPublicPage = unstable_cache(readPublicPage, [PUBLIC_PAGE_TAG], { tags: [PUBLIC_PAGE_TAG], revalidate: 3600 });

/** 'anon' : pas de session · 'forbidden' : connecté mais pas propriétaire de la page. */
export async function getAdminData(): Promise<AdminData | 'anon' | 'forbidden'> {
  // headers() d'abord : la route devient dynamique avant toute création de Better Auth ou de la base
  const h = await headers();
  const session = await getAuth().api.getSession({ headers: h });
  if (!session) return 'anon';
  const owner = await ownerFrom(session);
  if (!owner) return 'forbidden';

  const [page, clicks, sources, queue, apiKey, newsletterSettings] = await Promise.all([
    readAdminPage(),
    clickCounts(),
    clickSources(),
    queueStats(),
    apiKeyInfo(owner.userId),
    getNewsletterView(),
  ]);
  return { ...page, email: owner.email, clicks, sources, queue, apiKey, newsletterSettings };
}
