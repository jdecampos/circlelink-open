import 'server-only';
import type { NewsletterConfig } from './config';
import { removeEmailDnc, upsertContact } from './mautic';
import type { DeliveryOutcome, Source } from './types';

/** En dessous, on n'essaie pas la levée du DNC : elle partirait en délai dépassé. */
const MIN_DNC_MS = 100;

/** Transmet une inscription : upsert du contact, puis levée du DNC email si besoin, dans le budget. */
export async function deliver(cfg: NewsletterConfig, sub: { email: string; source: Source }, opts: { budgetMs: number }): Promise<DeliveryOutcome> {
  const start = Date.now();
  const r = await upsertContact(cfg, { email: sub.email, tags: ['circleLink', 'source-' + sub.source] }, { timeoutMs: opts.budgetMs });
  if (!r.ok) return r.outcome;

  if (!r.contact.doNotContact.some((d) => d.channel === 'email')) return { kind: 'ok', contactId: r.contact.id };

  // désinscrit qui se réinscrit : sa nouvelle inscription vaut nouveau consentement
  const left = opts.budgetMs - (Date.now() - start);
  if (left < MIN_DNC_MS) return { kind: 'retry', cause: 'budget épuisé avant la levée du DNC' };
  const dnc = await removeEmailDnc(cfg, r.contact.id, { timeoutMs: left });
  // la levée est retentée quelle que soit l'erreur : le contact existe, seul son statut reste à corriger
  return dnc.kind === 'ok' ? dnc : { kind: 'retry', cause: 'levée du DNC : ' + dnc.cause };
}
