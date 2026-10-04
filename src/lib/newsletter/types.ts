export const SOURCES = ['tiktok', 'instagram', 'facebook', 'linkedin', 'x', 'youtube', 'snapchat', 'threads', 'direct'] as const;
export type Source = (typeof SOURCES)[number];

/** Une provenance inconnue devient `direct`. */
export function toSource(v: string): Source {
  return (SOURCES as readonly string[]).includes(v) ? (v as Source) : 'direct';
}

/** Issue d'une transmission au service : `retry` = réessayer plus tard, `permanent` = ne pas réessayer. */
export type DeliveryOutcome =
  | { kind: 'ok' }
  | { kind: 'retry'; cause: string; /** le service refuse la clé (401/403) */ keyRejected?: boolean }
  | { kind: 'permanent'; cause: string };

export type QueuedSubscription = {
  id: number;
  email: string;
  source: Source;
  attempts: number;
};


export type SubscribeInput = { email: string; referrer: string };

export type SubscribeResult =
  | { ok: true } // transmis au service, ou mis en file
  | { ok: false; error: string }; // message en français, affichable tel quel
