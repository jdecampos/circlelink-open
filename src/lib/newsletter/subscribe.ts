'use server';

import { headers } from 'next/headers';
import { handleSubscription } from './subscription';
import type { SubscribeInput, SubscribeResult } from './types';

/** Action serveur du formulaire public. Lire les en-têtes ici ne rend pas `/` dynamique. */
export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  const h = await headers();
  return handleSubscription({ email: input?.email, referrer: input?.referrer, userAgent: h.get('user-agent') ?? '' });
}
