import 'server-only';
import { headers } from 'next/headers';
import { isOwnerEmail } from '@/lib/db/queries/owner';
import { getAuth } from './server';

export type OwnerSession = { userId: string; email: string };

export class OwnerRequiredError extends Error {
  constructor() {
    super('Action réservée au propriétaire de la page.');
  }
}

/** Une session ne vaut propriétaire que si son email est listé dans app_owner. */
export async function ownerFrom(session: { user: { id: string; email: string } } | null): Promise<OwnerSession | null> {
  if (!session) return null;
  const email = session.user.email.trim().toLowerCase();
  return (await isOwnerEmail(email)) ? { userId: session.user.id, email } : null;
}

/** Session de la requête en cours, si elle appartient au propriétaire. */
export async function getOwnerSession(): Promise<OwnerSession | null> {
  const h = await headers();
  const session = await getAuth().api.getSession({ headers: h });
  return ownerFrom(session);
}

/** Première instruction de chaque action de l'admin (constitution VII.1). */
export async function requireOwner(): Promise<OwnerSession> {
  const owner = await getOwnerSession();
  if (!owner) throw new OwnerRequiredError();
  return owner;
}
