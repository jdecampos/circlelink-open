import 'server-only';
import { EMAIL_RE } from '@/lib/links';
import { detectSource } from '@/lib/source';
import { enqueue } from '@/lib/db/queries/newsletter';
import { pgErrorCode } from '@/lib/db/client';
import { getActiveConnection, type ActiveConnection } from '@/lib/db/queries/newsletter-settings';
import { deliver } from './deliver';
import { logNewsletter } from './log';
import { toSource, type DeliveryOutcome, type SubscribeResult } from './types';

const INVALID = 'Cette adresse semble incomplète. Exemple : prenom@example.com';
const NOT_CONFIGURED = 'L’inscription à la newsletter n’est pas ouverte sur cette page.';
const UNAVAILABLE = 'Inscription impossible pour le moment. Réessaie dans un instant.';
/** Budget de l'appel synchrone : le visiteur doit voir le résultat en moins de 2 s. */
const BUDGET_MS = 1500;

/** Inscription : le service connecté tout de suite, la file s'il est momentanément indisponible. */
export async function handleSubscription(input: { email: unknown; referrer: unknown; userAgent: string }): Promise<SubscribeResult> {
  const email = String(input.email ?? '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: INVALID };
  const referrer = typeof input.referrer === 'string' ? input.referrer.slice(0, 512) : '';
  const source = toSource(detectSource(input.userAgent, referrer || null));

  let conn: ActiveConnection | null;
  try {
    conn = await getActiveConnection();
  } catch (e) {
    logNewsletter('newsletter.settings', { outcome: 'failed', code: pgErrorCode(e) ?? 'inconnu' });
    return { ok: false, error: UNAVAILABLE };
  }
  // newsletter coupée ou sans service : refus sans aucun appel réseau
  if (!conn) return { ok: false, error: NOT_CONFIGURED };

  let outcome: DeliveryOutcome;
  try {
    outcome = await deliver(conn, { email, source }, { budgetMs: BUDGET_MS });
  } catch {
    // erreur inattendue (et non classée) : l'inscription attend dans la file, rien n'est perdu
    outcome = { kind: 'retry', cause: 'erreur inattendue' };
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
