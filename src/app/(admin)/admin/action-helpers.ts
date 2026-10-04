import 'server-only';
import { revalidatePath, updateTag } from 'next/cache';
import { OwnerRequiredError, requireOwner, type OwnerSession } from '@/lib/auth/owner';
import { PUBLIC_PAGE_TAG } from '@/lib/cache-tags';
import type { ActionResult } from '@/lib/types';

/* Enveloppe commune des actions de l'espace (constitution VII.1) : requireOwner() d'abord,
   toute erreur devient un message affichable, le détail technique reste côté serveur. */

export const fail = (error: string): ActionResult => ({ ok: false, error });

type ErrorClass = new (...args: never[]) => Error;

/** Session propriétaire, puis l'action. Les erreurs des classes `shown` gardent leur message. */
export async function owned<T extends ActionResult>(run: (owner: OwnerSession) => Promise<T | ActionResult>, shown: ErrorClass[] = []): Promise<T | ActionResult> {
  try {
    return await run(await requireOwner());
  } catch (e) {
    if (e instanceof OwnerRequiredError || shown.some((C) => e instanceof C)) return fail((e as Error).message);
    console.error('admin.action', e instanceof Error ? e.message : e);
    return fail('Enregistrement impossible pour le moment. Réessaie dans un instant.');
  }
}

/** Après une écriture : page publique et espace régénérés. */
export function done(): ActionResult {
  updateTag(PUBLIC_PAGE_TAG);
  revalidatePath('/');
  revalidatePath('/admin', 'layout');
  return { ok: true };
}
