import { newsletterEnabled } from '@/lib/features';
import { readConfig } from '@/lib/newsletter/config';
import { countSubscribers } from '@/lib/newsletter/mautic';
import StatsView from './StatsView';

/** Le nombre d'inscrits vient de Mautic : lu ici seulement, pour ne pas ralentir les autres pages de l'admin. */
async function readSegmentCount(): Promise<number | null> {
  // sans Mautic : aucun appel réseau, la carte affiche « Newsletter non configurée »
  if (!newsletterEnabled()) return null;
  try {
    return await countSubscribers(readConfig(), { timeoutMs: 1500 });
  } catch {
    // Mautic injoignable ou refus : la carte affiche « Mautic indisponible »
    return null;
  }
}

export default async function StatsPage() {
  return <StatsView segmentCount={await readSegmentCount()} />;
}
