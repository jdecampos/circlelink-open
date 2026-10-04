import 'server-only';
import { pgErrorCode } from '@/lib/db/client';
import { claimDue, purgeExpired, resolve } from '@/lib/db/queries/newsletter';
import { getActiveConnection } from '@/lib/db/queries/newsletter-settings';
import { deliver } from './deliver';
import { logNewsletter } from './log';
import { toSource, type DeliveryOutcome, type QueuedSubscription } from './types';

export type RetryReport = { claimed: number; sent: number; lost: number; retried: number };

/** Délai par inscription en reprise : plus large qu'en direct, aucun visiteur n'attend. */
const BUDGET_MS = 5000;
const OUTCOME = { ok: 'sent', permanent: 'lost', retry: 'retry' } as const;

/**
 * Retente un lot de la file vers le service connecté. Une ligne en échec n'arrête jamais le lot.
 * Sans service connecté, seule la purge des 24 h s'applique.
 */
export async function processQueue(opts: { limit?: number } = {}): Promise<RetryReport> {
  const conn = await getActiveConnection();
  if (!conn) {
    await purgeExpired();
    return { claimed: 0, sent: 0, lost: 0, retried: 0 };
  }
  let rows: QueuedSubscription[];
  try {
    rows = await claimDue(opts.limit ?? 50);
  } catch (e) {
    throw new Error('newsletter_claim : ' + (pgErrorCode(e) ?? 'inconnu'));
  }
  const report: RetryReport = { claimed: rows.length, sent: 0, lost: 0, retried: 0 };

  for (const row of rows) {
    let outcome: DeliveryOutcome;
    try {
      outcome = await deliver(conn, { email: row.email, source: toSource(row.source) }, { budgetMs: BUDGET_MS });
    } catch {
      // erreur inattendue (et non classée) : on retentera au prochain passage, sans journaliser le détail
      outcome = { kind: 'retry', cause: 'erreur inattendue' };
    }
    const p_outcome = OUTCOME[outcome.kind];
    const cause = outcome.kind === 'ok' ? null : outcome.cause;
    try {
      await resolve(row.id, p_outcome, cause);
    } catch (e) {
      logNewsletter('newsletter.resolve', { outcome: 'failed', queueId: row.id, code: pgErrorCode(e) ?? 'inconnu' });
    }
    if (outcome.kind !== 'ok') logNewsletter('newsletter.retry', { outcome: p_outcome, queueId: row.id, cause: cause ?? undefined });

    if (outcome.kind === 'ok') report.sent++;
    else if (outcome.kind === 'permanent') report.lost++;
    else report.retried++;
  }
  return report;
}
