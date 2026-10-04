import 'server-only';
import { brevo } from './brevo';
import { kit } from './kit';
import { mailchimp } from './mailchimp';
import { mailerlite } from './mailerlite';
import type { Connector, ProviderId } from './types';

/** Connecteurs disponibles, dans l'ordre d'affichage de l'espace. Un nouveau service = un fichier ici. */
export const CONNECTORS: Record<ProviderId, Connector> = { brevo, mailchimp, mailerlite, kit };

export function connector(id: ProviderId): Connector {
  return CONNECTORS[id];
}
