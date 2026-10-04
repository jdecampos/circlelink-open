import { createHash, randomBytes } from 'node:crypto';

/** Forme d'une clé : `cl_` + 32 octets aléatoires en base64url (43 caractères). */
export const API_KEY_RE = /^cl_[A-Za-z0-9_-]{43}$/;

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Nouvelle clé : la valeur en clair n'est montrée qu'une fois, la base garde l'empreinte. */
export function newApiKey(): { key: string; prefix: string; hash: string } {
  const key = 'cl_' + randomBytes(32).toString('base64url');
  return { key, prefix: key.slice(0, 11), hash: hashApiKey(key) };
}
