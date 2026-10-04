import 'server-only';
import type { OwnerSession } from '@/lib/auth/owner';
import { ownerByKeyHash } from '@/lib/db/queries/api-keys';
import { API_KEY_RE, hashApiKey } from './key';

export class ApiAuthError extends Error {}

/**
 * Seconde porte d'écriture (constitution VII.1) : clé valide ET compte propriétaire.
 * La clé n'est jamais journalisée ni renvoyée dans un message.
 */
export async function requireApiOwner(req: Request): Promise<OwnerSession> {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '');
  if (!m) throw new ApiAuthError('Clé API manquante : envoie l’en-tête Authorization: Bearer <clé>.');
  const owner = API_KEY_RE.test(m[1]) ? await ownerByKeyHash(hashApiKey(m[1])) : null;
  if (!owner) throw new ApiAuthError('Clé API invalide ou révoquée.');
  return owner;
}
