import type { ProviderId } from '@/lib/db/queries/newsletter-settings';
import type { DeliveryOutcome, Source } from '../types';

export type { ProviderId };

/** Liste de destination chez le service : liste (Brevo), audience (Mailchimp), groupe (MailerLite), tag (Kit). */
export type Audience = { id: string; name: string; count: number | null };

export type Subscriber = { email: string; source: Source };
export type Call = { timeoutMs: number };

/** Erreur affichable dans l'espace : nomme le service et la cause, jamais la clé. */
export class ConnectorError extends Error {
  constructor(
    readonly kind: 'key' | 'unavailable' | 'unexpected',
    message: string,
  ) {
    super(message);
  }
}

export type Connector = {
  id: ProviderId;
  label: string;
  /** Nom de la liste chez ce service, au singulier : « liste », « audience »… */
  audienceLabel: string;
  /** Où créer la clé, et ce qu'elle doit pouvoir faire. */
  keyHelp: { url: string; text: string };
  /** Message si la clé n'a pas le format attendu, avant tout appel réseau. */
  checkKey(key: string): string | null;
  listAudiences(key: string, opts: Call): Promise<Audience[]>;
  subscribe(key: string, audienceId: string, sub: Subscriber, opts: Call): Promise<DeliveryOutcome>;
  countSubscribers(key: string, audienceId: string, opts: Call): Promise<number>;
};
