import type { LinkRow } from '@/lib/db/queries/links';
import type { LinkItem, Profile } from '@/lib/types';
import { linkFrom, profileFrom } from './validate';

const PROFILE_KEYS = ['name', 'handle', 'bio', 'location', 'theme', 'link_shape', 'avatar_url', 'show_credit'] as const;
const LINK_KEYS = ['type', 'category_id', 'title', 'url', 'description', 'price', 'visible'] as const;

/** Modification partielle du profil : seuls les champs envoyés changent, réseau par réseau pour socials. */
export function mergeProfile(current: Profile, patch: Record<string, unknown>): Profile | string {
  const next: Record<string, unknown> = { ...current };
  for (const k of PROFILE_KEYS) if (patch[k] !== undefined) next[k] = patch[k];
  if (patch.socials !== undefined) {
    if (!patch.socials || typeof patch.socials !== 'object' || Array.isArray(patch.socials)) return 'socials doit être un objet.';
    next.socials = { ...current.socials, ...patch.socials };
  }
  return profileFrom(next);
}

/** Modification partielle d'un lien : seuls les champs envoyés changent. */
export function mergeLink(current: LinkItem, patch: Record<string, unknown>): LinkRow | string {
  const next: Record<string, unknown> = { ...current };
  for (const k of LINK_KEYS) if (patch[k] !== undefined) next[k] = patch[k];
  return linkFrom(next);
}
