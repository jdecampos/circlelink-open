import 'server-only';
import type { DeliveryOutcome } from '../types';
import { ConnectorError } from './types';

/* Appels HTTP des connecteurs. Règle de journalisation : une `cause` ne contient jamais
   l'email, la clé, le corps de réponse ni un en-tête ; seulement un statut ou un motif court. */

export type HttpResult = { status: number; json: unknown } | { error: unknown };

export async function request(url: string, init: { method?: string; headers: Record<string, string>; body?: unknown; timeoutMs: number }): Promise<HttpResult> {
  try {
    const res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: { Accept: 'application/json', ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(init.timeoutMs),
      cache: 'no-store',
      redirect: 'error',
    });
    const json: unknown = await res.json().catch(() => null);
    return { status: res.status, json };
  } catch (error) {
    return { error };
  }
}

const isTimeout = (e: unknown) => (e instanceof Error || e instanceof DOMException) && (e.name === 'TimeoutError' || e.name === 'AbortError');

/**
 * 2xx → ok · délai, réseau, 408, 425, 429, 5xx → retry · 401, 403 → retry, clé refusée ·
 * autres 4xx → permanent (adresse refusée par le service : inutile de réessayer).
 */
export function classify(r: HttpResult): DeliveryOutcome {
  if ('error' in r) return { kind: 'retry', cause: isTimeout(r.error) ? 'délai dépassé' : 'erreur réseau' };
  const { status } = r;
  if (status >= 200 && status < 300) return { kind: 'ok' };
  if (status === 401 || status === 403) return { kind: 'retry', cause: 'clé refusée (HTTP ' + status + ')', keyRejected: true };
  if (status >= 500 || status === 408 || status === 425 || status === 429) return { kind: 'retry', cause: 'HTTP ' + status };
  return { kind: 'permanent', cause: 'HTTP ' + status };
}

/** Réponse à une lecture (listes, compte) : le JSON, ou une ConnectorError qui nomme le service. */
export function readOrThrow(r: HttpResult, label: string): unknown {
  const c = classify(r);
  if (c.kind === 'ok' && 'json' in r) return r.json;
  if (c.kind === 'retry' && c.keyRejected) throw new ConnectorError('key', `Clé refusée par ${label} : vérifie qu’elle est complète et active.`);
  if (c.kind === 'retry') throw new ConnectorError('unavailable', `${label} ne répond pas. Réessaie dans un instant.`);
  throw new ConnectorError('unexpected', `${label} a refusé la demande (${c.kind === 'permanent' ? c.cause : 'réponse inattendue'}).`);
}

/** Nombre lu dans une réponse, ou erreur « réponse inattendue ». */
export function num(v: unknown, label: string): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new ConnectorError('unexpected', `Réponse inattendue de ${label}.`);
  return n;
}
