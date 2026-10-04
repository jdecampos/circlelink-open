import 'server-only';
import { markKeyRejected, type ActiveConnection } from '@/lib/db/queries/newsletter-settings';
import { connector } from './connectors';
import { logNewsletter } from './log';
import type { DeliveryOutcome, Source } from './types';

/** Transmet une inscription au service connecté, dans le budget donné. */
export async function deliver(conn: ActiveConnection, sub: { email: string; source: Source }, opts: { budgetMs: number }): Promise<DeliveryOutcome> {
  const outcome = await connector(conn.provider).subscribe(conn.key, conn.audienceId, sub, { timeoutMs: opts.budgetMs });
  if (outcome.kind === 'retry' && outcome.keyRejected) {
    // l'espace affichera « reconnecte ton service » ; l'inscription, elle, part en file
    await markKeyRejected().catch((e: unknown) => logNewsletter('newsletter.key', { outcome: 'failed', cause: e instanceof Error ? e.message : 'inconnu' }));
  }
  return outcome;
}
