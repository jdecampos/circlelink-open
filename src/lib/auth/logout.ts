'use client';

import { authClient } from './client';

/** Cookie indicateur lu par la page publique (bouton « Modifier ma page »), sans aucune donnée. */
export const OWNER_HINT_COOKIE = 'cb-owner';

/** Déconnexion : session Better Auth fermée, cookie indicateur effacé. */
export async function logout(): Promise<void> {
  await authClient.signOut().catch(() => null);
  document.cookie = `${OWNER_HINT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}
