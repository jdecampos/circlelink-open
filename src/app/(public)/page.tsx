import type { Metadata } from 'next';
import { displayName } from '@/lib/brand';
import { siteUrl } from '@/lib/site';
import LinkPage from './LinkPage';
import { getPage } from './page-data';

// L'image Docker se construit sans base : la page est rendue à la requête, mais ses
// données viennent du cache (getPublicPage) : aucune requête en base par visite.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getPage();
  const title = displayName(profile.name) + ' · Liens';
  const description = profile.bio || 'Tous mes liens : formations, communauté, contenus et outils.';
  return {
    metadataBase: new URL(siteUrl()),
    title,
    description,
    alternates: { canonical: '/' },
    icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
    openGraph: { type: 'profile', title, description, url: '/', locale: 'fr_FR', username: profile.handle || undefined },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function Home() {
  const data = await getPage();
  return <LinkPage data={{ ...data, links: data.links.filter((l) => l.visible) }} />;
}
