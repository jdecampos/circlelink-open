'use server';

import { updateTag } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth/server';
import { PUBLIC_PAGE_TAG } from '@/lib/cache-tags';
import { SetupError, installOwner, type InstallInput } from '@/lib/setup/install';
import { SETUP_TAG } from '@/lib/setup/owner';
import type { ActionResult } from '@/lib/types';

/** Adresse du visiteur : dernier saut ajouté par le proxy (Coolify), pour la limite d'essais. */
function clientIp(h: Headers): string {
  const hops = (h.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return hops.at(-1) || h.get('x-real-ip') || 'inconnue';
}

/**
 * Seule écriture possible sans session (constitution VII.1) : crée le compte propriétaire,
 * une fois, avec le code d'installation des journaux. Ouvre ensuite la session et mène à l'admin.
 */
export async function install(input: InstallInput): Promise<ActionResult> {
  const h = await headers();
  const fields = { code: String(input?.code ?? ''), name: String(input?.name ?? ''), email: String(input?.email ?? ''), password: String(input?.password ?? '') };
  try {
    await installOwner(fields, clientIp(h));
  } catch (e) {
    if (e instanceof SetupError) return { ok: false, error: e.message };
    console.error('setup.install', e instanceof Error ? e.message : e);
    return { ok: false, error: 'Installation impossible pour le moment : la base ne répond pas. Réessaie dans un instant.' };
  }
  updateTag(SETUP_TAG);
  updateTag(PUBLIC_PAGE_TAG); // le profil a reçu le nom saisi
  let signedIn = true;
  try {
    await getAuth().api.signInEmail({ body: { email: fields.email.trim().toLowerCase(), password: fields.password }, headers: h });
  } catch (e) {
    // le compte existe : au pire, la propriétaire se connecte elle-même
    console.error('setup.signin', e instanceof Error ? e.message : e);
    signedIn = false;
  }
  redirect(signedIn ? '/admin' : '/connexion');
}
