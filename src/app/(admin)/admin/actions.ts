'use server';

import { revalidatePath } from 'next/cache';
import { newApiKey } from '@/lib/api/key';
import type { OwnerSession } from '@/lib/auth/owner';
import { categoryNameFrom, isId, linkFrom, profileFrom } from '@/lib/content/validate';
import { deleteApiKey, saveApiKey } from '@/lib/db/queries/api-keys';
import { CategoryNotEmptyError, DuplicateNameError, createCategory as dbCreateCategory, deleteCategory as dbDeleteCategory, renameCategory as dbRenameCategory, swapCategories as dbSwapCategories } from '@/lib/db/queries/categories';
import { createLink, deleteLink as dbDeleteLink, setLinkVisible as dbSetLinkVisible, swapLinks as dbSwapLinks, updateLink, type LinkRow } from '@/lib/db/queries/links';
import { updateProfile } from '@/lib/db/queries/profile';
import { done, fail, owned as ownedBy } from './action-helpers';
import type { ActionResult, LinkItem, LinkShape, LinkType, Theme } from '@/lib/types';

/* Constitution VII.1 : chaque action commence par requireOwner(), puis revalide ses
   entrées (le client n'est qu'une aide à la saisie) avec les règles partagées de
   src/lib/content/validate.ts. Les contraintes de la base restent le dernier verrou. */

/** Ces erreurs portent un message destiné à la propriétaire. */
const owned = <T extends ActionResult>(run: (owner: OwnerSession) => Promise<T | ActionResult>) => ownedBy(run, [DuplicateNameError, CategoryNotEmptyError]);

/* ------------------------------------------------------------------ liens */

export type LinkInput = { id?: string; type: LinkType; title: string; url: string; category_id: string; description: string; price: string; visible: boolean };

function linkRow(input: LinkInput): LinkRow | string {
  return linkFrom({ ...input, type: (['link', 'featured', 'product'] as const).includes(input.type) ? input.type : 'link', visible: !!input.visible });
}

export async function saveLink(input: LinkInput): Promise<ActionResult> {
  return owned(async () => {
    const row = linkRow(input);
    if (typeof row === 'string') return fail(row);
    if (input.id) {
      if (!isId(input.id)) return fail('Lien introuvable.');
      await updateLink(input.id, row);
    } else {
      await createLink(row);
    }
    return done();
  });
}

export async function setLinkVisible(id: string, visible: boolean): Promise<ActionResult> {
  return owned(async () => {
    if (!isId(id)) return fail('Lien introuvable.');
    await dbSetLinkVisible(id, !!visible);
    return done();
  });
}

export async function swapLinks(a: string, b: string): Promise<ActionResult> {
  return owned(async () => {
    if (!isId(a) || !isId(b)) return fail('Lien introuvable.');
    await dbSwapLinks(a, b);
    return done();
  });
}

export async function deleteLink(id: string): Promise<ActionResult> {
  return owned(async () => {
    if (!isId(id)) return fail('Lien introuvable.');
    await dbDeleteLink(id);
    return done();
  });
}

/** « Annuler » après une suppression : recrée le lien à sa place. */
export async function restoreLink(l: LinkItem): Promise<ActionResult> {
  return owned(async () => {
    const row = linkRow(l);
    if (typeof row === 'string' || !isId(l.id)) return fail('Restauration impossible.');
    await createLink(row, { id: l.id, position: Number.isInteger(l.position) ? l.position : undefined });
    return done();
  });
}

/* ------------------------------------------------------------- catégories */

export async function createCategory(rawName: string): Promise<ActionResult & { id?: string }> {
  return owned(async () => {
    const name = categoryNameFrom(rawName);
    if (typeof name !== 'string') return fail(name.error);
    const id = await dbCreateCategory(name);
    return { ...done(), id };
  });
}

export async function renameCategory(id: string, rawName: string): Promise<ActionResult> {
  return owned(async () => {
    const name = categoryNameFrom(rawName);
    if (!isId(id)) return fail('Catégorie introuvable.');
    if (typeof name !== 'string') return fail(name.error);
    await dbRenameCategory(id, name);
    return done();
  });
}

export async function swapCategories(a: string, b: string): Promise<ActionResult> {
  return owned(async () => {
    if (!isId(a) || !isId(b)) return fail('Catégorie introuvable.');
    await dbSwapCategories(a, b);
    return done();
  });
}

export async function deleteCategory(id: string, moveTo: string | null): Promise<ActionResult> {
  return owned(async () => {
    if (!isId(id) || (moveTo !== null && !isId(moveTo)) || moveTo === id) return fail('Catégorie introuvable.');
    await dbDeleteCategory(id, moveTo);
    return done();
  });
}

/* ------------------------------------------------------- profil & apparence */

export type ProfileInput = {
  name: string;
  handle: string;
  bio: string;
  location: string;
  socials: Record<string, string>;
  theme: Theme;
  link_shape: LinkShape;
  avatar_url?: string;
  logo_url?: string;
  logo_dark_url?: string;
};

export async function saveProfile(input: ProfileInput): Promise<ActionResult> {
  return owned(async () => {
    const p = profileFrom({
      ...input,
      handle: String(input.handle ?? '').trim().toLowerCase(),
      theme: input.theme === 'sombre' ? 'sombre' : 'clair',
      link_shape: (['pilule', 'arrondi', 'carre'] as const).includes(input.link_shape) ? input.link_shape : 'pilule',
    });
    if (typeof p === 'string') return fail(p);
    await updateProfile(p);
    return done();
  });
}

/* ---------------------------------------------------------------- clé API */

/** Génère (ou remplace) la clé du compte. La valeur en clair n'est renvoyée qu'ici. */
export async function generateApiKey(): Promise<ActionResult & { key?: string }> {
  return owned(async (owner) => {
    const { key, prefix, hash } = newApiKey();
    await saveApiKey(owner.userId, { prefix, hash });
    revalidatePath('/admin', 'layout');
    return { ok: true, key };
  });
}

export async function revokeApiKey(): Promise<ActionResult> {
  return owned(async (owner) => {
    await deleteApiKey(owner.userId);
    revalidatePath('/admin', 'layout');
    return { ok: true };
  });
}
