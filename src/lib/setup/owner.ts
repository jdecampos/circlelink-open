import 'server-only';
import { unstable_cache } from 'next/cache';
import { exec, getDb } from '@/lib/db/client';
import { sql } from 'drizzle-orm';

/** Tag du cache de hasOwner(), invalidé par l'installation. */
export const SETUP_TAG = 'setup';

export async function readHasOwner(): Promise<boolean> {
  const [{ owned }] = await exec<{ owned: boolean }>(sql`select exists (select 1 from app_owner) as owned`, getDb());
  return owned;
}

/**
 * L'instance a-t-elle un propriétaire ? En cache : lu par /connexion, /admin et /installation.
 * Rafraîchi au plus toutes les minutes, pour qu'un second conteneur (bascule de déploiement)
 * suive vite une installation faite sur le premier.
 */
export const hasOwner = unstable_cache(readHasOwner, [SETUP_TAG], { tags: [SETUP_TAG], revalidate: 60 });
