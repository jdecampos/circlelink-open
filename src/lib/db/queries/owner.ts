import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from '../client';
import { appOwner } from '../schema';

/** L'adresse est-elle celle d'un propriétaire de la page ? */
export async function isOwnerEmail(email: string): Promise<boolean> {
  const [row] = await getDb().select().from(appOwner).where(eq(appOwner.email, email.trim().toLowerCase())).limit(1);
  return !!row;
}
