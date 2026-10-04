// Lien de réinitialisation sans SMTP, créé en ligne de commande (scripts/db/reset-password.ts).
// Pas de 'server-only' ni d'alias '@/' : exécuté par Node dans le conteneur.
import { randomBytes, randomUUID } from 'node:crypto';

/** Exécute une requête paramétrée et renvoie ses lignes (postgres.js, ou PGlite en test). */
export type Run = (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

export const RESET_TTL_SECONDS = 15 * 60;

/**
 * Écrit un jeton à usage unique au format de Better Auth (`reset-password:<jeton>` dans
 * `verification`) et renvoie le lien de /nouveau-mot-de-passe. Refuse tout email qui n'est
 * pas celui d'un propriétaire.
 */
export async function createResetLink(run: Run, email: string, site: string, now = new Date()): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const [row] = await run('select u.id from "user" u join app_owner o on o.email = lower(u.email) where lower(u.email) = $1', [normalized]);
  if (!row) throw new Error(`${normalized || '(vide)'} n’est pas le compte propriétaire de cette instance.`);
  const token = randomBytes(18).toString('base64url');
  await run('insert into verification (id, identifier, value, expires_at, created_at, updated_at) values ($1, $2, $3, $4, $5, $5)', [
    randomUUID(),
    `reset-password:${token}`,
    row.id,
    new Date(now.getTime() + RESET_TTL_SECONDS * 1000),
    now,
  ]);
  return `${site.replace(/\/+$/, '')}/nouveau-mot-de-passe?token=${token}`;
}
