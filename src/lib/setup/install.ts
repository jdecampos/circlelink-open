import 'server-only';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { sql } from 'drizzle-orm';
import { exec, getDb, type Db } from '@/lib/db/client';
import { account, appOwner, appSetup, profile, user } from '@/lib/db/schema';
import { takeAttempt } from './attempts';
import { hashSetupCode } from './code';

export type InstallInput = { code: string; name: string; email: string; password: string };

/** Refus d'installation : le message est affichable tel quel, il ne révèle rien d'autre. */
export class SetupError extends Error {}

export const SETUP_ERRORS = {
  done: 'L’installation est déjà terminée.',
  badCode: 'Code d’installation incorrect.',
  tooMany: 'Trop d’essais. Réessaie dans une heure.',
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Message d'erreur du premier champ invalide, ou null. */
export function installInputError({ code, name, email, password }: InstallInput): string | null {
  if (!code.trim()) return 'Recopie le code d’installation affiché dans les journaux du conteneur.';
  if (!name.trim()) return 'Indique ton nom.';
  if (name.trim().length > 40) return 'Nom : 40 caractères maximum.';
  if (!EMAIL_RE.test(email.trim())) return 'Adresse email invalide.';
  if (password.length < 8) return 'Mot de passe : 8 caractères minimum.';
  if (password.length > 128) return 'Mot de passe : 128 caractères maximum.';
  return null;
}

const sameHash = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Crée le compte propriétaire, une seule fois, avec le code d'installation (constitution VII.1).
 * Tout se fait dans une transaction qui verrouille la ligne du code : deux appels simultanés
 * ne créent qu'un propriétaire. Lève SetupError si l'installation est refusée.
 */
export async function installOwner(input: InstallInput, ip: string, db: Db = getDb()): Promise<{ email: string }> {
  if (!takeAttempt(ip)) throw new SetupError(SETUP_ERRORS.tooMany);
  const invalid = installInputError(input);
  if (invalid) throw new SetupError(invalid);

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const passwordHash = await hashPassword(input.password);

  await db.transaction(async (tx) => {
    const [setup] = await exec<{ code_hash: string }>(sql`select code_hash from app_setup where id = 1 for update`, tx);
    const [{ owned }] = await exec<{ owned: boolean }>(sql`select exists (select 1 from app_owner) as owned`, tx);
    if (owned) throw new SetupError(SETUP_ERRORS.done);
    if (!setup || !sameHash(hashSetupCode(input.code), setup.code_hash)) throw new SetupError(SETUP_ERRORS.badCode);

    const userId = randomUUID();
    await tx.insert(user).values({ id: userId, name, email, emailVerified: true });
    await tx.insert(account).values({ id: randomUUID(), accountId: userId, providerId: 'credential', userId, password: passwordHash });
    await tx.insert(appOwner).values({ email });
    await tx.insert(profile).values({ id: 1, name }).onConflictDoNothing();
    await tx.delete(appSetup);
  });
  return { email };
}
