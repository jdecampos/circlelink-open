import 'server-only';
import type { NewsletterConfig } from './config';
import type { DeliveryOutcome } from './types';

/* Client de l'API REST Mautic (authentification HTTP basique).
   Règle de journalisation : une `cause` ne contient jamais l'email, le corps de
   réponse Mautic ni l'en-tête Authorization — seulement un statut ou un motif court. */

export type MauticContact = {
  id: number;
  doNotContact: { channel: string; reason: number }[];
};

type Classified = { kind: 'ok' } | { kind: 'retry'; cause: string } | { kind: 'permanent'; cause: string };
type CallResult = { status: number; json: unknown } | { error: unknown };

/** 2xx → ok · réseau, délai, 5xx, 429, 401, 403 → retry · autres 4xx → permanent. */
export function classify(input: { status: number } | { error: unknown }): Classified {
  if ('error' in input) {
    const name = input.error instanceof Error || input.error instanceof DOMException ? input.error.name : '';
    return { kind: 'retry', cause: name === 'TimeoutError' || name === 'AbortError' ? 'délai dépassé' : 'erreur réseau' };
  }
  const { status } = input;
  if (status >= 200 && status < 300) return { kind: 'ok' };
  if (status >= 500 || status === 429 || status === 401 || status === 403) return { kind: 'retry', cause: 'HTTP ' + status };
  return { kind: 'permanent', cause: 'HTTP ' + status };
}

async function call(cfg: NewsletterConfig, method: string, path: string, timeoutMs: number, body?: unknown): Promise<CallResult> {
  try {
    const res = await fetch(cfg.mauticUrl + path, {
      method,
      headers: {
        Authorization: 'Basic ' + Buffer.from(cfg.mauticUsername + ':' + cfg.mauticPassword).toString('base64'),
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    const json: unknown = await res.json().catch(() => null);
    return { status: res.status, json };
  } catch (error) {
    return { error };
  }
}

function toOutcome(r: CallResult, contactId: number): DeliveryOutcome {
  const c = classify(r);
  return c.kind === 'ok' ? { kind: 'ok', contactId } : c;
}

function readContact(json: unknown): MauticContact | null {
  const c = (json as { contact?: { id?: unknown; doNotContact?: unknown } } | null)?.contact;
  const id = Number(c?.id);
  if (!c || !Number.isInteger(id) || id <= 0) return null;
  const dnc = Array.isArray(c.doNotContact) ? c.doNotContact : [];
  return {
    id,
    doNotContact: dnc.map((d: { channel?: unknown; reason?: unknown }) => ({ channel: String(d.channel ?? ''), reason: Number(d.reason ?? 0) })),
  };
}

/** POST /api/contacts/new : Mautic crée ou met à jour par email, et ajoute les tags sans retirer les autres. */
export async function upsertContact(
  cfg: NewsletterConfig,
  input: { email: string; tags: string[] },
  opts: { timeoutMs: number },
): Promise<{ ok: true; contact: MauticContact } | { ok: false; outcome: DeliveryOutcome }> {
  const r = await call(cfg, 'POST', '/api/contacts/new', opts.timeoutMs, { email: input.email, tags: input.tags, overwriteWithBlank: false });
  const c = classify(r);
  if (c.kind !== 'ok') return { ok: false, outcome: c };
  const contact = readContact('json' in r ? r.json : null);
  if (!contact) return { ok: false, outcome: { kind: 'retry', cause: 'réponse Mautic inattendue' } };
  return { ok: true, contact };
}

/** POST /api/contacts/{id}/dnc/email/remove : le contact redevient joignable par email. */
export async function removeEmailDnc(cfg: NewsletterConfig, contactId: number, opts: { timeoutMs: number }): Promise<DeliveryOutcome> {
  return toOutcome(await call(cfg, 'POST', `/api/contacts/${contactId}/dnc/email/remove`, opts.timeoutMs), contactId);
}

/** Nombre de membres du segment des inscrits joignables ; null si Mautic ne répond pas. */
export async function countSubscribers(cfg: NewsletterConfig, opts: { timeoutMs: number }): Promise<number | null> {
  const q = new URLSearchParams({ search: 'segment:' + cfg.segmentAlias, limit: '1', minimal: 'true' });
  const r = await call(cfg, 'GET', '/api/contacts?' + q, opts.timeoutMs);
  if (classify(r).kind !== 'ok' || !('json' in r)) return null;
  const total = Number((r.json as { total?: unknown } | null)?.total);
  return Number.isFinite(total) ? total : null;
}
