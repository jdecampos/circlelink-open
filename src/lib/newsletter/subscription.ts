import 'server-only';
import { EMAIL_RE } from '@/lib/links';
import { detectSource } from '@/lib/source';
import { enqueue } from '@/lib/db/queries/newsletter';
import { pgErrorCode } from '@/lib/db/client';
import { newsletterEnabled } from '@/lib/features';
import { readConfig } from './config';
import { deliver } from './deliver';
import { logNewsletter } from './log';
import { toSource, type DeliveryOutcome, type SubscribeResult } from './types';

const INVALID = 'Cette adresse semble incomplète. Exemple : prenom@example.com';
const NOT_CONFIGURED = 'La newsletter n’est pas configurée sur cette page.';
const UNAVAILABLE = 'Inscription impossible pour le moment. Réessaie dans un instant.';
/** Budget de l'appel synchrone : le visiteur doit voir le résultat en moins de 2 s. */
const BUDGET_MS = 1500;

/** Inscription : Mautic tout de suite, la file si Mautic est momentanément indisponible. */
export async function handleSubscription(input: { email: unknown; referrer: unknown; userAgent: string }): Promise<SubscribeResult> {
  if (!newsletterEnabled()) return { ok: false, error: NOT_CONFIGURED };
  const email = String(input.email ?? '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: INVALID };
  const referrer = typeof input.referrer === 'string' ? input.referrer.slice(0, 512) : '';
  const source = toSource(detectSource(input.userAgent, referrer || null));

  let outcome: DeliveryOutcome;
  try {
    outcome = await deliver(readConfig(), { email, source }, { budgetMs: BUDGET_MS });
  } catch (e) {
    // configuration absente : l'inscription attend dans la file que Mautic soit configuré
    outcome = { kind: 'retry', cause: e instanceof Error ? e.message : 'configuration illisible' };
  }
  if (outcome.kind === 'ok') return { ok: true };

  logNewsletter('newsletter.subscribe', { outcome: outcome.kind, cause: outcome.cause });
  if (outcome.kind === 'permanent') return { ok: false, error: UNAVAILABLE };

  try {
    await enqueue(email, source);
  } catch (e) {
    // seul le code PostgreSQL est journalisé : le message peut contenir l'email
    logNewsletter('newsletter.enqueue', { outcome: 'failed', code: pgErrorCode(e) ?? 'inconnu' });
    return { ok: false, error: UNAVAILABLE };
  }
  return { ok: true };
}
