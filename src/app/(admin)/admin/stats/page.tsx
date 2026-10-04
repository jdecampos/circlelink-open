import { getActiveConnection } from '@/lib/db/queries/newsletter-settings';
import { connector } from '@/lib/newsletter/connectors';
import StatsView from './StatsView';

/** Le nombre d'inscrits vient du service connecté : lu ici seulement, pour ne pas ralentir les autres pages de l'espace. */
async function readSegmentCount(): Promise<number | null> {
  try {
    const conn = await getActiveConnection();
    // newsletter coupée : aucun appel réseau, la carte affiche « Newsletter désactivée »
    if (!conn) return null;
    return await connector(conn.provider).countSubscribers(conn.key, conn.audienceId, { timeoutMs: 1500 });
  } catch {
    // service injoignable ou clé refusée : la carte affiche « service indisponible »
    return null;
  }
}

export default async function StatsPage() {
  return <StatsView segmentCount={await readSegmentCount()} />;
}
