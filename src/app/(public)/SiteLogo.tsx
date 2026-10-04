import { displayName } from '@/lib/brand';
import { Mark } from '@/lib/icons';
import type { Profile } from '@/lib/types';

/** Logo choisi pour le thème de la page, sinon celui de l'autre thème, sinon le logo de CircleLink. */
export function logoFor(p: Pick<Profile, 'theme' | 'logo_url' | 'logo_dark_url'>): string {
  return p.theme === 'sombre' ? p.logo_dark_url || p.logo_url : p.logo_url || p.logo_dark_url;
}

export default function SiteLogo({ profile }: { profile: Profile }) {
  const src = logoFor(profile);
  if (!src) return <Mark size={32} />;
  // URL https: validée côté serveur et en base ; proportions libres, d'où <img> plutôt que next/image
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="site-logo" src={src} alt={displayName(profile.name)} />;
}
