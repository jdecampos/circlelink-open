import type { Viewport } from 'next';
import { getPage } from './page-data';
import '@/styles/cb.css';
import '@/styles/public.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getPage();
  return (
    <html lang="fr" data-theme={profile.theme} data-links={profile.link_shape}>
      <head>
        <link rel="preload" href="/fonts/nunito-sans-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
